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

    console.log(`🔄 [Backend] Tentando buscar QR Code via JSON Endpoint...`)
    console.log(`🆔 ID: ${INSTANCE_ID}`)

    // ESTRATÉGIA NOVA: Usar o endpoint que retorna JSON com o base64 (Mais seguro que imagem bruta)
    const zApiUrl = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${INSTANCE_TOKEN}/qr-code`
    
    // Faz a requisição para a Z-API
    const response = await fetch(zApiUrl, {
      method: 'GET',
      headers: { 
        'Client-Token': CLIENT_TOKEN,
        'Cache-Control': 'no-store' // Garante que não pega cache
      }
    })

    console.log(`📡 Status Z-API: ${response.status}`)

    // Tratamento de erros de rede/status
    if (response.status === 404) {
      return NextResponse.json({ error: 'Erro 404: Instância não encontrada na Z-API. Verifique o ID.' }, { status: 404 })
    }

    if (response.status === 401) {
       return NextResponse.json({ error: 'Erro 401: Não autorizado. Verifique Token ou Client-Token.' }, { status: 401 })
    }

    // Tenta ler o JSON
    const data = await response.json()
    
    // Log do que veio (ajuda a debugar se der erro)
    // console.log('📦 Payload Z-API:', JSON.stringify(data).substring(0, 100) + '...')

    // 1. Verifica se já está conectado
    if (data.connected) {
        return NextResponse.json({ connected: true })
    }

    // 2. Verifica se veio o QR Code (campo 'value')
    if (data.value) {
        // A Z-API já manda com "data:image/png;base64,..." no campo value
        return NextResponse.json({ qr: data.value, connected: false })
    }

    // 3. Se não veio QR nem connected, deve ser erro
    if (data.error) {
         return NextResponse.json({ error: data.error, details: data }, { status: 400 })
    }

    throw new Error('Resposta desconhecida da Z-API (sem QR e sem erro explicito).')

  } catch (error: any) {
    console.error('❌ Erro CRÍTICO na rota QR:', error)
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 })
  }
}