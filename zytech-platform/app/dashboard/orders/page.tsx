'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  ShoppingBag, Clock, MapPin, Phone, RefreshCw, Filter, Package,
  CheckCircle, XCircle, ArrowRight, Truck, ChefHat
} from 'lucide-react'

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*, organizations(name)') 
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar pedidos:', error)
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  async function handleCancelOrder(orderId: string) {
    if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;

    setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'canceled' } : o))

    await supabase
        .from('orders')
        .update({ status: 'canceled' })
        .eq('id', orderId)
  }

  async function handleAdvanceStatus(order: any) {
    const nextStatus: any = {
        'pending': 'preparing',
        'preparing': 'delivery',
        'delivery': 'finished',
        'finished': 'finished'
    }
    const newStatus = nextStatus[order.status] || order.status
    
    setOrders(orders.map(o => o.id === order.id ? { ...o, status: newStatus } : o))
    await supabase.from('orders').update({ status: newStatus }).eq('id', order.id)
  }

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'pending': return { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', shadow: 'shadow-yellow-500/10', label: 'Pendente', icon: Clock }
      case 'preparing': return { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', shadow: 'shadow-blue-500/10', label: 'Preparando', icon: ChefHat }
      case 'delivery': return { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', shadow: 'shadow-purple-500/10', label: 'Em Rota', icon: Truck }
      case 'finished': return { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', shadow: 'shadow-green-500/10', label: 'Entregue', icon: CheckCircle }
      case 'canceled': return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', shadow: 'shadow-red-500/10', label: 'Cancelado', icon: XCircle }
      default: return { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', shadow: 'shadow-none', label: status, icon: Package }
    }
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-blue-500/30 pb-20 relative overflow-hidden">
      
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto p-6 md:p-10 relative z-10 space-y-8">
      
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-6">
            <div>
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 flex items-center gap-3">
                    <ShoppingBag className="text-blue-500" size={32} /> Pedidos em Tempo Real
                </h1>
                <p className="text-gray-400 mt-2 text-sm flex items-center gap-2">
                    Acompanhe o fluxo de vendas e status de entrega
                </p>
            </div>
            
            <div className="flex gap-3">
                <button onClick={fetchOrders} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-sm font-bold transition-all group shadow-lg">
                    <RefreshCw size={16} className="group-hover:rotate-180 transition-transform text-blue-400" /> Atualizar
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-sm font-bold transition-all shadow-lg">
                    <Filter size={16} className="text-gray-400" /> Filtros
                </button>
            </div>
        </div>

        {loading ? (
            <div className="flex justify-center py-20">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-white/5"></div>
                    <div className="text-gray-500 font-mono text-sm">Sincronizando pedidos...</div>
                </div>
            </div>
        ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                    <Package size={32} className="text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-300">Nenhum pedido hoje</h3>
                <p className="text-sm text-gray-500 mt-2">Assim que o bot vender, os pedidos aparecerão aqui em tempo real.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {orders.map((order) => {
                    const statusStyle = getStatusStyle(order.status)
                    const StatusIcon = statusStyle.icon

                    return (
                        <div key={order.id} className={`bg-[#0a0a0a]/60 backdrop-blur-md border rounded-2xl overflow-hidden transition-all duration-300 group hover:-translate-y-1 shadow-2xl ${order.status === 'canceled' ? 'border-red-900/20 opacity-60 grayscale-[0.5]' : 'border-white/10 hover:border-blue-500/30 hover:shadow-blue-900/10'}`}>
                            
                            <div className="p-5 border-b border-white/5 flex justify-between items-start bg-white/[0.02]">
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                                        {order.organizations?.name || 'Loja Desconhecida'}
                                    </p>
                                    <h3 className="font-bold text-white text-lg truncate w-48 tracking-tight" title={order.customer_name}>
                                        {order.customer_name}
                                    </h3>
                                    <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1 font-mono">
                                        <Clock size={12} className="text-blue-500"/> 
                                        {new Date(order.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase border flex items-center gap-1.5 shadow-lg ${statusStyle.bg} ${statusStyle.color} ${statusStyle.border} ${statusStyle.shadow}`}>
                                    <StatusIcon size={12} /> {statusStyle.label}
                                </span>
                            </div>

                            <div className="p-5 min-h-[120px] bg-gradient-to-b from-transparent to-black/20">
                                <ul className="space-y-3 text-sm">
                                    {Array.isArray(order.items_json) && order.items_json.map((item: any, idx: number) => (
                                        <li key={idx} className="flex justify-between items-start text-gray-300 group/item">
                                            <div className="flex gap-3">
                                                <span className="bg-white/10 text-white font-bold font-mono px-1.5 rounded text-xs h-fit min-w-[24px] text-center border border-white/5">
                                                    {item.qty || 1}x
                                                </span>
                                                <span className="leading-snug text-sm text-gray-200">{item.name}</span>
                                            </div>
                                            <span className="text-gray-500 text-xs font-mono mt-0.5">
                                                R$ {(Number(item.price) * (item.qty || 1)).toFixed(2)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="p-5 border-t border-white/5 bg-[#050505] space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 text-xs text-gray-400">
                                        <div className="p-1.5 bg-blue-500/10 rounded-md shrink-0"><MapPin size={12} className="text-blue-400"/></div>
                                        <span className="line-clamp-2 leading-relaxed">{order.delivery_address || 'Endereço não informado'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-400">
                                        <div className="p-1.5 bg-green-500/10 rounded-md shrink-0"><Phone size={12} className="text-green-400"/></div>
                                        <span className="font-mono tracking-wide">{order.customer_phone}</span>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                    <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Pedido</span>
                                    <span className="text-xl font-bold text-white tracking-tight flex items-baseline gap-0.5">
                                        <span className="text-sm text-gray-500 font-normal mr-1">R$</span>
                                        {Number(order.total_value).toFixed(2)}
                                    </span>
                                </div>

                                {order.status !== 'canceled' && order.status !== 'finished' && (
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <button 
                                            onClick={() => handleAdvanceStatus(order)}
                                            className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 flex items-center justify-center gap-2 group/btn"
                                        >
                                            Avançar Status <ArrowRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform"/>
                                        </button>
                                        <button 
                                            onClick={() => handleCancelOrder(order.id)}
                                            className="py-2.5 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/20 rounded-xl text-xs font-bold transition-all"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                )}
                                
                                {order.status === 'canceled' && (
                                    <div className="pt-2">
                                        <div className="w-full py-2 text-center text-[10px] font-bold text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg uppercase tracking-wider">
                                            Cancelado Manualmente
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        )}
      </div>
    </div>
  )
}