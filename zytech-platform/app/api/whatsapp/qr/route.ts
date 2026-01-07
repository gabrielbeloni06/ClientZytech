import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Inicializa o Supabase com a Service Key para ter permissão de ler tokens sensíveis
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! 
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) {
      return NextResponse.json({ error: 'ID da organização é obrigatório' }, { status: 400 })
    }

    console.log(`🔄 [Backend] Buscando credenciais para Org: ${orgId}...`)

    // 1. Busca as credenciais no banco de dados
    const { data: org, error: dbError } = await supabase
      .from('organizations')
      .select('zapi_instance_id, zapi_token, zapi_client_token')
      .eq('id', orgId)
      .single()

    if (dbError || !org) {
      console.error('Erro DB:', dbError)
      return NextResponse.json({ error: 'Organização não encontrada ou sem credenciais.' }, { status: 404 })
    }

    if (!org.zapi_instance_id || !org.zapi_token) {
      return NextResponse.json({ error: 'Instância Z-API não configurada para este cliente.' }, { status: 400 })
    }

    const INSTANCE_ID = org.zapi_instance_id
    const INSTANCE_TOKEN = org.zapi_token
    const CLIENT_TOKEN = org.zapi_client_token // Agora vem do banco!

    // Endpoint de imagem com timestamp para evitar cache
    const zApiUrl = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${INSTANCE_TOKEN}/qr-code/image?_t=${Date.now()}`
    
    const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    }
    
    if (CLIENT_TOKEN) {
        headers['Client-Token'] = CLIENT_TOKEN
    }

    // Faz a chamada para a Z-API
    const response = await fetch(zApiUrl, {
      method: 'GET',
      headers: headers,
      cache: 'no-store'
    })

    const contentType = response.headers.get('content-type') || 'unknown'
    // console.log(`📡 Status: ${response.status} | Tipo: ${contentType}`)

    // 2. Tratamento de Erros HTTP óbvios
    if (response.status === 404) return NextResponse.json({ error: 'Instância 404 na Z-API (Verifique o ID no Banco).' }, { status: 404 })
    if (response.status === 401) return NextResponse.json({ error: 'Erro 401 Z-API: Token inválido.' }, { status: 401 })

    // 3. Se a Z-API devolveu JSON em vez de Imagem (Lógica blindada)
    if (contentType.includes('application/json')) {
        const json = await response.json()
        
        if (json.connected) {
            return NextResponse.json({ connected: true })
        }
        
        if (json.value) {
             let rawBase64 = json.value;
             if (!rawBase64.startsWith('data:image')) {
                rawBase64 = `data:image/png;base64,${rawBase64}`;
             }
             return NextResponse.json({ qr: rawBase64, connected: false })
        }

        const errorStatus = (!response.status || response.status < 400) ? 422 : response.status;
        return NextResponse.json({ error: 'Z-API retornou JSON inesperado.', details: json }, { status: errorStatus })
    }

    // 4. Leitura do binário (Imagem Real)
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