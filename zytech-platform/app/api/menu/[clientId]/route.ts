import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params

  if (!clientId) {
    return NextResponse.json({ error: 'ID do cliente obrigatório' }, { status: 400 })
  }

  const { data: client, error: clientError } = await supabase
    .from('organizations')
    .select('status, name, plan')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  if (client.status !== 'active') {
    return NextResponse.json({ error: 'Serviço suspenso. Contate o suporte.' }, { status: 403 })
  }

  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, price, category, description')
    .eq('organization_id', clientId)
    .eq('is_available', true)
    .order('category', { ascending: true })

  if (prodError) {
    return NextResponse.json({ error: 'Erro ao buscar cardápio' }, { status: 500 })
  }

  return NextResponse.json({
    shop: client.name,
    plan: client.plan,
    menu: products
  })
}