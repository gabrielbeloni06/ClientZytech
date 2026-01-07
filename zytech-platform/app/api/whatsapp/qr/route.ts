import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // --- CREDENCIAIS Z-API ---
    const INSTANCE_ID = '3ECD19678C8703E97D4572442EF70706'
    const INSTANCE_TOKEN = '6D5F55C706D38E75CA716748'
    const CLIENT_TOKEN = 'F7a09e770fcca44daab11e9536ea32284S' // Token que você mandou

    console.log(`🔄 [Backend] Buscando QR Code na Z-API...`)

    // Endpoint JSON (Retorna o base64 em texto, muito mais seguro que binário)
    const zApiUrl = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${INSTANCE_TOKEN}/qr-code`
    
    // Configura os headers com o seu Token de Segurança
    const headers: Record<string, string> = {
        'Cache-Control': 'no-store'
    }
    
    // Adiciona o token no header (obrigatório se configurado na Z-API)
    if (CLIENT_TOKEN) {
        headers['Client-Token'] = CLIENT_TOKEN
    }

    const response = await fetch(zApiUrl, {
      method: 'GET',
      headers: headers
    })

    // Tratamento de erros de segurança/acesso
    if (response.status === 401 || response.status === 403) {
        console.error('❌ Erro de Permissão Z-API:', await response.text())
        return NextResponse.json({ 
            error: 'Acesso negado pela Z-API. Verifique se o Client-Token bate com o painel.' 
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
        let qrImage = data.value;
        
        // CORREÇÃO: Garante que o base64 tenha o cabeçalho correto para o navegador exibir
        if (!qrImage.startsWith('data:image')) {
            qrImage = `data:image/png;base64,${qrImage}`;
        }

        return NextResponse.json({ qr: qrImage, connected: false })
    }

    // 3. Caso: Erro genérico
    return NextResponse.json({ error: 'Falha ao ler QR Code.', details: data }, { status: 400 })

  } catch (error: any) {
    console.error('❌ Erro Interno:', error)
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 })
  }
}