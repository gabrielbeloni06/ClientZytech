import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EVO_URL = process.env.EVOLUTION_API_URL!;
// Remove barra final e espaços vazios
const BASE_URL = EVO_URL?.trim().replace(/\/$/, ''); 
const EVO_KEY = process.env.EVOLUTION_API_KEY!;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    console.log(`>>> [CONEXÃO] Iniciando para: ${instanceName}`);

    // --- PASSO 1: TENTA CRIAR A INSTÂNCIA ---
    const createUrl = `${BASE_URL}/instance/create`;
    const createPayload = {
      instanceName: instanceName,
      token: crypto.randomUUID(),
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      reject_call: true,
      msgBufferLimit: 50
    };

    const createRes = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": EVO_KEY },
        body: JSON.stringify(createPayload)
    });

    if (createRes.ok) {
        console.log(">>> [CREATED] Instância criada com sucesso. Aguardando boot...");
        await delay(3000); // Espera o Chrome iniciar
    } else {
        // Se der erro, lemos o erro para saber se é porque já existe ou se é erro de autenticação
        const errorData = await createRes.json().catch(() => ({}));
        
        // Ignora erro 403 (Instance already exists), qualquer outro é erro real
        if (createRes.status === 403 || (errorData?.message && errorData.message.includes("already exists"))) {
            console.log(">>> [INFO] Instância já existe. Tentando conectar...");
        } else {
            console.error(">>> [CREATE ERROR]", createRes.status, errorData);
            // Se for erro de API KEY, já paramos aqui
            if (createRes.status === 401) {
                return NextResponse.json({ error: "Erro de Autenticação na Evolution API (Verifique sua API Key)" }, { status: 401 });
            }
        }
    }

    // --- PASSO 2: BUSCA O QR CODE (Loop Aumentado) ---
    // Aumentei para 5 tentativas de 2s (10s total) para dar tempo do Puppeteer subir
    for (let i = 0; i < 5; i++) {
        try {
            // endpoint correto para pegar base64
            const connectRes = await fetch(`${BASE_URL}/instance/connect/${instanceName}`, {
                headers: { 'apikey': EVO_KEY }
            });

            if (connectRes.ok) {
                const data = await connectRes.json();
                
                // Caso 1: Já está conectado
                if (data?.instance?.state === 'open') {
                    return NextResponse.json({ status: "connected", message: "Instância já conectada!" });
                }

                // Caso 2: Pegar QR Code (Evolution v1 e v2 variam onde o QR fica)
                const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;
                
                if (qr && typeof qr === 'string' && qr.length > 50) {
                    console.log(">>> [SUCESSO] QR Code encontrado.");
                    return NextResponse.json({ status: "qrcode", qrcode: qr });
                }

                // Caso 3: Instância existe, mas Chrome está carregando
                console.log(`>>> [WAIT] Tentativa ${i + 1}/5 - Aguardando QR Code...`);
            } else {
                // Logar se a API retornou 404 ou 500
                const errText = await connectRes.text();
                console.log(`>>> [API ERROR] ${connectRes.status}: ${errText}`);
            }
        } catch (e) {
            console.log(">>> [FETCH ERROR]", e);
        }
        await delay(2000); // 2 segundos entre tentativas
    }

    // Se saiu do loop, ainda está carregando ou deu erro na VPS.
    // Retornamos 'loading' para o frontend tentar novamente.
    return NextResponse.json({ 
        status: "loading", 
        message: "Inicializando o Chrome na VPS... Aguarde." 
    });

  } catch (err: any) {
    console.error(">>> [FATAL SERVER ERROR]", err);
    return NextResponse.json({ error: err.message || "Erro interno no servidor" }, { status: 500 });
  }
}