import { NextRequest, NextResponse } from "next/server";

// Sanitização da URL (remove barra no final se o usuário colocou)
const RAW_URL = process.env.EVOLUTION_API_URL || "";
const EVO_URL = RAW_URL.endsWith("/") ? RAW_URL.slice(0, -1) : RAW_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName, phoneNumber } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    console.log(`>>> [REFAZER ZERO] Iniciando para: ${instanceName}`);

    // 1. DELETE (Limpeza Total)
    // Não verificamos estado. Simplesmente mandamos apagar para garantir 'Clean Slate'.
    await fetch(`${EVO_URL}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: { 'apikey': EVO_KEY! }
    });
    
    // Espera o banco de dados da VPS limpar (Crucial)
    await delay(2500);

    // 2. CREATE (Criação Limpa)
    const createRes = await fetch(`${EVO_URL}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY! },
        body: JSON.stringify({
            instanceName: instanceName,
            qrcode: !phoneNumber, // Se tem telefone, NÃO gera QR (foca no Pairing)
            integration: "WHATSAPP-BAILEYS",
            reject_call: true
        })
    });

    if (!createRes.ok) {
        const errTxt = await createRes.text();
        return NextResponse.json({ error: `Erro ao Criar Instância (VPS): ${createRes.status} - ${errTxt}` }, { status: 500 });
    }

    // 3. WARMUP (Aquecimento do Motor)
    // O navegador Chrome dentro da VPS precisa de tempo para abrir antes de aceitar o número.
    // 7 segundos é o tempo médio seguro para a Hetzner CPX11.
    console.log(">>> [WAIT] Aguardando motor (7s)...");
    await delay(7000);

    // 4. CONNECT (Pairing Code)
    if (phoneNumber) {
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        console.log(`>>> [PAIRING] Pedindo código para ${cleanPhone}`);

        // Rota Padrão Evolution v2: GET com query params
        const connectUrl = `${EVO_URL}/instance/connect/${instanceName}?number=${cleanPhone}`;
        
        const connectRes = await fetch(connectUrl, {
            method: 'GET',
            headers: { 'apikey': EVO_KEY! }
        });

        const connectData = await connectRes.json();

        // Se falhar ou não vier código, mostramos o JSON Bruto para você ver o erro real
        if (!connectRes.ok || (!connectData.code && !connectData.pairingCode)) {
            console.error(">>> [PAIRING FAIL] Resposta da API:", JSON.stringify(connectData));
            
            // Tratamento especial: Se a API mandar QR Code em vez de Pairing, mostramos ele
            if (connectData.base64 || connectData.qrcode) {
                 return NextResponse.json({ 
                     status: 'qrcode', 
                     qrcode: connectData.base64 || connectData.qrcode,
                     message: "A API forçou QR Code (Pairing indisponível nesta versão)."
                 });
            }

            return NextResponse.json({ 
                error: `Erro da VPS: ${JSON.stringify(connectData)}` 
            }, { status: 500 });
        }

        return NextResponse.json({ 
            status: 'pairing', 
            code: connectData.code || connectData.pairingCode 
        });
    }

    // 5. CONNECT (QR Code Fallback)
    const qrRes = await fetch(`${EVO_URL}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': EVO_KEY! }
    });
    
    const qrData = await qrRes.json();
    const qrImage = qrData.base64 || qrData.qrcode?.base64 || qrData.qrcode;

    if (qrImage) {
        return NextResponse.json({ status: 'qrcode', qrcode: qrImage });
    }

    return NextResponse.json({ error: "Falha ao obter QR Code. Tente novamente." }, { status: 500 });

  } catch (error: any) {
    console.error("Erro Crítico:", error);
    return NextResponse.json({ error: `Erro Interno: ${error.message}` }, { status: 500 });
  }
}