import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = "http://46.224.182.243:8080";
const EVO_KEY = "clientzy_master_key_2025";

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName?.trim()) {
      return NextResponse.json(
        { status: "error", message: "Instance inválida" },
        { status: 400 }
      );
    }

    const name = instanceName.trim();

    const headers = {
      "Content-Type": "application/json",
      apikey: EVO_KEY
    };

    /* =========================
       1️⃣ BUSCAR ESTADO ATUAL
    ========================== */
    let stateData: any = null;

    try {
      const stateRes = await fetch(
        `${BASE_URL}/instance/connectionState/${name}`,
        { headers, cache: "no-store" }
      );

      if (stateRes.ok) {
        stateData = await stateRes.json();
      }
    } catch {}

    const state = stateData?.instance?.state;

    /* =========================
       2️⃣ CRIAR INSTÂNCIA (SE NÃO EXISTIR)
    ========================== */
    if (!state) {
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
    }

    /* =========================
       3️⃣ DISPARAR CONNECT (SÓ SE PRECISAR)
    ========================== */
    if (!state || state === "disconnected") {
      await fetch(`${BASE_URL}/instance/connect/${name}`, {
        headers
      }).catch(() => {});
    }

    /* =========================
       4️⃣ BUSCAR ESTADO FINAL
    ========================== */
    const finalRes = await fetch(
      `${BASE_URL}/instance/connectionState/${name}`,
      { headers, cache: "no-store" }
    );

    if (!finalRes.ok) {
      return NextResponse.json({
        status: "loading",
        message: "Inicializando WhatsApp..."
      });
    }

    const data = await finalRes.json();

    /* =========================
       5️⃣ CONECTADO
    ========================== */
    if (data?.instance?.state === "open") {
      return NextResponse.json({ status: "connected" });
    }

    /* =========================
       6️⃣ QR CODE
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
       7️⃣ AINDA CARREGANDO
    ========================== */
    return NextResponse.json({
      status: "loading",
      message: "Gerando QR Code..."
    });

  } catch (err: any) {
    console.error("CONNECT ERROR:", err);
    return NextResponse.json(
      { status: "error", message: err.message },
      { status: 500 }
    );
  }
}
