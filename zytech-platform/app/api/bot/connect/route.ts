import { NextRequest, NextResponse } from "next/server";

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    console.log(`>>> [CONEXÃO] Verificando: ${instanceName}`);

    let state = 'undefined';
    try {
        const statusRes = await fetch(`${EVO_URL}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': EVO_KEY! }
        });
        if (statusRes.ok) {
            const statusData = await statusRes.json();
            state = statusData?.instance?.state;
        }
    } catch (e) {
        console.log(">>> [STATUS CHECK] Instância offline ou inexistente.");
    }

    if (state === 'open') {
        return NextResponse.json({ status: 'connected', message: "Conectado!" });
    }

    if (state === 'undefined' || state === 'close') {
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
            console.log(`>>> [CREATE] Solicitando criação...`);
            const createRes = await fetch(createUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY! },
                body: JSON.stringify(createPayload)
            });
            
            if (createRes.ok) {
                const createData = await createRes.json();
                if (createData.qrcode && createData.qrcode.base64) {
                    return NextResponse.json({ status: 'qrcode', qrcode: createData.qrcode.base64, code: createData.qrcode.pairingCode });
                }
            }
        } catch (e) {
            console.error(">>> [CREATE ERROR]", e);
        }
    }

    console.log(`>>> [CONNECT] Buscando QR Code...`);
    const connectUrl = `${EVO_URL}/instance/connect/${instanceName}`;
    
    const connectRes = await fetch(connectUrl, {
        method: 'GET',
        headers: { 'apikey': EVO_KEY! }
    });

    if (connectRes.ok) {
        const connectData = await connectRes.json();
        const qrCode = connectData.base64 || connectData.qrcode?.base64 || connectData.qrcode;
        const pairingCode = connectData.code || connectData.pairingCode;

        if (qrCode) {
            return NextResponse.json({ status: 'qrcode', qrcode: qrCode, code: pairingCode });
        }
    }

    return NextResponse.json({ 
        error: "O servidor está iniciando o WhatsApp. Aguarde 5 segundos e clique novamente." 
    }, { status: 409 });

  } catch (error: any) {
    console.error("Erro Geral Route:", error);
    return NextResponse.json({ error: `Erro Interno: ${error.message}` }, { status: 500 });
  }
}