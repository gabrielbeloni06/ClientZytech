import { createClient } from '@/lib/supabaseServer'
import Link from 'next/link'
import { 
  TrendingUp, Users, ShoppingBag, Activity, 
  ArrowRight, DollarSign, Crown, Zap, Shield 
} from 'lucide-react'

export default async function DashboardHome() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', user?.id)
    .single()

  if (profile?.role !== 'super_admin') {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-white text-center p-10 space-y-6">
            
            <div className="bg-red-900/30 border border-red-500/50 p-4 rounded text-sm text-red-200 mb-8 max-w-md">
                <strong>🔧 DEBUG INFO (Só pra você ver):</strong><br/>
                O sistema detectou seu cargo como: <span className="font-bold text-white uppercase">"{profile?.role || 'NULL'}"</span>.<br/>
                Por isso você não está vendo a tela de Admin.
            </div>

            <div className="w-20 h-20 bg-[#222] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#333]">
                <ShoppingBag size={32} className="text-gray-400"/>
            </div>

            <div>
                <h1 className="text-3xl font-bold mb-2">Painel da Loja: {profile?.organizations?.name || 'Sua Empresa'}</h1>
                <p className="text-gray-400">Bem-vindo ao seu gerenciador de pedidos e cardápio.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
                <Link href="/dashboard/orders" className="flex-1 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-900/20">
                    <ShoppingBag size={20}/> Ver Pedidos
                </Link>
                <Link href={`/dashboard/clients/${profile?.organization_id}`} className="flex-1 bg-[#222] hover:bg-[#333] border border-[#333] text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center">
                    Gerenciar Cardápio
                </Link>
            </div>
        </div>
    )
  }

  const { data: allClients } = await supabase
    .from('organizations')
    .select('plan, status, subscription_value, subscription_cycle')
    .neq('name', 'Zytech HQ')
  
  const { data: allOrders } = await supabase
    .from('orders')
    .select('total_value, created_at')
  
  const { data: recentActivity } = await supabase
    .from('orders')
    .select('*, organizations(name)')
    .order('created_at', { ascending: false })
    .limit(5)

  let totalMRR = 0
  const planCounts = { diamante: 0, ouro: 0, prata: 0, bronze: 0 }

  allClients?.forEach(client => {
    if (client.status === 'active') {
        if (client.plan in planCounts) planCounts[client.plan as keyof typeof planCounts]++
        
        let val = Number(client.subscription_value) || 0
        if (client.subscription_cycle === 'anual') val /= 12
        if (client.subscription_cycle === 'semestral') val /= 6
        if (client.subscription_cycle === 'trimestral') val /= 3
        if (client.subscription_cycle === 'unico') val = 0
        totalMRR += val
    }
  })

  const gmv = allOrders?.reduce((acc, order) => acc + Number(order.total_value), 0) || 0
  const activeClients = allClients?.filter(c => c.status === 'active').length || 0
  const totalClients = allClients?.length || 0
  const today = new Date().toISOString().split('T')[0]
  const ordersToday = allOrders?.filter(o => o.created_at.startsWith(today)).length || 0
  const displayName = profile?.full_name?.split(' ')[0] || 'Admin'

  return (
    <div className="space-y-8 pb-10">
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Olá, {displayName} 👋</h2>
          <p className="text-gray-400 mt-1">Visão geral do ecossistema <span className="text-blue-400 font-bold">Zytech</span></p>
        </div>
        <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold animate-pulse">
             ● Painel Administrativo
        </div>
      </div>
      <div className="h-px bg-[#333] w-full" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-[#111] border border-[#333] hover:border-blue-500/50 transition-colors group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20"><DollarSign size={48} className="text-blue-500"/></div>
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider group-hover:text-blue-400">Receita Recorrente (MRR)</h3>
          <p className="text-3xl font-bold text-white mt-2">R$ {totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <span className="text-xs text-gray-500 mt-2 block">Baseado nos contratos ativos</span>
        </div>

        <div className="p-6 rounded-xl bg-[#111] border border-[#333] hover:border-purple-500/50 transition-colors group relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20"><Users size={48} className="text-purple-500"/></div>
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider group-hover:text-purple-400">Base de Clientes</h3>
          <p className="text-3xl font-bold text-white mt-2">{activeClients} <span className="text-lg text-gray-500 font-normal">/ {totalClients}</span></p>
          <div className="flex gap-2 mt-3 overflow-hidden">
             {planCounts.diamante > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-cyan-900/30 text-cyan-400 rounded border border-cyan-900/50">💎 {planCounts.diamante}</span>}
             {planCounts.ouro > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-900/30 text-yellow-400 rounded border border-yellow-900/50">⚡ {planCounts.ouro}</span>}
             <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded border border-gray-700">Outros: {planCounts.prata + planCounts.bronze}</span>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-[#111] border border-[#333] hover:border-green-500/50 transition-colors group relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20"><TrendingUp size={48} className="text-green-500"/></div>
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider group-hover:text-green-400">Volume Transacionado</h3>
          <p className="text-3xl font-bold text-white mt-2">R$ {gmv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <span className="text-xs text-green-500 mt-2 block">{ordersToday} pedidos hoje pelo Bot</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111] border border-[#333] rounded-xl overflow-hidden">
            <div className="p-6 border-b border-[#333] flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2"><Activity size={18} className="text-blue-500"/> Atividade Recente</h3>
                <Link href="/dashboard/orders" className="text-xs text-blue-400 hover:text-white transition-colors flex items-center gap-1">Ver tudo <ArrowRight size={12}/></Link>
            </div>
            <div className="divide-y divide-[#222]">
                {!recentActivity || recentActivity.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">Nenhuma atividade registrada ainda.</div>
                ) : (
                    recentActivity.map((order) => (
                        <div key={order.id} className="p-4 flex items-center justify-between hover:bg-[#161616] transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500"><ShoppingBag size={18}/></div>
                                <div>
                                    <p className="text-sm font-bold text-white">{order.customer_name}</p>
                                    <p className="text-xs text-gray-500">comprou em <span className="text-gray-300">{order.organizations?.name}</span></p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-green-400">+ R$ {Number(order.total_value).toFixed(2)}</p>
                                <p className="text-[10px] text-gray-600">{new Date(order.created_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        <div className="bg-[#111] border border-[#333] rounded-xl p-6">
             <h3 className="font-bold text-white mb-4">Ações Rápidas</h3>
             <div className="space-y-3">
                <Link href="/dashboard/clients" className="block w-full p-3 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-lg text-sm text-gray-300 transition-colors flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-600/20 flex items-center justify-center text-blue-500"><Users size={16}/></div>
                    Adicionar Novo Cliente
                </Link>
                <Link href="/dashboard/orders" className="block w-full p-3 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-lg text-sm text-gray-300 transition-colors flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-green-600/20 flex items-center justify-center text-green-500"><ShoppingBag size={16}/></div>
                    Monitorar Pedidos
                </Link>
             </div>
             <div className="mt-6 pt-6 border-t border-[#333]">
                <p className="text-xs text-gray-500 mb-2">Meta do Mês</p>
                <div className="w-full bg-[#222] rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full" style={{width: '65%'}}></div>
                </div>
                <p className="text-right text-xs text-gray-400 mt-1">65% atingido</p>
             </div>
        </div>
      </div>
    </div>
  )
}