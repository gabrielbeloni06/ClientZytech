import { NextRequest, NextResponse } from "next/server";

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    console.log(`>>> [CONEXÃO] Iniciando para: ${instanceName}`);

    try {
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

            console.log(`>>> [FORCE DELETE] Instância estava no estado '${state}'. Apagando para recriar limpo...`);
            await fetch(`${EVO_URL}/instance/delete/${instanceName}`, {
                method: 'DELETE',
                headers: { 'apikey': EVO_KEY! }
            });
            
            await delay(3000);
        }
    } catch (e) {
        console.log(">>> [CHECK IGNORED] Instância provavelmente não existia.");
    }

    const createUrl = `${EVO_URL}/instance/create`;
    const createPayload = {
      instanceName: instanceName,
      token: crypto.randomUUID(),
      qrcode: true,
      integration: "WHATSAPP-BAILEYS"
    };

    console.log(`>>> [CREATE] Criando nova instância...`);
    const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY! },
        body: JSON.stringify(createPayload)
    });

    if (!createRes.ok) {
        const errText = await createRes.text();
        console.log(`>>> [CREATE WARNING] ${createRes.status} - ${errText}`);
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
                    return NextResponse.json({ status: 'connected', message: "Conectou durante o processo!" });
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

    return NextResponse.json({ error: "Tempo esgotado. Por favor, clique novamente para reiniciar o processo." }, { status: 504 });

  } catch (error: any) {
    console.error("Erro Geral:", error);
    return NextResponse.json({ error: `Erro Interno: ${error.message}` }, { status: 500 });
  }
}