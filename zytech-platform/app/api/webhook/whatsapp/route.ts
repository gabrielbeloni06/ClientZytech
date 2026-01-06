import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { botRealEstateControl } from "@/lib/bots/templates/core/real_estate";

export const runtime = "nodejs";
export const maxDuration = 10;

async function sendZapiMessage(phone: string, message: string) {
  const url = `${process.env.ZAPI_BASE_URL}/send-text`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": process.env.ZAPI_CLIENT_TOKEN!
    },
    body: JSON.stringify({
      phone,
      message
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("Erro Z-API:", txt);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const msg = body?.message;

    if (!msg || msg.fromMe) {
      return NextResponse.json({ ok: true });
    }

    const customerPhone = msg.phone;
    if (!customerPhone) {
      return NextResponse.json({ ok: true });
    }

    const text =
      msg.text?.message ||
      msg.text ||
      msg.body ||
      "";

    if (!text.trim()) {
      return NextResponse.json({ ok: true });
    }

    const customerName = msg.senderName || "Visitante";

    const instanceNumber =
      body?.instance?.number ||
      msg?.to ||
      body?.phone;

    if (!instanceNumber) {
      console.error("Instance number não encontrado");
      return NextResponse.json({ ok: true });
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("whatsapp_number", instanceNumber)
      .single();

    if (!org) {
      console.error("Org não encontrada");
      return NextResponse.json({ ok: true });
    }

    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("org_id", org.id)
      .eq("customer_phone", customerPhone)
      .order("created_at", { ascending: true })
      .limit(10);

    const sendMessage = async (msg: string) => {
      await sendZapiMessage(customerPhone, msg);
    };

    const result = await botRealEstateControl(
      {
        orgId: org.id,
        history: history || [],
        text,
        customerPhone,
        customerName
      },
      sendMessage,
      supabase
    );

    if (result?.response) {
      await sendZapiMessage(customerPhone, result.response);
    }

    await supabase.from("messages").insert({
      org_id: org.id,
      customer_phone: customerPhone,
      role: "user",
      content: text
    });

    if (result?.response) {
      await supabase.from("messages").insert({
        org_id: org.id,
        customer_phone: customerPhone,
        role: "assistant",
        content: result.response
      });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("Erro webhook Z-API:", err);
    return NextResponse.json({ ok: true });
  }
}
