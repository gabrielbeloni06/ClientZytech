import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = "http://46.224.182.243:8080";
const EVO_KEY = "clientzy_master_key_2025";

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName?.trim()) {
      return NextResponse.json(
        { status: "error", message: "Nome da instância obrigatório" },
        { status: 400 }
      );
    }

    const name = instanceName.trim();
    const headers = {
      "Content-Type": "application/json",
      "apikey": EVO_KEY
    };

    /* ======================================================
       PASSO 1: VERIFICAR STATUS (Para não resetar quem já tá on)
    ====================================================== */
    let currentState = "NOT_FOUND";
    
    try {
      const stateRes = await fetch(`${BASE_URL}/instance/connectionState/${name}`, { 
        headers, 
        cache: "no-store" 
      });
      
      if (stateRes.ok) {
        const stateData = await stateRes.json();
        // Na v2.1.1, geralmente retorna { instance: { state: '...' } }
        currentState = stateData?.instance?.state || "close";
      }
    } catch (e) {
      // Se der 404 ou erro de rede, assume que não existe
      currentState = "NOT_FOUND";
    }

    // Se já está conectado, retorna sucesso e para aqui
    if (currentState === "open") {
      return NextResponse.json({ status: "connected" });
    }

    /* ======================================================
       PASSO 2: OBTER O QR CODE (Criação ou Conexão)
    ====================================================== */
    let resultData: any = null;

    if (currentState === "NOT_FOUND") {
      // CENÁRIO A: Instância não existe -> CRIAR
      // Na v2.1.1, ao enviar "qrcode: true", ela já retorna o base64 na resposta
      console.log(`Criando instância ${name}...`);
      
      const createRes = await fetch(`${BASE_URL}/instance/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          instanceName: name,
          token: crypto.randomUUID(), // Token de segurança da instância
          qrcode: true,               // IMPORTANTE: Pede o QR na resposta
          integration: "WHATSAPP-BAILEYS"
        })
      });

      if (!createRes.ok) {
         // Se der erro ao criar (ex: nome duplicado que o state não pegou)
         const errData = await createRes.json();
         throw new Error(errData?.message || "Erro ao criar instância");
      }

      resultData = await createRes.json();

    } else {
      // CENÁRIO B: Instância existe mas está desconectada -> CONECTAR
      // Na v2.1.1 usa-se GET no /connect/{nome} para pegar o base64
      console.log(`Buscando QR para instância ${name}...`);
      
      const connectRes = await fetch(`${BASE_URL}/instance/connect/${name}`, {
        method: "GET",
        headers
      });

      resultData = await connectRes.json();
    }

    /* ======================================================
       PASSO 3: NORMALIZAR A RESPOSTA DA V2.1.1
    ====================================================== */
    // Na v2.1.1:
    // - No create: data.qrcode.base64
    // - No connect: data.base64
    
    const qrCodeBase64 = 
      resultData?.qrcode?.base64 || // Formato resposta do Create
      resultData?.base64;           // Formato resposta do Connect

    if (qrCodeBase64) {
      return NextResponse.json({
        status: "qrcode",
        qrcode: qrCodeBase64.replace(/^data:image\/png;base64,/, "") // Remove prefixo se houver
      });
    }

    // Se chegou aqui e não tem QR, pode ser que a instância esteja 'connecting'
    return NextResponse.json({
      status: "loading",
      message: "Inicializando... Tente novamente em alguns segundos."
    });

  } catch (err: any) {
    console.error("API ERROR:", err);
    return NextResponse.json(
      { status: "error", message: err.message },
      { status: 500 }
    );
  }
}