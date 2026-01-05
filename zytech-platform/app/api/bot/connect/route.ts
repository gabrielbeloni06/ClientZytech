import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = "http://46.224.182.243:8080"; 
const EVO_KEY = "clientzy_master_key_2025";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();
    const cleanName = instanceName?.trim() || "instance_debug";
    const reqId = Date.now().toString().slice(-4);

    console.log(`[${reqId}] >>> INÍCIO: ${cleanName}`);

    const headers = { 
        "Content-Type": "application/json", 
        "apikey": EVO_KEY 
    };

    // 1. CRIAR INSTÂNCIA
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
            console.log(`[${reqId}] >>> CRIADO (201). Aguardando boot inicial (5s)...`);
            await delay(5000); 
        } else {
            const txt = await createRes.text();
            if(!txt.includes("already exists")) console.log(`[${reqId}] >>> INFO CREATE: ${txt}`);
        }
    } catch (e) {
        console.error(`[${reqId}] >>> ERRO CREATE:`, e);
    }

    // 2. LOOP DE BUSCA (Aumentado para 8 tentativas x 3s = 24 segundos)
    for (let i = 0; i < 8; i++) {
        try {
            console.log(`[${reqId}] >>> Tentativa ${i+1}/8...`);

            const connectRes = await fetch(`${BASE_URL}/instance/connect/${cleanName}`, {
                headers,
                cache: 'no-store'
            });

            if (connectRes.ok) {
                const data = await connectRes.json();
                
                // LOG COMPLETO PARA DEBUG (Isso vai nos mostrar o que a VPS está mandando)
                console.log(`[${reqId}] >>> JSON RECEBIDO:`, JSON.stringify(data).substring(0, 200));

                if (data?.instance?.state === 'open') {
                    return NextResponse.json({ status: "connected", message: "Conectado!" });
                }

                // Tenta achar o QR em qualquer lugar
                const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;
                
                if (qr && typeof qr === 'string' && qr.length > 50) {
                    console.log(`[${reqId}] >>> QR CODE ENCONTRADO!`);
                    return NextResponse.json({ status: "qrcode", qrcode: qr });
                }
            }
        } catch (e) {
            console.log(`[${reqId}] >>> ERRO LOOP:`, e);
        }
        
        // Espera 3 segundos entre tentativas
        await delay(3000);
    }

    // Se acabou o tempo e ainda está count=0
    console.log(`[${reqId}] >>> TIMEOUT. VPS ainda carregando.`);
    return NextResponse.json({ 
        status: "loading", 
        message: "Inicializando motor do WhatsApp..." 
    });

  } catch (err: any) {
    console.error(">>> FATAL:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}