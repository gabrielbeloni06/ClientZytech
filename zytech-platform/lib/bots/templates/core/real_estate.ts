import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

interface BotContext {
  orgId: string;
  history: any[];
  text: string;
  customerPhone: string;
  customerName?: string;
}

export async function botRealEstateControl({ orgId, history, text, customerPhone, customerName }: BotContext) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
      return { response: "Erro de configuração: Chave de IA não encontrada.", action: "error" };
  }
  const groq = new Groq({ apiKey });
  const { data: orgSettings } = await supabase
    .from('organizations')
    .select('ai_persona, opening_hours, ai_faq')
    .eq('id', orgId)
    .single();

  const aiPersona = orgSettings?.ai_persona || "Você é um corretor imobiliário experiente.";
  const aiFaq = orgSettings?.ai_faq || "Sem FAQ cadastrado.";
  const openingHours = orgSettings?.opening_hours || "Comercial";
  const { data: properties } = await supabase
    .from('products')
    .select('id, name, price, address, neighborhood, city, state, property_link, property_details, category')
    .eq('organization_id', orgId)
    .eq('active', true)
    .limit(30);

  const propertiesText = properties && properties.length > 0
    ? properties.map(p => `
      [ID: ${p.id}]
      - Tipo: ${p.category} | Nome: ${p.name}
      - Local: ${p.neighborhood || ''}, ${p.city || ''}-${p.state || ''}
      - Valor: R$ ${p.price}
      - Detalhes: ${p.property_details || 'N/A'}
      - Link: ${p.property_link || 'N/A'}
      `).join("\n")
    : "Não há imóveis cadastrados no momento.";

  const { data: busySlots } = await supabase
    .from('appointments')
    .select('appointment_date')
    .eq('org_id', orgId)
    .gte('appointment_date', new Date().toISOString())
    .limit(15);

  const busySlotsText = busySlots && busySlots.length > 0
    ? busySlots.map(s => new Date(s.appointment_date).toLocaleString('pt-BR')).join(", ")
    : "Agenda livre.";

  const now = new Date();
  const currentDateString = now.toLocaleDateString("pt-BR", { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

  const systemPrompt = `
    ${aiPersona}
    
    ESTADO ATUAL:
    - Data/Hora: ${currentDateString}
    - Cliente: ${customerName || 'Visitante'}
    
    BASE DE CONHECIMENTO (FAQ):
    ${aiFaq}

    CARTEIRA DE IMÓVEIS:
    ${propertiesText}

    AGENDA:
    - Funcionamento: ${openingHours}
    - Ocupados: [${busySlotsText}]

    SEU OBJETIVO: Vender/Alugar imóveis e agendar visitas.

    ROTEIRO DE ATENDIMENTO (Siga se o cliente estiver "perdido"):
    1. Pergunte se já conhece a imobiliária.
    2. Se não tem imóvel em mente, faça o RAIO-X:
       - Qual tipo? (Casa, Apartamento, Lote, Comercial)
       - Qual finalidade? (Compra ou Aluguel)
       - Qual localização desejada? (Bairro/Cidade)
    3. Com essas infos, busque na CARTEIRA DE IMÓVEIS acima e sugira opções.
    4. Se o cliente gostar, envie o Link e ofereça visita.

    REGRAS CRÍTICAS:
    1. Se o cliente perguntar algo difícil, técnico demais ou pedir para falar com humano, responda educadamente que vai chamar o especialista e USE A TAG: [TRANSFER_TO_AGENT: Motivo]
    2. Se não encontrar imóveis no perfil, pegue os dados dele e diga que um corretor vai procurar algo exclusivo. USE A TAG: [TRANSFER_TO_AGENT: Prospecção]
    3. Para agendar visita, use: [VISITA_CONFIRMADA: DATA_ISO|ID_IMOVEL|NOME]
  `;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: text }
  ];

  try {
    const completion = await groq.chat.completions.create({
      messages: messages as any,
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 800,
    });

    const aiResponse = completion.choices[0]?.message?.content || "";

    const transferMatch = aiResponse.match(/\[TRANSFER_TO_AGENT(?::\s*(.*?))?\]/);
    if (transferMatch || aiResponse.includes("[TRANSFER_TO_AGENT]")) {
        const reason = transferMatch ? transferMatch[1] : "Solicitação do cliente ou assunto complexo";

        await supabase.from('notifications').insert({
            organization_id: orgId,
            customer_phone: customerPhone,
            customer_name: customerName || 'Visitante',
            type: 'human_request',
            content: `Solicitação: "${text.substring(0, 40)}..." | Motivo AI: ${reason || 'Geral'}`,
            is_read: false
        });

        return { 
            response: aiResponse.replace(/\[TRANSFER_TO_AGENT.*?\]/, "").trim() || "Entendi. Vou chamar um de nossos corretores para falar com você agora mesmo.", 
            action: "transfer"
        };
    }

    const confirmationMatch = aiResponse.match(/\[VISITA_CONFIRMADA:\s*(.*?)\|(.*?)\|(.*?)\]/);
    if (confirmationMatch) {
        const dateString = confirmationMatch[1].trim();
        const productId = confirmationMatch[2].trim() === 'GERAL' ? null : confirmationMatch[2].trim();
        const productName = confirmationMatch[3].trim();
        
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId || '');

        await supabase.from('appointments').insert({
            org_id: orgId,
            customer_phone: customerPhone,
            client_name: customerName || customerPhone,
            appointment_date: new Date(dateString).toISOString(),
            status: 'confirmed',
            product_id: isValidUUID ? productId : null
        });

        await supabase.from('notifications').insert({
            organization_id: orgId,
            customer_phone: customerPhone,
            customer_name: customerName || 'Visitante',
            type: 'scheduled',
            content: `Nova visita agendada para ${dateString} - Imóvel: ${productName || 'Não especificado'}`,
            is_read: false
        });

        return { 
            response: aiResponse.replace(/\[VISITA_CONFIRMADA:.*?\]/, "").trim(), 
            action: "visit_scheduled" 
        };
    }

    return { response: aiResponse, action: "chat" };

  } catch (error) {
    console.error("Erro AI Real Estate:", error);
    return { response: "Erro de conexão momentâneo.", action: "error" };
  }
}