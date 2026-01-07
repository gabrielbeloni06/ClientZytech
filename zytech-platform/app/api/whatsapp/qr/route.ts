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
    const { data: org, error } = await supabase
      .from("organizations")
      .select("zapi_instance_id, zapi_token, zapi_client_token")
      .eq("id", orgId)
      .single();

    if (error || !org || !org.zapi_instance_id || !org.zapi_token) {
      return NextResponse.json({ error: "Credenciais Z-API não encontradas no banco." }, { status: 404 });
    }

    const instanceId = org.zapi_instance_id.trim();
    const token = org.zapi_token.trim();
    const clientToken = org.zapi_client_token ? org.zapi_client_token.trim() : "";

    const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/qr-code/image`;

    const headers: any = {};
    if (clientToken) {
      headers["Client-Token"] = clientToken;
    }

    const response = await fetch(zapiUrl, { headers });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Z-API Error] Status: ${response.status} - Body: ${errorText}`);
        
        return NextResponse.json(
            { error: `Erro Z-API (${response.status})`, details: errorText }, 
            { status: response.status }
        );
    }

    const imageBlob = await response.blob();
    return new NextResponse(imageBlob, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });

  } catch (err: any) {
    console.error("Erro interno no Proxy QR:", err);
    return NextResponse.json({ error: "Erro interno do servidor", details: err.message }, { status: 500 });
  }
}