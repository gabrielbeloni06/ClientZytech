import { NextResponse } from "next/server";
import { botSchedulingControl } from "@/lib/bots/templates/botai/scheduling";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text");
  const orgId = searchParams.get("orgId") || "8b6d716e-f842-4cc2-bb76-1f9bd4bb9d95";

  if (!text) {
    return NextResponse.json(
      { error: "Parâmetro 'text' é obrigatório. Ex: ?text=Quero agendar" },
      { status: 400 }
    );
  }

  try {
    const fakeHistory: any[] = [];

    const result = await botSchedulingControl({
      orgId,
      history: fakeHistory,
      text,
    });

    return NextResponse.json({
      original_text: text,
      bot_response: result.response,
      action_taken: result.action
    });

  } catch (error: any) {
    console.error("Erro no teste de agendamento:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno no servidor" },
      { status: 500 }
    );
  }
}