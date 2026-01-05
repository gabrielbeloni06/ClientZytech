import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = "http://46.224.182.243:8080"; 
const EVO_KEY = "clientzy_master_key_2025";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();
    const cleanName = instanceName?.trim() || "final_test";
    const reqId = Date.now().toString().slice(-4);

    console.log(`[${reqId}] >>> INÍCIO v2.1.1 (No-Sandbox): ${cleanName}`);

    const headers = { "Content-Type": "application/json", "apikey": EVO_KEY };

    // 1. CRIAR
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
            console.log(`[${reqId}] >>> CRIADO (201). Aguardando Chrome (5s)...`);
            await delay(5000); 
        } else {
            const txt = await createRes.text();
            if(!txt.includes("already exists")) console.log(`[${reqId}] >>> INFO CREATE: ${txt}`);
        }
    } catch (e) {
        console.error(`[${reqId}] >>> ERRO CREATE:`, e);
    }

    // 2. BUSCA QR CODE
    for (let i = 0; i < 6; i++) {
        try {
            console.log(`[${reqId}] >>> Tentativa ${i+1}/6...`);
            const connectRes = await fetch(`${BASE_URL}/instance/connect/${cleanName}`, {
                headers,
                cache: 'no-store'
            });

            if (connectRes.ok) {
                const data = await connectRes.json();
                
                // Debug do JSON
                const jsonStr = JSON.stringify(data);
                console.log(`[${reqId}] >>> JSON: ${jsonStr.substring(0, 100)}...`);

                if (data?.instance?.state === 'open') {
                    return NextResponse.json({ status: "connected", message: "Conectado!" });
                }

                // v2.1.1 retorna base64 na raiz ou dentro de qrcode
                const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;
                
                if (qr && typeof qr === 'string' && qr.length > 50) {
                    console.log(`[${reqId}] >>> QR CODE ENCONTRADO!`);
                    return NextResponse.json({ status: "qrcode", qrcode: qr });
                }
            }
        } catch (e) {
            console.log(`[${reqId}] >>> ERRO LOOP:`, e);
        }
        await delay(3000);
    }

    return NextResponse.json({ 
        status: "loading", 
        message: "Inicializando..." 
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}