import { NextRequest, NextResponse } from "next/server";

// Sanitização da URL (remove barra no final se o usuário colocou)
const RAW_URL = process.env.EVOLUTION_API_URL || "";
const EVO_URL = RAW_URL.endsWith("/") ? RAW_URL.slice(0, -1) : RAW_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

// Delay auxiliar
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { instanceName, phoneNumber } = await req.json();

    if (!instanceName) return NextResponse.json({ error: "Nome da instância obrigatório" }, { status: 400 });

    console.log(`>>> [CONEXÃO] Iniciando: ${instanceName} | URL Base: ${EVO_URL}`);

    // 1. LIMPEZA E CRIAÇÃO (GARANTIR INSTÂNCIA NOVA)
    try {
        // Verifica estado
        const statusRes = await fetch(`${EVO_URL}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': EVO_KEY! }
        });

        // Se existe, deleta (Reset Forçado) para o Pairing Code funcionar limpo
        if (statusRes.ok) {
            console.log(`>>> [RESET] Apagando instância existente...`);
            await fetch(`${EVO_URL}/instance/delete/${instanceName}`, {
                method: 'DELETE',
                headers: { 'apikey': EVO_KEY! }
            });
            await delay(3000); // Tempo para o banco limpar
        }

        // Criação
        const createUrl = `${EVO_URL}/instance/create`;
        const createPayload = {
          instanceName: instanceName,
          token: crypto.randomUUID(),
          qrcode: !phoneNumber, // Só gera QR se NÃO tiver telefone
          integration: "WHATSAPP-BAILEYS",
          reject_call: true,
          msgBufferLimit: 50
        };

        console.log(`>>> [CREATE] Criando...`);
        await fetch(createUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY! },
            body: JSON.stringify(createPayload)
        });

    } catch (e) {
        console.error(">>> [INIT ERROR]", e);
    }

    // 2. BUSCA DO CÓDIGO (PAIRING CODE)
    if (phoneNumber) {
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        console.log(`>>> [PAIRING] Aguardando motor (5s) para pedir código p/ ${cleanPhone}...`);
        
        // Aguarda a instância inicializar o navegador/socket
        await delay(5000); 

        // ESTRATÉGIA MULTI-ROTA (Tenta todas as formas conhecidas)
        let code = null;

        // Tentativa A: GET com Query Param (Padrão v2.1)
        if (!code) {
            try {
                const urlA = `${EVO_URL}/instance/connect/${instanceName}?number=${cleanPhone}`;
                console.log(`>>> [TRY A] GET ${urlA}`);
                const resA = await fetch(urlA, { 
                    method: 'GET', 
                    headers: { 'apikey': EVO_KEY! } 
                });
                if (resA.ok) {
                    const dataA = await resA.json();
                    console.log(">>> [RESP A]", JSON.stringify(dataA));
                    code = dataA.code || dataA.pairingCode;
                }
            } catch (e) { console.log(">>> [FAIL A]", e); }
        }

        // Tentativa B: POST (Padrão v2.0 / v2.2)
        if (!code) {
            try {
                const urlB = `${EVO_URL}/instance/connect/${instanceName}`;
                console.log(`>>> [TRY B] POST ${urlB}`);
                const resB = await fetch(urlB, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY! },
                    body: JSON.stringify({ number: cleanPhone })
                });
                if (resB.ok) {
                    const dataB = await resB.json();
                    console.log(">>> [RESP B]", JSON.stringify(dataB));
                    code = dataB.code || dataB.pairingCode;
                }
            } catch (e) { console.log(">>> [FAIL B]", e); }
        }

        if (code) {
            return NextResponse.json({ status: 'pairing', code: code });
        }
        
        return NextResponse.json({ error: "A API não retornou o código em nenhuma das tentativas. Verifique se o número está correto." }, { status: 500 });
    }

    // 3. FLUXO DE QR CODE (Fallback)
    await delay(2000);
    const connectUrl = `${EVO_URL}/instance/connect/${instanceName}`;
    const connectRes = await fetch(connectUrl, { headers: { 'apikey': EVO_KEY! } });
    
    if (connectRes.ok) {
        const connectData = await connectRes.json();
        const qrCode = connectData.base64 || connectData.qrcode?.base64 || connectData.qrcode;
        if (qrCode) return NextResponse.json({ status: 'qrcode', qrcode: qrCode });
    }

    return NextResponse.json({ error: "Não foi possível gerar QR ou Código." }, { status: 500 });

  } catch (error: any) {
    console.error("Erro Geral:", error);
    return NextResponse.json({ error: `Erro Interno: ${error.message}` }, { status: 500 });
  }
}