import { NextRequest, NextResponse } from "next/server";

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName, phoneNumber } = await req.json(); 

    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    console.log(`>>> [CONEXÃO] Iniciando para: ${instanceName} ${phoneNumber ? '(Modo Pairing Code)' : '(Modo QR)'}`);

    try {
        const statusRes = await fetch(`${EVO_URL}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': EVO_KEY! }
        });
        if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData?.instance?.state === 'open') {
                 return NextResponse.json({ status: 'connected', message: "Já conectado!" });
            }
            await fetch(`${EVO_URL}/instance/delete/${instanceName}`, {
                method: 'DELETE',
                headers: { 'apikey': EVO_KEY! }
            });
            await delay(2000);
        }
    } catch (e) {}

    const createUrl = `${EVO_URL}/instance/create`;
    const createPayload = {
      instanceName: instanceName,
      token: crypto.randomUUID(),
      qrcode: !phoneNumber, 
      integration: "WHATSAPP-BAILEYS",
      reject_call: true,
      msgBufferLimit: 50
    };

    await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY! },
        body: JSON.stringify(createPayload)
    });

    const connectUrl = `${EVO_URL}/instance/connect/${instanceName}`;
    
    if (phoneNumber) {
        console.log(`>>> [PAIRING] Solicitando código para ${phoneNumber}...`);
        
        await delay(3000); 

        const pairRes = await fetch(connectUrl, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY! },
            body: JSON.stringify({ number: phoneNumber })
        });

        if (pairRes.ok) {
            const pairData = await pairRes.json();
            if (pairData.code || pairData.pairingCode) {
                return NextResponse.json({ 
                    status: 'pairing', 
                    code: pairData.code || pairData.pairingCode 
                });
            }
        }
        return NextResponse.json({ error: "Falha ao gerar código de pareamento. Tente novamente." }, { status: 500 });
    }

    return NextResponse.json({ error: "Por favor, forneça o número do celular para gerar o código." }, { status: 400 });

  } catch (error: any) {
    console.error("Erro Geral:", error);
    return NextResponse.json({ error: `Erro Interno: ${error.message}` }, { status: 500 });
  }
}