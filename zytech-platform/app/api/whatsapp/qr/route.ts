import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // --- CREDENCIAIS Z-API (HARDCODED PARA TESTE) ---
    const INSTANCE_ID = '3ECD19678C8703E97D4572442EF70706'
    const INSTANCE_TOKEN = '6D5F55C706D38E75CA716748'
    const CLIENT_TOKEN = 'F7a09e770fcca44daab11e9536ea32284S' 

    console.log(`🔄 [Backend] Buscando IMAGEM...`)

    // TRUQUE 1: Adiciona timestamp na URL para a Z-API não devolver cache velho
    const zApiUrl = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${INSTANCE_TOKEN}/qr-code/image?_t=${Date.now()}`
    
    const headers: Record<string, string> = {
        // TRUQUE 2: Headers agressivos de "sem cache"
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
      cache: 'no-store' // TRUQUE 3: OBRIGATÓRIO no Next.js App Router para não cachear fetch
    })

    // Log para debug
    const contentType = response.headers.get('content-type') || 'unknown'
    console.log(`📡 Status: ${response.status} | Tipo: ${contentType}`)

    // Tratamento de erros de status
    if (response.status === 404) return NextResponse.json({ error: 'Instância 404' }, { status: 404 })
    if (response.status === 401) return NextResponse.json({ error: 'Erro 401: Token inválido' }, { status: 401 })

    // Se a Z-API devolver JSON (ex: connected: true ou erro), tratamos aqui
    if (contentType.includes('application/json')) {
        const json = await response.json()
        if (json.connected) return NextResponse.json({ connected: true })
        return NextResponse.json({ error: 'Erro Z-API', details: json }, { status: response.status || 400 })
    }

    // Leitura do binário
    const imageBuffer = await response.arrayBuffer()

    // TRUQUE 4: Verifica se retornou HTML de erro disfarçado de imagem (comum em firewall/proxy)
    // Se os primeiros bytes forem "<!DOCT" ou "<html", é erro.
    const firstBytes = new Uint8Array(imageBuffer.slice(0, 50));
    const textStart = new TextDecoder().decode(firstBytes);
    if (textStart.includes('<html') || textStart.includes('<!DOCT')) {
        console.error('❌ Recebido HTML em vez de imagem:', textStart);
        return NextResponse.json({ error: 'Z-API retornou uma página HTML de erro (provável bloqueio ou erro 500).' }, { status: 502 });
    }

    if (imageBuffer.byteLength < 100) {
         return NextResponse.json({ error: 'Arquivo recebido muito pequeno para ser uma imagem.' }, { status: 500 })
    }

    // Conversão final
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    
    // TRUQUE 5: Usa o mime-type que a API mandou, se não mandou usa png
    const mimeType = contentType.startsWith('image/') ? contentType : 'image/png';
    const dataUri = `data:${mimeType};base64,${base64Image}`

    return NextResponse.json({ qr: dataUri, connected: false })

  } catch (error: any) {
    console.error('❌ Erro Interno:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}