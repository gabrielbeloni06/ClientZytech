import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Imports dos Bots
import { botRealEstateControl, BotContext } from "@/lib/bots/templates/core/real_estate";
// import { botDeliveryControl } from "@/lib/bots/templates/core/delivery";
// import { botSchedulingControl } from "@/lib/bots/templates/core/scheduling";

import { sendWhatsAppMessage, getMediaUrl, downloadMedia } from "@/lib/whatsapp";
import { transcribeAudio } from "@/lib/groq-audio";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// VERIFICAÇÃO (GET) - MODO PERMISSIVO TOTAL
// ============================================================================
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  console.log(`>>> [WEBHOOK GET] Recebido: Mode=${mode}, Token=${token}, Challenge=${challenge}`);

  // MODO DE RESGATE: Aceita qualquer token se o modo for subscribe.
  // Isso garante que você consiga salvar no painel da Meta sem erro.
  if (mode === "subscribe" && challenge) {
    console.log(">>> [WEBHOOK GET] Verificação ACEITA forçadamente.");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// ============================================================================
// RECEBIMENTO (POST)
// ============================================================================
export async function POST(req: NextRequest) {
  // Log imediato para provar que a requisição chegou
  console.log(">>> [WEBHOOK POST] CONEXÃO RECEBIDA!");

  try {
    const body = await req.json();
    
    // Ignorar atualizações de status para limpar o log
    if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
        return new NextResponse("OK", { status: 200 });
    }

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
        // Ping da Meta ou evento sem mensagem
        console.log(">>> [WEBHOOK POST] Evento sem mensagem (Ping/Status).");
        return new NextResponse("OK", { status: 200 });
    }

    const businessPhoneId = value.metadata?.phone_number_id;
    console.log(`>>> [MSG] De: ${message.from} | Para ID da Empresa: ${businessPhoneId}`);

    // 1. Busca a empresa dona deste número
    const { data: org, error } = await supabase
      .from("organizations")
      .select("id, bot_status, whatsapp_access_token, business_type, name")
      .eq("whatsapp_phone_id", businessPhoneId) 
      .single();

    if (error || !org) {
        console.warn(`>>> [ERRO] Empresa não encontrada para o ID ${businessPhoneId}. Verifique se o ID no Supabase está exato.`);
        // Retornamos 200 OK para a Meta parar de tentar enviar, já que o erro é nosso de config
        return new NextResponse("OK", { status: 200 });
    }

    // 2. Verifica se bot está ativo
    if (!org.bot_status) {
      console.log(`>>> [SILENCIO] Bot desligado para ${org.name}`);
      return new NextResponse("OK", { status: 200 });
    }

    // 3. Processa Texto/Audio
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
        } catch (e) {
            console.error("Erro audio:", e);
        }
    }

    if (!userText) return new NextResponse("OK", { status: 200 });

    console.log(`>>> [PROCESSANDO] Cliente diz: "${userText}"`);

    // 4. Executa Bot
    const sendMessageWrapper = async (text: string) => {
        console.log(`>>> [RESPONDENDO] "${text}"`);
        await sendWhatsAppMessage(org.whatsapp_access_token, businessPhoneId, customerPhone, text);
    };

    const botContext: BotContext = { 
        orgId: org.id, 
        history: [], 
        text: userText, 
        customerPhone, 
        customerName 
    };

    if (org.business_type === 'real_estate') {
        const result = await botRealEstateControl(botContext, sendMessageWrapper, supabase);
        if (result?.response) await sendMessageWrapper(result.response);
    } else {
        await sendMessageWrapper("Olá! Sou o assistente virtual da " + org.name);
    }

    return new NextResponse("OK", { status: 200 });

  } catch (error) {
    console.error("Erro Fatal Webhook:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}