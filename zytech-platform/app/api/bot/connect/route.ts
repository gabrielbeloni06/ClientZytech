import { NextRequest, NextResponse } from "next/server";

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    console.log(`>>> [CONEXÃO FORÇADA] Iniciando reset para: ${instanceName}`);

    try {
        const statusRes = await fetch(`${EVO_URL}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': EVO_KEY! }
        });

        if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData?.instance?.state === 'open') {
                 return NextResponse.json({ status: 'connected', message: "Já está conectado e funcionando!" });
            }
            
            console.log(`>>> [DELETE] Apagando instância travada...`);
            await fetch(`${EVO_URL}/instance/delete/${instanceName}`, {
                method: 'DELETE',
                headers: { 'apikey': EVO_KEY! }
            });
            
            await delay(4000); 
        }
    } catch (e) {
        console.log(">>> [CLEANUP] Instância não existia ou erro ao checar (o que é bom).");
    }

    console.log(`>>> [CREATE] Criando nova instância...`);
    const createUrl = `${EVO_URL}/instance/create`;
    const createPayload = {
      instanceName: instanceName,
      token: crypto.randomUUID(),
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      reject_call: true, 
      msgBufferLimit: 50
    };

    const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY! },
        body: JSON.stringify(createPayload)
    });

    if (!createRes.ok) {
        const errText = await createRes.text();
        console.log(`>>> [CREATE LOG] ${errText}`);
    }

    let qrCode = null;
    let pairingCode = null;
    
    for (let i = 0; i < 6; i++) {
        console.log(`>>> [CONNECT] Tentativa interna ${i+1}/6...`);
        
        try {
            const connectRes = await fetch(`${EVO_URL}/instance/connect/${instanceName}`, {
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
            console.error(`>>> [CONNECT FAIL] Erro momentâneo na tentativa ${i+1}`);
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

    return NextResponse.json({ error: "A VPS não conseguiu gerar o QR Code a tempo. Tente novamente em 1 minuto." }, { status: 504 });

  } catch (error: any) {
    console.error("Erro Geral Route:", error);
    return NextResponse.json({ error: `Erro Interno: ${error.message}` }, { status: 500 });
  }
}