export const botDeliveryControl = async (org: any, phone: string, text: string, sendMessage: Function, supabase: any) => {
    
    let menuText = "Cardápio indisponível no momento.";
    
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('name, price, description')
            .eq('organization_id', org.id)
            .eq('active', true);

        if (error) {
            console.error('Erro ao buscar produtos:', error);
        } else if (products && products.length > 0) {
            menuText = products.map((p: any) => 
                `- ${p.name}: R$ ${p.price} ${p.description ? `(${p.description})` : ''}`
            ).join('\n');
        } else {
            menuText = "Não há produtos cadastrados ou ativos no momento.";
        }
    } catch (dbError) {
        console.error('Erro de conexão ao buscar cardápio:', dbError);
    }

    const systemPrompt = `
        Você é o atendente virtual da pizzaria/restaurante '${org.name || 'Delivery'}'.
        Seu tom é amigável, jovem e prestativo.
        
        CARDÁPIO ATUALIZADO DO SISTEMA:
        ${menuText}
        
        REGRAS:
        - Use APENAS os produtos listados acima. Se o cliente pedir algo fora, diga que não temos.
        - Tente fechar o pedido confirmando os sabores e o endereço de entrega.
        - Responda de forma curta e direta (máximo 2 frases).
        - NÃO invente preços. Use os valores exatos da lista.
    `;

    try {
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            console.error('❌ ERRO CRÍTICO: GROQ_API_KEY não encontrada nas variáveis de ambiente (.env).');
            await sendMessage(phone, 'Desculpe, estou em manutenção (erro de configuração interna).');
            return;
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                temperature: 0.6,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Groq API Error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content;

        if (!aiResponse) {
            throw new Error('Resposta vazia da AI');
        }

        await sendMessage(phone, aiResponse);

    } catch (error) {
        console.error('Erro na AI (Delivery):', error);
        await sendMessage(phone, 'Desculpe, tive um problema técnico momentâneo. Pode repetir?');
    }
}