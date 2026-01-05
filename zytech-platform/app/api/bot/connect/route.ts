import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EVO_URL = process.env.EVOLUTION_API_URL!;
const EVO_KEY = process.env.EVOLUTION_API_KEY!;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getState(instanceName: string) {
  try {
    const res = await fetch(
      `${EVO_URL}/instance/connectionState/${instanceName}`,
      { headers: { apikey: EVO_KEY } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.instance?.state;
  } catch {
    return null;
  }
}

async function waitForAnyState(instanceName: string, timeout = 30000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const state = await getState(instanceName);
    console.log(">>> [STATE]", state);

    if (state && state !== "close") return state;

    await delay(2000);
  }

  throw new Error("Timeout aguardando instância responder");
}

export async function POST(req: NextRequest) {
  try {
    const { instanceName, phoneNumber } = await req.json();

    if (!instanceName) {
      return NextResponse.json(
        { error: "instanceName é obrigatório" },
        { status: 400 }
      );
    }

    console.log(
      `>>> [START] ${instanceName} ${
        phoneNumber ? `(PAIR ${phoneNumber})` : "(QR)"
      }`
    );

    // ─────────────────────────────
    // 1️⃣ Limpa instância antiga
    // ─────────────────────────────
    try {
      const state = await getState(instanceName);

      if (state === "open") {
        return NextResponse.json({
          status: "connected",
          message: "Instância já conectada"
        });
      }

      if (state) {
        console.log(`>>> [RESET] Deletando instância (${state})`);
        await fetch(`${EVO_URL}/instance/delete/${instanceName}`, {
          method: "DELETE",
          headers: { apikey: EVO_KEY }
        });
        await delay(6000);
      }
    } catch {}

    // ─────────────────────────────
    // 2️⃣ Cria instância
    // ─────────────────────────────
    console.log(">>> [CREATE] Criando instância");

    await fetch(`${EVO_URL}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVO_KEY
      },
      body: JSON.stringify({
        instanceName,
        token: crypto.randomUUID(),
        qrcode: !phoneNumber,
        integration: "WHATSAPP-BAILEYS",
        reject_call: true,
        msgBufferLimit: 50
      })
    });

    await delay(3000);

    // ─────────────────────────────
    // 3️⃣ PAIRING POR NÚMERO
    // ─────────────────────────────
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      console.log(">>> [PAIRING] Iniciando pairing:", cleanPhone);

      // 🔥 Chamada que SOBE o motor
      await fetch(
        `${EVO_URL}/instance/connect/${instanceName}?number=${cleanPhone}`,
        { headers: { apikey: EVO_KEY } }
      );

      // 🔥 Espera qualquer estado vivo
      await waitForAnyState(instanceName);

      // 🔥 Pede o código de verdade
      const pairRes = await fetch(
        `${EVO_URL}/instance/connect/${instanceName}?number=${cleanPhone}`,
        { headers: { apikey: EVO_KEY } }
      );

      const pairData = await pairRes.json();
      console.log(">>> [PAIR RAW]", pairData);

      const code =
        pairData?.code ||
        pairData?.pairingCode ||
        pairData?.data?.code;

      if (!code) {
        return NextResponse.json(
          { error: "Pairing não retornado (WhatsApp bloqueado ou instância inválida)" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        status: "pairing",
        code
      });
    }

    // ─────────────────────────────
    // 4️⃣ QR CODE
    // ─────────────────────────────
    console.log(">>> [QR] Solicitando QR Code");

    await fetch(
      `${EVO_URL}/instance/connect/${instanceName}`,
      { headers: { apikey: EVO_KEY } }
    );

    await waitForAnyState(instanceName);

    const qrRes = await fetch(
      `${EVO_URL}/instance/connect/${instanceName}`,
      { headers: { apikey: EVO_KEY } }
    );

    const qrData = await qrRes.json();
    console.log(">>> [QR RAW]", qrData);

    const qr =
      qrData?.base64 ||
      qrData?.qrcode?.base64 ||
      qrData?.qrcode;

    if (!qr) {
      return NextResponse.json(
        { error: "QR Code não retornado" },
        { status: 500 }
      );
    }

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
