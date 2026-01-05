import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EVO_URL = process.env.EVOLUTION_API_URL!;
const EVO_KEY = process.env.EVOLUTION_API_KEY!;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function forceQR(instanceName: string, timeout = 40000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    console.log(">>> [QR LOOP] tentando gerar QR...");

    try {
      const res = await fetch(
        `${EVO_URL}/instance/connect/${instanceName}`,
        { headers: { apikey: EVO_KEY } }
      );

      if (res.ok) {
        const data = await res.json();

        const qr =
          data?.base64 ||
          data?.qrcode?.base64 ||
          data?.qrcode;

        if (qr) return qr;
      }
    } catch (e) {
      console.log(">>> [QR RETRY ERROR]", e);
    }

    await delay(2000);
  }

  throw new Error("Timeout aguardando QR Code da VPS");
}

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) {
      return NextResponse.json(
        { error: "Nome da instância é obrigatório" },
        { status: 400 }
      );
    }

    console.log(`>>> [START QR] ${instanceName}`);

    try {
      await fetch(`${EVO_URL}/instance/delete/${instanceName}`, {
        method: "DELETE",
        headers: { apikey: EVO_KEY }
      });
      console.log(">>> [DELETE] Instância limpa");
      await delay(4000); // Tempo seguro para o banco da VPS
    } catch {}

    // ─────────────────────────
    // 2️⃣ Cria instância
    // ─────────────────────────
    console.log(">>> [CREATE] criando instância");

    const createRes = await fetch(`${EVO_URL}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVO_KEY
      },
      body: JSON.stringify({
        instanceName,
        token: crypto.randomUUID(),
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        reject_call: true,
        msgBufferLimit: 50
      })
    });

    if (!createRes.ok) {
        const errText = await createRes.text();
        console.log(">>> [CREATE WARN]", errText);
    }

    await delay(3000); 

    const qr = await forceQR(instanceName);

    return NextResponse.json({
      status: "qrcode",
      qrcode: qr
    });

  } catch (err: any) {
    console.error(">>> [ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Erro interno" },
      { status: 500 }
    );
  }
}