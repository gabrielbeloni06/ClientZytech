import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EVO_URL = process.env.EVOLUTION_API_URL!;
// Remove barra final se houver
const BASE_URL = EVO_URL?.endsWith('/') ? EVO_URL.slice(0, -1) : EVO_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY!;

// Delay auxiliar
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    console.log(`>>> [CONEXÃO] Checando: ${instanceName}`);

    // 1. VERIFICAR STATUS ATUAL
    let state = 'undefined';
    try {
        const stateRes = await fetch(`${BASE_URL}/instance/connectionState/${instanceName}`, {
             headers: { 'apikey': EVO_KEY }
        });
        if (stateRes.ok) {
            const data = await stateRes.json();
            state = data?.instance?.state || 'close';
        }
    } catch (e) {
        state = 'undefined';
    }

    console.log(`>>> [STATUS] Estado atual: ${state}`);

    // CENÁRIO A: Já conectado
    if (state === 'open') {
        return NextResponse.json({ status: "connected", message: "Conectado!" });
    }

    // CENÁRIO B: Instância Travada ou Inexistente -> RESET NUCLEAR
    // Se não estiver 'connecting' (boot) nem 'open', assumimos que está quebrada ou não existe.
    if (state !== 'connecting') {
        console.log(`>>> [RESET] Estado '${state}' inválido. Recriando do zero...`);
        
        // 1. Deleta
        try {
            await fetch(`${BASE_URL}/instance/delete/${instanceName}`, {
                method: "DELETE",
                headers: { 'apikey': EVO_KEY }
            });
            await delay(2000); // Tempo pro banco limpar
        } catch (e) {}

        // 2. Cria
        const createRes = await fetch(`${BASE_URL}/instance/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": EVO_KEY },
            body: JSON.stringify({
                instanceName: instanceName,
                token: crypto.randomUUID(),
                qrcode: true,
                integration: "WHATSAPP-BAILEYS",
                reject_call: true,
                msgBufferLimit: 50
            })
        });

        if (createRes.ok) {
            // Retorna LOADING para o frontend esperar o boot (que demora uns 10s)
            // Não esperamos aqui para não dar timeout na Vercel
            return NextResponse.json({ status: "loading", message: "Servidor iniciando..." });
        } else {
            const err = await createRes.text();
            console.error(">>> [CREATE ERROR]", err);
            // Se der erro de "already exists", tentamos conectar no próximo passo
        }
    }

    // CENÁRIO C: Instância existe (ou acabou de ser recriada) -> Tenta pegar QR
    // Tenta por ~6 segundos (seguro para Vercel)
    for (let i = 0; i < 4; i++) {
        try {
            const connectRes = await fetch(`${BASE_URL}/instance/connect/${instanceName}`, {
                headers: { 'apikey': EVO_KEY }
            });

            if (connectRes.ok) {
                const data = await connectRes.json();
                
                // Se vier count:0, ainda está no boot
                if (data.count === 0) {
                    console.log(">>> [WAIT] Booting Chrome...");
                } else {
                    const qr = data?.base64 || data?.qrcode?.base64 || data?.qrcode;
                    if (qr && typeof qr === 'string' && qr.length > 50) {
                        return NextResponse.json({ status: "qrcode", qrcode: qr });
                    }
                }
            }
        } catch (e) {
            console.log(">>> [RETRY QR]", e);
        }
        await delay(1500);
    }

    // Se saiu do loop sem QR, é porque ainda está bootando.
    // Mandamos "loading" para o frontend tentar de novo em 2s.
    return NextResponse.json({ status: "loading", message: "Gerando QR Code..." });

  } catch (err: any) {
    console.error(">>> [FATAL]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}