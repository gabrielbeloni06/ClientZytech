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

    // Log de diagnóstico
    console.log(`>>> [INIT] Conectando a ${BASE_URL}`);
    console.log(`>>> [AUTH] Chave (inicio): '${EVO_KEY.substring(0, 3)}...' (Tamanho: ${EVO_KEY.length})`);

    if (!BASE_URL || !EVO_KEY) {
        return NextResponse.json({ error: "Configuração da API incompleta." }, { status: 500 });
    }

    if (!instanceName) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    // Cabeçalhos que imitam um cliente padrão + segurança dupla de chave
    const headers = {
        "Content-Type": "application/json",
        "apikey": EVO_KEY,                  // Padrão Evolution
        "Authorization": `Bearer ${EVO_KEY}`, // Fallback comum
        "User-Agent": "ClientzyBot/1.0"     // Evita bloqueio de 'bot' sem user-agent
    };

    // 1. TENTATIVA DE CRIAÇÃO (CREATE)
    // Usamos a mesma estrutura que funcionou no seu CURL
    const createUrl = `${BASE_URL}/instance/create`;
    const createPayload = {
      instanceName: instanceName,
      token: crypto.randomUUID(),
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      reject_call: true
    };

    console.log(`>>> [CREATE] POST ${createUrl}`);

    try {
        const createRes = await fetch(createUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(createPayload)
        });
        
        const resText = await createRes.text();

        // Tratamento específico de erro de autenticação
        if (createRes.status === 401 || createRes.status === 403) {
            console.error(`>>> [401 BLOCKED] Resposta da VPS: ${resText}`);
            return NextResponse.json({ 
                error: `A VPS recusou a conexão (401). Resposta: ${resText}. Confirme se rodou 'docker compose down -v' na VPS.` 
            }, { status: 401 });
        }
        
        // Se criou ou já existe, seguimos
        console.log(`>>> [CREATE RESULT] ${createRes.status}: ${resText.substring(0, 100)}`);
        
        // Se foi criado agora (201), esperamos o boot
        if (createRes.status === 201) {
             await delay(3000);
        }

    } catch (e: any) {
        console.error(">>> [NET ERROR]", e);
        return NextResponse.json({ error: `Erro de Rede: ${e.message}` }, { status: 502 });
    }

    // 2. BUSCA DO QR CODE (CONNECT)
    // Tenta 3 vezes
    for (let i = 0; i < 3; i++) {
        try {
            const connectRes = await fetch(`${BASE_URL}/instance/connect/${instanceName}`, {
                method: 'GET',
                headers // Usa os mesmos headers reforçados
            });

            if (connectRes.ok) {
                const data = await connectRes.json();
                
                if (data?.instance?.state === 'open') {
                    return NextResponse.json({ status: "connected", message: "Conectado!" });
                }

                // Se count:0, ainda está no boot
                if (data.count === 0) {
                    console.log(">>> [WAIT] count:0 (Booting)...");
                } 
                else {
                    const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;
                    
                    if (qr && typeof qr === 'string' && qr.length > 50) {
                        return NextResponse.json({ status: "qrcode", qrcode: qr });
                    }
                }
            } else {
                console.log(`>>> [CONNECT FAIL] ${connectRes.status}`);
            }
        } catch (e) {
            console.log(">>> [RETRY QR]", e);
        }
        await delay(1500);
    }

    return NextResponse.json({ 
        status: "loading", 
        message: "Inicializando WhatsApp na VPS..." 
    });

  } catch (err: any) {
    console.error(">>> [FATAL]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}