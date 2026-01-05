import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = "http://46.224.182.243:8080"; 
const EVO_KEY = "clientzy_master_key_2025";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();
    const cleanName = instanceName?.trim() || "v1_debug";
    const reqId = Date.now().toString().slice(-4);

    console.log(`[${reqId}] >>> INÍCIO v1.8.2: ${cleanName}`);

    const headers = { 
        "Content-Type": "application/json", 
        "apikey": EVO_KEY 
    };

    // 1. CRIAR INSTÂNCIA (v1.8.2 é robusta aqui)
    try {
        const createRes = await fetch(`${BASE_URL}/instance/create`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                instanceName: cleanName,
                qrcode: true // v1 precisa disso explícito
            })
        });

        if (createRes.ok) {
            console.log(`[${reqId}] >>> CRIADO (201). Aguardando 3s...`);
            await delay(3000); 
        } else {
            const txt = await createRes.text();
            if(!txt.includes("already exists")) console.log(`[${reqId}] >>> INFO CREATE: ${txt}`);
        }
    } catch (e) {
        console.error(`[${reqId}] >>> ERRO CREATE:`, e);
    }

    // 2. BUSCA QR CODE
    for (let i = 0; i < 5; i++) {
        try {
            console.log(`[${reqId}] >>> Tentativa ${i+1}/5...`);

            const connectRes = await fetch(`${BASE_URL}/instance/connect/${cleanName}`, {
                headers,
                cache: 'no-store'
            });

            if (connectRes.ok) {
                const data = await connectRes.json();
                
                // v1.8.2 geralmente retorna o base64 direto ou dentro de qrcode
                const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;
                
                // Checa se conectou
                if (data?.instance?.state === 'open') {
                    return NextResponse.json({ status: "connected", message: "Conectado!" });
                }

                if (qr && typeof qr === 'string' && qr.length > 50) {
                    console.log(`[${reqId}] >>> QR CODE ENCONTRADO!`);
                    return NextResponse.json({ status: "qrcode", qrcode: qr });
                }
            }
        } catch (e) {
            console.log(`[${reqId}] >>> ERRO LOOP:`, e);
        }
        await delay(2000);
    }

    return NextResponse.json({ 
        status: "loading", 
        message: "Carregando..." 
    });

  } catch (err: any) {
    console.error(">>> FATAL:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}