import { NextRequest, NextResponse } from "next/server";

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    const createUrl = `${EVO_URL}/instance/create`;
    const createPayload = {
      instanceName: instanceName,
      token: "", 
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      webhook: process.env.NEXT_PUBLIC_URL ? `${process.env.NEXT_PUBLIC_URL}/api/webhook` : undefined, 
      webhook_by_events: false,
      events: ["MESSAGES-UPSERT"]
    };

    console.log(`>>> [EVO] Criando instância: ${instanceName}`);
    
    await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY! },
      body: JSON.stringify(createPayload)
    });

    const connectUrl = `${EVO_URL}/instance/connect/${instanceName}`;
    const connectRes = await fetch(connectUrl, {
      method: 'GET',
      headers: { 'apikey': EVO_KEY! }
    });

    if (!connectRes.ok) {
        const stateUrl = `${EVO_URL}/instance/connectionState/${instanceName}`;
        const stateRes = await fetch(stateUrl, { headers: { 'apikey': EVO_KEY! } });
        const stateData = await stateRes.json();
        
        if (stateData?.instance?.state === 'open') {
            return NextResponse.json({ status: 'connected', message: "Instância já conectada!" });
        }
        return NextResponse.json({ error: "Falha ao gerar QR Code" }, { status: 500 });
    }

    const connectData = await connectRes.json();

    if (connectData && connectData.base64) {
        return NextResponse.json({ 
            status: 'qrcode', 
            qrcode: connectData.base64, 
            code: connectData.code
        });
    }

    return NextResponse.json({ error: "QR Code não disponível. Tente novamente." }, { status: 500 });

  } catch (error: any) {
    console.error("Erro Conexão:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}