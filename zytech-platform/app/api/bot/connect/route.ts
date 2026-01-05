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
    
    // Configuração para NÃO FAZER CACHE (Isso resolve o loading infinito)
    const fetchOptions: RequestInit = {
        headers: {
            "Content-Type": "application/json",
            "apikey": EVO_KEY
        },
        cache: 'no-store', // <--- O SEGREDO ESTÁ AQUI
        next: { revalidate: 0 }
    };

    console.log(`>>> [INIT] Processando: ${cleanName}`);

    // 1. VERIFICAÇÃO INTELIGENTE
    let needsCreation = false;

    try {
        const checkRes = await fetch(`${BASE_URL}/instance/connectionState/${cleanName}`, fetchOptions);
        
        if (checkRes.ok) {
            const data = await checkRes.json();
            if (data?.instance?.state === 'open') {
                return NextResponse.json({ status: "connected", message: "Whatsapp já conectado!" });
            }
            console.log(">>> [INFO] Instância existe desconectada.");
        } else if (checkRes.status === 404) {
            console.log(">>> [INFO] Instância não existe. Criando...");
            needsCreation = true;
        }
    } catch (e) {
        needsCreation = true;
    }

    // 2. CRIAÇÃO (Se necessário)
    if (needsCreation) {
        try {
            const createRes = await fetch(`${BASE_URL}/instance/create`, {
                ...fetchOptions,
                method: "POST",
                body: JSON.stringify({
                    instanceName: cleanName,
                    token: crypto.randomUUID(),
                    qrcode: true,
                    integration: "WHATSAPP-BAILEYS",
                    reject_call: true
                })
            });

            if (createRes.ok) {
                console.log(">>> [CREATED] Criado com sucesso. Aguardando boot (3s)...");
                await delay(3000);
            }
        } catch (e) {
            console.error(">>> [CREATE FAIL]", e);
        }
    }

    // 3. BUSCA DO QR CODE (Polling Otimizado)
    // Loop de 5 tentativas
    for (let i = 0; i < 5; i++) {
        try {
            // Importante: Usamos o fetchOptions com 'no-store' aqui também
            const connectRes = await fetch(`${BASE_URL}/instance/connect/${cleanName}`, fetchOptions);

            if (connectRes.ok) {
                const data = await connectRes.json();
                
                if (data?.instance?.state === 'open') {
                    return NextResponse.json({ status: "connected", message: "Conectado!" });
                }

                const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;
                
                if (qr && typeof qr === 'string' && qr.length > 50) {
                    console.log(">>> [QR FOUND] Enviando para o frontend.");
                    return NextResponse.json({ status: "qrcode", qrcode: qr });
                } else {
                    console.log(`>>> [WAITING] Tentativa ${i+1}/5 - VPS processando...`);
                }
            }
        } catch (e) {
            console.log(`>>> [RETRY ERROR] ${e}`);
        }
        
        await delay(2000);
    }

    return NextResponse.json({ 
        status: "loading", 
        message: "Inicializando WhatsApp..." 
    });

  } catch (err: any) {
    console.error(">>> [FATAL]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}