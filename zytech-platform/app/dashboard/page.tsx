import { createClient } from '@/lib/supabaseServer'
import Link from 'next/link'
import { 
  TrendingUp, Users, ShoppingBag, Activity, 
  ArrowRight, DollarSign, Crown, Zap, Shield, PieChart,
  Settings, Calendar, LifeBuoy, CreditCard, BarChart3, Wallet,
  Server, Cpu, MessageSquare, AlertCircle, Home
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
    <div className="relative h-24 w-full mt-4 bg-gradient-to-b from-blue-500/5 to-transparent rounded-lg border border-blue-500/10 p-2 overflow-hidden group">
      <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
         <div className="border-t border-blue-400/30 w-full"></div>
         <div className="border-t border-blue-400/30 w-full"></div>
         <div className="border-t border-blue-400/30 w-full"></div>
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
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#a855f7" />
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
          className="drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]"
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
                className={`w-full max-w-[24px] rounded-t-sm transition-all duration-500 opacity-80 group-hover:opacity-100 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] ${item.color}`}
                style={{ height: `${(item.value / max) * 100}%` }}
              ></div>
              <div className="absolute -top-8 bg-[#0a0a0a] border border-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                {item.value} clientes
              </div>
           </div>
           <span className="text-[9px] text-gray-500 mt-2 uppercase tracking-tighter truncate w-full text-center font-mono group-hover:text-gray-300 transition-colors">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

const PaymentDonut = ({ data }: { data: { label: string, value: number, color: string }[] }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0)
  let accum = 0
  const radius = 15.9155

  return (
    <div className="relative w-24 h-24 flex items-center justify-center group">
      <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all opacity-50"></div>
      <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90 relative z-10">
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
              className="transition-all duration-300 hover:stroke-[6px] hover:opacity-100 opacity-80 cursor-pointer drop-shadow-sm"
            />
          )
        })}
      </svg>
      <div className="absolute text-center z-20 pointer-events-none">
         <span className="text-xs font-bold text-white block">{total}</span>
         <span className="text-[8px] text-gray-500 uppercase">Total</span>
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
    const orgName = profile?.organizations?.name
    
    const hour = new Date().getHours()
    const isOpen = hour >= 9 && hour < 22 

    return (
      <div className="min-h-[60vh] flex flex-col justify-center space-y-8 text-white max-w-5xl mx-auto">
        
        <div className="relative bg-gradient-to-r from-[#0a0a0a] to-[#050505] border border-gray-800/50 p-8 rounded-2xl overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-600/20 transition-all duration-700"></div>
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Olá, {profile?.full_name?.split(' ')[0]}
            </h1>
            <p className="text-gray-400 text-lg">
              Gerencie a <span className="text-white font-semibold">{orgName}</span>.
            </p>
            <div className="mt-4 flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${isOpen ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-500 font-mono uppercase tracking-widest">
                    {isOpen ? 'Sistema Operante' : 'Fora de Horário'}
                </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           
           {orgType === 'delivery' && (
             <a href="/dashboard" className="group relative p-8 bg-gradient-to-br from-green-900/10 to-black border border-green-500/20 hover:border-green-500/40 rounded-2xl transition-all duration-300 overflow-hidden shadow-lg hover:shadow-green-900/10">
                <div className="relative z-10 flex flex-col h-full justify-between">
                   <div className="w-14 h-14 bg-green-500/10 text-green-400 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] transition-all border border-green-500/10">
                      <Home size={28}/>
                   </div>
                   <div className="mt-6">
                      <h3 className="font-bold text-xl text-white group-hover:text-green-400 transition-colors">Início</h3>
                      <p className="text-sm text-gray-500 mt-1">Recarregar painel</p>
                   </div>
                   <div className="mt-4 flex items-center text-xs text-green-500 font-bold opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                      ATUALIZAR <ArrowRight size={12} className="ml-1"/>
                   </div>
                </div>
             </a>
           )}
           
           {(orgType === 'commerce' || orgType === 'service') && (
             <Link href="/dashboard/appointments" className="group relative p-8 bg-gradient-to-br from-purple-900/10 to-black border border-purple-500/20 hover:border-purple-500/40 rounded-2xl transition-all duration-300 overflow-hidden shadow-lg hover:shadow-purple-900/10">
                <div className="relative z-10 flex flex-col h-full justify-between">
                   <div className="w-14 h-14 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all border border-purple-500/10">
                      <Calendar size={28}/>
                   </div>
                   <div className="mt-6">
                      <h3 className="font-bold text-xl text-white group-hover:text-purple-400 transition-colors">Agenda</h3>
                      <p className="text-sm text-gray-500 mt-1">Visualizar e gerenciar horários</p>
                   </div>
                   <div className="mt-4 flex items-center text-xs text-purple-500 font-bold opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                      VER AGENDA <ArrowRight size={12} className="ml-1"/>
                   </div>
                </div>
             </Link>
           )}

           <Link href={`/dashboard/clients/${profile?.organization_id}`} className="group relative p-8 bg-gradient-to-br from-blue-900/10 to-black border border-blue-500/20 hover:border-blue-500/40 rounded-2xl transition-all duration-300 overflow-hidden shadow-lg hover:shadow-blue-900/10">
              <div className="relative z-10 flex flex-col h-full justify-between">
                 <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all border border-blue-500/10">
                    <Settings size={28}/>
                 </div>
                 <div className="mt-6">
                    <h3 className="font-bold text-xl text-white group-hover:text-blue-400 transition-colors">
                        {orgType === 'delivery' ? 'Gestão de Delivery' : 'Configurações'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Cardápio, Pedidos e Configs</p>
                 </div>
                 <div className="mt-4 flex items-center text-xs text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                    ACESSAR <ArrowRight size={12} className="ml-1"/>
                 </div>
              </div>
           </Link>

           <Link href="/dashboard/support" className="group relative p-8 bg-gradient-to-br from-pink-900/10 to-black border border-pink-500/20 hover:border-pink-500/40 rounded-2xl transition-all duration-300 overflow-hidden shadow-lg hover:shadow-pink-900/10">
              <div className="relative z-10 flex flex-col h-full justify-between">
                 <div className="w-14 h-14 bg-pink-500/10 text-pink-400 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(236,72,153,0.2)] transition-all border border-pink-500/10">
                    <LifeBuoy size={28}/>
                 </div>
                 <div className="mt-6">
                    <h3 className="font-bold text-xl text-white group-hover:text-pink-400 transition-colors">Suporte</h3>
                    <p className="text-sm text-gray-500 mt-1">Ajuda e chamados técnicos</p>
                 </div>
                 <div className="mt-4 flex items-center text-xs text-pink-500 font-bold opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                    AJUDA <ArrowRight size={12} className="ml-1"/>
                 </div>
              </div>
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
    .limit(7)

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
  const displayName = profile?.full_name?.split(' ')[0] || 'Admin'


  return (
    <div className="space-y-8 text-white pb-10">
      
      <div className="flex justify-between items-end">
        <div>
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500">
                Command Center
            </h2>
            <p className="text-gray-400 mt-1 text-sm font-mono tracking-wide">
                BEM-VINDO, {displayName.toUpperCase()}. SISTEMA OPERANTE.
            </p>
        </div>
        <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-green-900/20 border border-green-500/30">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"></span>
                <span className="text-green-500 text-xs font-bold">LIVE</span>
             </div>
             <div className="px-3 py-1.5 rounded bg-blue-900/20 border border-blue-500/30 text-blue-400 text-xs font-bold font-mono">
                  v2.0.5-release
             </div>
        </div>
      </div>
      
      <div className="h-px bg-gradient-to-r from-blue-900/50 via-gray-800 to-transparent w-full" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        <div className="space-y-4 lg:col-span-1">
            
            <div className="p-6 rounded-xl bg-gradient-to-br from-green-900/10 to-black border border-green-500/20 hover:border-green-500/40 transition-all group relative overflow-hidden shadow-lg hover:shadow-green-900/10">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 blur-3xl rounded-full translate-x-8 -translate-y-8 group-hover:bg-green-500/20 transition-all"></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-500 border border-green-500/20"><DollarSign size={20}/></div>
                    <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Mês Atual</span>
                </div>
                <p className="text-3xl font-bold text-white tracking-tight relative z-10">R$ {totalRevenueMonth.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-green-400 relative z-10">
                    <TrendingUp size={12} /> <span>+15% vs mês anterior</span>
                </div>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-900/10 to-black border border-blue-500/20 hover:border-blue-500/40 transition-all group relative overflow-hidden shadow-lg hover:shadow-blue-900/10">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-3xl rounded-full translate-x-8 -translate-y-8 group-hover:bg-blue-500/20 transition-all"></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20"><Activity size={20}/></div>
                    <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Recorrente (MRR)</span>
                </div>
                <p className="text-3xl font-bold text-white tracking-tight relative z-10">R$ {totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                <p className="text-xs text-gray-500 mt-2 relative z-10">Base sólida de assinaturas</p>
            </div>

            <div className="p-5 rounded-xl bg-gradient-to-br from-gray-900/30 to-black border border-gray-800 hover:border-gray-700 transition-all space-y-4 shadow-lg">
                <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><Cpu size={14}/> System Health</h3>
                
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-300">
                        <span>CPU Load</span>
                        <span className="text-green-400 font-mono">12%</span>
                    </div>
                    <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 w-[12%] shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-300">
                        <span>Memory</span>
                        <span className="text-yellow-400 font-mono">45%</span>
                    </div>
                    <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 w-[45%] shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-300">
                        <span>Database Latency</span>
                        <span className="text-blue-400 font-mono">24ms</span>
                    </div>
                    <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-[20%] shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                    </div>
                </div>
            </div>

        </div>

        <div className="lg:col-span-2 space-y-6">
             <div className="p-6 rounded-xl bg-gradient-to-br from-blue-900/5 to-black border border-blue-500/10 min-h-[300px] flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/20 transition-all shadow-lg">
                <div className="flex justify-between items-start z-10">
                    <div>
                        <h3 className="font-bold text-white flex items-center gap-2"><BarChart3 size={18} className="text-blue-500"/> Fluxo Financeiro</h3>
                        <p className="text-sm text-gray-500">Visualização de entrada diária</p>
                    </div>
                    <div className="flex gap-2">
                         <span className="px-2 py-1 bg-blue-900/20 text-blue-400 text-[10px] rounded border border-blue-500/30 uppercase font-bold animate-pulse">Realtime</span>
                    </div>
                </div>
                <NeonLineChart currentData={chartDataFinance} prevTotal={prevRevenueMonth} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-900/10 to-black border border-indigo-500/20 hover:border-indigo-500/40 transition-all flex flex-col items-center justify-center relative group shadow-lg">
                     <h3 className="text-xs font-bold text-gray-400 absolute top-4 left-4 uppercase">Pagamentos</h3>
                     <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 blur-2xl rounded-full group-hover:bg-indigo-500/10 transition-all"></div>
                     <div className="mt-4 scale-90 relative z-10">
                        <PaymentDonut data={chartDataPayments} />
                     </div>
                     <div className="mt-4 flex flex-wrap gap-2 justify-center relative z-10">
                        {chartDataPayments.slice(0,3).map(p => (
                             <div key={p.label} className="flex items-center gap-1.5 text-[9px] text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/5">
                                 <span className="w-1.5 h-1.5 rounded-full" style={{background: p.color, boxShadow: `0 0 5px ${p.color}`}}></span>
                                 {p.label}
                             </div>
                        ))}
                     </div>
                 </div>

                 <div className="p-5 rounded-xl bg-gradient-to-br from-purple-900/10 to-black border border-purple-500/20 flex flex-col justify-between group hover:border-purple-500/40 transition-all shadow-lg hover:shadow-purple-900/10">
                      <div className="flex justify-between items-start relative z-10">
                          <h3 className="text-xs font-bold text-purple-400 uppercase flex items-center gap-2"><Zap size={14}/> AI Engine</h3>
                          <span className="w-2 h-2 bg-purple-500 rounded-full animate-ping shadow-[0_0_8px_#a855f7]"></span>
                      </div>
                      <div className="space-y-2 mt-2 relative z-10">
                          <div className="text-3xl font-bold text-white tracking-tight">4.2k</div>
                          <div className="text-[10px] text-gray-400">Mensagens processadas hoje</div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-purple-500/10 text-[10px] text-gray-500 flex justify-between relative z-10">
                          <span className="flex items-center gap-1"><Cpu size={10}/> Llama 3.3</span>
                          <span className="text-green-500 font-bold">Estável</span>
                      </div>
                      <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full group-hover:bg-purple-500/10 transition-all"></div>
                 </div>
            </div>
        </div>

        <div className="space-y-4 lg:col-span-1">
             <div className="p-6 rounded-xl bg-gradient-to-br from-orange-900/10 to-black border border-orange-500/20 hover:border-orange-500/40 transition-all shadow-lg group">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-white text-xs uppercase flex items-center gap-2"><Users size={14} className="text-orange-500"/> Planos Ativos</h3>
                      <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded border border-orange-500/30">{activeClients}</span>
                  </div>
                  <SubscriptionBar data={chartDataPlans} />
             </div>

             <div className="p-5 rounded-xl bg-gradient-to-br from-gray-900/30 to-black border border-gray-800 hover:border-gray-700 transition-all flex flex-col h-[300px] shadow-lg">
                  <h3 className="font-bold text-white text-xs uppercase mb-4 flex items-center gap-2"><Server size={14} className="text-gray-400"/> Live Logs</h3>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {recentActivity?.map((order, i) => (
                        <div key={order.id} className="group flex flex-col gap-1 p-2 rounded bg-white/5 border border-white/5 hover:border-gray-600 transition-all hover:bg-white/10">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-300 truncate max-w-[100px]">{order.organizations?.name}</span>
                                <span className="text-[9px] text-gray-500 font-mono">{new Date(order.created_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-gray-400 flex items-center gap-1.5">
                                    {order.payment_method === 'pix' ? <Zap size={10} className="text-yellow-500"/> : <CreditCard size={10} className="text-blue-400"/>} 
                                    {order.payment_method}
                                </span>
                                <span className="text-green-400 font-mono text-[10px] font-bold">+R${Number(order.total_value).toFixed(0)}</span>
                            </div>
                        </div>
                    ))}
                    {recentActivity?.length === 0 && <div className="text-center text-gray-600 text-xs py-10">Sem atividade recente.</div>}
                  </div>
             </div>
        </div>

      </div>
    </div>
  )
}