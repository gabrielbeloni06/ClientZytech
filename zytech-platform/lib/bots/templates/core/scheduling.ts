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
      return { response: "Erro de configuração: Chave de IA não encontrada.", action: "error" };
  }
  const groq = new Groq({ apiKey });

  const { data: orgSettings } = await supabase
    .from('organizations')
    .select('ai_persona, opening_hours')
    .eq('id', orgId)
    .single();

  const aiPersona = orgSettings?.ai_persona || "Você é um assistente virtual premium. Atenda com excelência.";
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
    : "Agenda livre.";

  const systemPrompt = `
    INSTRUÇÃO DE PERSONALIDADE (PRIORITÁRIA):
    ${aiPersona}
    
    CONTEXTO TEMPORAL:
    - Hoje: ${currentDateString} (${currentTimeString})
    
    REGRAS DE NEGÓCIO:
    - Funcionamento: ${openingHours}
    - Horários Ocupados: [${busySlotsText}]

    OBJETIVO:
    Agendar horário. Use a personalidade definida acima em TODAS as respostas.
    Ao confirmar, use APENAS a tag técnica no final: [AGENDAMENTO_CONFIRMADO: AAAA-MM-DD HH:MM]
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

    const aiResponse = completion.choices[0]?.message?.content || "Desculpe, não consegui processar.";

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
        console.error("Erro BD Core:", error);
        return { response: "Houve um erro no sistema ao salvar. Tente novamente.", action: "error" };
      }
      return { response: aiResponse.replace(/\[AGENDAMENTO_CONFIRMADO:.*?\]/, "").trim(), action: "scheduled" };
    }

    return { response: aiResponse, action: "chat" };

  } catch (error) {
    console.error("Erro AI ZyCore:", error);
    return { response: "Instabilidade momentânea.", action: "error" };
  }
}