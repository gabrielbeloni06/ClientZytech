import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) return NextResponse.json({ error: "Org ID missing" }, { status: 400 });

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: org, error } = await supabase
    .from("organizations")
    .select("zapi_instance_id, zapi_token, zapi_client_token")
    .eq("id", orgId)
    .single();

  if (error || !org || !org.zapi_instance_id || !org.zapi_token) {
    console.error("Credenciais Z-API ausentes no banco:", error || "Dados incompletos");
    return NextResponse.json({ error: "Configuração Z-API incompleta." }, { status: 404 });
  }

  const instanceId = org.zapi_instance_id.trim();
  const token = org.zapi_token.trim();
  
  const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/qr-code/image`;

  try {
    const headers: any = {};
    
    if (org.zapi_client_token && org.zapi_client_token.trim() !== "") {
      headers["Client-Token"] = org.zapi_client_token.trim();
    }

    const response = await fetch(zapiUrl, { headers });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro Z-API ao pegar QR:", response.status, errorText);
        return NextResponse.json({ error: "Erro na Z-API", details: errorText }, { status: response.status });
    }

    const imageBlob = await response.blob();
    
    return new NextResponse(imageBlob, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });

  } catch (error) {
    console.error("Erro de conexão (QR Code):", error);
    return NextResponse.json({ error: "Falha interna ao conectar com Z-API" }, { status: 500 });
  }
}