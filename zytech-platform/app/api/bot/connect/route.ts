import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EVO_URL = process.env.EVOLUTION_API_URL!;
// Remove barra final se houver para evitar erro de URL (ex: http://ip:8080//instance)
const BASE_URL = EVO_URL?.endsWith('/') ? EVO_URL.slice(0, -1) : EVO_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY!;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função que fica tentando pegar o QR Code até ele aparecer
async function forceQR(instanceName: string, timeout = 45000) {
  const start = Date.now();
  console.log(`>>> [LOOP QR] Iniciando busca persistente para: ${instanceName}`);

  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(
        `${BASE_URL}/instance/connect/${instanceName}`,
        { headers: { 'apikey': EVO_KEY } }
      );

      if (res.ok) {
        const data = await res.json();
        
        // Se vier { count: 0 }, é porque o Chrome da VPS ainda está abrindo. Ignora.
        if (data.count === 0) {
             // console.log(">>> [WAIT] count:0 (Carregando...)");
        } 
        else {
            // Tenta encontrar o QR Code real (base64)
            const qr = 
                data?.base64 || 
                data?.qrcode?.base64 || 
                data?.qrcode;

            if (qr && typeof qr === 'string' && qr.length > 50) {
                console.log(">>> [SUCCESS] QR Code encontrado!");
                return qr;
            }
            
            // Se já estiver conectado
            if (data?.instance?.state === 'open') return "CONNECTED";
        }
      } 
    } catch (e) {
      console.log(">>> [RETRY ERROR]", e);
    }

    // Espera 2.5s antes de tentar de novo
    await delay(2500);
  }

  throw new Error("Timeout: A VPS não gerou o QR Code a tempo (travou em count:0).");
}

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    console.log(`>>> [INIT] Resetando instância: ${instanceName}`);

    // 1. DELETE (Limpeza Preventiva para não dar conflito)
    try {
      await fetch(`${BASE_URL}/instance/delete/${instanceName}`, {
        method: "DELETE",
        headers: { 'apikey': EVO_KEY }
      });
      await delay(2000); 
    } catch {}

    // 2. CREATE (Criação)
    const createRes = await fetch(`${BASE_URL}/instance/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": EVO_KEY },
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
        const txt = await createRes.text();
        // Se der erro que não seja "já existe", logamos
        if (!txt.includes("already")) {
             console.log(`>>> [CREATE INFO] ${txt}`);
        }
    }

    // 3. WAIT INICIAL (Essencial para sair do count:0)
    await delay(4000);

    // 4. LOOP DE BUSCA (A mágica acontece aqui)
    const qrCode = await forceQR(instanceName);

    if (qrCode === "CONNECTED") {
        return NextResponse.json({ status: "connected", message: "Conectado!" });
    }

    return NextResponse.json({ status: "qrcode", qrcode: qrCode });

  } catch (err: any) {
    console.error(">>> [FATAL ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Erro interno" },
      { status: 500 }
    );
  }
}