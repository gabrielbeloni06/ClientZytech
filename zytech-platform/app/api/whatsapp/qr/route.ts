import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // --- CREDENCIAIS Z-API ---
    const INSTANCE_ID = '3ECD19678C8703E97D4572442EF70706'
    const INSTANCE_TOKEN = '6D5F55C706D38E75CA716748'
    const CLIENT_TOKEN = 'F7a09e770fcca44daab11e9536ea32284S' 

    console.log(`🔄 [Backend] Buscando IMAGEM do QR Code na Z-API...`)

    // MUDANÇA CRÍTICA: Voltamos para o endpoint /image que entrega o PNG real
    // Isso evita confusão entre texto de pareamento e base64
    const zApiUrl = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${INSTANCE_TOKEN}/qr-code/image`
    
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

    // Tratamento: Z-API retorna 404 se a instância não existe
    if (response.status === 404) {
        return NextResponse.json({ error: 'Instância não encontrada (404).' }, { status: 404 })
    }

    // Tratamento: Erros de permissão
    if (response.status === 401 || response.status === 403) {
        console.error('❌ Erro de Permissão Z-API:', await response.text())
        return NextResponse.json({ 
            error: 'Acesso negado. Verifique o Client-Token.' 
        }, { status: 401 })
    }

    // Tratamento Especial: Z-API retorna 422 ou 400 se já estiver conectado
    // Mas às vezes retorna isso como JSON. Vamos verificar o Content-Type.
    const contentType = response.headers.get('content-type') || ''
    
    if (!response.ok) {
        // Tenta ler como JSON para ver se é aviso de "Connected"
        if (contentType.includes('application/json')) {
            const errorJson = await response.json()
            if (errorJson.connected) {
                return NextResponse.json({ connected: true })
            }
            return NextResponse.json({ error: 'Erro Z-API', details: errorJson }, { status: response.status })
        }
        throw new Error(`Erro na requisição da imagem: ${response.status}`)
    }

    // SUCESSO: Converter o Buffer da imagem para Base64
    const imageBuffer = await response.arrayBuffer()
    
    // Verificação de segurança: se o buffer for muito pequeno, não é uma imagem válida
    if (imageBuffer.byteLength < 100) {
         // Pode ser um erro em texto plano disfarçado
         const text = new TextDecoder().decode(imageBuffer)
         if (text.includes('connected') || text.includes('true')) {
             return NextResponse.json({ connected: true })
         }
         throw new Error('Retorno inválido (muito pequeno) da Z-API')
    }

    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const dataUri = `data:image/png;base64,${base64Image}`

    return NextResponse.json({ qr: dataUri, connected: false })

  } catch (error: any) {
    console.error('❌ Erro Interno:', error)
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 })
  }
}