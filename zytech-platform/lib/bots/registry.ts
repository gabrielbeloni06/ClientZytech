import { createClient } from '@supabase/supabase-js'

import { botRealEstateControl } from '@/lib/bots/templates/core/real_estate'
import { botDeliveryControl } from '@/lib/bots/templates/core/delivery'
import { botSchedulingControl } from '@/lib/bots/templates/core/scheduling'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ AVISO: Supabase URL ou Key não encontradas em lib/bots/registry.ts.')
}

const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co', 
    supabaseKey || 'placeholder-key'
)

const createBotHandler = (handler: Function) => {
    if (!handler) {
        return async () => ({ response: "Erro: Template não implementado no código.", action: "error" })
    }

    return async (org: any, phone: string, text: string, sendMessage: Function) => {
        return handler({ 
            orgId: org.id, 
            history: [],
            text, 
            customerPhone: phone,
            customerName: "Cliente" 
        }, sendMessage, supabase)
    }
}

export const BOT_TEMPLATES: Record<string, Function> = {
    // Imobiliária (NOVO)
    'imobiliaria_basico': createBotHandler(botRealEstateControl),

    'scheduling_core': createBotHandler(botSchedulingControl),
    'delivery_core': createBotHandler(botDeliveryControl),
    'scheduling_botai': createBotHandler(botSchedulingControl),
    'delivery_botai': createBotHandler(botDeliveryControl),     

    'comercio_basico': createBotHandler(botSchedulingControl), 
    'comercio_agendamento': createBotHandler(botSchedulingControl),
    'delivery_padrao': createBotHandler(botDeliveryControl),
    'comercio_control': createBotHandler(botSchedulingControl),
    'delivery_control': createBotHandler(botDeliveryControl),
}

export const AVAILABLE_TEMPLATES_LIST = [
    { id: 'imobiliaria_basico', label: 'Imobiliária: Consultor IA (Vendas/Aluguel)' },

    { id: 'scheduling_core', label: 'Core: Agendamento Premium (Persona)' },
    { id: 'delivery_core', label: 'Core: Delivery Premium (Persona)' },

    { id: 'scheduling_botai', label: 'BotAI: Agendamento Inteligente' },
    { id: 'delivery_botai', label: 'BotAI: Delivery Inteligente' },

    { id: 'comercio_basico', label: 'Start: Comércio Menu' },
    { id: 'comercio_agendamento', label: 'Start: Agendamento Simples' },
    { id: 'delivery_padrao', label: 'Start: Delivery Básico' },
    { id: 'comercio_control', label: 'Control: Comércio Avançado' },
    { id: 'delivery_control', label: 'Control: Delivery Flow' },
]