import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Configuração do servidor incompleta (Faltam variáveis de ambiente)." }, 
      { status: 500 }
    );
  }

  return NextResponse.json({
    supabaseUrl: supabaseUrl,
    supabaseKey: supabaseAnonKey
  });
}