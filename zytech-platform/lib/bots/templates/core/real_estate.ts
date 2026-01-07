import Groq from "groq-sdk";
import { SupabaseClient } from "@supabase/supabase-js";

export interface BotContext {
  orgId: string;
  history: any[];
  text: string;
  customerPhone: string;
  customerName?: string;
}

export async function botRealEstateControl(
  context: BotContext, 
  sendMessage: (msg: string) => Promise<void>, 
  supabase: SupabaseClient
) {
  const { orgId, history, text, customerPhone, customerName } = context;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
      console.error("CRÍTICO: GROQ_API_KEY ausente.");
      return { response: "Desculpe, estou atualizando meu sistema. Um momento.", action: "error" };
  }
  const groq = new Groq({ apiKey });

  const { data: orgSettings } = await supabase
    .from('organizations')
    .select('ai_persona, opening_hours, ai_faq')
    .eq('id', orgId)
    .single();

  const aiPersona = orgSettings?.ai_persona || "Você é um consultor imobiliário sênior da Clientzy.";
  const aiFaq = orgSettings?.ai_faq || "";
  const openingHours = orgSettings?.opening_hours || "09:00 às 18:00";

  const { data: properties } = await supabase
    .from('products')
    .select('id, name, price, address, neighborhood, city, property_details, property_link, category')
    .eq('organization_id', orgId)
    .eq('is_available', true) 
    .limit(15); 

  const propertiesText = properties && properties.length > 0
    ? properties.map(p => `
      - ID: ${p.id} | Tipo: ${p.category}
      - Imóvel: ${p.name}
      - Local: ${p.neighborhood} (${p.city})
      - Valor: R$ ${p.price?.toLocaleString('pt-BR')}
      - Detalhes: ${p.property_details || ''}
      - Link: ${p.property_link || ''}
      `).join("\n")
    : "AVISO: Nenhum imóvel disponível no sistema agora.";

  const now = new Date();
  const { data: busySlots } = await supabase
    .from('appointments')
    .select('appointment_date')
    .eq('org_id', orgId)
    .gte('appointment_date', now.toISOString())
    .eq('status', 'confirmed')
    .limit(20);

  const busySlotsText = busySlots?.map(s => 
      new Date(s.appointment_date).toLocaleString('pt-BR', { day: '2-digit', hour: '2-digit', minute:'2-digit' })
  ).join(", ") || "Agenda Livre";

  const currentDateString = now.toLocaleDateString("pt-BR", { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

  const systemPrompt = `
    ${aiPersona}
    
    [CONTEXTO ATUAL]
    Data e Hora: ${currentDateString}
    Cliente: ${customerName || 'Visitante'} (Tel: ${customerPhone})
    
    [BASE DE CONHECIMENTO]
    FAQ da Empresa: ${aiFaq}
    
    [LISTA DE IMÓVEIS DISPONÍVEIS]
    ${propertiesText}
    
    [DISPONIBILIDADE DE AGENDA]
    Horário de Funcionamento: ${openingHours}
    Horários JÁ Ocupados (Não agendar nestes): [${busySlotsText}]

    [SUA MISSÃO]
    Atender o cliente, tirar dúvidas sobre os imóveis listados e tentar agendar uma visita.
    Seja persuasivo, educado e profissional.

    [REGRAS DE OURO - SEGURANÇA & NEGOCIAÇÃO]
    1. PROIBIDO NEGOCIAR VALORES: Você NÃO tem autorização para dar descontos, aceitar contrapropostas ou negociar o preço listado.
    2. SE O CLIENTE PEDIR DESCONTO: Diga educadamente que não tem alçada para alterar valores e use a tag de transferência IMEDIATAMENTE: [TRANSFER_TO_AGENT: Tentativa de Negociação].
    3. JAMAIS invente imóveis que não estão na lista acima. Se não estiver na lista, diga que não temos no momento.
    4. Mantenha respostas curtas e objetivas (máximo 2 parágrafos).

    [COMANDOS DO SISTEMA]
    - Para transferir para humano: [TRANSFER_TO_AGENT: Motivo Resumido]
    - Para confirmar agendamento: [VISITA_CONFIRMADA: YYYY-MM-DDTHH:MM:SS|ID_IMOVEL_OU_NULL|NOME_DO_IMOVEL]
  `;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6), 
    { role: "user", content: text }
  ];

  try {
    const completion = await groq.chat.completions.create({
      messages: messages as any,
      model: "llama-3.3-70b-versatile",
      temperature: 0.3, 
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0]?.message?.content || "";

    const transferMatch = aiResponse.match(/\[TRANSFER_TO_AGENT(?::\s*(.*?))?\]/);
    
    if (transferMatch || aiResponse.includes("[TRANSFER_TO_AGENT]")) {
        const reason = transferMatch ? transferMatch[1] : "Solicitação do cliente";

        await supabase.from('notifications').insert({
            organization_id: orgId,
            customer_phone: customerPhone,
            customer_name: customerName || 'Visitante',
            type: 'human_request',
            content: `Humano Solicitado. Motivo: ${reason}`,
            is_read: false
        });

        await supabase.from('customers')
            .update({ is_bot_paused: true })
            .eq('organization_id', orgId)
            .eq('phone', customerPhone);
        
        const cleanResponse = aiResponse.replace(/\[TRANSFER_TO_AGENT.*?\]/, "").trim();
        return { 
            response: cleanResponse || "Entendi. Vou transferir seu atendimento para um de nossos especialistas. Um momento, por favor.", 
            action: "transfer"
        };
    }

    const confirmationMatch = aiResponse.match(/\[VISITA_CONFIRMADA:\s*(.*?)\|(.*?)\|(.*?)\]/);
    if (confirmationMatch) {
        const dateString = confirmationMatch[1].trim();
        let productId = confirmationMatch[2].trim();
        const productName = confirmationMatch[3].trim();
        
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
            productId = null as any;
        }

        await supabase.from('appointments').insert({
            org_id: orgId,
            customer_phone: customerPhone,
            client_name: customerName || customerPhone,
            appointment_date: new Date(dateString).toISOString(),
            status: 'confirmed',
            product_id: productId
        });

        await supabase.from('notifications').insert({
            organization_id: orgId,
            customer_phone: customerPhone,
            customer_name: customerName || 'Visitante',
            type: 'scheduled',
            content: `Visita Agendada: ${new Date(dateString).toLocaleDateString('pt-BR')} - ${productName}`,
            is_read: false
        });

        const cleanResponse = aiResponse.replace(/\[VISITA_CONFIRMADA:.*?\]/, "").trim();
        return { response: cleanResponse, action: "visit_scheduled" };
    }

    return { response: aiResponse, action: "chat" };

  } catch (error) {
    console.error("Erro AI:", error);
    return { response: "Desculpe, tive um lapso momentâneo. Poderia repetir?", action: "error" };
  }
}