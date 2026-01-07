import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // --- CREDENCIAIS Z-API ---
    const INSTANCE_ID = '3ECD19678C8703E97D4572442EF70706'
    const INSTANCE_TOKEN = '6D5F55C706D38E75CA716748'
    const CLIENT_TOKEN = 'F7a09e770fcca44daab11e9536ea32284S' 

    console.log(`🔄 [Backend] Buscando IMAGEM...`)

    // Endpoint de imagem
    const zApiUrl = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${INSTANCE_TOKEN}/qr-code/image?_t=${Date.now()}`
    
    const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    }
    
    if (CLIENT_TOKEN) {
        headers['Client-Token'] = CLIENT_TOKEN
    }

    const response = await fetch(zApiUrl, {
      method: 'GET',
      headers: headers,
      cache: 'no-store'
    })

    const contentType = response.headers.get('content-type') || 'unknown'
    console.log(`📡 Status: ${response.status} | Tipo: ${contentType}`)

    // 1. Tratamento de Erros HTTP óbvios
    if (response.status === 404) return NextResponse.json({ error: 'Instância 404: Verifique ID da Instância.' }, { status: 404 })
    if (response.status === 401) return NextResponse.json({ error: 'Erro 401: Token inválido ou bloqueado.' }, { status: 401 })

    // 2. Se a Z-API devolveu JSON em vez de Imagem (Aqui que estava o problema)
    if (contentType.includes('application/json')) {
        const json = await response.json()
        console.log('📦 JSON recebido da Z-API:', JSON.stringify(json))

        if (json.connected) {
            return NextResponse.json({ connected: true })
        }
        
        // CORREÇÃO: Às vezes a Z-API devolve o base64 dentro do JSON 'value' mesmo na rota de imagem
        if (json.value) {
             let rawBase64 = json.value;
             // Limpeza se necessário
             if (!rawBase64.startsWith('data:image')) {
                rawBase64 = `data:image/png;base64,${rawBase64}`;
             }
             return NextResponse.json({ qr: rawBase64, connected: false })
        }

        // Se for um JSON de erro mas veio com status 200, forçamos um erro 422 para o frontend pegar
        const errorStatus = (!response.status || response.status < 400) ? 422 : response.status;
        return NextResponse.json({ error: 'Z-API retornou JSON inesperado.', details: json }, { status: errorStatus })
    }

    // 3. Leitura do binário (Imagem Real)
    const imageBuffer = await response.arrayBuffer()

    // Verificação de segurança: HTML disfarçado
    const firstBytes = new Uint8Array(imageBuffer.slice(0, 50));
    const textStart = new TextDecoder().decode(firstBytes);
    if (textStart.includes('<html') || textStart.includes('<!DOCT')) {
        console.error('❌ Recebido HTML em vez de imagem:', textStart);
        return NextResponse.json({ error: 'Erro 502: Z-API retornou página HTML de erro.' }, { status: 502 });
    }

    if (imageBuffer.byteLength < 100) {
         return NextResponse.json({ error: 'Arquivo inválido ou muito pequeno recebido da API.' }, { status: 500 })
    }

    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const mimeType = contentType.startsWith('image/') ? contentType : 'image/png';
    const dataUri = `data:${mimeType};base64,${base64Image}`

    return NextResponse.json({ qr: dataUri, connected: false })

  } catch (error: any) {
    console.error('❌ Erro Interno:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}