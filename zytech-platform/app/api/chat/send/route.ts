import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { orgId, phone, text } = await req.json();

    if (!orgId || !phone || !text) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("whatsapp_access_token, whatsapp_phone_id")
      .eq("id", orgId)
      .single();

    if (!org?.whatsapp_access_token || !org?.whatsapp_phone_id) {
      return NextResponse.json({ error: "WhatsApp não configurado nesta empresa" }, { status: 400 });
    }

    const result = await sendWhatsAppMessage(
      org.whatsapp_access_token,
      org.whatsapp_phone_id,
      phone,
      text
    );

    if (!result) {
      return NextResponse.json({ error: "Falha ao enviar para Meta" }, { status: 500 });
    }

    await supabase.from("chat_messages").insert({
      organization_id: orgId,
      phone: phone,
      role: "assistant", 
      content: text,
      sender_name: "Atendente Humano"
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Erro no envio manual:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}