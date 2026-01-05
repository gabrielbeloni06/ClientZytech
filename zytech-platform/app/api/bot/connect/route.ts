import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Limpeza agressiva das variáveis
const EVO_URL = process.env.EVOLUTION_API_URL || "";
const BASE_URL = EVO_URL.trim().replace(/\/$/, "");
const EVO_KEY = process.env.EVOLUTION_API_KEY?.trim() || "";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    console.log(`>>> [INIT] Conectando a ${BASE_URL}`);

    if (!BASE_URL || !EVO_KEY) {
        return NextResponse.json({ error: "Configuração da API incompleta." }, { status: 500 });
    }

    if (!instanceName) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    const headers = {
        "Content-Type": "application/json",
        "apikey": EVO_KEY,
        "Authorization": `Bearer ${EVO_KEY}`,
        "User-Agent": "ClientzyBot/1.0"
    };

    // 1. CHECAGEM E LIMPEZA (FORCE RESET)
    // Se a instância já existe mas não está conectada, matamos ela para não travar o boot.
    try {
        const stateRes = await fetch(`${BASE_URL}/instance/connectionState/${instanceName}`, {
             headers
        });
        
        if (stateRes.ok) {
            const data = await stateRes.json();
            const state = data?.instance?.state;
            
            if (state === 'open') {
                 return NextResponse.json({ status: "connected", message: "Já conectado!" });
            }
            
            console.log(`>>> [RESET] Apagando instância travada (${state})...`);
            await fetch(`${BASE_URL}/instance/delete/${instanceName}`, {
                method: "DELETE",
                headers
            });
            // Delay obrigatório para o Postgres da VPS limpar os dados
            await delay(3000); 
        }
    } catch (e) {
        console.log(">>> [INFO] Instância limpa (não existia).");
    }

    // 2. CRIAÇÃO LIMPA (CREATE)
    const createUrl = `${BASE_URL}/instance/create`;
    const createPayload = {
      instanceName: instanceName,
      token: crypto.randomUUID(),
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      reject_call: true
    };

    console.log(`>>> [CREATE] Criando nova instância...`);

    try {
        const createRes = await fetch(createUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(createPayload)
        });
        
        if (!createRes.ok) {
            const txt = await createRes.text();
            // Ignora erro se for "já existe" (caso o delete tenha falhado por timing)
            if (!txt.includes("already")) console.log(`>>> [CREATE INFO] ${txt}`);
        }
        
        // Aguarda o Boot do Chrome na VPS (Essencial para não receber count:0)
        console.log(">>> [WAIT] Aguardando motor (5s)...");
        await delay(5000);

    } catch (e: any) {
        return NextResponse.json({ error: `Erro de Rede ao Criar: ${e.message}` }, { status: 502 });
    }

    // 3. BUSCA DO QR CODE (CONNECT)
    // Tenta por 15 segundos (5 tentativas de 3s)
    for (let i = 0; i < 5; i++) {
        try {
            console.log(`>>> [POLLING ${i+1}/5] Buscando QR...`);
            const connectRes = await fetch(`${BASE_URL}/instance/connect/${instanceName}`, {
                method: 'GET',
                headers
            });

            if (connectRes.ok) {
                const data = await connectRes.json();
                
                if (data?.instance?.state === 'open') {
                    return NextResponse.json({ status: "connected", message: "Conectado!" });
                }

                if (data.count === 0) {
                    console.log(">>> [WAIT] count:0 (Ainda carregando)...");
                } 
                else {
                    const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;
                    
                    if (qr && typeof qr === 'string' && qr.length > 50) {
                        return NextResponse.json({ status: "qrcode", qrcode: qr });
                    }
                }
            }
        } catch (e) {
            console.log(">>> [RETRY QR]", e);
        }
        await delay(3000);
    }

    // Se saiu do loop, ainda está carregando.
    // Retorna LOADING para o frontend tentar de novo em vez de dar erro.
    return NextResponse.json({ 
        status: "loading", 
        message: "Sincronizando com WhatsApp..." 
    });

  } catch (err: any) {
    console.error(">>> [FATAL]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}