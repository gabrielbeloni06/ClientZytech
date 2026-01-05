import { NextRequest, NextResponse } from "next/server";

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!EVO_URL) {
      return NextResponse.json({ error: "ERRO DE CONFIG: A variável EVOLUTION_API_URL está vazia na Vercel." }, { status: 500 });
    }
    if (!EVO_KEY) {
      return NextResponse.json({ error: "ERRO DE CONFIG: A variável EVOLUTION_API_KEY está vazia na Vercel." }, { status: 500 });
    }

    const { instanceName } = await req.json();
    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    console.log(`>>> [DIAGNOSTICO] Tentando conectar em: ${EVO_URL}`);

    try {
        const pingRes = await fetch(`${EVO_URL}/`, { 
            method: 'GET',
            headers: { 'apikey': EVO_KEY } 
        });
        
        console.log(`>>> [PING] Status: ${pingRes.status}`);
        
        if (!pingRes.ok && pingRes.status !== 404) {
        }
    } catch (pingError: any) {
        console.error(">>> [PING FALHOU]", pingError);
        return NextResponse.json({ 
            error: `FALHA DE CONEXÃO VERCEL -> VPS. O servidor Vercel não conseguiu alcançar ${EVO_URL}. Erro: ${pingError.message}` 
        }, { status: 502 });
    }

    const createUrl = `${EVO_URL}/instance/create`;
    const createPayload = {
      instanceName: instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS"
    };

    console.log(`>>> [CREATE] Criando instância: ${instanceName}`);
    
    try {
        await fetch(createUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
            body: JSON.stringify(createPayload)
        });
    } catch (e) {
        console.log(">>> [CREATE] Erro ignorável (provavelmente já existe):", e);
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
        
        if (errText.includes("open") || errText.includes("connected")) {
             return NextResponse.json({ status: 'connected', message: "Instância já conectada!" });
        }

        return NextResponse.json({ 
            error: `Erro da Evolution API: ${connectRes.status} - ${errText}` 
        }, { status: 500 });
    }

    const connectData = await connectRes.json();

    if (connectData && connectData.base64) {
        return NextResponse.json({ 
            status: 'qrcode', 
            qrcode: connectData.base64, 
            code: connectData.code 
        });
    }

    return NextResponse.json({ error: "A API respondeu, mas não enviou o QR Code." }, { status: 500 });

  } catch (error: any) {
    console.error("Erro Geral:", error);
    return NextResponse.json({ error: `Erro Interno: ${error.message}` }, { status: 500 });
  }
}