import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EVO_URL = process.env.EVOLUTION_API_URL!;
// Garante que não tenha barra no final
const BASE_URL = EVO_URL?.trim().replace(/\/$/, "");
const EVO_KEY = process.env.EVOLUTION_API_KEY?.trim() || "";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    // Debug da Chave (Mostra os 3 primeiros digitos para conferência no log)
    const keyHint = EVO_KEY ? `${EVO_KEY.substring(0, 3)}...` : "VAZIA";
    console.log(`>>> [AUTH DEBUG] Vercel Key começa com: ${keyHint}`);

    if (!BASE_URL || !EVO_KEY) {
        return NextResponse.json({ error: "Configuração da API incompleta na Vercel." }, { status: 500 });
    }

    if (!instanceName) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    console.log(`>>> [CONEXÃO] Processando: ${instanceName}`);

    // 1. TENTATIVA DE CRIAÇÃO
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
                "apikey": EVO_KEY // A Evolution v2 usa 'apikey' no header
            },
            body: JSON.stringify(createPayload)
        });
        
        if (createRes.status === 401 || createRes.status === 403) {
            console.error(`>>> [AUTH FAIL] A VPS recusou a chave: ${keyHint}`);
            return NextResponse.json({ 
                error: `Erro de Autenticação. A Vercel enviou a chave iniciada em '${keyHint}', mas a VPS recusou. Tente rodar 'docker compose down -v' na VPS.` 
            }, { status: 401 });
        }
        
        if (createRes.ok) {
            console.log(">>> [CREATED] Nova instância iniciada.");
            await delay(2000); 
        }
    } catch (e) {
        console.error(">>> [NETWORK ERROR]", e);
        return NextResponse.json({ error: "Erro de conexão com a VPS (Network Error)" }, { status: 502 });
    }

    // 2. BUSCA DO QR CODE
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
                    console.log(">>> [WAIT] VPS Booting...");
                } else {
                    const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;
                    if (qr && typeof qr === 'string' && qr.length > 50) {
                        return NextResponse.json({ status: "qrcode", qrcode: qr });
                    }
                }
            } else if (connectRes.status === 401) {
                 return NextResponse.json({ error: "Senha rejeitada na busca do QR." }, { status: 401 });
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