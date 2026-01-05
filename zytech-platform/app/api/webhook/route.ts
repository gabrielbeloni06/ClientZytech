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

// Health Check para o painel da Evolution (se necessário)
export async function GET(req: NextRequest) {
  return new NextResponse("Evolution Webhook Online 🚀", { status: 200 });
}

// ============================================================================
// RECEBIMENTO DE MENSAGENS (EVOLUTION API)
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validação do Evento
    // A Evolution v2 envia 'event': 'messages.upsert' para novas mensagens
    if (body.event !== 'messages.upsert') {
        // Ignora eventos de status, presença, etc. para não poluir
        return new NextResponse("OK", { status: 200 });
    }

    const msgData = body.data;
    const instanceName = body.instance; // O nome da instância (Ex: "imobiliaria_01")
    
    // 2. Filtros Básicos
    // Ignorar mensagens enviadas pelo próprio bot (fromMe)
    if (msgData.key.fromMe) return new NextResponse("OK", { status: 200 });

    // Ignorar mensagens de Status (Broadcast)
    if (msgData.key.remoteJid === 'status@broadcast') return new NextResponse("OK", { status: 200 });

    // (Opcional) Ignorar Grupos se o bot for apenas para atendimento direto
    // if (msgData.key.remoteJid.includes('@g.us')) return new NextResponse("OK", { status: 200 });

    console.log(`>>> [EVO WEBHOOK] Msg de ${msgData.pushName} na instância: ${instanceName}`);

    // 3. Identificar Empresa no Supabase
    // Usamos o 'whatsapp_phone_id' para armazenar o 'Nome da Instância' da Evolution
    const { data: org, error } = await supabase
      .from("organizations")
      .select("id, bot_status, business_type, name, ai_faq, whatsapp_access_token")
      .eq("whatsapp_phone_id", instanceName) 
      .single();

    if (!org) {
        console.warn(`>>> [EVO IGNORED] Instância '${instanceName}' não encontrada no banco.`);
        return new NextResponse("OK", { status: 200 });
    }

    if (!org.bot_status) {
        // Bot desligado, apenas ignora
        return new NextResponse("OK", { status: 200 });
    }

    // 4. Extração de Dados da Mensagem
    const customerPhone = msgData.key.remoteJid.replace('@s.whatsapp.net', ''); // Remove o sufixo
    const customerName = msgData.pushName || "Cliente";
    let userText = "";
    
    const messageType = msgData.messageType;

    // Tratamento de tipos de mensagem da Evolution
    if (messageType === 'conversation') {
        userText = msgData.message.conversation;
    } else if (messageType === 'extendedTextMessage') {
        userText = msgData.message.extendedTextMessage.text;
    } else if (messageType === 'audioMessage') {
        // Lógica de áudio (Simplificada para não travar se falhar transcrição)
        // A Evolution geralmente manda o base64 se configurado, ou precisamos baixar
        console.log(">>> [AUDIO] Recebido, transcrição pendente de implementação completa.");
        userText = "[Áudio recebido]"; 
        // Se quiser implementar transcrição, use:
        // const buffer = await downloadMediaEvolution(msgData);
        // userText = await transcribeAudio(buffer);
    }

    if (!userText) return new NextResponse("OK", { status: 200 });

    // 5. MÓDULO DE MEMÓRIA (Salvar no Banco)
    await supabase.from('chat_messages').insert({
        organization_id: org.id,
        phone: customerPhone,
        role: 'user',
        content: userText,
        sender_name: customerName
    });

    // 6. Recuperar Contexto (Últimas 6 mensagens)
    const { data: historyData } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('organization_id', org.id)
        .eq('phone', customerPhone)
        .order('created_at', { ascending: false })
        .limit(6);
    
    const history = historyData ? historyData.reverse() : [];

    // 7. Preparar Envio de Resposta
    const sendMessageWrapper = async (responseText: string) => {
        if (!responseText) return;

        // Envia via Evolution API
        // Nota: O primeiro argumento (token) deixamos vazio pois usamos a chave global no lib/whatsapp.ts
        await sendWhatsAppMessage(
            '', 
            instanceName, // Nome da instância
            customerPhone, 
            responseText
        );
        
        // Salva resposta do bot no banco
        await supabase.from('chat_messages').insert({
            organization_id: org.id,
            phone: customerPhone,
            role: 'assistant',
            content: responseText
        });
    };

    // Contexto para o Bot
    const botContext: BotContext = { 
        orgId: org.id, 
        history, 
        text: userText, 
        customerPhone, 
        customerName 
    };

    // 8. Roteamento de Bots
    if (org.business_type === 'real_estate') {
        const result = await botRealEstateControl(botContext, sendMessageWrapper, supabase);
        
        // Se o bot retornar uma resposta final direta
        if (result?.response) {
            await sendMessageWrapper(result.response);
        }
    } 
    else if (org.business_type === 'delivery') {
        // const result = await botDeliveryControl(botContext, sendMessageWrapper, supabase);
        // if (result?.response) await sendMessageWrapper(result.response);
    }
    else {
        // Fallback Genérico
        await sendMessageWrapper(`Olá! Sou o assistente virtual da ${org.name}. Em que posso ajudar?`);
    }

    return new NextResponse("OK", { status: 200 });

  } catch (error: any) {
    console.error("Erro Crítico Webhook Evolution:", error);
    // Retorna 200 mesmo com erro para a Evolution não ficar tentando reenviar a mensagem infinitamente
    return new NextResponse("Internal Error Handled", { status: 200 });
  }
}