import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Imports dos Bots
import { botRealEstateControl, BotContext } from "@/lib/bots/templates/core/real_estate";
// import { botDeliveryControl } from "@/lib/bots/templates/core/delivery";

import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { transcribeAudio } from "@/lib/groq-audio";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Health Check
export async function GET(req: NextRequest) {
  return new NextResponse("Evolution Webhook Online 🚀", { status: 200 });
}

// Recebimento de Mensagens
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validação do Evento (Evolution v2: messages.upsert)
    if (body.event !== 'messages.upsert') return new NextResponse("OK", { status: 200 });

    const msgData = body.data;
    const instanceName = body.instance; // Nome da instância = Phone ID no banco
    
    if (msgData.key.fromMe || msgData.key.remoteJid === 'status@broadcast') {
        return new NextResponse("OK", { status: 200 });
    }

    console.log(`>>> [MSG] De: ${msgData.pushName} | Instância: ${instanceName}`);

    // 2. Busca Empresa
    const { data: org } = await supabase
      .from("organizations")
      .select("id, bot_status, business_type, name, ai_faq, whatsapp_access_token")
      .eq("whatsapp_phone_id", instanceName) 
      .single();

    if (!org || !org.bot_status) return new NextResponse("OK", { status: 200 });

    // 3. Extração
    const customerPhone = msgData.key.remoteJid.replace('@s.whatsapp.net', '');
    const customerName = msgData.pushName || "Cliente";
    let userText = "";
    
    if (msgData.messageType === 'conversation') userText = msgData.message.conversation;
    else if (msgData.messageType === 'extendedTextMessage') userText = msgData.message.extendedTextMessage.text;
    else if (msgData.messageType === 'audioMessage') userText = "[Áudio]"; // Simplificado

    if (!userText) return new NextResponse("OK", { status: 200 });

    // 4. Memória
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

    // 5. Bot
    const sendMessageWrapper = async (text: string) => {
        if (!text) return;
        await sendWhatsAppMessage('', instanceName, customerPhone, text);
        await supabase.from('chat_messages').insert({
            organization_id: org.id,
            phone: customerPhone,
            role: 'assistant',
            content: text
        });
    };

    const botContext: BotContext = { 
        orgId: org.id, 
        history, 
        text: userText, 
        customerPhone, 
        customerName 
    };

    if (org.business_type === 'real_estate') {
        const result = await botRealEstateControl(botContext, sendMessageWrapper, supabase);
        if (result?.response) await sendMessageWrapper(result.response);
    } else {
        await sendMessageWrapper(`Olá! Sou o assistente da ${org.name}.`);
    }

    return new NextResponse("OK", { status: 200 });

  } catch (error) {
    console.error("Erro Webhook:", error);
    return new NextResponse("Error", { status: 500 });
  }
}