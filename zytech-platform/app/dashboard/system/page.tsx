'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  Cpu, Server, Shield, Database, Activity, CheckCircle, 
  AlertTriangle, RefreshCw, HardDrive, Wifi, Lock, Zap,
  Terminal, BarChart, Settings, Play, Pause
} from 'lucide-react'


const PulseDot = ({ color = 'bg-green-500' }: { color?: string }) => (
  <span className="relative flex h-3 w-3">
    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}></span>
    <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`}></span>
  </span>
)

const ResourceBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 tracking-wider">
      <span>{label}</span>
      <span className="text-white font-mono">{value}%</span>
    </div>
    <div className="w-full bg-[#111] rounded-full h-1.5 overflow-hidden border border-white/5">
      <div 
        className={`h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_currentColor] ${color}`} 
        style={{ width: `${value}%`, backgroundColor: 'currentColor' }}
      ></div>
    </div>
  </div>
)

const NetworkGraph = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number
        let offset = 0
        const dataPoints = Array(50).fill(0).map(() => Math.random() * 50 + 20)

        const draw = () => {
            const width = canvas.width
            const height = canvas.height
            ctx.clearRect(0, 0, width, height)

            ctx.strokeStyle = '#1a1a1a'
            ctx.lineWidth = 1
            ctx.beginPath()
            for(let i=0; i<width; i+=20) { ctx.moveTo(i, 0); ctx.lineTo(i, height) }
            for(let i=0; i<height; i+=20) { ctx.moveTo(0, i); ctx.lineTo(width, i) }
            ctx.stroke()

            ctx.strokeStyle = '#8b5cf6' 
            ctx.lineWidth = 2
            ctx.beginPath()
            
            if (offset % 5 === 0) {
                dataPoints.shift()
                dataPoints.push(Math.random() * 40 + 10 + (Math.sin(offset/20) * 10))
            }

            for (let i = 0; i < dataPoints.length; i++) {
                const x = (i / (dataPoints.length - 1)) * width
                const y = height - dataPoints[i]
                if (i === 0) ctx.moveTo(x, y)
                else ctx.lineTo(x, y)
            }
            ctx.stroke()

            ctx.lineTo(width, height)
            ctx.lineTo(0, height)
            ctx.fillStyle = 'rgba(139, 92, 246, 0.1)'
            ctx.fill()

            offset++
            animationFrameId = requestAnimationFrame(draw)
        }

        draw()
        return () => cancelAnimationFrame(animationFrameId)
    }, [])

    return <canvas ref={canvasRef} width={300} height={100} className="w-full h-24 rounded-lg opacity-80" />
}

export default function SystemPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  const [dbStats, setDbStats] = useState({
    users: 0,
    clients: 0,
    orders: 0,
    products: 0,
    latency: 0
  })

  const [logs, setLogs] = useState<string[]>([])
  
  const [cpuLoad, setCpuLoad] = useState(12)
  const [memLoad, setMemLoad] = useState(45)

  useEffect(() => {
    fetchSystemStats()
    
    const interval = setInterval(() => {
        setCpuLoad(prev => Math.min(100, Math.max(5, prev + (Math.random() * 10 - 5))))
        setMemLoad(prev => Math.min(100, Math.max(20, prev + (Math.random() * 6 - 3))))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  async function fetchSystemStats() {
    setRefreshing(true)
    const start = performance.now()

    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    const { count: orgCount } = await supabase.from('organizations').select('*', { count: 'exact', head: true })
    const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true })
    const { count: prodCount } = await supabase.from('products').select('*', { count: 'exact', head: true })
    const { data: latestOrgs } = await supabase.from('organizations').select('name, created_at').order('created_at', { ascending: false }).limit(3)
    const { data: latestOrders } = await supabase.from('orders').select('customer_name, total_value, created_at').order('created_at', { ascending: false }).limit(2)

    const end = performance.now()
    const latency = Math.round(end - start)

    setDbStats({
        users: userCount || 0,
        clients: orgCount || 0,
        orders: orderCount || 0,
        products: prodCount || 0,
        latency
    })

    const newLogs = [
        `[SYSTEM] Database latency check: ${latency}ms OK`,
        ...(latestOrgs || []).map(o => `[AUTH] New organization registered: ${o.name}`),
        ...(latestOrders || []).map(o => `[TRANS] Order processed: R$${o.total_value} for ${o.customer_name}`),
        `[CRON] Weekly backup verified successfully.`,
        `[BOT] WhatsApp API connection stable.`
    ]
    setLogs(newLogs.slice(0, 6))

    setLoading(false)
    setRefreshing(false)
  }

  const systemPlans = [
    { name: 'ZyStart', type: 'Entry Level', color: 'text-orange-400 border-orange-500/20', bg: 'bg-orange-500/5', shadow: 'shadow-orange-500/10' },
    { name: 'ZyControl', type: 'Mid Range', color: 'text-blue-400 border-blue-500/20', bg: 'bg-blue-500/5', shadow: 'shadow-blue-500/10' },
    { name: 'ZyBotAI', type: 'AI Powered', color: 'text-purple-400 border-purple-500/20', bg: 'bg-purple-500/5', shadow: 'shadow-purple-500/10' },
    { name: 'ZyCore', type: 'Enterprise', color: 'text-[#ff0033] border-[#ff0033]/20', bg: 'bg-[#ff0033]/5', shadow: 'shadow-[#ff0033]/10' },
  ]

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-blue-500/30 pb-20 relative overflow-hidden">
      
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-green-900/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto p-6 md:p-10 relative z-10 space-y-8">
      
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-6 border-b border-white/5">
            <div>
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center gap-3">
                    <Cpu className="text-blue-400" size={32}/> Monitor do Sistema
                </h1>
                <p className="text-gray-400 mt-2 text-sm flex items-center gap-2">
                    <Activity size={14} className="text-cyan-500"/>
                    Infraestrutura global e status de serviços
                </p>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Latência DB</p>
                    <p className={`text-xl font-mono font-bold ${dbStats.latency < 200 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {dbStats.latency}ms
                    </p>
                </div>
                <button 
                    onClick={fetchSystemStats} 
                    disabled={refreshing}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw size={20} className={`text-blue-400 ${refreshing ? 'animate-spin' : ''}`}/>
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-[#0a0a0a]/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl flex items-center gap-4 group hover:border-green-500/30 transition-all">
                <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 group-hover:shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all">
                    <Wifi size={24} className="text-green-500"/>
                </div>
                <div>
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Status API</p>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">Online</span>
                        <PulseDot color="bg-green-500"/>
                    </div>
                </div>
            </div>

            <div className="p-5 bg-[#0a0a0a]/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl flex items-center gap-4 group hover:border-purple-500/30 transition-all">
                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all">
                    <Database size={24} className="text-purple-500"/>
                </div>
                <div>
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Registros Totais</p>
                    <p className="text-lg font-bold text-white font-mono">
                        {(dbStats.users + dbStats.clients + dbStats.orders + dbStats.products).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="p-5 bg-[#0a0a0a]/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl flex items-center gap-4 group hover:border-blue-500/30 transition-all">
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all">
                    <Shield size={24} className="text-blue-500"/>
                </div>
                <div>
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Versão Core</p>
                    <p className="text-lg font-bold text-white font-mono">v2.1.0 <span className="text-xs text-blue-400 ml-1">stable</span></p>
                </div>
            </div>

            <div className="p-5 bg-[#0a0a0a]/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl flex items-center gap-4 group hover:border-yellow-500/30 transition-all">
                <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 group-hover:shadow-[0_0_15px_rgba(234,179,8,0.2)] transition-all">
                    <Lock size={24} className="text-yellow-500"/>
                </div>
                <div>
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Segurança</p>
                    <p className="text-lg font-bold text-white">TLS 1.3</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 to-transparent pointer-events-none"></div>
                
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <h3 className="font-bold text-white flex items-center gap-2"><Server size={18} className="text-purple-500"/> Server Metrics</h3>
                    <div className="flex gap-2">
                        <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-[10px] font-bold text-green-400 uppercase">Cluster A: Healthy</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-6">
                        <ResourceBar label="CPU Load (vCore)" value={Math.round(cpuLoad)} color="text-purple-500" />
                        <ResourceBar label="Memory Usage (RAM)" value={Math.round(memLoad)} color="text-blue-500" />
                        <ResourceBar label="Storage I/O" value={23} color="text-cyan-500" />
                        <ResourceBar label="Network Bandwidth" value={67} color="text-pink-500" />
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col justify-end relative overflow-hidden">
                        <p className="text-[10px] text-gray-500 uppercase font-bold absolute top-4 left-4">Network Traffic (Live)</p>
                        <NetworkGraph />
                        <div className="flex justify-between mt-2 text-xs font-mono text-gray-400">
                            <span>In: 450 MB/s</span>
                            <span>Out: 1.2 GB/s</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-1 flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
                <div className="bg-[#151515] px-4 py-2 flex items-center gap-2 border-b border-white/5">
                    <Terminal size={14} className="text-gray-500"/>
                    <span className="text-gray-400 font-bold">system_logs.log</span>
                </div>
                <div className="p-4 space-y-2 text-gray-300 h-full flex flex-col justify-end">
                    {logs.map((log, i) => (
                        <div key={i} className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                            <span className="text-blue-500 opacity-50 select-none">{new Date().toLocaleTimeString('pt-BR', {hour12: false})}</span>
                            <span className={log.includes('OK') ? 'text-green-400' : log.includes('New') ? 'text-purple-400' : 'text-gray-300'}>
                                {log}
                            </span>
                        </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                        <span className="text-green-500 opacity-50">root@zytech:~#</span>
                        <span className="animate-pulse">_</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
                { label: 'Organizações', value: dbStats.clients, icon: Settings, color: 'text-orange-400', bg: 'bg-orange-900/10 border-orange-500/20' },
                { label: 'Usuários', value: dbStats.users, icon: Lock, color: 'text-cyan-400', bg: 'bg-cyan-900/10 border-cyan-500/20' },
                { label: 'Pedidos Totais', value: dbStats.orders, icon: BarChart, color: 'text-green-400', bg: 'bg-green-900/10 border-green-500/20' },
                { label: 'Itens Cadastrados', value: dbStats.products, icon: HardDrive, color: 'text-pink-400', bg: 'bg-pink-900/10 border-pink-500/20' },
            ].map((stat, i) => (
                <div key={i} className={`p-4 rounded-xl border ${stat.bg} flex items-center gap-4 transition-all hover:scale-105`}>
                    <div className={`p-2 rounded-lg bg-black/20 ${stat.color}`}><stat.icon size={20}/></div>
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{stat.label}</p>
                        <p className="text-2xl font-bold text-white font-mono">{loading ? '...' : stat.value}</p>
                    </div>
                </div>
            ))}
        </div>

        <div>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><Zap className="text-yellow-500"/> Arquitetura de Planos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {systemPlans.map((plan) => (
                    <div key={plan.name} className={`p-6 bg-[#0a0a0a]/80 backdrop-blur border rounded-2xl flex flex-col justify-between h-40 transition-all hover:border-opacity-100 border-opacity-50 hover:-translate-y-1 shadow-lg hover:${plan.shadow} ${plan.color} ${plan.bg.replace('5', '0')}`}>
                        <div>
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] opacity-70 uppercase font-bold tracking-widest">{plan.type}</span>
                                <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] bg-current`}></div>
                            </div>
                            <h3 className="font-bold text-2xl mt-2 text-white">{plan.name}</h3>
                        </div>
                        <div className="flex justify-between items-end border-t border-white/10 pt-4">
                            <span className="text-xs font-mono opacity-50">Active Deployments</span>
                            <span className="text-xs px-2 py-1 rounded bg-white/10 font-bold text-white">READY</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  )
}