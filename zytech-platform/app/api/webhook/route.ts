import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { botRealEstateControl, BotContext } from "@/lib/bots/templates/core/real_estate";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { transcribeAudio } from "@/lib/groq-audio";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  return new NextResponse("Evolution Webhook Online 🚀", { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.event !== 'messages.upsert') {
        return new NextResponse("OK", { status: 200 });
    }

    const msgData = body.data;
    const instanceName = body.instance; 
    
    if (msgData.key.fromMe) return new NextResponse("OK", { status: 200 });

    if (msgData.key.remoteJid.includes('@g.us')) return new NextResponse("OK", { status: 200 });

    console.log(`>>> [EVO] Nova msg em: ${instanceName} | De: ${msgData.pushName}`);

    const { data: org, error } = await supabase
      .from("organizations")
      .select("id, bot_status, business_type, name, ai_faq, whatsapp_access_token")
      .eq("whatsapp_phone_id", instanceName) 
      .single();

    if (!org || !org.bot_status) {
        console.log(`>>> [EVO] Ignorado: Instância '${instanceName}' não encontrada ou bot desligado.`);
        return new NextResponse("OK", { status: 200 });
    }

    const customerPhone = msgData.key.remoteJid.replace('@s.whatsapp.net', '');
    const customerName = msgData.pushName || "Cliente";
    let userText = "";

    const messageType = msgData.messageType;

    if (messageType === 'conversation') {
        userText = msgData.message.conversation;
    } else if (messageType === 'extendedTextMessage') {
        userText = msgData.message.extendedTextMessage.text;
    } else if (messageType === 'audioMessage') {
        userText = "[Áudio recebido]"; 
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

    const sendMessageWrapper = async (response: string) => {
        if (!response) return;

        await sendWhatsAppMessage(
            '', 
            instanceName, 
            customerPhone, 
            response
        );
        
        await supabase.from('chat_messages').insert({
            organization_id: org.id,
            phone: customerPhone,
            role: 'assistant',
            content: response
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
        await sendMessageWrapper("Olá! Sou o assistente virtual da " + org.name);
    }

    return new NextResponse("OK", { status: 200 });

  } catch (error) {
    console.error("Erro Crítico Webhook Evolution:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}