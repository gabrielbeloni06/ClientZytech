import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { BOT_TEMPLATES } from '@/lib/bots/registry' 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
    console.error("❌ ERRO CRÍTICO: 'SUPABASE_SERVICE_ROLE_KEY' não encontrada. Verifique seu .env.local e REINICIE o servidor.")
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || 'chave-falsa-para-nao-quebrar-build')
const VERIFY_TOKEN = 'zytech_secure_token_123'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new NextResponse(challenge, { status: 200 })
    }
    return new NextResponse('Forbidden', { status: 403 })
  }
  return new NextResponse('Bad Request', { status: 400 })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.object === 'simulator') {
        const { organization_id, message, phone } = body
        console.log(`[SIMULATOR] Recebido: "${message}" de ${phone}`)
        
        if (!supabaseServiceKey) {
            return NextResponse.json({ error: 'Configuração de API pendente no servidor.' }, { status: 500 })
        }

        const { error: saveError } = await supabase.from('chat_messages').insert({
            organization_id, chat_id: phone, role: 'user', content: message
        })
        
        if (saveError) {
            console.error("❌ [SIMULATOR] Erro ao salvar no banco:", saveError.message)
            return NextResponse.json({ error: `Erro de Banco: ${saveError.message}` }, { status: 500 })
        }

        await processMessage(organization_id, phone, message, true)
        return NextResponse.json({ status: 'SIMULATED' }, { status: 200 })
    }

    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0]
      const changes = entry?.changes?.[0]
      const value = changes?.value
      const message = value?.messages?.[0]

      if (message) {
        const businessPhoneNumberId = value.metadata.phone_number_id
        const from = message.from
        const messageBody = message.text?.body || ''

        const { data: org } = await supabase.from('organizations').select('id').eq('whatsapp_phone_id', businessPhoneNumberId).single()
        
        if (org) {
            await supabase.from('chat_messages').insert({
                organization_id: org.id, chat_id: from, role: 'user', content: messageBody
            })
            await processMessage(org.id, from, messageBody, false)
        }
      }
      return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 })
    }

    return NextResponse.json({ status: 'NOT_FOUND' }, { status: 404 })
  } catch (error) {
    console.error('[API ERROR]:', error)
    return NextResponse.json({ status: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  }
}

async function processMessage(orgId: string, phone: string, text: string, isSimulation: boolean) {
  console.log(`[BOT ENGINE] Processando para Org: ${orgId}`)
  
  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()
  
  if (error || !org) {
      console.error("❌ [BOT ENGINE] Erro ao buscar organização:", error?.message)
      if (isSimulation) await sendHelper(orgId, phone, "Erro: Empresa não encontrada.", true)
      return
  }

  if (!org.bot_status) {
      console.warn("⚠️ [BOT ENGINE] Bot está DESLIGADO.")
      if (isSimulation) await sendHelper(org.id, phone, "[SISTEMA] Bot desligado.", true)
      return 
  }

  let templateKey = org.bot_template

  if (!templateKey) {
      if (org.plan?.includes('ZyStart')) templateKey = 'comercio_basico'
      else if (org.business_type === 'delivery') templateKey = 'delivery_padrao'
      else templateKey = 'comercio_agendamento'
  }

  console.log(`[BOT ENGINE] Usando template: ${templateKey}`)

  const botFunction = BOT_TEMPLATES[templateKey]

  if (botFunction) {
      await botFunction(org, phone, text, async (response: string) => {
          await sendHelper(org.id, phone, response, isSimulation, org)
      })
  } else {
      console.error(`❌ [BOT ENGINE] Template '${templateKey}' não encontrado no registro.`)
      await sendHelper(org.id, phone, "[ERRO] Configuração de bot inválida. Contate o suporte.", isSimulation)
  }
}

async function sendHelper(orgId: string, phone: string, message: string, isSimulation: boolean, orgData?: any) {
    console.log(`[BOT RESPONSE] Enviando: "${message}"`)
    
    const { error } = await supabase.from('chat_messages').insert({
        organization_id: orgId,
        chat_id: phone,
        role: 'assistant',
        content: message
    })

    if (error) console.error("❌ [BOT RESPONSE] Erro ao salvar:", error.message)

    if (!isSimulation && orgData?.whatsapp_phone_id && orgData?.whatsapp_access_token) {
        try {
            await fetch(`https://graph.facebook.com/v17.0/${orgData.whatsapp_phone_id}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${orgData.whatsapp_access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: phone,
                    type: 'text',
                    text: { body: message }
                })
            })
        } catch (e) {
            console.error("Erro Meta API:", e)
        }
    }
}