import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { botRealEstateControl, BotContext } from "@/lib/bots/templates/core/real_estate";

import { sendWhatsAppMessage, getMediaUrl, downloadMedia } from "@/lib/whatsapp";
import { transcribeAudio } from "@/lib/groq-audio";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = process.env.ZYTECH_VERIFY_TOKEN || "clientzy_token_seguro";

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.entry?.[0]?.changes?.[0]?.value?.statuses) return new NextResponse("OK", { status: 200 });

    const entry = body.entry?.[0];
    const value = entry?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    if (!message) return new NextResponse("OK", { status: 200 });

    const businessPhoneId = value.metadata?.phone_number_id;

    const { data: org, error } = await supabase
      .from("organizations")
      .select("id, bot_status, whatsapp_access_token, business_type, name")
      .eq("whatsapp_phone_id", businessPhoneId) 
      .single();

    if (error || !org) {
        console.warn(`[Webhook] Ignorado: Empresa não encontrada para ID ${businessPhoneId}`);
        return new NextResponse("OK", { status: 200 });
    }

    if (!org.bot_status || !org.whatsapp_access_token) return new NextResponse("OK", { status: 200 });

    const customerPhone = message.from;
    const customerName = value.contacts?.[0]?.profile?.name || "Cliente";
    let userText = "";

    if (message.type === "text") {
      userText = message.text.body;
    } else if (message.type === "audio") {
      try {
        const mediaId = message.audio.id;
        const mediaUrl = await getMediaUrl(mediaId, org.whatsapp_access_token);
        if (mediaUrl) {
            const audioBuffer = await downloadMedia(mediaUrl, org.whatsapp_access_token);
            if (audioBuffer) {
               const buffer = Buffer.from(audioBuffer);
               userText = await transcribeAudio(buffer) || "";
            }
        }
      } catch (e) { console.error("Erro áudio:", e); }
    }

    if (!userText) return new NextResponse("OK", { status: 200 });

    await supabase.from('chat_messages').insert({
        organization_id: org.id,
        phone: customerPhone,
        role: 'user',
        content: userText,
        sender_name: customerName
    });

    const { data: historyData } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('organization_id', org.id)
        .eq('phone', customerPhone)
        .order('created_at', { ascending: false })
        .limit(6);
    
    const history = historyData ? historyData.reverse() : [];

    const sendMessageWrapper = async (responseText: string) => {
        if (!responseText) return;
        
        await sendWhatsAppMessage(org.whatsapp_access_token, businessPhoneId, customerPhone, responseText);
        
        await supabase.from('chat_messages').insert({
            organization_id: org.id,
            phone: customerPhone,
            role: 'assistant',
            content: responseText
        });
    };

    const botContext: BotContext = { 
        orgId: org.id, 
        history: history, 
        text: userText, 
        customerPhone, 
        customerName 
    };

    if (org.business_type === 'real_estate') {
        const result = await botRealEstateControl(botContext, sendMessageWrapper, supabase);
        
        if (result?.response) {
            await sendMessageWrapper(result.response);
        }
    } else {
        await sendMessageWrapper("Olá! Sou o assistente virtual da " + org.name);
    }

    return new NextResponse("OK", { status: 200 });

  } catch (error) {
    console.error("Erro Crítico Webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}