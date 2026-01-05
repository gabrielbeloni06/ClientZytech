import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = "http://46.224.182.243:8080";
const EVO_KEY = "clientzy_master_key_2025";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function POST(req: NextRequest) {
  const { instanceName } = await req.json();
  const name = instanceName || "teste_qr";

  const headers = {
    "Content-Type": "application/json",
    "apikey": EVO_KEY
  };

  // 1️⃣ Criar instância
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

  // 2️⃣ Disparar connect (1x)
  await fetch(`${BASE_URL}/instance/connect/${name}`, {
    headers
  }).catch(() => {});

  // 3️⃣ Polling do QR (até 60s)
  for (let i = 0; i < 20; i++) {
    const res = await fetch(
      `${BASE_URL}/instance/connectionState/${name}`,
      { headers, cache: "no-store" }
    );

    if (res.ok) {
      const data = await res.json();

      // Já conectado
      if (data?.instance?.state === "open") {
        return NextResponse.json({ status: "connected" });
      }

      // QR Code
      const qr =
        data?.qrcode?.base64 ||
        data?.qr ||
        data?.base64;

      if (qr && qr.length > 50) {
        return NextResponse.json({
          status: "qrcode",
          qrcode: qr
        });
      }
    }

    await delay(3000);
  }

  return NextResponse.json({
    status: "loading",
    message: "QR ainda não disponível"
  });
}
