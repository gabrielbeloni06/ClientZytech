import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { botDeliveryControl } from '@/lib/bots/templates/control/delivery'
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const text = searchParams.get('text') || 'Quais são os sabores?'
  const manualOrgId = searchParams.get('orgId')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Faltam chaves do Supabase no .env' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    let org = { id: manualOrgId, name: 'Pizzaria Teste (Mock)' }

    if (!manualOrgId) {
        const { data: orgs } = await supabase.from('organizations').select('id, name').limit(1)
        if (orgs && orgs.length > 0) {
            org = orgs[0]
        } else {
            const { data: prod } = await supabase.from('products').select('organization_id').limit(1).single()
            if (prod) org.id = prod.organization_id
        }
    }

    if (!org.id) {
        return NextResponse.json({ 
            warning: 'Nenhuma organização encontrada. O cardápio pode vir vazio.',
            tip: 'Adicione ?orgId=SEU_UUID na URL ou crie dados no banco.'
        })
    }

    let botResponse = ''
    const mockSendMessage = async (phone: string, message: string) => {
        botResponse = message
    }

    console.log(`[Teste] Executando bot para Org: ${org.id} com texto: "${text}"`)
    
    await botDeliveryControl(
        org, 
        '5511999999999',
        text, 
        mockSendMessage, 
        supabase
    )
    
    return NextResponse.json({ 
        status: 'success',
        input_text: text,
        org_used: org,
        ai_response: botResponse || 'Sem resposta (verifique logs do terminal)'
    })

  } catch (error: any) {
    return NextResponse.json({ 
        status: 'error', 
        message: error.message,
        stack: error.stack 
    }, { status: 500 })
  }
}