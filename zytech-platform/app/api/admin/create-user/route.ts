import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    const body = await request.json()
    const { email, password, organization_id, name } = body

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Chave Service Role não configurada no servidor.' }, { status: 500 })
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, 
      user_metadata: { full_name: name }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Erro ao criar usuário Auth')

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email,
        full_name: name,
        role: 'org_owner', 
        organization_id: organization_id,
        created_at: new Date().toISOString()
      })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    return NextResponse.json({ success: true, user: authData.user })

  } catch (error: any) {
    console.error('Erro API Create User:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 400 })
  }
}