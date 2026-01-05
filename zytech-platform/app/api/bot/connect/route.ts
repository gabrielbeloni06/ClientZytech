import { NextRequest, NextResponse } from "next/server";

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    const statusUrl = `${EVO_URL}/instance/connectionState/${instanceName}`;
    const statusRes = await fetch(statusUrl, {
        method: 'GET',
        headers: { 'apikey': EVO_KEY! }
    });

    if (statusRes.ok) {
        const statusData = await statusRes.json();
        const state = statusData?.instance?.state;

        if (state === 'open') {
            return NextResponse.json({ status: 'connected', message: "Instância já conectada e pronta!" });
        }

        console.log(`>>> [AUTO-CORREÇÃO] Limpando instância antiga '${instanceName}' (Estado: ${state})...`);
        await fetch(`${EVO_URL}/instance/delete/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': EVO_KEY! }
        });
        await delay(2000);
    }

    const createUrl = `${EVO_URL}/instance/create`;
    const createPayload = {
      instanceName: instanceName,
      token: crypto.randomUUID(),
      qrcode: true,
      integration: "WHATSAPP-BAILEYS"
    };

    console.log(`>>> [CREATE] Criando instância nova: ${instanceName}`);
    
    const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY! },
        body: JSON.stringify(createPayload)
    });

    if (!createRes.ok) {
        const errText = await createRes.text();
        if (!errText.includes("already")) {
             return NextResponse.json({ error: `Erro ao criar: ${errText}` }, { status: 500 });
        }
    }
    let qrCode = null;
    let pairingCode = null;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts && !qrCode) {
        attempts++;
        console.log(`>>> [CONNECT] Tentativa ${attempts}/${maxAttempts} de buscar QR Code...`);
        
        try {
            const connectUrl = `${EVO_URL}/instance/connect/${instanceName}`;
            const connectRes = await fetch(connectUrl, {
                method: 'GET',
                headers: { 'apikey': EVO_KEY! }
            });

            if (connectRes.ok) {
                const connectData = await connectRes.json();
                qrCode = connectData.base64 || connectData.qrcode?.base64 || connectData.qrcode;
                pairingCode = connectData.code || connectData.pairingCode;
                
                if (qrCode) break; 
            }
        } catch (e) {
            console.error(`>>> [CONNECT ERROR] Falha na tentativa ${attempts}:`, e);
        }

        if (!qrCode) await delay(2000);
    }

    if (qrCode) {
        return NextResponse.json({ 
            status: 'qrcode', 
            qrcode: qrCode, 
            code: pairingCode 
        });
    }

    return NextResponse.json({ error: "A API demorou demais para iniciar o QR Code. Por favor, tente clicar novamente." }, { status: 504 });

  } catch (error: any) {
    console.error("Erro Geral Route:", error);
    return NextResponse.json({ error: `Erro Interno: ${error.message}` }, { status: 500 });
  }
}