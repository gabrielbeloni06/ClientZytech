import { SupabaseClient } from '@supabase/supabase-js'
import { getCatalogMessage } from '../../utils'

function parseBookingDateTime(dateStr: string, timeStr: string): Date | null {
    try {
        if (!dateStr || !timeStr) return null
        
        const [day, month] = dateStr.split('/').map(Number)
        const [hour, minute] = timeStr.split(':').map(Number)
        
        if (!day || !month || hour === undefined || minute === undefined) return null

        const now = new Date()
        const year = now.getFullYear()
        
        const bookingDate = new Date(year, month - 1, day, hour, minute)
        
        if (isNaN(bookingDate.getTime())) return null
        
        if (bookingDate < now) {
             return null 
        }
        
        return bookingDate
    } catch (e) {
        return null
    }
}

export const botComercioControl = async (org: any, phone: string, text: string, sendMessage: Function, supabase: SupabaseClient) => {
    const cleanText = text.trim()
    const lowerText = cleanText.toLowerCase()
    if (['oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'menu', 'inicio', 'início', 'ajuda'].some(t => lowerText === t)) {
        await sendMessage(
            `🤖 *Assistente Virtual ${org.name}* (ZyControl)\n\n` +
            `Seja bem-vindo(a)! Como posso ajudar você hoje?\n` +
            `Digite o número da opção desejada:\n\n` +
            `1️⃣ *Agendar Horário*\n` +
            `2️⃣ *Ver Meus Agendamentos*\n` +
            `3️⃣ *Cancelar um Agendamento*\n` +
            `4️⃣ *Ver Catálogo e Preços*\n` +
            `5️⃣ *Falar com Atendente*`
        )
        return
    }

    if (lowerText === '1' || lowerText === 'agendar') {
        await sendMessage(
            `🗓️ *Novo Agendamento*\n\n` +
            `Para agendar, envie uma mensagem no seguinte formato:\n` +
            `*MARCAR Dia/Mês Hora Serviço*\n\n` +
            `Exemplos:\n` +
            `👉 _Marcar 15/10 14:30 Corte Masculino_\n` +
            `👉 _Marcar 20/10 09:00 Barba_`
        )
        return
    }

    if (lowerText.startsWith('marcar ')) {
        const parts = cleanText.split(' ') 
        
        if (parts.length < 4) {
            await sendMessage(`⚠️ *Formato Inválido*\nPor favor use: *MARCAR Dia/Mês Hora Serviço*\nExemplo: Marcar 10/12 15:00 Corte`)
            return
        }

        const datePart = parts[1]
        const timePart = parts[2]
        const servicePart = parts.slice(3).join(' ') 

        const bookingDate = parseBookingDateTime(datePart, timePart)

        if (!bookingDate) {
            await sendMessage(`❌ *Data ou Hora inválida.*\nVerifique se digitou corretamente (DD/MM HH:MM) e se a data não está no passado.`)
            return
        }

        const { data: conflicts } = await supabase
            .from('appointments')
            .select('id')
            .eq('organization_id', org.id)
            .eq('appointment_date', bookingDate.toISOString())
            .neq('status', 'canceled')
        
        if (conflicts && conflicts.length > 0) {
            await sendMessage(`⚠️ *Horário Indisponível*\nJá temos um cliente agendado para ${datePart} às ${timePart}. Por favor, tente outro horário.`)
            return
        }

        const { error } = await supabase.from('appointments').insert({
            organization_id: org.id,
            customer_phone: phone,
            client_name: "Cliente WhatsApp",
            service_name: servicePart,
            appointment_date: bookingDate.toISOString(),
            status: 'confirmed',
            notes: `Agendado via Bot Control`
        })

        if (error) {
            console.error("Erro ao agendar:", error)
            await sendMessage(`❌ Ocorreu um erro técnico ao salvar seu horário. Tente novamente mais tarde.`)
        } else {
            await sendMessage(
                `✅ *Agendamento Confirmado!*\n\n` +
                `🗓 *Data:* ${bookingDate.toLocaleDateString('pt-BR')}\n` +
                `⏰ *Hora:* ${timePart}\n` +
                `✂️ *Serviço:* ${servicePart}\n\n` +
                `Te esperamos lá! Se precisar cancelar, digite *Menu* e escolha a opção 3.`
            )
        }
        return
    }

    if (lowerText === '2' || lowerText.includes('meus agendamentos')) {
        const { data: myAppts } = await supabase
            .from('appointments')
            .select('*')
            .eq('organization_id', org.id)
            .eq('customer_phone', phone)
            .neq('status', 'canceled')
            .gte('appointment_date', new Date().toISOString())
            .order('appointment_date', { ascending: true })
            .limit(5)

        if (!myAppts || myAppts.length === 0) {
            await sendMessage(`📭 Você não possui agendamentos futuros confirmados conosco.`)
        } else {
            let msg = `📋 *Seus Próximos Agendamentos:*\n`
            myAppts.forEach((app: any) => {
                const d = new Date(app.appointment_date)
                const dateFmt = d.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})
                const timeFmt = d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})
                const shortId = app.id.slice(0, 4)
                msg += `\n🔹 *${dateFmt} às ${timeFmt}* - ${app.service_name}\n   (Cód: ${shortId})`
            })
            msg += `\n\nPara cancelar algum, vá ao Menu > Opção 3.`
            await sendMessage(msg)
        }
        return
    }

    if (lowerText === '3' || lowerText.startsWith('cancelar')) {
        if (lowerText === '3') {
            await sendMessage(
                `🗑️ *Cancelar Agendamento*\n\n` +
                `Para cancelar, verifique o código do agendamento na Opção 2 e digite:\n` +
                `*CANCELAR Código*\n\n` +
                `Exemplo: _Cancelar a1b2_`
            )
            return
        }
        
        const parts = cleanText.split(' ')
        if (parts.length < 2) {
            await sendMessage(`⚠️ Digite o código do agendamento. Ex: *Cancelar a1b2*`)
            return
        }
        
        const idPrefix = parts[1]
        
        const { data: matches } = await supabase
            .from('appointments')
            .select('id, service_name, appointment_date')
            .eq('organization_id', org.id)
            .eq('customer_phone', phone)
            .ilike('id', `${idPrefix}%`)
            .limit(1)
            
        if (!matches || matches.length === 0) {
            await sendMessage(`❌ Agendamento não encontrado com o código "${idPrefix}". Verifique na opção 2.`)
            return
        }
        
        const appt = matches[0]
        
        const { error } = await supabase
            .from('appointments')
            .update({ status: 'canceled' })
            .eq('id', appt.id)
            
        if (error) {
            await sendMessage(`❌ Erro ao cancelar. Tente novamente.`)
        } else {
            const dateStr = new Date(appt.appointment_date).toLocaleDateString('pt-BR')
            await sendMessage(`✅ Agendamento de *${appt.service_name}* para dia ${dateStr} foi cancelado com sucesso.`)
        }
        return
    }

    if (lowerText === '4' || lowerText.includes('catalogo') || lowerText.includes('preços') || lowerText.includes('serviços')) {
        const catalogMsg = await getCatalogMessage(supabase, org.id)
        await sendMessage(catalogMsg || "O catálogo está sendo atualizado.")
        return
    }

    if (lowerText === '5' || lowerText.includes('atendente') || lowerText.includes('falar com humano')) {
        await sendMessage(
            `📞 *Contato Humano*\n\n` +
            `Você pode nos ligar no número: ${org.whatsapp || 'Indisponível'}\n` +
            `Ou aguarde, um atendente visualizará sua mensagem em breve.`
        )
        return
    }

    await sendMessage(`❓ Não entendi. Por favor, digite *Menu* para ver as opções disponíveis.`)
}