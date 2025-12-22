import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Importa o bot corrigido
import { botRealEstateControl, BotContext } from "@/lib/bots/templates/core/real_estate";
// Mantenha os outros importados se existirem, senão comente
// import { botDeliveryControl } from "@/lib/bots/templates/core/delivery";
// import { botSchedulingControl } from "@/lib/bots/templates/core/scheduling";

import { sendWhatsAppMessage, getMediaUrl, downloadMedia } from "@/lib/whatsapp";
import { transcribeAudio } from "@/lib/groq-audio";

// Configuração do Supabase (Singleton para esta requisição)
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
    
    // Tratamento de Status (sent, delivered, read) - Ignorar
    if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
        return new NextResponse("OK", { status: 200 });
    }

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) return new NextResponse("OK", { status: 200 });

    const businessPhoneId = value.metadata?.phone_number_id;

    // 1. Identificar Empresa
    const { data: org, error } = await supabase
      .from("organizations")
      .select("id, bot_status, whatsapp_access_token, business_type, name")
      .eq("whatsapp_phone_id", businessPhoneId) 
      .single();

    if (error || !org) {
        console.log(`[Webhook] Ignorando: Empresa não encontrada para ID ${businessPhoneId}`);
        return new NextResponse("OK", { status: 200 });
    }

    if (!org.bot_status || !org.whatsapp_access_token) {
      console.log(`[Webhook] Bot desligado para ${org.name}`);
      return new NextResponse("OK", { status: 200 });
    }

    // 2. Processar Texto do Usuário
    const customerPhone = message.from;
    const customerName = value.contacts?.[0]?.profile?.name || "Visitante";
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
      } catch (err) {
          console.error("Erro processando áudio:", err);
          await sendWhatsAppMessage(org.whatsapp_access_token, businessPhoneId, customerPhone, "Não consegui ouvir o áudio. Pode escrever?");
          return new NextResponse("OK", { status: 200 });
      }
    }

    if (!userText) return new NextResponse("OK", { status: 200 });

    // 3. Preparar Execução do Bot
    
    // Wrapper simples para enviar mensagens (caso o bot precise mandar algo no meio do processo)
    const sendMessageWrapper = async (text: string) => {
        await sendWhatsAppMessage(org.whatsapp_access_token, businessPhoneId, customerPhone, text);
    };

    const botContext: BotContext = { 
        orgId: org.id, 
        history: [], // Implementar busca de histórico no Supabase aqui se desejar
        text: userText, 
        customerPhone, 
        customerName 
    };

    let botResult;

    // 4. Executar Bot Correto
    // AQUI ESTAVA O ERRO: Agora passamos os 3 argumentos que o real_estate.ts espera
    if (org.business_type === 'real_estate') {
        botResult = await botRealEstateControl(botContext, sendMessageWrapper, supabase);
    } 
    /* else if (org.business_type === 'delivery') {
        botResult = await botDeliveryControl(botContext, sendMessageWrapper, supabase);
    } else {
        botResult = await botSchedulingControl(botContext, sendMessageWrapper, supabase);
    }
    */
    else {
        // Fallback temporário se não for imobiliária
        console.log("Tipo de negócio não implementado ainda:", org.business_type);
        return new NextResponse("OK", { status: 200 });
    }

    // 5. Enviar Resposta Final
    if (botResult?.response) {
        await sendWhatsAppMessage(org.whatsapp_access_token, businessPhoneId, customerPhone, botResult.response);
    }

    return new NextResponse("OK", { status: 200 });

  } catch (error) {
    console.error("Erro Crítico Webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}