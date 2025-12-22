import Groq from "groq-sdk";
import { SupabaseClient } from "@supabase/supabase-js";

// Definição clara da interface do contexto
export interface BotContext {
  orgId: string;
  history: any[];
  text: string;
  customerPhone: string;
  customerName?: string;
}

// Assinatura da função corrigida para aceitar 3 argumentos
export async function botRealEstateControl(
  context: BotContext, 
  sendMessage: (msg: string) => Promise<void>, 
  supabase: SupabaseClient
) {
  // Desestruturação do contexto
  const { orgId, history, text, customerPhone, customerName } = context;

  // Validação da API Key da IA
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
      console.error("CRÍTICO: GROQ_API_KEY não configurada.");
      return { response: "Erro de configuração: Chave de IA não encontrada.", action: "error" };
  }
  const groq = new Groq({ apiKey });

  // 1. Busca Configurações da Empresa
  const { data: orgSettings } = await supabase
    .from('organizations')
    .select('ai_persona, opening_hours, ai_faq')
    .eq('id', orgId)
    .single();

  const aiPersona = orgSettings?.ai_persona || "Você é um corretor imobiliário experiente.";
  const aiFaq = orgSettings?.ai_faq || "Sem FAQ cadastrado.";
  const openingHours = orgSettings?.opening_hours || "Horário Comercial";

  // 2. Busca Imóveis Ativos (Produto)
  const { data: properties } = await supabase
    .from('products')
    .select('id, name, price, address, neighborhood, city, state, property_link, property_details, category')
    .eq('organization_id', orgId)
    .eq('active', true) // Garante que só pega ativos
    .limit(20); // Limite seguro para não estourar tokens

  const propertiesText = properties && properties.length > 0
    ? properties.map(p => `
      [ID: ${p.id}]
      - Tipo: ${p.category} | Nome: ${p.name}
      - Local: ${p.neighborhood || ''}, ${p.city || ''}
      - Valor: R$ ${p.price}
      - Detalhes: ${p.property_details || 'N/A'}
      - Link: ${p.property_link || 'N/A'}
      `).join("\n")
    : "Não há imóveis cadastrados/disponíveis no momento.";

  // 3. Busca Agenda Ocupada
  const { data: busySlots } = await supabase
    .from('appointments')
    .select('appointment_date')
    .eq('org_id', orgId)
    .gte('appointment_date', new Date().toISOString())
    .limit(15);

  const busySlotsText = busySlots && busySlots.length > 0
    ? busySlots.map(s => new Date(s.appointment_date).toLocaleString('pt-BR')).join(", ")
    : "Agenda livre.";

  // 4. Montagem do Prompt
  const now = new Date();
  const currentDateString = now.toLocaleDateString("pt-BR", { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

  const systemPrompt = `
    ${aiPersona}
    
    ESTADO ATUAL:
    - Data/Hora: ${currentDateString}
    - Cliente: ${customerName || 'Visitante'} (${customerPhone})
    
    BASE DE CONHECIMENTO (FAQ):
    ${aiFaq}

    CARTEIRA DE IMÓVEIS:
    ${propertiesText}

    AGENDA:
    - Funcionamento: ${openingHours}
    - Horários Ocupados (Não agendar nestes): [${busySlotsText}]

    SEU OBJETIVO: Vender/Alugar imóveis e agendar visitas.

    DIRETRIZES:
    1. Se o cliente não souber o que quer, faça perguntas de qualificação (tipo, bairro, valor).
    2. Use a lista de IMÓVEIS acima para sugerir opções reais.
    3. Respostas curtas e objetivas (formato WhatsApp).

    AÇÕES (Use estas tags para executar comandos):
    - Transferir p/ Humano: [TRANSFER_TO_AGENT: Motivo]
    - Agendar Visita: [VISITA_CONFIRMADA: YYYY-MM-DDTHH:MM:SS|ID_IMOVEL|NOME_IMOVEL]
  `;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: text }
  ];

  try {
    // 5. Chamada LLM
    const completion = await groq.chat.completions.create({
      messages: messages as any,
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 800,
    });

    const aiResponse = completion.choices[0]?.message?.content || "";

    // 6. Processamento de Tags de Ação

    // Caso A: Transferência
    const transferMatch = aiResponse.match(/\[TRANSFER_TO_AGENT(?::\s*(.*?))?\]/);
    if (transferMatch || aiResponse.includes("[TRANSFER_TO_AGENT]")) {
        const reason = transferMatch ? transferMatch[1] : "Solicitação do cliente";

        await supabase.from('notifications').insert({
            organization_id: orgId,
            customer_phone: customerPhone,
            customer_name: customerName || 'Visitante',
            type: 'human_request',
            content: `Solicitação Humana: "${text.substring(0, 50)}..." | Motivo: ${reason}`,
            is_read: false
        });

        const cleanResponse = aiResponse.replace(/\[TRANSFER_TO_AGENT.*?\]/, "").trim();
        return { 
            response: cleanResponse || "Entendi. Vou chamar um de nossos corretores para falar com você agora mesmo.", 
            action: "transfer"
        };
    }

    // Caso B: Agendamento Confirmado
    const confirmationMatch = aiResponse.match(/\[VISITA_CONFIRMADA:\s*(.*?)\|(.*?)\|(.*?)\]/);
    if (confirmationMatch) {
        const dateString = confirmationMatch[1].trim();
        let productId = confirmationMatch[2].trim();
        const productName = confirmationMatch[3].trim();
        
        // Validação de UUID
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
        if (!isValidUUID || productId === 'GERAL') productId = null as any;

        // Inserir agendamento
        const { error: bookingError } = await supabase.from('appointments').insert({
            org_id: orgId,
            customer_phone: customerPhone,
            client_name: customerName || customerPhone,
            appointment_date: new Date(dateString).toISOString(),
            status: 'confirmed',
            product_id: productId
        });

        if (bookingError) console.error("Erro ao agendar:", bookingError);

        // Notificar admin
        await supabase.from('notifications').insert({
            organization_id: orgId,
            customer_phone: customerPhone,
            customer_name: customerName || 'Visitante',
            type: 'scheduled',
            content: `Visita agendada: ${dateString} - Imóvel: ${productName}`,
            is_read: false
        });

        return { 
            response: aiResponse.replace(/\[VISITA_CONFIRMADA:.*?\]/, "").trim(), 
            action: "visit_scheduled" 
        };
    }

    // Caso C: Resposta Normal
    return { response: aiResponse, action: "chat" };

  } catch (error) {
    console.error("Erro AI Real Estate:", error);
    return { response: "Desculpe, tive um erro de conexão. Tente novamente em instantes.", action: "error" };
  }
}