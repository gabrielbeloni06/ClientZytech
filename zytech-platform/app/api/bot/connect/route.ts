import { NextRequest, NextResponse } from "next/server";

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName, phoneNumber } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    console.log(`>>> [CONEXÃO] Iniciando: ${instanceName} ${phoneNumber ? `(Pairing: ${phoneNumber})` : '(QR)'}`);

    try {
        const statusRes = await fetch(`${EVO_URL}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': EVO_KEY! }
        });
        
        if (statusRes.ok) {
            const statusData = await statusRes.json();
            const state = statusData?.instance?.state;
            
            if (state === 'open') {
                 return NextResponse.json({ status: 'connected', message: "Já conectado!" });
            }
            
            console.log(`>>> [RESET] Apagando instância antiga (${state})...`);
            await fetch(`${EVO_URL}/instance/delete/${instanceName}`, {
                method: 'DELETE',
                headers: { 'apikey': EVO_KEY! }
            });
            await delay(3000); 
        }
    } catch (e) {
        console.log(">>> [INFO] Instância limpa (não existia).");
    }

    const createUrl = `${EVO_URL}/instance/create`;
    const createPayload = {
      instanceName: instanceName,
      token: crypto.randomUUID(),
      qrcode: !phoneNumber, 
      integration: "WHATSAPP-BAILEYS",
      reject_call: true,
      msgBufferLimit: 50
    };

    console.log(`>>> [CREATE] Criando instância...`);
    const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY! },
        body: JSON.stringify(createPayload)
    });

    if (!createRes.ok) {
        const errTxt = await createRes.text();
        console.log(`>>> [CREATE INFO] ${errTxt}`);
    }

    if (phoneNumber) {
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        console.log(`>>> [PAIRING] Aguardando motor iniciar para pedir código para: ${cleanPhone}...`);
        
        await delay(5000); 

        const connectUrl = `${EVO_URL}/instance/connect/${instanceName}?number=${cleanPhone}`;
        
        console.log(`>>> [PAIRING REQUEST] ${connectUrl}`);
        
        const pairRes = await fetch(connectUrl, {
            method: 'GET',
            headers: { 'apikey': EVO_KEY! }
        });

        if (!pairRes.ok) {
            const errText = await pairRes.text();
            console.error(`>>> [PAIRING ERROR] ${pairRes.status}: ${errText}`);
            return NextResponse.json({ error: `Erro da Evolution: ${errText}` }, { status: 500 });
        }

        const pairData = await pairRes.json();
        console.log(">>> [PAIRING RESPONSE]", JSON.stringify(pairData));

        const code = pairData.code || pairData.pairingCode;

        if (code) {
            return NextResponse.json({ status: 'pairing', code: code });
        }
        
        const qrFallback = pairData.base64 || pairData.qrcode?.base64 || pairData.qrcode;
        if (qrFallback && typeof qrFallback === 'string' && qrFallback.length > 100) {
             return NextResponse.json({ 
                 status: 'qrcode', 
                 qrcode: qrFallback, 
                 message: "A API retornou QR Code em vez de código numérico." 
             });
        }
        
        return NextResponse.json({ 
            error: `API respondeu sem código. Resposta bruta: ${JSON.stringify(pairData)}` 
        }, { status: 500 });
    }

    await delay(2000);
    const connectUrl = `${EVO_URL}/instance/connect/${instanceName}`;
    const connectRes = await fetch(connectUrl, { headers: { 'apikey': EVO_KEY! } });
    const connectData = await connectRes.json();
    const qrCode = connectData.base64 || connectData.qrcode?.base64 || connectData.qrcode;

    if (qrCode) {
        return NextResponse.json({ status: 'qrcode', qrcode: qrCode });
    }

    return NextResponse.json({ error: "Não foi possível gerar QR ou Código." }, { status: 500 });

  } catch (error: any) {
    console.error("Erro Geral:", error);
    return NextResponse.json({ error: `Erro Interno: ${error.message}` }, { status: 500 });
  }
}