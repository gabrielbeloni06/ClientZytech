import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { botRealEstateControl } from "@/lib/bots/templates/core/real_estate";
import { botDeliveryControl } from "@/lib/bots/templates/core/delivery";
import { botSchedulingControl } from "@/lib/bots/templates/core/scheduling";
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
  const myVerifyToken = process.env.ZYTECH_VERIFY_TOKEN || "zytech123";

  if (mode === "subscribe" && token === myVerifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) return new NextResponse("OK", { status: 200 });

    const businessPhoneId = value.metadata?.phone_number_id;
    console.log(">>> [DEBUG] ID Recebido da Meta:", businessPhoneId);

    const { data: org, error } = await supabase
      .from("organizations")
      .select("id, bot_status, whatsapp_access_token, business_type, name")
      .eq("whatsapp_phone_id", businessPhoneId) 
      .single();

    if (error) {
        console.log(">>> [DEBUG] Erro ao buscar empresa:", error.message);
    }

    if (!org) {
        console.log(">>> [DEBUG] Nenhuma empresa encontrada com este ID:", businessPhoneId);
        return new NextResponse("OK", { status: 200 });
    }

    console.log(`>>> [DEBUG] Empresa encontrada: ${org.name} | Status Bot: ${org.bot_status}`);

    if (!org.bot_status || !org.whatsapp_access_token) {
      console.log(">>> [DEBUG] Bot desligado ou sem token.");
      return new NextResponse("OK", { status: 200 });
    }

    const customerPhone = message.from;
    const customerName = value.contacts?.[0]?.profile?.name || "Visitante";
    let userText = "";

    if (message.type === "text") {
      userText = message.text.body;
    } else if (message.type === "audio") {
      const mediaId = message.audio.id;
      const mediaUrl = await getMediaUrl(mediaId, org.whatsapp_access_token);
      if (mediaUrl) {
        const audioBuffer = await downloadMedia(mediaUrl, org.whatsapp_access_token);
        if (audioBuffer) {
           const buffer = Buffer.from(audioBuffer);
           const transcription = await transcribeAudio(buffer);
           if (transcription) userText = transcription;
           else await sendWhatsAppMessage(org.whatsapp_access_token, businessPhoneId, customerPhone, "Não entendi o áudio.");
        }
      }
    }

    if (!userText) return new NextResponse("OK", { status: 200 });

    let botResult;
    const history: any[] = []; 

    if (org.business_type === 'real_estate') {
        botResult = await botRealEstateControl({ orgId: org.id, history, text: userText, customerPhone, customerName });
    } else if (org.business_type === 'delivery') {
        botResult = await botDeliveryControl({ orgId: org.id, history, text: userText, customerPhone });
    } else {
        botResult = await botSchedulingControl({ orgId: org.id, history, text: userText, customerPhone });
    }

    if (botResult?.action === 'transfer') {
        await sendWhatsAppMessage(org.whatsapp_access_token, businessPhoneId, customerPhone, botResult.response);
    } else {
        await sendWhatsAppMessage(org.whatsapp_access_token, businessPhoneId, customerPhone, botResult.response);
    }

    return new NextResponse("OK", { status: 200 });

  } catch (error) {
    console.error("Erro Crítico no Webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}