import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // --- CREDENCIAIS Z-API ---
    const INSTANCE_ID = '3ECD19678C8703E97D4572442EF70706'
    const INSTANCE_TOKEN = '6D5F55C706D38E75CA716748'
    const CLIENT_TOKEN = 'F7a09e770fcca44daab11e9536ea32284S' 

    console.log(`🔄 [Backend] Buscando QR Code na Z-API...`)

    const zApiUrl = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${INSTANCE_TOKEN}/qr-code`
    
    const headers: Record<string, string> = {
        'Cache-Control': 'no-store'
    }
    
    if (CLIENT_TOKEN) {
        headers['Client-Token'] = CLIENT_TOKEN
    }

    const response = await fetch(zApiUrl, {
      method: 'GET',
      headers: headers
    })

    if (response.status === 401 || response.status === 403) {
        console.error('❌ Erro de Permissão Z-API:', await response.text())
        return NextResponse.json({ 
            error: 'Acesso negado pela Z-API. Verifique o Client-Token.' 
        }, { status: 401 })
    }

    if (response.status === 404) {
        return NextResponse.json({ error: 'Instância não encontrada.' }, { status: 404 })
    }

    const data = await response.json()

    // 1. Caso: Instância já conectada
    if (data.connected) {
        return NextResponse.json({ connected: true })
    }

    // 2. Caso: QR Code recebido com sucesso
    if (data.value) {
        let rawBase64 = data.value;

        // LÓGICA DE LIMPEZA AGRESSIVA:
        // 1. Se já vier com prefixo "data:image...", removemos para não duplicar ou usar formato errado
        rawBase64 = rawBase64.replace(/^data:image\/[a-z]+;base64,/, "");
        
        // 2. Remove qualquer espaço em branco ou quebra de linha (\n) que corrompe a imagem
        rawBase64 = rawBase64.replace(/\s/g, '');

        // 3. Reconstrói o prefixo padrão limpo
        const qrImage = `data:image/png;base64,${rawBase64}`;

        return NextResponse.json({ qr: qrImage, connected: false })
    }

    // 3. Caso: Erro genérico
    return NextResponse.json({ error: 'Falha ao ler QR Code.', details: data }, { status: 400 })

  } catch (error: any) {
    console.error('❌ Erro Interno:', error)
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 })
  }
}