import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: NextRequest) {
  try {

    const payload = await req.json();
    const { record, table, type } = payload;

    if (type !== 'INSERT') return NextResponse.json({ message: "Ignorado (não é insert)" });

    console.log(`>>> [PUSH] Novo evento na tabela: ${table}`);

    let orgId = record.organization_id || record.org_id;
    let title = "Nova Atualização";
    let body = "Você tem uma nova notificação.";
    let data = { url: "myapp://dashboard" };

    if (table === 'chat_messages') {
        if (record.role !== 'user') return NextResponse.json({ message: "Ignorado (msg enviada)" });
        
        title = `💬 Nova mensagem de ${record.sender_name || 'Cliente'}`;
        body = record.content.substring(0, 100);
        data = { url: `myapp://chat/${record.phone}` }; 
    } 
    else if (table === 'appointments') {
        title = `📅 Novo Agendamento!`;
        body = `${record.client_name} agendou para ${new Date(record.appointment_date).toLocaleDateString('pt-BR')} às ${new Date(record.appointment_date).toLocaleTimeString('pt-BR')}`;
    }
    else {
        return NextResponse.json({ message: "Tabela não monitorada" });
    }

    if (!orgId) return NextResponse.json({ error: "Organization ID não encontrado no registro" });

    const { data: tokens } = await supabase
      .from('user_push_tokens')
      .select('token')
      .eq('organization_id', orgId);

    if (!tokens || tokens.length === 0) {
        return NextResponse.json({ message: "Nenhum dispositivo registrado para esta empresa." });
    }

    const messages = tokens.map(t => ({
      to: t.token,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      priority: 'high'
    }));

    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoData = await expoRes.json();
    console.log(`>>> [PUSH] Enviado para ${tokens.length} dispositivos.`);

    return NextResponse.json(expoData);

  } catch (error: any) {
    console.error("Erro no Push:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}