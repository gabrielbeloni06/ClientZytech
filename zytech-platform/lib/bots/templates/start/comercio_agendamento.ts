import { SupabaseClient } from '@supabase/supabase-js'
import { getCatalogMessage } from '../../utils'

export const botComercioAgendamento = async (org: any, phone: string, text: string, sendMessage: Function, supabase: SupabaseClient) => {
    const lowerText = text.toLowerCase()
    
    if (['oi', 'olá', 'ola', 'bom dia'].some(t => lowerText.includes(t))) {
        await sendMessage(`Olá! Sou o assistente virtual da *${org.name}*.\n\nPosso ajudar a marcar seu horário. Digite *"Agendar"* para começar ou *"Catálogo"* para ver preços.`)
    }
    else if (lowerText.includes('catalogo') || lowerText.includes('servicos')) {
        const catalogMsg = await getCatalogMessage(supabase, org.id)
        await sendMessage(catalogMsg)
    }
    else if (lowerText.includes('agendar')) {
        await sendMessage(`🗓️ Para agendar, digite:\n*Nome, Serviço, Dia e Hora*\n\nExemplo: João, Corte, Amanhã as 14h`)
    } 
    else if (text.includes(',')) {
        const parts = text.split(',')
        if (parts.length >= 2) {
            const clientName = parts[0].trim()
            const serviceName = parts[1].trim()
            const timeInfo = parts[2] ? parts[2].trim() : 'Horário a combinar'

            const { error } = await supabase.from('appointments').insert({
                organization_id: org.id,
                client_name: clientName,
                service_name: serviceName,
                appointment_date: new Date().toISOString(), 
                status: 'pending',
                notes: `Solicitado via WhatsApp: ${timeInfo}`
            })

            if (error) {
                console.error(error)
                await sendMessage(`❌ Erro ao salvar. Tente novamente.`)
            } else {
                await sendMessage(`✅ *Solicitação Recebida!*\n\n👤 ${clientName}\n✂️ ${serviceName}\n🕒 ${timeInfo}\n\nAguarde a confirmação.`)
            }
        } else {
            await sendMessage(`⚠️ Formato inválido. Use vírgulas: *Nome, Serviço, Horário*`)
        }
    } 
    else {
        await sendMessage(`Não entendi. Digite *"Agendar"* ou *"Catálogo"*.`)
    }
}