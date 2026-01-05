import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = "http://46.224.182.243:8080";
const EVO_KEY = "clientzy_master_key_2025";

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName?.trim()) {
      return NextResponse.json(
        { status: "error", message: "Nome da instância é obrigatório" },
        { status: 400 }
      );
    }

    const name = instanceName.trim();
    const headers = {
      "Content-Type": "application/json",
      "apikey": EVO_KEY
    };

    let resultData: any = null;
    let action = "";

    // ======================================================
    // TENTATIVA 1: CRIAR A INSTÂNCIA (Assume que não existe)
    // ======================================================
    try {
      console.log(`[API] Tentando criar instância: ${name}`);
      
      const createRes = await fetch(`${BASE_URL}/instance/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          instanceName: name,
          token: crypto.randomUUID(),
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        })
      });

      // Se sucesso (201), pega o JSON e segue
      if (createRes.ok) {
        resultData = await createRes.json();
        action = "created";
      } else {
        // Se deu erro, precisamos ver se é porque JÁ EXISTE (403)
        const errorText = await createRes.text();
        
        // Verifica se o erro é o clássico "instance already exists"
        if (createRes.status === 403 || errorText.includes("already exists")) {
          console.log(`[API] Instância ${name} já existe. Tentando conectar...`);
          throw new Error("ALREADY_EXISTS"); // Força pular para o catch
        } else {
            // Se for outro erro (ex: 500 do servidor), repassa o erro real
            throw new Error(`Erro ao criar: ${errorText}`);
        }
      }

    } catch (err: any) {
      // ======================================================
      // TENTATIVA 2: SE JÁ EXISTE, TENTA CONECTAR (Buscar QR)
      // ======================================================
      if (err.message === "ALREADY_EXISTS") {
        const connectRes = await fetch(`${BASE_URL}/instance/connect/${name}`, {
          method: "GET",
          headers
        });

        if (connectRes.ok) {
            resultData = await connectRes.json();
            action = "connected";
        } else {
            // Se falhar no connect também, pode ser que a instância esteja travada
            // Tenta ver o estado pra saber se já não está conectada
             const stateRes = await fetch(`${BASE_URL}/instance/connectionState/${name}`, { headers });
             const stateData = await stateRes.json();
             
             if (stateData?.instance?.state === 'open') {
                 return NextResponse.json({ status: "connected" });
             }
             
             throw new Error("Não foi possível conectar na instância existente.");
        }
      } else {
        throw err; // Repassa erros que não sejam "Already Exists"
      }
    }

    // ======================================================
    // TRATAR RETORNO DO QR CODE
    // ======================================================
    
    // Se a instância retornou que já está conectada no JSON de criação/conexão
    if (resultData?.instance?.state === 'open' || resultData?.state === 'open') {
        return NextResponse.json({ status: "connected" });
    }

    // Normaliza onde está o Base64 (muda dependendo se veio do Create ou Connect)
    const qrCodeBase64 = 
      resultData?.qrcode?.base64 ||  // Padrão Create V2
      resultData?.base64 ||          // Padrão Connect V2
      resultData?.qrcode;            // Variações

    if (qrCodeBase64 && typeof qrCodeBase64 === 'string') {
      console.log(`[API] QR Code obtido via ${action}`);
      return NextResponse.json({
        status: "qrcode",
        qrcode: qrCodeBase64.replace(/^data:image\/png;base64,/, "")
      });
    }

    // Se não tem QR Code, provavelmente está inicializando
    return NextResponse.json({
      status: "loading",
      message: "Inicializando a instância..."
    });

  } catch (err: any) {
    console.error("[API ERROR]", err.message);
    return NextResponse.json(
      { status: "error", message: err.message },
      { status: 500 }
    );
  }
}