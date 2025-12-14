import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

interface BotContext {
  orgId: string;
  history: any[];
  text: string;
  customerPhone: string;
}

export async function botDeliveryControl({ orgId, history, text, customerPhone }: BotContext) {
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
    .select('ai_persona')
    .eq('id', orgId)
    .single();

  const aiPersona = orgSettings?.ai_persona || "Você é um assistente de vendas premium.";

  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, description')
    .eq('organization_id', orgId)
    .eq('active', true);

  const catalogText = products && products.length > 0
    ? products.map(p => `- ${p.name} (R$ ${p.price}): ${p.description || ''}`).join("\n")
    : "Estamos atualizando nosso cardápio.";

  const systemPrompt = `
    INSTRUÇÃO DE PERSONALIDADE (PRIORITÁRIA):
    ${aiPersona}
    
    CATÁLOGO EXCLUSIVO:
    ${catalogText}

    OBJETIVO:
    Vender e encantar o cliente. Use a personalidade definida para oferecer os produtos.
    Sugira combinações se fizer sentido com a persona.
    Ao fechar o pedido, use a tag técnica: [PEDIDO_CONFIRMADO: ITENS|TOTAL]
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
      temperature: 0.7,
      max_tokens: 600,
    });

    const aiResponse = completion.choices[0]?.message?.content || "Um momento, por favor.";

    if (aiResponse.includes("[PEDIDO_CONFIRMADO")) {
        return { response: aiResponse.replace(/\[PEDIDO_CONFIRMADO.*?\]/, "").trim(), action: "order_placed" };
    }

    return { response: aiResponse, action: "chat" };

  } catch (error) {
    console.error("Erro AI Delivery ZyCore:", error);
    return { response: "Instabilidade momentânea.", action: "error" };
  }
}