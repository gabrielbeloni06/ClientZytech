import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clientId, customer_phone, customer_name, items, total, address } = body

    if (!clientId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Dados incompletos (clientId ou items faltando)' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          organization_id: clientId,
          customer_phone: customer_phone,
          customer_name: customer_name || 'Cliente do Whats',
          total_value: total,
          status: 'pending',
          items_json: items,
          delivery_address: address || 'Retirada/Não informado'
        }
      ])
      .select()

    if (error) {
      console.error('Erro ao salvar pedido:', error)
      return NextResponse.json({ error: 'Erro ao gravar no banco' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      orderId: data[0].id,
      message: 'Pedido recebido na cozinha!' 
    })

  } catch (err) {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
}