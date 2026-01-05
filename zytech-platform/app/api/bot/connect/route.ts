import { NextRequest, NextResponse } from "next/server";

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    console.log(`>>> [CONEXÃO] Iniciando processo para: ${instanceName}`);

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
        
        const createText = await createRes.text();
        console.log(`>>> [CREATE STATUS] ${createRes.status} - ${createText.substring(0, 50)}...`);
        
    } catch (e) {
        console.error(">>> [CREATE ERROR]", e);
    }

    const connectUrl = `${EVO_URL}/instance/connect/${instanceName}`;
    
    let qrCode = null;
    let pairingCode = null;
    let attempts = 0;
    const maxAttempts = 30; 

    while (attempts < maxAttempts && !qrCode) {
        attempts++;
        
        try {
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

        await delay(1500);
    }

    if (qrCode) {
        return NextResponse.json({ 
            status: 'qrcode', 
            qrcode: qrCode, 
            code: pairingCode 
        });
    }

    return NextResponse.json({ error: "Não foi possível obter o QR Code. O servidor pode estar sobrecarregado." }, { status: 504 });

  } catch (error: any) {
    console.error("Erro Geral Route:", error);
    return NextResponse.json({ error: `Erro Interno: ${error.message}` }, { status: 500 });
  }
}