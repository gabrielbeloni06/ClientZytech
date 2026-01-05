import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EVO_URL = process.env.EVOLUTION_API_URL || "";
const BASE_URL = EVO_URL.trim().replace(/\/$/, "");
const EVO_KEY = process.env.EVOLUTION_API_KEY?.trim() || "";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!BASE_URL || !EVO_KEY) {
        return NextResponse.json({ error: "Configuração da API incompleta." }, { status: 500 });
    }
    if (!instanceName) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    const cleanName = instanceName.trim();
    
    // Headers padrão
    const headers = {
        "Content-Type": "application/json",
        "apikey": EVO_KEY
    };

    console.log(`>>> [INIT] Processando: ${cleanName}`);

    // 1. VERIFICAÇÃO INTELIGENTE (Sem deletar à toa)
    // Tenta buscar informações da instância para decidir se cria ou recicla
    let needsCreation = false;

    try {
        const checkRes = await fetch(`${BASE_URL}/instance/connectionState/${cleanName}`, { headers });
        
        if (checkRes.ok) {
            const data = await checkRes.json();
            // Se já estiver conectado, retorna sucesso na hora
            if (data?.instance?.state === 'open') {
                return NextResponse.json({ status: "connected", message: "Whatsapp já conectado!" });
            }
            console.log(">>> [INFO] Instância existe mas está desconectada. Reaproveitando...");
        } else if (checkRes.status === 404) {
            console.log(">>> [INFO] Instância não encontrada. Criando nova...");
            needsCreation = true;
        }
    } catch (e) {
        // Se der erro de rede ao checar, tentamos criar por garantia
        needsCreation = true;
    }

    // 2. CRIAÇÃO (Apenas se necessário)
    if (needsCreation) {
        try {
            const createRes = await fetch(`${BASE_URL}/instance/create`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    instanceName: cleanName,
                    token: crypto.randomUUID(),
                    qrcode: true,
                    integration: "WHATSAPP-BAILEYS",
                    reject_call: true
                })
            });

            if (createRes.ok) {
                console.log(">>> [CREATED] Nova instância iniciada.");
                // Delay para o Chrome subir (obrigatório na criação)
                await delay(3000);
            } else {
                const errText = await createRes.text();
                if (!errText.includes("already exists")) {
                    console.error(`>>> [CREATE ERROR] ${errText}`);
                }
            }
        } catch (e) {
            console.error(">>> [CREATE FAIL]", e);
        }
    }

    // 3. BUSCA DO QR CODE (Polling Otimizado)
    // Tenta 5 vezes. Se a instância já existia, isso é rápido.
    for (let i = 0; i < 5; i++) {
        try {
            const connectRes = await fetch(`${BASE_URL}/instance/connect/${cleanName}`, { headers });

            if (connectRes.ok) {
                const data = await connectRes.json();
                
                // Checagem dupla de conexão
                if (data?.instance?.state === 'open') {
                    return NextResponse.json({ status: "connected", message: "Conectado!" });
                }

                // Pega o QR Code (suporte a v2 e v1)
                const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;
                
                if (qr && typeof qr === 'string' && qr.length > 50) {
                    console.log(">>> [QR FOUND] QR Code retornado com sucesso.");
                    return NextResponse.json({ status: "qrcode", qrcode: qr });
                }
            }
        } catch (e) {
            console.log(`>>> [POLLING ERROR] ${e}`);
        }
        
        // Se não achou ainda, espera um pouco.
        // Se foi criada agora, o Chrome demora. Se já existia, é rápido.
        await delay(2000);
    }

    // Se saiu do loop, o Chrome ainda está subindo.
    // Retornamos 'loading' pro frontend tentar de novo sem erro.
    return NextResponse.json({ 
        status: "loading", 
        message: "Inicializando WhatsApp..." 
    });

  } catch (err: any) {
    console.error(">>> [FATAL]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}