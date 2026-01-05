import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = "http://46.224.182.243:8080"; 
const EVO_KEY = "clientzy_master_key_2025";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();
    const cleanName = instanceName?.trim();
    const reqId = Date.now().toString().slice(-4); // ID curto para log

    console.log(`[${reqId}] >>> PROCESSO INICIADO: ${cleanName}`);

    const headers = { "Content-Type": "application/json", "apikey": EVO_KEY };

    // 1. TENTA CRIAR
    try {
        const createRes = await fetch(`${BASE_URL}/instance/create`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                instanceName: cleanName,
                token: crypto.randomUUID(),
                qrcode: true,
                integration: "WHATSAPP-BAILEYS",
                reject_call: true
            })
        });

        if (createRes.ok) {
            console.log(`[${reqId}] >>> CRIADO COM SUCESSO (201). Aguardando 5s...`);
            await delay(5000); // Espera o Chrome subir
        } else {
            console.log(`[${reqId}] >>> Status Criação: ${createRes.status} (Provavelmente já existe)`);
        }
    } catch (e) {
        console.error(`[${reqId}] >>> ERRO CRIAÇÃO:`, e);
    }

    // 2. BUSCA QR CODE COM TIMEOUT (Para não travar o log)
    for (let i = 0; i < 3; i++) {
        try {
            console.log(`[${reqId}] >>> Buscando QR (${i+1}/3)...`);

            // AbortController: Se a VPS não responder em 8s, cancelamos
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const connectRes = await fetch(`${BASE_URL}/instance/connect/${cleanName}`, {
                headers,
                cache: 'no-store',
                signal: controller.signal // <--- Isso impede o travamento eterno
            });
            
            clearTimeout(timeoutId); // Limpa o timer se respondeu rápido

            if (connectRes.ok) {
                const data = await connectRes.json();
                
                // Loga um pedacinho da resposta pra confirmar que chegou
                console.log(`[${reqId}] >>> RESPOSTA VPS: Status=${data?.instance?.state}, Count=${data?.count}`);

                if (data?.instance?.state === 'open') {
                    return NextResponse.json({ status: "connected", message: "Conectado!" });
                }

                const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;
                if (qr && qr.length > 50) {
                    console.log(`[${reqId}] >>> QR CODE ENCONTRADO!`);
                    return NextResponse.json({ status: "qrcode", qrcode: qr });
                }
            } else {
                console.log(`[${reqId}] >>> ERRO HTTP: ${connectRes.status}`);
            }

        } catch (e: any) {
            if (e.name === 'AbortError') {
                console.log(`[${reqId}] >>> TIMEOUT: A VPS demorou mais de 8s para responder.`);
            } else {
                console.log(`[${reqId}] >>> ERRO FETCH:`, e.message);
            }
        }
        await delay(2000);
    }

    console.log(`[${reqId}] >>> FIM. Retornando Loading.`);
    return NextResponse.json({ status: "loading", message: "VPS processando..." });

  } catch (err: any) {
    console.error(">>> FATAL:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}