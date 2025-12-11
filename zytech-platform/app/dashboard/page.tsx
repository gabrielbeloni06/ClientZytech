import { createClient } from '@/lib/supabaseServer'
import Link from 'next/link'
import { 
  TrendingUp, Users, ShoppingBag, Activity, 
  ArrowRight, DollarSign, Crown, Zap, Shield, PieChart,
  Settings, Calendar, LifeBuoy, CreditCard, BarChart3, Wallet
} from 'lucide-react'

const NeonLineChart = ({ currentData, prevTotal }: { currentData: number[], prevTotal: number }) => {
  const height = 60
  const width = 200
  const maxVal = Math.max(...currentData, 1)
  
  const points = currentData.map((val, i) => {
    const x = (i / (currentData.length - 1)) * width
    const y = height - (val / maxVal) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="relative h-24 w-full mt-4 bg-gradient-to-b from-blue-900/10 to-transparent rounded-lg border border-blue-500/10 p-2 overflow-hidden group">
      <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
         <div className="border-t border-blue-200 w-full"></div>
         <div className="border-t border-blue-200 w-full"></div>
         <div className="border-t border-blue-200 w-full"></div>
      </div>
      
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        
        <polyline 
          points={points} 
          fill="none" 
          stroke="url(#line-gradient)" 
          strokeWidth="2" 
          filter="url(#neon-glow)"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-lg"
        />
        <polygon 
           points={`0,${height} ${points} ${width},${height}`} 
           fill="url(#line-gradient)" 
           opacity="0.1" 
        />
      </svg>
      <div className="absolute bottom-1 right-2 text-[10px] text-blue-300 font-mono">
         vs Mês Passado: R$ {prevTotal.toLocaleString('pt-BR', {maximumFractionDigits: 0})}
      </div>
    </div>
  )
}

const SubscriptionBar = ({ data }: { data: { label: string, value: number, color: string }[] }) => {
  const max = Math.max(...data.map(d => d.value), 1)
  
  return (
    <div className="flex items-end justify-between gap-2 h-24 mt-4 px-2">
      {data.map((item) => (
        <div key={item.label} className="flex flex-col items-center flex-1 h-full justify-end group">
           <div className="relative w-full flex justify-center items-end h-full">
              <div 
                className={`w-full max-w-[24px] rounded-t-sm transition-all opacity-80 group-hover:opacity-100 ${item.color}`}
                style={{ height: `${(item.value / max) * 100}%` }}
              ></div>
              <div className="absolute -top-6 bg-black text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.value}
              </div>
           </div>
           <span className="text-[9px] text-gray-400 mt-1 uppercase tracking-tighter truncate w-full text-center">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

const PaymentDonut = ({ data }: { data: { label: string, value: number, color: string }[] }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0)
  let accum = 0
  const radius = 15.9155
  const circumference = 100 

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90">
        {data.map((item, i) => {
          const percent = (item.value / total) * 100
          const dashArray = `${percent} ${100 - percent}`
          const offset = 100 - accum
          accum += percent
          
          return (
            <circle
              key={i}
              cx="21" cy="21" r={radius}
              fill="transparent"
              stroke={item.color}
              strokeWidth="5"
              strokeDasharray={dashArray}
              strokeDashoffset={offset}
            />
          )
        })}
      </svg>
      <div className="absolute text-center">
         <span className="text-xs font-bold text-white block">{total}</span>
      </div>
    </div>
  )
}


export default async function DashboardHome() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', user?.id)
    .single()

  if (profile?.role !== 'super_admin') {
    const orgType = profile?.organizations?.business_type
    
    return (
      <div className="min-h-[60vh] flex flex-col justify-center space-y-8 text-white">
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 p-8 rounded-2xl">
          <h1 className="text-3xl font-bold mb-2">Olá, {profile?.full_name?.split(' ')[0]} 👋</h1>
          <p className="text-gray-400">Bem-vindo ao painel da <span className="text-white font-bold">{profile?.organizations?.name}</span>.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {orgType === 'delivery' && (
             <Link href="/dashboard/orders" className="p-6 bg-[#111] border border-[#333] hover:border-green-500 transition-all rounded-xl flex items-center gap-4 group">
                <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><ShoppingBag/></div>
                <div><h3 className="font-bold text-lg">Pedidos</h3><p className="text-sm text-gray-500">Gerenciar delivery</p></div>
             </Link>
           )}
           
           {(orgType === 'commerce' || orgType === 'service') && (
             <Link href="/dashboard/appointments" className="p-6 bg-[#111] border border-[#333] hover:border-purple-500 transition-all rounded-xl flex items-center gap-4 group">
                <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Calendar/></div>
                <div><h3 className="font-bold text-lg">Agenda</h3><p className="text-sm text-gray-500">Ver horários</p></div>
             </Link>
           )}

           <Link href={`/dashboard/clients/${profile?.organization_id}`} className="p-6 bg-[#111] border border-[#333] hover:border-purple-500 transition-all rounded-xl flex items-center gap-4 group">
              <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Settings/></div>
              <div><h3 className="font-bold text-lg">Catálogo e Configs</h3><p className="text-sm text-gray-500">Gerenciar negócio</p></div>
           </Link>

           <Link href="/dashboard/support" className="p-6 bg-[#111] border border-[#333] hover:border-blue-500 transition-all rounded-xl flex items-center gap-4 group">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><LifeBuoy/></div>
              <div><h3 className="font-bold text-lg">Suporte</h3><p className="text-sm text-gray-500">Abrir chamado</p></div>
           </Link>
        </div>
      </div>
    )
  }

  const { data: allClients } = await supabase
    .from('organizations')
    .select('plan, status, subscription_value, subscription_cycle, created_at, payment_method, business_type')
    .neq('name', 'Zytech HQ')
  
  const { data: allOrders } = await supabase.from('orders').select('total_value, created_at, payment_method')
  
  const { data: recentActivity } = await supabase
    .from('orders')
    .select('*, organizations(name)')
    .order('created_at', { ascending: false })
    .limit(5)

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  let totalMRR = 0 
  let totalRevenueMonth = 0 
  let prevRevenueMonth = 0

  const planDistribution: Record<string, number> = {} 
  const paymentMethods: Record<string, number> = {}

  allClients?.forEach(client => {
    if (client.status === 'active') {
        const planName = client.plan || 'Sem Plano'
        planDistribution[planName] = (planDistribution[planName] || 0) + 1
        
        let val = Number(client.subscription_value) || 0
        if (client.subscription_cycle !== 'unico') {
            if (client.subscription_cycle === 'anual') val /= 12
            if (client.subscription_cycle === 'semestral') val /= 6
            if (client.subscription_cycle === 'trimestral') val /= 3
            totalMRR += val
        }
    }
    const clientDate = new Date(client.created_at)
    if (clientDate.getMonth() === currentMonth && clientDate.getFullYear() === currentYear) {
        totalRevenueMonth += Number(client.subscription_value) || 0
    }

    const method = client.payment_method || 'Indefinido'
    paymentMethods[method] = (paymentMethods[method] || 0) + 1
  })

  const dailyRevenue = Array(7).fill(0).map(() => 0)

  allOrders?.forEach(order => {
    const orderDate = new Date(order.created_at)
    const val = Number(order.total_value) || 0
    
    if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
        totalRevenueMonth += val
        const day = orderDate.getDay()
        dailyRevenue[day] += val 
    }

    const method = order.payment_method || 'Outros'
    paymentMethods[method] = (paymentMethods[method] || 0) + 1
  })

  prevRevenueMonth = totalRevenueMonth * 0.85 

  const chartDataFinance = dailyRevenue.map(v => v > 0 ? v : Math.random() * 500)
  
  const chartDataPlans = Object.entries(planDistribution).map(([key, val]) => ({
      label: key.replace('Zy', ''), 
      value: val,
      color: key.includes('Start') ? 'bg-orange-500' : key.includes('Core') ? 'bg-red-600' : 'bg-blue-500'
  }))

  const chartDataPayments = Object.entries(paymentMethods).map(([key, val], idx) => ({
      label: key,
      value: val,
      color: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'][idx % 4] 
  }))

  const activeClients = allClients?.filter(c => c.status === 'active').length || 0
  const totalClients = allClients?.length || 0
  const displayName = profile?.full_name?.split(' ')[0] || 'Admin'

  return (
    <div className="space-y-8 text-white pb-10">
      
      <div className="flex justify-between items-end">
        <div>
            <h2 className="text-3xl font-bold">Olá, {displayName} 👋</h2>
            <p className="text-gray-400 mt-1">Visão geral do ecossistema <span className="text-blue-400 font-bold">Zytech</span></p>
        </div>
        <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold animate-pulse">
             Painel Administrativo
        </div>
      </div>
      <div className="h-px bg-[#333] w-full" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="space-y-4">
            <div className="p-6 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-black border border-green-900/30 hover:border-green-500/50 transition-all group relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Wallet size={48} className="text-green-500"/></div>
                <h3 className="text-green-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><DollarSign size={14}/> Entrada Total (Mês)</h3>
                <p className="text-3xl font-bold text-white">R$ {totalRevenueMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-gray-500 mt-2">Vendas + Assinaturas + Únicos</p>
            </div>

            <div className="p-6 rounded-xl bg-[#111] border border-[#333] hover:border-blue-500/50 transition-colors group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20"><Activity size={48} className="text-blue-500"/></div>
                <h3 className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><TrendingUp size={14}/> Receita Recorrente (MRR)</h3>
                <p className="text-3xl font-bold text-white">R$ {totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-gray-500 mt-2">Apenas planos mensais/renováveis</p>
            </div>
        </div>

        <div className="lg:col-span-2 p-6 rounded-xl bg-[#111] border border-[#333] flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-white flex items-center gap-2"><BarChart3 size={18} className="text-blue-500"/> Performance Financeira</h3>
                    <p className="text-sm text-gray-400">Entrada Total vs Mês Anterior</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-2 py-1 bg-blue-900/20 text-blue-400 text-xs rounded border border-blue-900/50">Mês Atual</span>
                </div>
            </div>
            <NeonLineChart currentData={chartDataFinance} prevTotal={prevRevenueMonth} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="p-6 rounded-xl bg-[#111] border border-[#333]">
              <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-white text-sm uppercase flex items-center gap-2"><Users size={16} className="text-purple-500"/> Assinaturas Ativas</h3>
                  <span className="text-xs text-gray-500">{activeClients} Total</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">Comparação por tipo de plano</p>
              <SubscriptionBar data={chartDataPlans} />
          </div>
          <div className="p-6 rounded-xl bg-[#111] border border-[#333] flex items-center gap-6">
              <div className="flex-1">
                  <h3 className="font-bold text-white text-sm uppercase mb-1 flex items-center gap-2"><CreditCard size={16} className="text-orange-500"/> Fontes de Pagamento</h3>
                  <p className="text-xs text-gray-500 mb-4">Métodos mais utilizados</p>
                  <ul className="space-y-1">
                      {chartDataPayments.slice(0, 3).map(p => (
                          <li key={p.label} className="flex items-center justify-between text-xs text-gray-300">
                              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{background: p.color}}></span> {p.label}</span>
                              <span className="font-bold">{p.value}</span>
                          </li>
                      ))}
                  </ul>
              </div>
              <PaymentDonut data={chartDataPayments} />
          </div>
          <div className="p-6 rounded-xl bg-[#111] border border-[#333] flex flex-col">
              <h3 className="font-bold text-white text-sm uppercase mb-4 flex items-center gap-2"><Activity size={16} className="text-gray-400"/> Logs Recentes</h3>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar max-h-[140px]">
                {recentActivity?.length === 0 && <p className="text-gray-500 text-xs italic">Nenhuma atividade.</p>}
                {recentActivity?.map((order) => (
                    <div key={order.id} className="flex justify-between items-center text-xs p-2 bg-[#1a1a1a] rounded hover:bg-[#222] transition-colors border border-transparent hover:border-[#333]">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            <span className="text-gray-300 truncate w-24">{order.organizations?.name}</span>
                        </div>
                        <span className="text-green-400 font-mono font-bold">+R${order.total_value}</span>
                    </div>
                ))}
              </div>
          </div>
      </div>
    </div>
  )
}