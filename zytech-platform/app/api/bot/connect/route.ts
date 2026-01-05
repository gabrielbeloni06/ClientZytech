import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EVO_URL = process.env.EVOLUTION_API_URL!;
// Garante que não tenha barra no final para evitar erros de URL
const BASE_URL = EVO_URL?.endsWith('/') ? EVO_URL.slice(0, -1) : EVO_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY!;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function forceQR(instanceName: string, timeout = 40000) {
  const start = Date.now();
  console.log(`>>> [LOOP QR] Iniciando busca para: ${instanceName}`);

  while (Date.now() - start < timeout) {
    try {
      // 1. Checa estado antes de pedir QR (Evita pedir QR se já conectou)
      const stateRes = await fetch(`${BASE_URL}/instance/connectionState/${instanceName}`, {
         headers: { 'apikey': EVO_KEY }
      });
      
      if (stateRes.ok) {
          const stateData = await stateRes.json();
          if (stateData?.instance?.state === 'open') {
              return "CONNECTED"; // Código especial para avisar que já conectou
          }
      }

      // 2. Pede o QR Code
      const res = await fetch(
        `${BASE_URL}/instance/connect/${instanceName}`,
        { headers: { 'apikey': EVO_KEY } }
      );

      if (res.ok) {
        const data = await res.json();
        
        // Log para debug (ver o que a VPS está mandando de verdade)
        // console.log(">>> [QR PAYLOAD]", JSON.stringify(data).substring(0, 100));

        // Tenta encontrar o QR Code em todos os lugares conhecidos da Evolution
        const qr = 
            data?.base64 || 
            data?.qrcode?.base64 || 
            data?.qrcode ||
            data?.code; // Às vezes pairing code vem aqui

        if (qr && typeof qr === 'string' && qr.length > 20) {
            // Se for base64 puro sem prefixo, adicionamos para exibir na tela
            if (!qr.startsWith('data:image') && !qr.startsWith('http')) {
                // Assume que é base64 se for longo
                return qr;
            }
            return qr;
        }
      } else {
         const txt = await res.text();
         console.log(`>>> [QR FETCH ERROR] ${res.status}: ${txt}`);
      }
    } catch (e) {
      console.log(">>> [QR RETRY ERROR]", e);
    }

    // Espera 2s antes de tentar de novo
    await delay(2000);
  }

  throw new Error("Timeout: A VPS respondeu, mas não enviou um QR Code válido após 40s.");
}

export async function POST(req: NextRequest) {
  try {
    // Validação de variáveis de ambiente críticas
    if (!BASE_URL || !EVO_KEY) {
        return NextResponse.json({ error: "Configuração da API (URL/Key) não encontrada na Vercel." }, { status: 500 });
    }

    const { instanceName } = await req.json();

    if (!instanceName) {
      return NextResponse.json(
        { error: "Nome da instância é obrigatório" },
        { status: 400 }
      );
    }

    console.log(`>>> [INIT] Resetando instância: ${instanceName} na URL ${BASE_URL}`);

    // ─────────────────────────
    // 1️⃣ Deleta instância antiga (Limpeza Forçada)
    // ─────────────────────────
    try {
      await fetch(`${BASE_URL}/instance/delete/${instanceName}`, {
        method: "DELETE",
        headers: { 'apikey': EVO_KEY }
      });
      // Tempo para o Postgres da VPS limpar os dados
      await delay(3000); 
    } catch {}

    // ─────────────────────────
    // 2️⃣ Cria instância (Payload Simplificado)
    // ─────────────────────────
    console.log(">>> [CREATE] Enviando comando de criação...");
    
    // Removi parâmetros opcionais que podem dar conflito em versões diferentes
    const createRes = await fetch(`${BASE_URL}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVO_KEY
      },
      body: JSON.stringify({
        instanceName: instanceName,
        token: crypto.randomUUID(),
        qrcode: true,
        integration: "WHATSAPP-BAILEYS"
      })
    });

    if (!createRes.ok) {
        const errText = await createRes.text();
        // Ignora erro se for "já existe", senão estoura erro
        if (!errText.includes("already exists") && !errText.includes("already in use")) {
             console.error(`>>> [CREATE FAIL] ${createRes.status} - ${errText}`);
             return NextResponse.json({ error: `Falha na VPS ao criar: ${errText}` }, { status: 500 });
        }
    }

    // ─────────────────────────
    // 3️⃣ WAIT (Tempo de Boot do Navegador na VPS)
    // ─────────────────────────
    // A VPS precisa de tempo para baixar o Chrome e iniciar
    console.log(">>> [WAIT] Aguardando motor da VPS (5s)...");
    await delay(5000);

    // ─────────────────────────
    // 4️⃣ FETCH QR (Loop)
    // ─────────────────────────
    const qrResult = await forceQR(instanceName);

    if (qrResult === "CONNECTED") {
        return NextResponse.json({
            status: "connected",
            message: "Instância já conectada!"
        });
    }

    return NextResponse.json({
      status: "qrcode",
      qrcode: qrResult
    });

  } catch (err: any) {
    console.error(">>> [FATAL ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Erro interno no servidor Next.js" },
      { status: 500 }
    );
  }
}