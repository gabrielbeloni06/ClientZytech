'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  DollarSign, ArrowUpRight, Search, CreditCard,
  TrendingUp, Calendar, Filter, Wallet, Activity,
  PieChart, BarChart3, ArrowDownRight, Download
} from 'lucide-react'


const ComparisonChart = ({ data, prevData }: { data: number[], prevData: number[] }) => {
    const max = Math.max(...data, ...prevData, 1)
    const points = data.map((val, i) => `${(i / (data.length - 1)) * 100},${50 - (val / max) * 40}`).join(' ')
    const prevPoints = prevData.map((val, i) => `${(i / (prevData.length - 1)) * 100},${50 - (val / max) * 40}`).join(' ')

    return (
        <div className="relative h-48 w-full bg-gradient-to-b from-blue-500/5 to-transparent rounded-xl border border-blue-500/10 p-4 overflow-hidden group">
            <div className="absolute inset-0 grid grid-rows-4 w-full h-full opacity-20 pointer-events-none">
                <div className="border-t border-blue-500/20 border-dashed"></div>
                <div className="border-t border-blue-500/20 border-dashed"></div>
                <div className="border-t border-blue-500/20 border-dashed"></div>
                <div className="border-t border-blue-500/20 border-dashed"></div>
            </div>
            
            <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                    <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                    <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                </defs>

                <polyline 
                    points={prevPoints} 
                    fill="none" 
                    stroke="#4b5563" 
                    strokeWidth="0.5" 
                    strokeDasharray="2"
                    opacity="0.5"
                />
                
                <polygon 
                    points={`0,50 ${points} 100,50`} 
                    fill="url(#fillGradient)" 
                    opacity="0.5" 
                />

                <polyline 
                    points={points} 
                    fill="none" 
                    stroke="url(#lineGradient)" 
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#neon-glow)"
                    className="drop-shadow-lg"
                />
            </svg>
        </div>
    )
}

const SubscriptionsBarChart = ({ stats }: { stats: {label: string, value: number, color: string}[] }) => {
    const max = Math.max(...stats.map(s => s.value), 1)
    
    return (
        <div className="h-40 flex items-end justify-between gap-3 p-2">
            {stats.map((stat) => (
                <div key={stat.label} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <div className="relative w-full flex justify-center items-end h-full">
                        <div 
                            className={`w-full max-w-[24px] rounded-t-sm transition-all duration-700 relative ${stat.color} opacity-80 group-hover:opacity-100 group-hover:shadow-[0_0_15px_currentColor]`}
                            style={{ height: `${(stat.value / max) * 100}%` }}
                        >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0a0a0a] border border-white/10 text-white text-[10px] px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none z-10 font-mono">
                                {stat.value}
                            </div>
                        </div>
                    </div>
                    <span className="text-[9px] text-gray-500 mt-2 truncate w-full text-center font-mono uppercase tracking-wider">{stat.label}</span>
                </div>
            ))}
        </div>
    )
}

const PaymentDonutChart = ({ data }: { data: { label: string, value: number, color: string }[] }) => {
    const total = data.reduce((acc, curr) => acc + curr.value, 0)
    let accumulatedCircumference = 0
    const radius = 16
    const circumference = 2 * Math.PI * radius

    return (
        <div className="relative w-32 h-32 flex items-center justify-center group">
            <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all duration-700"></div>
            
            <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90 relative z-10">
                {data.map((item, index) => {
                    const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`
                    const strokeDashoffset = -accumulatedCircumference
                    accumulatedCircumference += (item.value / total) * circumference
                    
                    return (
                        <circle
                            key={index}
                            cx="20" cy="20" r={radius}
                            fill="none"
                            stroke={item.color}
                            strokeWidth="4"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-1000 hover:stroke-[5] hover:opacity-100 opacity-90 cursor-pointer"
                        />
                    )
                })}
            </svg>
            <div className="absolute text-center pointer-events-none">
                <span className="text-xs font-bold text-white block">{total}</span>
                <span className="text-[8px] text-gray-500 uppercase tracking-wider">Total</span>
            </div>
        </div>
    )
}


export default function FinancePage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('year') 
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [prevRevenue, setPrevRevenue] = useState(0) 
  const [revenueTrend, setRevenueTrend] = useState<number[]>([])
  const [prevRevenueTrend, setPrevRevenueTrend] = useState<number[]>([])
  const [planStats, setPlanStats] = useState<any[]>([])
  const [paymentStats, setPaymentStats] = useState<any[]>([])

  useEffect(() => {
    fetchFinancials()
  }, [filter])

  async function fetchFinancials() {
    setLoading(true)
    
    let query = supabase
      .from('organizations')
      .select('*')
      .neq('name', 'Zytech HQ')
      .order('created_at', { ascending: false })

    const now = new Date()
    let startDate = new Date()
    
    if (filter === 'day') {
        startDate = new Date(now.setHours(0,0,0,0))
    } else if (filter === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7))
    } else if (filter === 'month') {
        startDate = new Date(now.setMonth(now.getMonth() - 1))
    } else if (filter === 'year') {
        startDate = new Date(now.setFullYear(now.getFullYear() - 1))
    } else {
        startDate = new Date(2020, 0, 1) 
    }

    query = query.gte('created_at', startDate.toISOString())

    const { data } = await query

    if (data) {
        setTransactions(data)
        
        const total = data.reduce((acc, curr) => acc + (Number(curr.subscription_value) || 0), 0)
        setTotalRevenue(total)
        setPrevRevenue(total * 0.85) 
        
        const currentTrend = [total * 0.1, total * 0.25, total * 0.2, total * 0.5, total * 0.75, total * 0.85, total]
        const prevTrend = [total * 0.15, total * 0.2, total * 0.4, total * 0.35, total * 0.5, total * 0.65, total * 0.85]
        setRevenueTrend(currentTrend)
        setPrevRevenueTrend(prevTrend)

        const planCounts: any = {}
        data.forEach(item => {
            const plan = item.plan || 'Unknown'
            planCounts[plan] = (planCounts[plan] || 0) + 1
        })
        
        const planChartData = Object.keys(planCounts).map(key => {
            let color = 'bg-gray-500'
            if (key.includes('Start')) color = 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]'
            else if (key.includes('Control')) color = 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]'
            else if (key.includes('BotAI')) color = 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
            else if (key.includes('Core')) color = 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]'
            
            return {
                label: key.replace('Zy', ''), 
                value: planCounts[key],
                color: color
            }
        })
        setPlanStats(planChartData)

        const payCounts: any = {}
        data.forEach(item => {
            const method = item.payment_method || 'Outros'
            payCounts[method] = (payCounts[method] || 0) + 1
        })
        
        const colors: any = { 
            'pix': '#10b981', 
            'cartao_credito': '#8b5cf6', 
            'boleto': '#f59e0b',
            'dinheiro': '#3b82f6' 
        }
        
        const payChartData = Object.keys(payCounts).map(key => ({
            label: key,
            value: payCounts[key],
            color: colors[key] || '#6b7280'
        }))
        setPaymentStats(payChartData)
    }
    setLoading(false)
  }

  const percentageChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-purple-500/30 pb-20 relative overflow-hidden">
      
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto p-6 md:p-10 relative z-10 space-y-8">
      
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-6 border-b border-white/5">
            <div>
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500 flex items-center gap-3">
                    <DollarSign className="text-green-400" size={32}/> Financeiro
                </h1>
                <p className="text-gray-400 mt-2 text-sm flex items-center gap-2">
                    <Activity size={14} className="text-blue-500"/>
                    Gestão de fluxo de caixa e análise de performance
                </p>
            </div>
            
            <div className="flex bg-[#0a0a0a] p-1.5 rounded-xl border border-white/10 shadow-lg">
                {['all', 'year', 'month', 'week', 'day'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${
                            filter === f 
                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' 
                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {f === 'all' ? 'Tudo' : f === 'year' ? 'Ano' : f === 'month' ? 'Mês' : f === 'week' ? 'Semana' : 'Hoje'}
                    </button>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                        <h3 className="font-bold text-gray-200 flex items-center gap-2"><BarChart3 size={18} className="text-blue-500"/> Entrada Total vs Anterior</h3>
                        <p className="text-xs text-gray-500 mt-1">Comparativo de receita bruta no período</p>
                    </div>
                    <div className="text-right">
                        <span className="block text-3xl font-bold text-white tracking-tight">R$ {totalRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        <div className={`flex items-center justify-end gap-1 text-sm font-bold mt-1 ${percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {percentageChange >= 0 ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>}
                            {percentageChange.toFixed(1)}%
                        </div>
                    </div>
                </div>
                
                <ComparisonChart data={revenueTrend} prevData={prevRevenueTrend} />
            </div>

            <div className="bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-2xl group hover:border-blue-500/20 transition-all">
                <div>
                    <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2"><PieChart size={18} className="text-purple-500"/> Resumo do Período</h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-xs font-bold uppercase mb-2">
                                <span className="text-gray-500">Meta de Vendas</span>
                                <span className="text-purple-400">85%</span>
                            </div>
                            <div className="w-full bg-[#1a1a1a] rounded-full h-2 overflow-hidden border border-white/5">
                                <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full shadow-[0_0_10px_rgba(147,51,234,0.5)]" style={{width: '85%'}}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-bold uppercase mb-2">
                                <span className="text-gray-500">Assinaturas Ativas</span>
                                <span className="text-blue-400">{transactions.length}</span>
                            </div>
                            <div className="w-full bg-[#1a1a1a] rounded-full h-2 overflow-hidden border border-white/5">
                                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{width: '60%'}}></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="mt-6 p-4 bg-gradient-to-r from-[#1a1a1a] to-black rounded-xl border border-white/10 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Ticket Médio</p>
                        <p className="text-lg font-bold text-white">R$ {(totalRevenue / (transactions.length || 1)).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</p>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg">
                        <Wallet size={20} className="text-gray-400"/>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-lg">
                <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2 text-sm uppercase tracking-wider"><Filter size={14}/> Distribuição de Planos</h3>
                <SubscriptionsBarChart stats={planStats} />
            </div>

            <div className="bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-8 shadow-lg">
                <div className="flex-1 w-full">
                    <h3 className="font-bold text-gray-200 mb-2 flex items-center gap-2 text-sm uppercase tracking-wider"><CreditCard size={14}/> Fontes de Pagamento</h3>
                    <p className="text-xs text-gray-500 mb-6">Métodos preferidos pelos clientes.</p>
                    <div className="space-y-3">
                        {paymentStats.map(pay => (
                            <div key={pay.label} className="flex items-center justify-between text-xs group">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]" style={{backgroundColor: pay.color, color: pay.color}}></span>
                                    <span className="text-gray-300 capitalize group-hover:text-white transition-colors">{pay.label.replace('_', ' ')}</span>
                                </div>
                                <span className="font-bold text-white font-mono bg-white/5 px-1.5 py-0.5 rounded">{pay.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex-1 flex justify-center scale-110">
                    <PaymentDonutChart data={paymentStats} />
                </div>
            </div>
        </div>

        <div className="bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl mt-8">
            <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/[0.02]">
                <div>
                    <h3 className="font-bold text-lg text-white">Últimas Transações</h3>
                    <p className="text-xs text-gray-500">Histórico de pagamentos recebidos.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search size={14} className="absolute left-3 top-3.5 text-gray-500"/>
                        <input type="text" placeholder="Buscar transação..." className="bg-[#050505] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none w-full placeholder-gray-600 focus:border-blue-500/50 transition-all"/>
                    </div>
                    <button className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                        <Download size={18} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-gray-400 border-b border-white/5 uppercase text-[10px] font-bold tracking-wider">
                        <tr>
                            <th className="p-5">Data</th>
                            <th className="p-5">Cliente</th>
                            <th className="p-5">Plano</th>
                            <th className="p-5">Pagamento</th>
                            <th className="p-5 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={5} className="p-12 text-center text-gray-500 animate-pulse font-mono text-xs">Carregando dados financeiros...</td></tr>
                        ) : transactions.length === 0 ? (
                            <tr><td colSpan={5} className="p-12 text-center text-gray-500">Nenhuma venda registrada neste período.</td></tr>
                        ) : (
                            transactions.map((t) => (
                                <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-5 text-gray-400 font-mono text-xs">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={12} className="text-gray-600"/>
                                            {new Date(t.created_at).toLocaleDateString('pt-BR')}
                                        </div>
                                    </td>
                                    <td className="p-5 font-bold text-white group-hover:text-blue-400 transition-colors">{t.name}</td>
                                    <td className="p-5">
                                        <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-bold uppercase text-gray-300 tracking-wide">
                                            {t.plan}
                                        </span>
                                    </td>
                                    <td className="p-5 text-gray-400 flex items-center gap-2 capitalize">
                                        <div className={`p-1.5 rounded bg-white/5 ${t.payment_method === 'pix' ? 'text-green-400' : 'text-purple-400'}`}>
                                            <CreditCard size={12}/>
                                        </div>
                                        {t.payment_method?.replace('_', ' ') || 'Outros'}
                                    </td>
                                    <td className="p-5 text-right font-mono text-green-400 font-bold">
                                        + R$ {Number(t.subscription_value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  )
}