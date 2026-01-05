import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = "http://46.224.182.243:8080";
const EVO_KEY = "clientzy_master_key_2025";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName || !instanceName.trim()) {
      return NextResponse.json(
        { status: "error", message: "Instance inválida" },
        { status: 400 }
      );
    }

    const name = instanceName.trim();

    const headers = {
      "Content-Type": "application/json",
      "apikey": EVO_KEY
    };

    /* =========================
       1️⃣ CRIAR INSTÂNCIA
    ========================== */
    await fetch(`${BASE_URL}/instance/create`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        instanceName: name,
        token: crypto.randomUUID(),
        qrcode: true,
        integration: "WHATSAPP-BAILEYS"
      })
    }).catch(() => {});

    /* =========================
       2️⃣ DISPARAR CONNECT (1x)
    ========================== */
    await fetch(`${BASE_URL}/instance/connect/${name}`, {
      headers
    }).catch(() => {});

    /* =========================
       3️⃣ BUSCAR ESTADO / QR
       (1 tentativa por request)
    ========================== */
    const stateRes = await fetch(
      `${BASE_URL}/instance/connectionState/${name}`,
      { headers, cache: "no-store" }
    );

    if (!stateRes.ok) {
      return NextResponse.json({
        status: "loading",
        message: "Aguardando servidor..."
      });
    }

    const data = await stateRes.json();

    /* =========================
       4️⃣ JÁ CONECTADO
    ========================== */
    if (data?.instance?.state === "open") {
      return NextResponse.json({
        status: "connected"
      });
    }

    /* =========================
       5️⃣ QR CODE DISPONÍVEL
    ========================== */
    const qr =
      data?.qrcode?.base64 ||
      data?.qr ||
      data?.base64;

    if (qr && typeof qr === "string" && qr.length > 50) {
      return NextResponse.json({
        status: "qrcode",
        qrcode: qr
      });
    }

    /* =========================
       6️⃣ AINDA INICIALIZANDO
    ========================== */
    return NextResponse.json({
      status: "loading",
      message: "Inicializando WhatsApp..."
    });

  } catch (err: any) {
    console.error("BOT CONNECT ERROR:", err);
    return NextResponse.json(
      { status: "error", message: err.message || "Erro interno" },
      { status: 500 }
    );
  }
}
