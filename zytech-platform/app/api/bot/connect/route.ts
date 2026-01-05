import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// HARDCODED PARA ELIMINAR ERRO DE ENV
const BASE_URL = "http://46.224.182.243:8080"; 
const EVO_KEY = "clientzy_master_key_2025";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();
    
    // Gera um nome limpo e um ID único para o log
    const cleanName = instanceName?.trim() || "sem_nome";
    const reqId = Date.now().toString().slice(-4);

    console.log(`[${reqId}] >>> INICIANDO DEBUG PARA: ${cleanName}`);

    // Headers sem cache
    const headers = { 
        "Content-Type": "application/json", 
        "apikey": EVO_KEY 
    };
    
    // URL com timestamp para evitar cache do Next.js
    const timeParam = `?t=${Date.now()}`;

    // 1. CRIAÇÃO ---------------------------------------------------
    try {
        console.log(`[${reqId}] >>> TENTANDO CRIAR (POST /instance/create)`);
        
        const createRes = await fetch(`${BASE_URL}/instance/create${timeParam}`, {
            method: "POST",
            headers,
            cache: 'no-store',
            body: JSON.stringify({
                instanceName: cleanName,
                token: crypto.randomUUID(),
                qrcode: true,
                integration: "WHATSAPP-BAILEYS",
                reject_call: true
            })
        });

        const createText = await createRes.text();
        console.log(`[${reqId}] >>> RESPOSTA CREATE (${createRes.status}): ${createText.substring(0, 200)}...`);
        
        // Se criou (201) ou já existe (403), seguimos.
        if (createRes.ok) {
            console.log(`[${reqId}] >>> SUCESSO. Aguardando 5s para o Chrome subir...`);
            await delay(5000);
        } else if (createRes.status === 403) {
            console.log(`[${reqId}] >>> JÁ EXISTE. Buscando QR Code direto...`);
        } else {
             // Se deu outro erro (ex: 500, 400), paramos.
             return NextResponse.json({ error: `Erro VPS: ${createText}` }, { status: 500 });
        }

    } catch (e: any) {
        console.error(`[${reqId}] >>> ERRO FATAL NO FETCH CREATE:`, e.message);
        return NextResponse.json({ error: "Falha de conexão Vercel -> VPS" }, { status: 500 });
    }

    // 2. BUSCA DO QR CODE (Loop de Debug) -------------------------
    for (let i = 0; i < 5; i++) {
        try {
            console.log(`[${reqId}] >>> BUSCA QR TENTATIVA ${i+1}/5`);
            
            // Fetch do connect
            const connectRes = await fetch(`${BASE_URL}/instance/connect/${cleanName}${timeParam}`, {
                headers,
                cache: 'no-store'
            });

            if (!connectRes.ok) {
                console.log(`[${reqId}] >>> ERRO HTTP CONNECT: ${connectRes.status}`);
            } else {
                const data = await connectRes.json();
                
                // VAMOS LOGAR O JSON INTEIRO PARA VER ONDE ESTÁ O QR CODE
                // Limitamos a 200 chars para não estourar o log se vier base64 gigante
                const jsonString = JSON.stringify(data);
                console.log(`[${reqId}] >>> JSON RECEBIDO: ${jsonString.substring(0, 300)}...`);

                // Checagens
                if (data?.instance?.state === 'open') {
                     return NextResponse.json({ status: "connected", message: "Conectado!" });
                }

                // Tenta achar o QR Code em todos os lugares possíveis
                const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;

                if (qr && typeof qr === 'string' && qr.length > 50) {
                    console.log(`[${reqId}] >>> QR CODE ENCONTRADO! ENVIANDO...`);
                    return NextResponse.json({ status: "qrcode", qrcode: qr });
                }
            }

        } catch (e) {
            console.log(`[${reqId}] >>> ERRO NO LOOP:`, e);
        }
        await delay(2000);
    }

    console.log(`[${reqId}] >>> TIMEOUT. NENHUM QR CODE ENCONTRADO APÓS 5 TENTATIVAS.`);
    return NextResponse.json({ 
        status: "loading", 
        message: "Aguardando VPS gerar imagem..." 
    });

  } catch (err: any) {
    console.error(">>> [FATAL]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}