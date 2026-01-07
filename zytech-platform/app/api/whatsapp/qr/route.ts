import { NextResponse } from 'next/server'

// import { createClient } from '@supabase/supabase-js'
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! 
// const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: Request) {
  try {
    // Pegamos os params só para não quebrar a lógica, mas não vamos usar para buscar no banco agora
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    // --- MODO DE TESTE (HARDCODED) ---
    // Estamos ignorando o orgId e o Supabase para validar a conexão Z-API
    const INSTANCE_ID = '3ECD19678C8703E97D4572442EF70706'
    const INSTANCE_TOKEN = '6D5F55C706D38E75CA716748'
    const CLIENT_TOKEN = '' // Se sua instância tiver Client-Token de segurança, coloque aqui

    console.log(`Tentando buscar QR Code para Instância: ${INSTANCE_ID}`)

    // 2. Monta a URL da Z-API
    const zApiUrl = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${INSTANCE_TOKEN}/qr-code/image`
    
    // 3. Faz a requisição para a Z-API
    const response = await fetch(zApiUrl, {
      method: 'GET',
      headers: { 
        'Client-Token': CLIENT_TOKEN
      }
    })

    // Tratamento de erros
    if (response.status === 404) {
      return NextResponse.json({ error: 'Erro 404: Instância não encontrada ou desligada na Z-API.' }, { status: 404 })
    }

    // Verifica se retornou JSON (erro ou status conectado) em vez de imagem
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
        const jsonResponse = await response.json()
        
        if (jsonResponse.connected) {
            return NextResponse.json({ connected: true })
        }
        
        // Se for erro de "Instance not connected" mas sem imagem, ou outro erro
        if (!response.ok) {
            console.error('Erro JSON da Z-API:', jsonResponse)
            return NextResponse.json({ error: jsonResponse.message || 'Erro na Z-API', details: jsonResponse }, { status: response.status })
        }
    }

    if (!response.ok) {
      throw new Error(`Z-API retornou status: ${response.status}`)
    }

    // 4. CONVERSÃO: Buffer -> Base64
    const imageBuffer = await response.arrayBuffer()
    
    // Validação extra: se o buffer for muito pequeno, pode ser um erro em texto plano disfarçado
    if (imageBuffer.byteLength < 50) {
        const text = new TextDecoder().decode(imageBuffer)
        return NextResponse.json({ error: `Resposta inválida da Z-API: ${text}` }, { status: 500 })
    }

    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const dataUri = `data:image/png;base64,${base64Image}`

    return NextResponse.json({ qr: dataUri, connected: false })

  } catch (error: any) {
    console.error('Erro CRÍTICO na rota QR:', error)
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 })
  }
}