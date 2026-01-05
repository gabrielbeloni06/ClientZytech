import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EVO_URL = process.env.EVOLUTION_API_URL!;
// Remove barra final se houver
const BASE_URL = EVO_URL?.endsWith('/') ? EVO_URL.slice(0, -1) : EVO_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY!;

// Delay auxiliar
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    console.log(`>>> [CONEXÃO] Processando: ${instanceName}`);

    // 1. TENTATIVA DE CRIAÇÃO (Idempotente)
    // Tentamos criar. Se já existir, a API vai dar erro 403, nós ignoramos e seguimos.
    // NÃO DELETAMOS MAIS A INSTÂNCIA AQUI PARA NÃO REINICIAR O BOOT DO CHROME.
    const createUrl = `${BASE_URL}/instance/create`;
    const createPayload = {
      instanceName: instanceName,
      token: crypto.randomUUID(),
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      reject_call: true,
      msgBufferLimit: 50
    };

    try {
        const createRes = await fetch(createUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": EVO_KEY },
            body: JSON.stringify(createPayload)
        });
        
        // Se criou com sucesso (201), damos um tempinho pro banco alocar
        if (createRes.ok) {
            console.log(">>> [CREATED] Nova instância iniciada.");
            await delay(2000); 
        }
    } catch (e) {
        console.error(">>> [CREATE SKIP] Provavelmente já existe.");
    }

    // 2. BUSCA DO QR CODE
    // Tenta pegar o QR Code. Se a instância estiver subindo, devolvemos 'loading' pro frontend esperar.
    
    // Tenta algumas vezes internamente para agilizar
    for (let i = 0; i < 3; i++) {
        try {
            const connectRes = await fetch(`${BASE_URL}/instance/connect/${instanceName}`, {
                headers: { 'apikey': EVO_KEY }
            });

            if (connectRes.ok) {
                const data = await connectRes.json();
                
                // Se já conectou
                if (data?.instance?.state === 'open') {
                    return NextResponse.json({ status: "connected", message: "Conectado!" });
                }

                // Se vier count:0, o Chrome está subindo.
                // NÃO RETORNAMOS ERRO. Apenas aguardamos.
                if (data.count === 0) {
                    console.log(">>> [WAIT] VPS Processando (Chrome Boot)...");
                } 
                else {
                    // Tenta encontrar o QR Code real
                    const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;
                    
                    if (qr && typeof qr === 'string' && qr.length > 50) {
                        return NextResponse.json({ status: "qrcode", qrcode: qr });
                    }
                }
            }
        } catch (e) {
            console.log(">>> [RETRY API]", e);
        }
        await delay(1500);
    }

    // Se chegou aqui, é porque ainda está ligando (count:0) ou deu erro temporário.
    // Retornamos status 'loading' para o frontend tentar de novo em 3s SEM RESETAR nada.
    return NextResponse.json({ 
        status: "loading", 
        message: "Inicializando WhatsApp na VPS..." 
    });

  } catch (err: any) {
    console.error(">>> [FATAL]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}