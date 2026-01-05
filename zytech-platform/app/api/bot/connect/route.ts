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

    console.log(`>>> [INIT] Conectando a ${BASE_URL} para instância: ${instanceName}`);

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

    // 1. TENTATIVA DE CRIAÇÃO (CREATE)
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

        // Tratamento Inteligente de Erros
        if (createRes.status === 403 && (resText.includes("already in use") || resText.includes("already exists"))) {
            // SUCESSO DISFARÇADO: Se já existe, apenas logamos e seguimos para buscar o QR Code
            console.log(`>>> [CREATE SKIP] Instância já existe. Prosseguindo para conexão.`);
        } 
        else if (createRes.status === 401) {
            // ERRO REAL DE SENHA
            console.error(`>>> [401 AUTH] Senha rejeitada.`);
            return NextResponse.json({ error: "Erro de Autenticação: Verifique a API KEY na Vercel." }, { status: 401 });
        }
        else if (!createRes.ok) {
            // OUTROS ERROS
            console.warn(`>>> [CREATE WARN] HTTP ${createRes.status}: ${resText}`);
        } else {
            // SUCESSO REAL (201)
            console.log(`>>> [CREATE SUCCESS] Instância criada.`);
            // Se criou agora, espera o boot
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
                headers
            });

            if (connectRes.ok) {
                const data = await connectRes.json();
                
                // Se já conectou
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
                console.log(`>>> [CONNECT FAIL] HTTP ${connectRes.status}`);
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