import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = "http://46.224.182.243:8080";
const EVO_KEY = "clientzy_master_key_2025";

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName || !instanceName.trim()) {
      return NextResponse.json(
        { status: "error", message: "Nome da instância é obrigatório" },
        { status: 400 }
      );
    }

    const name = instanceName.trim();

    const headers = {
      "Content-Type": "application/json",
      apikey: EVO_KEY
    };

    // ======================================================
    // 1️⃣ TENTA CRIAR A INSTÂNCIA
    // ======================================================
    try {
      await fetch(`${BASE_URL}/instance/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          instanceName: name,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        })
      });
    } catch (_) {
      // ignora erro — se já existir, seguimos o fluxo
    }

    // ======================================================
    // 2️⃣ VERIFICA ESTADO DA CONEXÃO
    // ======================================================
    const stateRes = await fetch(
      `${BASE_URL}/instance/connectionState/${name}`,
      { headers }
    );

    if (stateRes.ok) {
      const stateData = await stateRes.json();
      if (stateData?.instance?.state === "open") {
        return NextResponse.json({ status: "connected" });
      }
    }

    // ======================================================
    // 3️⃣ BUSCA QR CODE VIA fetchInstances (PONTO CRÍTICO)
    // ======================================================
    const listRes = await fetch(`${BASE_URL}/instance/fetchInstances`, {
      headers
    });

    if (!listRes.ok) {
      throw new Error("Erro ao buscar instâncias");
    }

    const instances = await listRes.json();
    const instance = instances.find(
      (i: any) => i.instanceName === name
    );

    if (!instance) {
      return NextResponse.json({
        status: "loading",
        message: "Instância inicializando"
      });
    }

    const qrBase64 =
      instance?.qrcode?.base64 ||
      instance?.qrcode ||
      instance?.qr;

    if (qrBase64) {
      return NextResponse.json({
        status: "qrcode",
        qrcode: qrBase64.replace(/^data:image\/png;base64,/, "")
      });
    }

    return NextResponse.json({
      status: "loading",
      message: "Aguardando QR Code"
    });

  } catch (err: any) {
    console.error("[EVOLUTION ERROR]", err);
    return NextResponse.json(
      { status: "error", message: err.message },
      { status: 500 }
    );
  }
}
