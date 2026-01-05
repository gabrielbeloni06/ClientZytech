import { NextRequest, NextResponse } from "next/server";

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    console.log(`>>> [CONEXÃO] Iniciando para: ${instanceName}`);

    const createUrl = `${EVO_URL}/instance/create`;
    const createPayload = {
      instanceName: instanceName,
      token: crypto.randomUUID(),
      qrcode: true,
      integration: "WHATSAPP-BAILEYS"
    };

    try {
        const createRes = await fetch(createUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY! },
            body: JSON.stringify(createPayload)
        });
        
        if (!createRes.ok) {
            const err = await createRes.text();
            console.log(`>>> [CREATE INFO] Status: ${createRes.status} (Provavelmente já existe)`);
        } else {
            console.log(`>>> [CREATE SUCCESS] Instância criada.`);
        }
    } catch (e) {
        console.error(">>> [CREATE ERROR]", e);
    }

    let qrCode = null;
    let pairingCode = null;
    let attempts = 0;
    const maxAttempts = 15; 

    while (attempts < maxAttempts && !qrCode) {
        attempts++;
        console.log(`>>> [CONNECT] Tentativa ${attempts}/${maxAttempts}...`);
        
        try {
            const connectUrl = `${EVO_URL}/instance/connect/${instanceName}`;
            const connectRes = await fetch(connectUrl, {
                method: 'GET',
                headers: { 'apikey': EVO_KEY! }
            });

            if (connectRes.ok) {
                const connectData = await connectRes.json();
                
                if (connectData?.instance?.state === 'open') {
                    return NextResponse.json({ status: 'connected', message: "Instância já conectada!" });
                }

                qrCode = connectData.base64 || connectData.qrcode?.base64 || connectData.qrcode;
                pairingCode = connectData.code || connectData.pairingCode;
                
                if (qrCode) break;
            }
        } catch (e) {
            console.error(`>>> [CONNECT FAIL]`, e);
        }

        await delay(2000);
    }

    if (qrCode) {
        return NextResponse.json({ 
            status: 'qrcode', 
            qrcode: qrCode, 
            code: pairingCode 
        });
    }

    return NextResponse.json({ error: "O servidor está inicializando. Aguarde 10 segundos e clique novamente." }, { status: 504 });

  } catch (error: any) {
    console.error("Erro Geral:", error);
    return NextResponse.json({ error: `Erro Interno: ${error.message}` }, { status: 500 });
  }
}