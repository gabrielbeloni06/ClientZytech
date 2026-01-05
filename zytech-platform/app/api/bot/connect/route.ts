import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EVO_URL = process.env.EVOLUTION_API_URL!;
// Remove barra final se houver e espaços
const BASE_URL = EVO_URL?.trim().endsWith('/') ? EVO_URL.trim().slice(0, -1) : EVO_URL?.trim();
// Remove espaços extras que podem vir da Vercel
const EVO_KEY = process.env.EVOLUTION_API_KEY?.trim()!;

// Delay auxiliar
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    // 0. DIAGNÓSTICO DE AMBIENTE
    if (!BASE_URL || !EVO_KEY) {
        console.error(">>> [CONFIG ERROR] Variáveis de ambiente faltando.");
        return NextResponse.json({ error: "Configuração da API incompleta na Vercel." }, { status: 500 });
    }

    // Log de segurança para conferência (mostra apenas o início)
    console.log(`>>> [CONFIG] URL: ${BASE_URL} | Key: ${EVO_KEY.substring(0, 4)}***`);

    const { instanceName } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    console.log(`>>> [CONEXÃO] Processando: ${instanceName}`);

    // 1. TENTATIVA DE CRIAÇÃO (Idempotente)
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
            headers: { 
                "Content-Type": "application/json", 
                "apikey": EVO_KEY 
            },
            body: JSON.stringify(createPayload)
        });
        
        if (createRes.status === 401 || createRes.status === 403) {
            console.error(">>> [AUTH ERROR] A VPS recusou a senha (401/403).");
            return NextResponse.json({ error: "Erro de Autenticação: A senha da API na Vercel não bate com a VPS." }, { status: 401 });
        }
        
        if (createRes.ok) {
            console.log(">>> [CREATED] Nova instância iniciada.");
            await delay(2000); 
        } else {
             // Loga o erro, mas não para (pode ser "já existe")
             const txt = await createRes.text();
             if (!txt.includes("already")) console.log(`>>> [CREATE INFO] ${txt}`);
        }
    } catch (e) {
        console.error(">>> [CREATE FAIL] Erro de rede ou DNS:", e);
        return NextResponse.json({ error: "Não foi possível contactar a VPS." }, { status: 502 });
    }

    // 2. BUSCA DO QR CODE
    // Loop de tentativas
    for (let i = 0; i < 3; i++) {
        try {
            const connectRes = await fetch(`${BASE_URL}/instance/connect/${instanceName}`, {
                headers: { 'apikey': EVO_KEY }
            });

            if (connectRes.ok) {
                const data = await connectRes.json();
                
                if (data?.instance?.state === 'open') {
                    return NextResponse.json({ status: "connected", message: "Conectado!" });
                }

                if (data.count === 0) {
                    console.log(">>> [WAIT] VPS Processando (Chrome Boot)...");
                } 
                else {
                    const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;
                    
                    if (qr && typeof qr === 'string' && qr.length > 50) {
                        return NextResponse.json({ status: "qrcode", qrcode: qr });
                    }
                }
            } else if (connectRes.status === 401) {
                 return NextResponse.json({ error: "Senha da API Inválida (401)" }, { status: 401 });
            }
        } catch (e) {
            console.log(">>> [RETRY API]", e);
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