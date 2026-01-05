import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60; // 60s timeout

const EVO_URL = process.env.EVOLUTION_API_URL!;
// Remove barra final se houver
const BASE_URL = EVO_URL?.endsWith('/') ? EVO_URL.slice(0, -1) : EVO_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY!;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    console.log(`>>> [CONEXÃO RÁPIDA] Processando: ${instanceName}`);

    // 1. CHECAGEM DE ESTADO (Para ser instantâneo se já existir)
    try {
        const stateRes = await fetch(`${BASE_URL}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': EVO_KEY }
        });

        if (stateRes.ok) {
            const stateData = await stateRes.json();
            const state = stateData?.instance?.state;

            if (state === 'open') {
                return NextResponse.json({ status: "connected", message: "Já conectado!" });
            }
            
            console.log(`>>> [STATUS] Instância existe (Estado: ${state}). Pulando criação...`);
            // Se existe e não está open, pulamos direto para o passo de pegar o QR Code
        } else {
            // Se deu 404 (Não existe), então criamos
            console.log(`>>> [STATUS] Instância não encontrada. Criando...`);
            throw new Error("Not Found");
        }
    } catch (e) {
        // 2. CRIAÇÃO (Só acontece se não existir)
        const createUrl = `${BASE_URL}/instance/create`;
        const createPayload = {
          instanceName: instanceName,
          token: crypto.randomUUID(),
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          reject_call: true,
          msgBufferLimit: 50
        };

        const createRes = await fetch(createUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": EVO_KEY },
            body: JSON.stringify(createPayload)
        });

        if (!createRes.ok) {
            const errTxt = await createRes.text();
            console.log(`>>> [CREATE ERROR] ${errTxt}`);
        } else {
            // Se criou agora, precisamos esperar o Chrome subir
            console.log(">>> [WARMUP] Instância criada, aguardando boot (5s)...");
            await delay(5000);
        }
    }

    // 3. BUSCA O QR CODE (Tenta algumas vezes rapidinho)
    // Se já existia, isso deve ser instantâneo (resposta < 1s)
    let qrCode = null;
    
    for (let i = 0; i < 5; i++) {
        try {
            const connectRes = await fetch(`${BASE_URL}/instance/connect/${instanceName}`, {
                method: 'GET',
                headers: { 'apikey': EVO_KEY }
            });

            if (connectRes.ok) {
                const data = await connectRes.json();
                
                // Se vier count:0, ainda está carregando, tenta de novo
                if (data.count === 0) {
                    console.log(">>> [WAIT] count:0...");
                } else {
                    const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;
                    if (qr && typeof qr === 'string' && qr.length > 50) {
                        qrCode = qr;
                        break;
                    }
                }
            }
        } catch (err) {
            console.log(">>> [RETRY QR]", err);
        }
        await delay(1500);
    }

    if (qrCode) {
        return NextResponse.json({ status: "qrcode", qrcode: qrCode });
    }

    // Se falhar, manda o erro, mas não crasha
    return NextResponse.json({ error: "Ainda carregando... Tente clicar novamente em 5 segundos." }, { status: 408 });

  } catch (err: any) {
    console.error(">>> [FATAL ERROR]", err);
    return NextResponse.json({ error: err.message || "Erro interno" }, { status: 500 });
  }
}