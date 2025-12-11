'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  DollarSign, ArrowUpRight, Search, CreditCard
} from 'lucide-react'

const ComparisonChart = ({ data, prevData }: { data: number[], prevData: number[] }) => {
    const max = Math.max(...data, ...prevData, 1)
    const points = data.map((val, i) => `${(i / (data.length - 1)) * 100},${50 - (val / max) * 40}`).join(' ')
    const prevPoints = prevData.map((val, i) => `${(i / (prevData.length - 1)) * 100},${50 - (val / max) * 40}`).join(' ')

    return (
        <div className="relative h-40 w-full bg-[#0a0a0a] rounded-lg border border-[#222] p-2 overflow-hidden">
            <div className="absolute inset-0 grid grid-rows-4 w-full h-full opacity-10">
                <div className="border-t border-gray-100"></div>
                <div className="border-t border-gray-100"></div>
                <div className="border-t border-gray-100"></div>
                <div className="border-t border-gray-100"></div>
            </div>
            
            <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
                <polyline 
                    points={prevPoints} 
                    fill="none" 
                    stroke="#444" 
                    strokeWidth="1" 
                    strokeDasharray="2"
                />
                
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                </defs>

                <polyline 
                    points={points} 
                    fill="none" 
                    stroke="url(#lineGradient)" 
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                />
                
                <polygon 
                    points={`0,50 ${points} 100,50`} 
                    fill="url(#lineGradient)" 
                    opacity="0.1" 
                />
            </svg>
        </div>
    )
}

const SubscriptionsBarChart = ({ stats }: { stats: {label: string, value: number, color: string}[] }) => {
    const max = Math.max(...stats.map(s => s.value), 1)
    
    return (
        <div className="h-40 flex items-end justify-between gap-2 p-2">
            {stats.map((stat) => (
                <div key={stat.label} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <div 
                        className={`w-full max-w-[30px] rounded-t-sm transition-all duration-500 relative ${stat.color}`}
                        style={{ height: `${(stat.value / max) * 100}%` }}
                    >
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] bg-black border border-[#333] px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                            {stat.value}
                        </span>
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">{stat.label}</span>
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
        <div className="relative w-32 h-32 flex items-center justify-center">
            <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
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
                            strokeWidth="5"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-1000"
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
    let prevStartDate = new Date() 

    if (filter === 'day') {
        startDate = new Date(now.setHours(0,0,0,0))
        prevStartDate = new Date(now.setDate(now.getDate() - 1))
    } else if (filter === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7))
        prevStartDate = new Date(now.setDate(now.getDate() - 7))
    } else if (filter === 'month') {
        startDate = new Date(now.setMonth(now.getMonth() - 1))
        prevStartDate = new Date(now.setMonth(now.getMonth() - 1))
    } else if (filter === 'year') {
        startDate = new Date(now.setFullYear(now.getFullYear() - 1))
        prevStartDate = new Date(now.setFullYear(now.getFullYear() - 1))
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
        const currentTrend = [total * 0.1, total * 0.3, total * 0.2, total * 0.6, total * 0.8, total * 0.9, total]
        const prevTrend = [total * 0.15, total * 0.2, total * 0.4, total * 0.3, total * 0.5, total * 0.6, total * 0.85]
        setRevenueTrend(currentTrend)
        setPrevRevenueTrend(prevTrend)

        const planCounts: any = {}
        data.forEach(item => {
            const plan = item.plan || 'Unknown'
            planCounts[plan] = (planCounts[plan] || 0) + 1
        })
        const planChartData = Object.keys(planCounts).map(key => ({
            label: key, 
            value: planCounts[key],
            color: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
        }))
        setPlanStats(planChartData)

        const payCounts: any = {}
        data.forEach(item => {
            const method = item.payment_method || 'Outros'
            payCounts[method] = (payCounts[method] || 0) + 1
        })
        
        const colors: any = { 'pix': '#10b981', 'cartao_credito': '#8b5cf6', 'boleto': '#f59e0b', 'dinheiro': '#3b82f6' }
        
        const payChartData = Object.keys(payCounts).map(key => ({
            label: key,
            value: payCounts[key],
            color: colors[key] || '#6b7280'
        }))
        setPaymentStats(payChartData)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-8 text-white pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="text-green-500" size={32}/> Financeiro
          </h2>
          <p className="text-gray-400 mt-1">Fluxo de caixa e análise de performance</p>
        </div>
        
        <div className="flex bg-[#111] p-1 rounded-lg border border-[#333]">
            {['all', 'year', 'month', 'week', 'day'].map((f) => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        filter === f 
                        ? 'bg-[#222] text-white shadow-sm border border-[#444]' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    {f === 'all' ? 'Tudo' : f === 'year' ? 'Ano' : f === 'month' ? 'Mês' : f === 'week' ? 'Semana' : 'Hoje'}
                </button>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="bg-[#111] border border-[#333] rounded-xl p-5 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="font-bold text-gray-200">Entrada Total vs Anterior</h3>
                    <p className="text-xs text-gray-500">Comparativo com período passado</p>
                </div>
                <div className="text-right">
                    <span className="block text-2xl font-bold text-white">R$ {totalRevenue.toLocaleString('pt-BR')}</span>
                    <span className="text-xs text-green-400 flex items-center justify-end gap-1">
                        <ArrowUpRight size={12}/> +12%
                    </span>
                </div>
            </div>
            <ComparisonChart data={revenueTrend} prevData={prevRevenueTrend} />
        </div>

        <div className="bg-[#111] border border-[#333] rounded-xl p-5 flex flex-col justify-between">
            <div>
                <h3 className="font-bold text-gray-200 mb-6">Resumo do Período</h3>
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">Meta de Vendas</span>
                            <span className="text-white font-bold">85%</span>
                        </div>
                        <div className="w-full bg-[#222] rounded-full h-2">
                            <div className="bg-purple-600 h-2 rounded-full shadow-[0_0_10px_rgba(147,51,234,0.5)]" style={{width: '85%'}}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">Assinaturas Ativas</span>
                            <span className="text-white font-bold">{transactions.length}</span>
                        </div>
                        <div className="w-full bg-[#222] rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{width: '60%'}}></div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-6 p-4 bg-[#1a1a1a] rounded-lg border border-[#333]">
                <p className="text-xs text-gray-500 uppercase mb-1">Maior Venda</p>
                <p className="text-xl font-bold text-white">R$ 350,00</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-[#111] border border-[#333] rounded-xl p-5">
              <h3 className="font-bold text-gray-200 mb-4">Planos & Assinaturas</h3>
              <SubscriptionsBarChart stats={planStats} />
          </div>

          <div className="bg-[#111] border border-[#333] rounded-xl p-5 flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                  <h3 className="font-bold text-gray-200 mb-2">Meios de Pagamento</h3>
                  <p className="text-xs text-gray-500 mb-4">Distribuição por método escolhido pelos clientes.</p>
                  <div className="space-y-2">
                      {paymentStats.map(pay => (
                          <div key={pay.label} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{backgroundColor: pay.color}}></span>
                                  <span className="text-gray-300 capitalize">{pay.label.replace('_', ' ')}</span>
                              </div>
                              <span className="font-bold text-white">{pay.value}</span>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="flex-1 flex justify-center">
                  <PaymentDonutChart data={paymentStats} />
              </div>
          </div>
      </div>

      <div className="bg-[#111] border border-[#333] rounded-xl overflow-hidden mt-8">
        <div className="p-6 border-b border-[#333] flex justify-between items-center">
            <h3 className="font-bold text-lg">Últimas Transações</h3>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0a] border border-[#333] rounded-lg w-64">
                <Search size={14} className="text-gray-500"/>
                <input type="text" placeholder="Buscar..." className="bg-transparent text-sm text-white outline-none w-full placeholder-gray-600"/>
            </div>
        </div>

        <table className="w-full text-left text-sm">
            <thead className="bg-[#151515] text-gray-400 border-b border-[#333]">
                <tr>
                    <th className="p-4">Data</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Plano</th>
                    <th className="p-4">Pagamento</th>
                    <th className="p-4 text-right">Valor</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
                {loading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando dados...</td></tr>
                ) : transactions.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhuma venda neste período.</td></tr>
                ) : (
                    transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-[#161616] transition-colors">
                            <td className="p-4 text-gray-400">
                                {new Date(t.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="p-4 font-bold text-white">{t.name}</td>
                            <td className="p-4">
                                <span className="px-2 py-1 bg-[#222] border border-[#333] rounded text-xs font-bold uppercase text-gray-300">
                                    {t.plan}
                                </span>
                            </td>
                            <td className="p-4 text-gray-400 flex items-center gap-2 capitalize">
                                <CreditCard size={14}/> {t.payment_method?.replace('_', ' ') || 'Outros'}
                            </td>
                            <td className="p-4 text-right font-mono text-green-400 font-medium">
                                + R$ {Number(t.subscription_value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>
    </div>
  )
}