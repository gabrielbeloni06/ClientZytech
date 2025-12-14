import { SupabaseClient } from '@supabase/supabase-js'

export async function getCatalogMessage(supabase: SupabaseClient, orgId: string) {
    const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_available', true)
        .order('category', { ascending: true })

    if (!products || products.length === 0) {
        return "Desculpe, nosso catálogo está vazio no momento."
    }

    let msg = "*📋 CATÁLOGO DISPONÍVEL:*\n"
    let currentCat = ''

    products.forEach(p => {
        if (p.category !== currentCat) {
            msg += `\n*--- ${p.category} ---*\n`
            currentCat = p.category
        }
        const stockInfo = p.track_stock ? ` (${p.stock_quantity || 0} disp.)` : ''
        msg += `▪️ ${p.name}: R$ ${Number(p.price).toFixed(2)}${stockInfo}\n`
    })

    return msg
}