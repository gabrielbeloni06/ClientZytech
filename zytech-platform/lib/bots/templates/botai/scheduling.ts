import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

interface BotContext {
  orgId: string;
  history: any[];
  text: string;
  customerPhone: string;
}

export async function botSchedulingControl({ orgId, history, text, customerPhone }: BotContext) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
      console.error("ERRO: GROQ_API_KEY não configurada no .env");
      return { response: "Desculpe, estou em manutenção (Configuração de IA pendente).", action: "error" };
  }
  const groq = new Groq({ apiKey });

  const { data: orgSettings } = await supabase
    .from('organizations')
    .select('opening_hours')
    .eq('id', orgId)
    .single();

  const fixedPersona = "Você é a assistente virtual de agendamentos da empresa. Seja profissional, educada e direta.";
  const openingHours = orgSettings?.opening_hours || "Segunda a Sexta, das 09:00 às 18:00";

  const now = new Date();
  const currentDateString = now.toLocaleDateString("pt-BR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const currentTimeString = now.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });

  const { data: busySlots } = await supabase
    .from('appointments')
    .select('appointment_date')
    .eq('org_id', orgId)
    .gte('appointment_date', new Date().toISOString())
    .order('appointment_date', { ascending: true })
    .limit(10);

  const busySlotsText = busySlots && busySlots.length > 0
    ? busySlots.map(s => new Date(s.appointment_date).toLocaleString('pt-BR')).join(", ")
    : "Nenhum horário ocupado encontrado nos próximos dias.";

  const systemPrompt = `
    ${fixedPersona}
    
    CONTEXTO TEMPORAL ATUAL:
    - Hoje é: ${currentDateString}
    - Hora atual: ${currentTimeString}
    
    INFORMAÇÕES DA EMPRESA:
    - Horário de Funcionamento: ${openingHours}
    
    HORÁRIOS JÁ OCUPADOS (Não agende nestes horários exatos):
    [${busySlotsText}]

    SUAS REGRAS:
    1. Seu objetivo é encontrar um horário livre e confirmar o agendamento.
    2. Respeite RIGOROSAMENTE o horário de funcionamento.
    3. Se o cliente pedir um horário indisponível, sugira o próximo livre.
    4. Quando confirmar, responda com a tag: [AGENDAMENTO_CONFIRMADO: AAAA-MM-DD HH:MM] no final.
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

    const confirmationMatch = aiResponse.match(/\[AGENDAMENTO_CONFIRMADO:\s*(.*?)\]/);
    if (confirmationMatch) {
      const dateString = confirmationMatch[1];
      const { error } = await supabase.from('appointments').insert({
        org_id: orgId,
        appointment_date: new Date(dateString).toISOString(),
        customer_phone: customerPhone,
        status: "confirmed"
      });

      if (error) {
        console.error("Erro BD:", error);
        return { response: "Erro técnico ao agendar. Tente novamente.", action: "error" };
      }
      return { response: aiResponse.replace(/\[AGENDAMENTO_CONFIRMADO:.*?\]/, "").trim(), action: "scheduled" };
    }

    return { response: aiResponse, action: "chat" };

  } catch (error) {
    console.error("Erro AI BotAI:", error);
    return { response: "Erro de conexão.", action: "error" };
  }
}