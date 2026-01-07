import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Mantenha essas variáveis de ambiente no seu .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! 

// Usamos a service key para ter permissão de ler os tokens no banco
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) {
      return NextResponse.json({ error: 'ID da organização é obrigatório' }, { status: 400 })
    }

    // 1. Busca as credenciais da Z-API no seu banco de dados
    // CERTIFIQUE-SE que os nomes das colunas (zapi_instance_id, zapi_token) estão iguais ao seu DB
    const { data: org, error: dbError } = await supabase
      .from('organizations')
      .select('zapi_instance_id, zapi_token, zapi_security_token') 
      .eq('id', orgId)
      .single()

    if (dbError || !org?.zapi_instance_id || !org?.zapi_token) {
      return NextResponse.json({ error: 'Credenciais da instância não encontradas no banco.' }, { status: 404 })
    }

    // 2. Monta a URL da Z-API para pegar a IMAGEM do QR Code
    const zApiUrl = `https://api.z-api.io/instances/${org.zapi_instance_id}/token/${org.zapi_token}/qr-code/image`
    
    // 3. Faz a requisição para a Z-API
    const response = await fetch(zApiUrl, {
      method: 'GET',
      headers: { 
        'Client-Token': org.zapi_security_token || '' // Passa o Client-Token se você usar
      }
    })

    // Tratamento: Se der 404, a instância pode estar desligada ou incorreta
    if (response.status === 404) {
      return NextResponse.json({ error: 'Instância não encontrada ou desligada na Z-API.' }, { status: 404 })
    }

    // Tratamento: Se a Z-API retornar erro (ex: já conectado), as vezes vem como JSON
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
        const jsonResponse = await response.json()
        if (jsonResponse.connected) {
            return NextResponse.json({ connected: true })
        }
        // Se for outro erro JSON
        if (!response.ok) {
            return NextResponse.json({ error: jsonResponse.message || 'Erro na Z-API' }, { status: response.status })
        }
    }

    if (!response.ok) {
      throw new Error(`Z-API retornou status: ${response.status}`)
    }

    // 4. CONVERSÃO CRÍTICA: Transforma o binário da imagem em Base64
    const imageBuffer = await response.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const dataUri = `data:image/png;base64,${base64Image}`

    // 5. Devolve o JSON pronto para o seu front
    return NextResponse.json({ qr: dataUri, connected: false })

  } catch (error: any) {
    console.error('Erro na rota QR:', error)
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 })
  }
}