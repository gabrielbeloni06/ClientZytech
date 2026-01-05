import { NextRequest, NextResponse } from "next/server";

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!EVO_URL) {
      return NextResponse.json({ error: "ERRO DE CONFIG: EVOLUTION_API_URL vazia." }, { status: 500 });
    }
    if (!EVO_KEY) {
      return NextResponse.json({ error: "ERRO DE CONFIG: EVOLUTION_API_KEY vazia." }, { status: 500 });
    }

    const { instanceName } = await req.json();
    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    console.log(`>>> [CONEXÃO] Iniciando para instância: ${instanceName} em ${EVO_URL}`);

    const createUrl = `${EVO_URL}/instance/create`;
    const createPayload = {
      instanceName: instanceName,
      token: crypto.randomUUID(), 
      qrcode: true,
      integration: "WHATSAPP-BAILEYS"
    };

    console.log(`>>> [CREATE] Tentando criar...`);
    
    const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
        body: JSON.stringify(createPayload)
    });

    if (!createRes.ok) {
        const createErrText = await createRes.text();
        console.log(`>>> [CREATE INFO] Resposta: ${createRes.status} - ${createErrText}`);

        if (!createErrText.includes("already exists") && !createErrText.includes("já existe")) {
             return NextResponse.json({ 
                 error: `Falha ao criar instância: ${createRes.status} - ${createErrText}` 
             }, { status: 500 });
        }
        console.log(">>> [CREATE] Instância já existia. Prosseguindo para conexão.");
    } else {
        console.log(">>> [CREATE] Instância criada com sucesso!");
    }

    const connectUrl = `${EVO_URL}/instance/connect/${instanceName}`;
    console.log(`>>> [CONNECT] Buscando QR Code: ${connectUrl}`);

    const connectRes = await fetch(connectUrl, {
      method: 'GET',
      headers: { 'apikey': EVO_KEY }
    });

    if (!connectRes.ok) {
        const errText = await connectRes.text();
        console.error(`>>> [CONNECT ERRO] HTTP ${connectRes.status}: ${errText}`);
        
        if (errText.includes("open") || errText.includes("connected") || errText.includes("already connected")) {
             return NextResponse.json({ status: 'connected', message: "Instância já conectada e pronta!" });
        }

        return NextResponse.json({ 
            error: `Erro ao buscar QR Code: ${connectRes.status} - ${errText}` 
        }, { status: 500 });
    }

    const connectData = await connectRes.json();

    const qrCode = connectData.base64 || connectData.qrcode;
    
    if (qrCode) {
        return NextResponse.json({ 
            status: 'qrcode', 
            qrcode: qrCode, 
            code: connectData.code 
        });
    }

    if (connectData.instance?.state === 'open') {
        return NextResponse.json({ status: 'connected', message: "Conectado!" });
    }

    return NextResponse.json({ error: "A API respondeu mas não enviou o QR Code. Tente novamente em 5 segundos." }, { status: 500 });

  } catch (error: any) {
    console.error("Erro Geral Route:", error);
    return NextResponse.json({ error: `Erro Interno: ${error.message}` }, { status: 500 });
  }
}