import { NextRequest, NextResponse } from "next/server";

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    console.log(`>>> [CONEXÃO] Iniciando processo para: ${instanceName}`);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        await fetch(`${EVO_URL}/instance/fetchInstances`, { 
            method: 'GET',
            headers: { 'apikey': EVO_KEY! },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
    } catch (e) {
        console.error(">>> [VPS OFFLINE]", e);
        return NextResponse.json({ error: "A VPS não está respondendo. Verifique se o servidor está ligado e o Docker rodando." }, { status: 502 });
    }

    const createUrl = `${EVO_URL}/instance/create`;
    const createPayload = {
      instanceName: instanceName,
      token: crypto.randomUUID(),
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      reject_call: true,
      msgBufferLimit: 50
    };

    try {
        const createRes = await fetch(createUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY! },
            body: JSON.stringify(createPayload)
        });
        
        if (!createRes.ok) {
            const txt = await createRes.text();
            if (!txt.includes("already")) console.log(`>>> [CREATE INFO] ${txt}`);
        }
    } catch (e) {
        console.error(">>> [CREATE ERROR]", e);
    }

    let qrCode = null;
    let pairingCode = null;
    let attempts = 0;
    const maxAttempts = 8; 

    while (attempts < maxAttempts && !qrCode) {
        attempts++;
        
        try {
            const connectUrl = `${EVO_URL}/instance/connect/${instanceName}`;
            const connectRes = await fetch(connectUrl, {
                method: 'GET',
                headers: { 'apikey': EVO_KEY! }
            });

            if (connectRes.ok) {
                const connectData = await connectRes.json();
                
                if (connectData?.instance?.state === 'open') {
                    return NextResponse.json({ status: 'connected', message: "Conectado com sucesso!" });
                }

                qrCode = connectData.base64 || connectData.qrcode?.base64 || connectData.qrcode;
                pairingCode = connectData.code || connectData.pairingCode;
                
                if (qrCode) break; 
            }
        } catch (e) {
        }

        if (!qrCode) await delay(1500);
    }

    if (qrCode) {
        return NextResponse.json({ 
            status: 'qrcode', 
            qrcode: qrCode, 
            code: pairingCode 
        });
    }

    return NextResponse.json({ error: "O QR Code ainda está sendo gerado. Por favor, clique novamente." }, { status: 504 });

  } catch (error: any) {
    console.error("Erro Geral Route:", error);
    return NextResponse.json({ error: `Erro Interno: ${error.message}` }, { status: 500 });
  }
}