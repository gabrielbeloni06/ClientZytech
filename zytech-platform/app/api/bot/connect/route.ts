import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Forçamos o uso do IP que sabemos que funciona
const BASE_URL = process.env.EVOLUTION_API_URL?.replace(/\/$/, '') || "http://46.224.182.243:8080";
const EVO_KEY = process.env.EVOLUTION_API_KEY!;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    // Limpa o nome da instância (remove espaços e caracteres especiais que a Evolution odeia)
    const cleanName = instanceName.trim().replace(/[^a-zA-Z0-9_-]/g, "");

    console.log(`>>> [CONNECT] Iniciando para: ${cleanName} em ${BASE_URL}`);

    // headers padrão
    const headers = {
      "Content-Type": "application/json",
      "apikey": EVO_KEY
    };

    // 1. TENTATIVA DE CRIAÇÃO
    try {
      const createRes = await fetch(`${BASE_URL}/instance/create`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          instanceName: cleanName,
          token: crypto.randomUUID(),
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          reject_call: true
        })
      });

      if (createRes.status === 401 || createRes.status === 403) {
         // Se cair aqui, a API KEY da Vercel está diferente da VPS
         const errText = await createRes.text();
         // Se for 403 E a mensagem for "already exists", tudo bem. Se não, é erro de chave.
         if (!errText.includes("already exists")) {
            console.error(">>> [ERRO DE AUTH] Verifique sua API KEY na Vercel!");
            return NextResponse.json({ error: "Erro de Autenticação (API Key inválida)" }, { status: 401 });
         }
      }

      if (createRes.ok) {
        console.log(">>> [CREATED] Instância criada. Aguardando boot...");
        await delay(2000);
      }
    } catch (e) {
      console.log(">>> [CREATE INFO] Provavelmente já existe ou erro de rede:", e);
    }

    // 2. BUSCA DO QR CODE (Tenta por 6 segundos)
    for (let i = 0; i < 4; i++) {
      try {
        const connectRes = await fetch(`${BASE_URL}/instance/connect/${cleanName}`, {
          headers: headers
        });

        if (connectRes.ok) {
          const data = await connectRes.json();
          
          // Caso: Conectado
          if (data?.instance?.state === 'open') {
            return NextResponse.json({ status: "connected", message: "Whatsapp já conectado!" });
          }

          // Caso: QR Code Disponível (Evolution 2.1.1 retorna base64 ou qrcode.base64)
          const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;
          
          if (qr && typeof qr === 'string' && qr.length > 100) {
            console.log(">>> [QRCODE] Encontrado!");
            return NextResponse.json({ status: "qrcode", qrcode: qr });
          }
        } else if (connectRes.status === 404) {
             console.log(">>> [404] Instância não encontrada (ainda criando?)");
        }
      } catch (e) {
        console.error(">>> [RETRY ERROR]", e);
      }
      await delay(1500);
    }

    // Se chegou aqui, retornamos loading para o frontend tentar de novo
    return NextResponse.json({ 
        status: "loading", 
        message: "Iniciando WhatsApp..." 
    });

  } catch (err: any) {
    console.error(">>> [FATAL]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}