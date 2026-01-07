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
    
    if (!body || body.fromMe || body.isGroup || body.type === "e2e_notification" || body.type === "call_log") {
      return NextResponse.json({ ok: true });
    }

    const customerPhone = body.phone;
    const instanceId = body.instanceId;
    const messageId = body.messageId; 
    const text = body.text?.message || body.body || body.caption || "";

    if (!customerPhone || !instanceId || !text.trim()) {
      return NextResponse.json({ ok: true });
    }

    const customerName = body.senderName || "Visitante";

    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; 
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

    if (!sbUrl || !sbKey) {
        console.error("❌ ERRO CRÍTICO: Variáveis de ambiente do Supabase não encontradas.");
        // Retorna OK para não travar a fila da Z-API
        return NextResponse.json({ ok: true });
    }

    const supabase = createClient(sbUrl, sbKey);
    if (messageId) {
        try {
            const { data: existingMsg } = await supabase
                .from("messages")
                .select("id")
                .eq("message_id", messageId) 
                .maybeSingle(); 
            
            if (existingMsg) {
                return NextResponse.json({ ok: true });
            }
        } catch (e) {
        }
    }

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, zapi_instance_id, zapi_token, zapi_client_token")
      .eq("zapi_instance_id", instanceId)
      .single();

    if (orgError || !org) {
      console.error(`⚠️ Org não encontrada para Instância: ${instanceId}`);
      return NextResponse.json({ ok: true });
    }

    const { data: customer } = await supabase
        .from("customers")
        .select("is_bot_paused")
        .eq("organization_id", org.id)
        .eq("phone", customerPhone)
        .maybeSingle();

    await supabase.from("messages").insert({
      org_id: org.id,
      customer_phone: customerPhone,
      role: "user",
      content: text,
      message_id: messageId 
    });

    if (customer?.is_bot_paused) {
        console.log(`⏸️ Bot pausado para ${customerPhone}.`);
        return NextResponse.json({ ok: true });
    }

    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("org_id", org.id)
      .eq("customer_phone", customerPhone)
      .order("created_at", { ascending: false })
      .limit(10); 

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
    console.error("❌ ERRO NO WEBHOOK:", err);
    return NextResponse.json({ ok: true });
  }
}