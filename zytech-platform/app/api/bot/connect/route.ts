import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EVO_URL = process.env.EVOLUTION_API_URL!;
// Garante que não tenha barra no final
const BASE_URL = EVO_URL.endsWith('/') ? EVO_URL.slice(0, -1) : EVO_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY!;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function forceQR(instanceName: string, timeout = 45000) {
  const start = Date.now();

  console.log(`>>> [LOOP QR] Iniciando busca para: ${instanceName}`);

  while (Date.now() - start < timeout) {
    try {
      // Tenta endpoint padrão da v2
      const res = await fetch(
        `${BASE_URL}/instance/connect/${instanceName}`,
        { 
            headers: { 'apikey': EVO_KEY } 
        }
      );

      if (res.ok) {
        const data = await res.json();
        
        // Verifica todos os formatos possíveis de QR Code que a API pode retornar
        const qr = 
            data?.base64 || 
            data?.qrcode?.base64 || 
            data?.qrcode;

        if (qr && typeof qr === 'string' && qr.startsWith('data:image')) {
            // Se já vier com prefixo, retorna direto
            return qr.split(',')[1]; // Retorna só o base64 sem o cabeçalho
        } else if (qr) {
            return qr; // Retorna o base64 puro
        }
      } 
    } catch (e) {
      console.log(">>> [RETRY QR] Aguardando API...", e);
    }
    
    await delay(2000);
  }
  throw new Error("Timeout: A API não gerou o QR Code a tempo.");
}

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    console.log(`>>> [INIT] Resetando instância: ${instanceName}`);

    // 1. DELETE (Limpeza Forçada)
    try {
      await fetch(`${BASE_URL}/instance/delete/${instanceName}`, {
        method: "DELETE",
        headers: { 'apikey': EVO_KEY }
      });
      await delay(3000); 
    } catch {}

    // 2. CREATE (Criação Limpa)
    console.log(">>> [CREATE] Enviando comando...");
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
        integration: "WHATSAPP-BAILEYS",
        reject_call: true,
        msgBufferLimit: 50
      })
    });

    if (!createRes.ok) {
        const errText = await createRes.text();
        console.error(`>>> [CREATE FAIL] ${createRes.status} - ${errText}`);
        return NextResponse.json({ error: `Falha na VPS ao criar: ${errText}` }, { status: 500 });
    }

    // 3. WAIT (Tempo de Boot do Chrome)
    // A VPS precisa de tempo para subir o navegador antes de gerar imagem
    console.log(">>> [WAIT] Aguardando motor...");
    await delay(5000);

    // 4. FETCH QR (Loop)
    const qrCode = await forceQR(instanceName);

    return NextResponse.json({
      status: "qrcode",
      qrcode: qrCode
    });

  } catch (err: any) {
    console.error(">>> [FATAL ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Erro interno no servidor Next.js" },
      { status: 500 }
    );
  }
}