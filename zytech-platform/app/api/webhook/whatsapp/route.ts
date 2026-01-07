import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { botRealEstateControl } from "@/lib/bots/templates/core/real_estate";

export const runtime = "nodejs";
export const maxDuration = 60;

async function sendZapiMessage(
  phone: string,
  message: string,
  instanceId: string,
  token: string,
  clientToken?: string
) {
  if (!message || !message.trim()) return;

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (clientToken) {
      headers["Client-Token"] = clientToken;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        phone,
        message,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Z-API Error] ${res.status}: ${errorText}`);
    }
  } catch (error) {
    console.error("[Z-API Network Error]:", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log("Webhook Payload recebido:", JSON.stringify(body?.instanceId ? { instanceId: body.instanceId } : body, null, 2));

    const msg = body; 
    if (!msg || msg.fromMe || msg.isGroup || msg.type === "e2e_notification") {
      return NextResponse.json({ ok: true });
    }

    const customerPhone = msg.phone;
    if (!customerPhone) return NextResponse.json({ ok: true });

    const text = msg.text?.message || msg.body || "";
    if (!text.trim()) {
      return NextResponse.json({ ok: true });
    }

    const customerName = msg.senderName || "Visitante";
    
    const instanceId = msg.instanceId || body.instanceId;

    if (!instanceId) {
      console.error("ERRO: Instance ID não identificado no webhook.");
      return NextResponse.json({ ok: true });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, zapi_instance_id, zapi_token, zapi_client_token")
      .eq("zapi_instance_id", instanceId)
      .single();

    if (orgError || !org) {
      console.error(`Organização não encontrada para a instância Z-API: ${instanceId}`);
      return NextResponse.json({ ok: true });
    }

    await supabase.from("messages").insert({
      org_id: org.id,
      customer_phone: customerPhone,
      role: "user",
      content: text,
    });

    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("org_id", org.id)
      .eq("customer_phone", customerPhone)
      .order("created_at", { ascending: false })
      .limit(15);

    const conversationHistory = history ? history.reverse() : [];

    const sendMessageWrapper = async (responseMessage: string) => {
      await sendZapiMessage(
        customerPhone,
        responseMessage,
        org.zapi_instance_id,
        org.zapi_token,
        org.zapi_client_token
      );
    };

    const result = await botRealEstateControl(
      {
        orgId: org.id,
        history: conversationHistory,
        text,
        customerPhone,
        customerName,
      },
      sendMessageWrapper,
      supabase
    );

    if (result?.response) {
      await sendMessageWrapper(result.response);

      await supabase.from("messages").insert({
        org_id: org.id,
        customer_phone: customerPhone,
        role: "assistant",
        content: result.response,
      });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("ERRO CRÍTICO no Webhook:", err);
    return NextResponse.json({ ok: true });
  }
}