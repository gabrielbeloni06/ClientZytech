import { SupabaseClient } from '@supabase/supabase-js'
import { getCatalogMessage } from '../../utils'

export const botComercioBasico = async (org: any, phone: string, text: string, sendMessage: Function, supabase: SupabaseClient) => {
    const lowerText = text.toLowerCase().trim()
    
    if (['oi', 'olá', 'ola', 'menu', 'ajuda'].some(t => lowerText.includes(t))) {
        await sendMessage(`👋 Olá! Bem-vindo à *${org.name}*.\n\nEscolha uma opção:\n1️⃣ Ver Catálogo / Serviços\n2️⃣ Horários e Endereço\n3️⃣ Falar com Atendente`)
    } 
    else if (lowerText === '1' || lowerText.includes('catalogo')) {
        const catalogMsg = await getCatalogMessage(supabase, org.id)
        await sendMessage(catalogMsg)
        await sendMessage("Para agendar ou pedir, digite a opção 3 para falar com um atendente (Neste plano não agendo automático).")
    }
    else if (lowerText === '2') {
        await sendMessage(`📍 *Endereço:* Consulte no Google Maps\n⏰ *Horário:* 09h às 19h.`)
    }
    else if (lowerText === '3') {
        await sendMessage(`Ok! Um atendente humano irá te responder assim que possível.`)
    }
    else {
        await sendMessage(`Desculpe, não entendi. Digite *Oi* para ver o menu.`)
    }
}