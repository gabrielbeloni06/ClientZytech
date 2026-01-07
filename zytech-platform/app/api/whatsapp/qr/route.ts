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

  const { data: org } = await supabase
    .from("organizations")
    .select("zapi_instance_id, zapi_token, zapi_client_token")
    .eq("id", orgId)
    .single();

  if (!org || !org.zapi_instance_id || !org.zapi_token) {
    return NextResponse.json({ error: "Z-API não configurada" }, { status: 404 });
  }

  const zapiUrl = `https://api.z-api.io/instances/${org.zapi_instance_id}/token/${org.zapi_token}/qr-code/image`;

  try {
    const headers: any = {};
    if (org.zapi_client_token) {
      headers["Client-Token"] = org.zapi_client_token;
    }

    const response = await fetch(zapiUrl, { headers });

    if (!response.ok) {
        const errorJson = await response.json();
        return NextResponse.json(errorJson, { status: response.status });
    }

    const imageBlob = await response.blob();
    
    return new NextResponse(imageBlob, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });

  } catch (error) {
    console.error("Erro ao buscar QR:", error);
    return NextResponse.json({ error: "Falha na conexão com Z-API" }, { status: 500 });
  }
}