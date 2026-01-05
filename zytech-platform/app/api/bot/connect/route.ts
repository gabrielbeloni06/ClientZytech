import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EVO_URL = process.env.EVOLUTION_API_URL!;
const EVO_KEY = process.env.EVOLUTION_API_KEY!;

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) {
      return NextResponse.json(
        { error: "instanceName obrigatório" },
        { status: 400 }
      );
    }

    // 1️⃣ Remove instância antiga (se existir)
    try {
      await fetch(`${EVO_URL}/instance/delete/${instanceName}`, {
        method: "DELETE",
        headers: { apikey: EVO_KEY }
      });
      await delay(2000);
    } catch {}

    // 2️⃣ Cria nova instância
    const res = await fetch(`${EVO_URL}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVO_KEY
      },
      body: JSON.stringify({
        instanceName,
        token: crypto.randomUUID(),
        integration: "WHATSAPP-BAILEYS",
        qrcode: true
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Erro interno" },
      { status: 500 }
    );
  }
}
