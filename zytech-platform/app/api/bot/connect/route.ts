import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Configurações Hardcoded para garantir (já que sabemos que funcionam)
const BASE_URL = "http://46.224.182.243:8080"; 
const EVO_KEY = "clientzy_master_key_2025";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    // Limpa o nome para evitar erros de URL
    const cleanName = instanceName.trim().replace(/\s/g, '');

    // Configuração CRUCIAL para não fazer cache e evitar loop infinito
    const noCacheConfig: RequestInit = {
        headers: { 
            "Content-Type": "application/json", 
            "apikey": EVO_KEY 
        },
        cache: 'no-store',
        next: { revalidate: 0 }
    };

    console.log(`>>> [INIT] Processando instância: ${cleanName}`);

    // =================================================================================
    // PASSO 1: CRIAÇÃO FORÇADA (Create First Strategy)
    // =================================================================================
    // Tentamos criar sempre. Se der erro de "já existe", apenas ignoramos.
    try {
        const createRes = await fetch(`${BASE_URL}/instance/create`, {
            ...noCacheConfig,
            method: "POST",
            body: JSON.stringify({
                instanceName: cleanName,
                token: crypto.randomUUID(),
                qrcode: true,
                integration: "WHATSAPP-BAILEYS",
                reject_call: true
            })
        });

        // Se criou agora (201) ou deu ok (200), esperamos o Chrome subir
        if (createRes.ok) {
            console.log(">>> [CRIADO] Instância iniciada. Aguardando motor (4s)...");
            await delay(4000); 
        } else {
            // Se der erro, lemos para ver se é "Already exists"
            const errorTxt = await createRes.text();
            if (!errorTxt.includes("already exists")) {
                console.log(`>>> [CREATE INFO] ${errorTxt}`);
            } else {
                console.log(">>> [INFO] Instância já existia. Buscando QR Code...");
            }
        }
    } catch (e) {
        console.error(">>> [CREATE FAIL] Erro de rede ao tentar criar:", e);
    }

    // =================================================================================
    // PASSO 2: BUSCA DO QR CODE (Polling)
    // =================================================================================
    // Tentamos 4 vezes (Total aprox. 8 a 10 segundos)
    for (let i = 0; i < 4; i++) {
        try {
            const connectRes = await fetch(`${BASE_URL}/instance/connect/${cleanName}`, noCacheConfig);

            if (connectRes.ok) {
                const data = await connectRes.json();
                
                // Caso 1: Já conectado
                if (data?.instance?.state === 'open') {
                    return NextResponse.json({ status: "connected", message: "Conectado!" });
                }

                // Caso 2: QR Code encontrado
                // A Evolution v2 pode retornar o base64 direto na raiz ou dentro de 'qrcode'
                const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;
                
                if (qr && typeof qr === 'string' && qr.length > 50) {
                    console.log(">>> [SUCESSO] QR Code enviado para o frontend.");
                    return NextResponse.json({ status: "qrcode", qrcode: qr });
                }
            }
        } catch (e) {
            console.log(`>>> [RETRY ${i+1}] Erro ao buscar QR:`, e);
        }
        
        // Espera 2s antes da próxima tentativa
        await delay(2000);
    }

    // Se saiu do loop sem QR Code, retornamos loading para o frontend tentar de novo
    // Isso evita erro na tela do usuário
    return NextResponse.json({ 
        status: "loading", 
        message: "Inicializando WhatsApp..." 
    });

  } catch (err: any) {
    console.error(">>> [FATAL]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}