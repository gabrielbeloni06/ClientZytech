import { SupabaseClient } from '@supabase/supabase-js'
import { getCatalogMessage } from '../../utils'

export const botDeliveryPadrao = async (org: any, phone: string, text: string, sendMessage: Function, supabase: SupabaseClient) => {
    const lowerText = text.toLowerCase()
    
    if (['pedir', 'cardapio', 'fome', 'lanche', 'oi'].some(t => lowerText.includes(t))) {
        const catalogMsg = await getCatalogMessage(supabase, org.id)
        await sendMessage(`🍕 *Delivery ${org.name}*\n\n${catalogMsg}`)
        await sendMessage(`\nPara fazer o pedido, digite os itens que deseja. (IA de pedidos em breve)`)
    } 
    else if (lowerText.includes('status')) {
        await sendMessage(`Seu último pedido está sendo preparado! 🍳`)
    }
    else {
        await sendMessage(`Olá! Bem-vindo ao Delivery da *${org.name}*.\nDigite *"Pedir"* para ver o cardápio.`)
    }
}