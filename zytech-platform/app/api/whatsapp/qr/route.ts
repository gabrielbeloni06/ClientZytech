import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) return NextResponse.json({ error: "ID da organização faltando." }, { status: 400 });

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Busca credenciais
    const { data: org, error } = await supabase
      .from("organizations")
      .select("zapi_instance_id, zapi_token, zapi_client_token")
      .eq("id", orgId)
      .single();

    if (error || !org || !org.zapi_instance_id || !org.zapi_token) {
      return NextResponse.json({ error: "Credenciais não encontradas no banco de dados." }, { status: 404 });
    }

    const instanceId = org.zapi_instance_id.trim();
    const token = org.zapi_token.trim();
    const clientToken = org.zapi_client_token?.trim();

    // 2. Chama a Z-API
    const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/qr-code/image`;
    
    const headers: any = {};
    if (clientToken) headers["Client-Token"] = clientToken;

    const response = await fetch(zapiUrl, { headers });
    const contentType = response.headers.get("content-type");

    // 3. Verifica se é Erro (JSON) ou Sucesso (Imagem)
    if (contentType && contentType.includes("application/json")) {
        // É um erro ou aviso (ex: já conectado)
        const errorJson = await response.json();
        console.error("Z-API Retornou JSON (Erro/Aviso):", errorJson);
        
        if (errorJson.connected) {
            return NextResponse.json({ error: "Esta instância já está conectada!", connected: true }, { status: 400 });
        }
        
        return NextResponse.json({ error: errorJson.message || errorJson.error || "Erro na Z-API" }, { status: response.status });
    }

    if (!response.ok) {
        return NextResponse.json({ error: `Erro na Z-API: ${response.statusText}` }, { status: response.status });
    }

    // 4. Sucesso: Converte a imagem para Base64 para garantir transporte seguro
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;

    return NextResponse.json({ qr: base64Image });

  } catch (err: any) {
    console.error("Erro interno:", err);
    return NextResponse.json({ error: "Erro interno no servidor", details: err.message }, { status: 500 });
  }
}