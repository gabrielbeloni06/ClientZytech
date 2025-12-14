import { createClient } from '@supabase/supabase-js'
import { botComercioBasico } from '@/lib/bots/templates/start/comercio_basico'
import { botComercioAgendamento } from '@/lib/bots/templates/start/comercio_agendamento'
import { botDeliveryPadrao } from '@/lib/bots/templates/start/delivery_padrao'
import { botComercioControl } from '@/lib/bots/templates/control/comercio'
import { botDeliveryControl as botDeliveryControlLegacy } from '@/lib/bots/templates/control/delivery'
import { botSchedulingControl as botSchedulingBotAi } from '@/lib/bots/templates/botai/scheduling'
import { botDeliveryControl as botDeliveryBotAi } from '@/lib/bots/templates/botai/delivery'
import { botSchedulingControl as botSchedulingCore } from '@/lib/bots/templates/core/scheduling'
import { botDeliveryControl as botDeliveryCore } from '@/lib/bots/templates/core/delivery'


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
            customerPhone: phone 
        }, sendMessage, supabase)
    }
}

// --- MAPA DE TEMPLATES (Chave -> Função) ---
// As chaves aqui devem corresponder ao que é salvo na coluna 'bot_template' do banco
export const BOT_TEMPLATES: Record<string, Function> = {
    // ZyStart
    'comercio_basico': createBotHandler(botComercioBasico),
    'comercio_agendamento': createBotHandler(botComercioAgendamento),
    'delivery_padrao': createBotHandler(botDeliveryPadrao),

    // ZyControl
    'comercio_control': createBotHandler(botComercioControl),
    'delivery_control': createBotHandler(botDeliveryControlLegacy),

    // ZyBotAI (IA Padrão)
    'scheduling_botai': createBotHandler(botSchedulingBotAi),
    'delivery_botai': createBotHandler(botDeliveryBotAi),

    // ZyCore (IA Personalizável)
    'scheduling_core': createBotHandler(botSchedulingCore),
    'delivery_core': createBotHandler(botDeliveryCore),
}

// --- LISTA PARA O DROPDOWN (Admin) ---
export const AVAILABLE_TEMPLATES_LIST = [
    // ZyStart
    { id: 'comercio_basico', label: 'Start: Comércio Menu (Estático)' },
    { id: 'comercio_agendamento', label: 'Start: Agendamento Simples' },
    { id: 'delivery_padrao', label: 'Start: Delivery Básico' },

    // ZyControl
    { id: 'comercio_control', label: 'Control: Comércio Avançado' },
    { id: 'delivery_control', label: 'Control: Delivery Flow' },

    // ZyBotAI
    { id: 'scheduling_botai', label: 'BotAI: Agendamento Inteligente' },
    { id: 'delivery_botai', label: 'BotAI: Delivery Inteligente' },

    // ZyCore
    { id: 'scheduling_core', label: 'Core: Agendamento Premium (Persona)' },
    { id: 'delivery_core', label: 'Core: Delivery Premium (Persona)' },
]