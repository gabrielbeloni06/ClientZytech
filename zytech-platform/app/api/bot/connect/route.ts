import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Limpeza de variáveis (trim) para evitar erros de espaço em branco
const EVO_URL_RAW = process.env.EVOLUTION_API_URL || "";
// Garante que não tenha barra no final
const BASE_URL = EVO_URL_RAW.trim().replace(/\/$/, "");
const EVO_KEY = process.env.EVOLUTION_API_KEY?.trim() || "";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!BASE_URL || !EVO_KEY) {
        return NextResponse.json({ error: "Configuração da API ausente na Vercel" }, { status: 500 });
    }

    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    console.log(`>>> [CONEXÃO] Iniciando para: ${instanceName}`);
    console.log(`>>> [DEBUG] URL: ${BASE_URL} | Key: ${EVO_KEY.substring(0, 3)}***`);

    // 1. TENTATIVA DE CRIAÇÃO (Idempotente)
    // Não deletamos antes para ganhar tempo. Se já existe, a API avisa.
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
        
        // Se der 401 aqui, a senha está errada
        if (createRes.status === 401 || createRes.status === 403) {
            console.error(">>> [AUTH ERROR] VPS rejeitou a senha.");
            return NextResponse.json({ error: "Senha da API incorreta. Verifique a Vercel." }, { status: 401 });
        }

        if (createRes.ok) {
            console.log(">>> [CREATED] Nova instância iniciada.");
            await delay(2000); // Tempo para o banco alocar
        }
    } catch (e) {
        console.error(">>> [CREATE FAIL]", e);
        return NextResponse.json({ error: "Falha ao conectar na VPS (Network Error)" }, { status: 502 });
    }

    // 2. BUSCA DO QR CODE (Polling Rápido)
    let qrCode = null;
    
    // Tenta 3 vezes
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

                // Se vier count:0, o Chrome está subindo. Aguarda.
                if (data.count === 0) {
                    console.log(">>> [WAIT] VPS Booting...");
                } 
                else {
                    // Tenta encontrar o QR Code
                    const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;
                    
                    if (qr && typeof qr === 'string' && qr.length > 50) {
                        qrCode = qr;
                        break; // Achou!
                    }
                }
            }
        } catch (e) {
            console.log(">>> [RETRY QR]", e);
        }
        await delay(1500);
    }

    if (qrCode) {
        return NextResponse.json({ status: "qrcode", qrcode: qrCode });
    }

    // Se chegou aqui, é porque ainda está ligando (count:0)
    return NextResponse.json({ 
        status: "loading", 
        message: "Inicializando WhatsApp na VPS..." 
    });

  } catch (err: any) {
    console.error(">>> [FATAL]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}