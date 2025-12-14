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

  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, description')
    .eq('organization_id', orgId)
    .eq('active', true);

  const catalogText = products && products.length > 0
    ? products.map(p => `- ${p.name} (R$ ${p.price}): ${p.description || ''}`).join("\n")
    : "Cardápio vazio no momento.";

  const systemPrompt = `
    Você é o assistente virtual de delivery da loja (ZyBotAI).
    
    CATÁLOGO DISPONÍVEL:
    ${catalogText}

    SUAS REGRAS:
    1. Responda dúvidas sobre produtos e preços baseando-se APENAS no catálogo acima.
    2. Se o cliente quiser algo fora do catálogo, diga educadamente que não tem.
    3. Seja direto e eficiente.
    4. Para confirmar um pedido, liste os itens e o total.
    5. Quando o cliente confirmar finalização, responda com a tag: [PEDIDO_CONFIRMADO: ITENS|TOTAL]
  `;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: text }
  ];

  try {
    const completion = await groq.chat.completions.create({
      messages: messages as any,
      model: "llama-3.1-8b-instant",
      temperature: 0.5,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0]?.message?.content || "Desculpe, não entendi.";

    if (aiResponse.includes("[PEDIDO_CONFIRMADO")) {
        return { response: aiResponse.replace(/\[PEDIDO_CONFIRMADO.*?\]/, "").trim(), action: "order_placed" };
    }

    return { response: aiResponse, action: "chat" };

  } catch (error) {
    console.error("Erro AI Delivery BotAI:", error);
    return { response: "Erro de conexão.", action: "error" };
  }
}