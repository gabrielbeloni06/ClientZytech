import { NextRequest, NextResponse } from "next/server";

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

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

        console.log(`>>> [AUTO-CORREÇÃO] Instância '${instanceName}' existe mas está desconectada (${state}). Recriando...`);
        
        await fetch(`${EVO_URL}/instance/delete/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': EVO_KEY! }
        });
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

    const connectUrl = `${EVO_URL}/instance/connect/${instanceName}`;
    const connectRes = await fetch(connectUrl, {
      method: 'GET',
      headers: { 'apikey': EVO_KEY! }
    });

    const connectData = await connectRes.json();

    const qrCode = connectData.base64 || connectData.qrcode?.base64 || connectData.qrcode;
    const pairingCode = connectData.code || connectData.pairingCode;

    if (qrCode) {
        return NextResponse.json({ 
            status: 'qrcode', 
            qrcode: qrCode, 
            code: pairingCode 
        });
    }

    return NextResponse.json({ error: "Instância criada, mas o QR Code não foi retornado. Tente clicar novamente." }, { status: 500 });

  } catch (error: any) {
    console.error("Erro Geral Route:", error);
    return NextResponse.json({ error: `Erro Interno: ${error.message}` }, { status: 500 });
  }
}