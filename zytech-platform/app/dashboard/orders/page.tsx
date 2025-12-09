'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  ShoppingBag, Clock, MapPin, Phone, RefreshCw, Filter, Package 
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

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
      case 'preparing': return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
      case 'delivery': return 'text-purple-500 bg-purple-500/10 border-purple-500/20'
      case 'finished': return 'text-green-500 bg-green-500/10 border-green-500/20'
      case 'canceled': return 'text-red-500 bg-red-500/10 border-red-500/20'
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: any = {
      pending: 'Pendente',
      preparing: 'Preparando',
      delivery: 'Em Rota',
      finished: 'Entregue',
      canceled: 'Cancelado'
    }
    return labels[status] || status
  }

  return (
    <div className="space-y-6 text-white pb-20 relative">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="text-blue-500" /> Pedidos em Tempo Real
          </h2>
          <p className="text-gray-400 text-sm">Acompanhe o fluxo de vendas</p>
        </div>
        
        <div className="flex gap-2">
            <button onClick={fetchOrders} className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-[#333] hover:bg-[#222] rounded-lg text-sm transition-colors group">
                <RefreshCw size={16} className="group-hover:rotate-180 transition-transform" /> Atualizar
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-[#333] hover:bg-[#222] rounded-lg text-sm transition-colors">
                <Filter size={16} /> Filtros
            </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Carregando pedidos...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#333] rounded-xl bg-[#111]/50">
            <div className="w-16 h-16 bg-[#222] rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
                <Package size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-400">Nenhum pedido hoje</h3>
            <p className="text-sm text-gray-600">Assim que o bot vender, aparece aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {orders.map((order) => (
                <div key={order.id} className="bg-[#111] border border-[#333] rounded-xl overflow-hidden hover:border-blue-500/30 transition-all group shadow-lg">
                    <div className="p-4 border-b border-[#222] flex justify-between items-start bg-[#151515]">
                        <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                                {order.organizations?.name || 'Loja Desconhecida'}
                            </p>
                            <h3 className="font-bold text-white text-lg truncate w-48" title={order.customer_name}>
                                {order.customer_name}
                            </h3>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                <Clock size={12}/> 
                                {new Date(order.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                            </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                        </span>
                    </div>

                    <div className="p-4 bg-[#0a0a0a]/50 min-h-[100px]">
                        <ul className="space-y-3 text-sm">
                            {Array.isArray(order.items_json) && order.items_json.map((item: any, idx: number) => (
                                <li key={idx} className="flex justify-between items-start text-gray-300">
                                    <span className="flex gap-2">
                                        <span className="text-blue-500 font-bold font-mono">x{item.qty || 1}</span>
                                        <span className="leading-tight">{item.name}</span>
                                    </span>
                                    <span className="text-gray-500 text-xs font-mono mt-0.5">
                                        R$ {(Number(item.price) * (item.qty || 1)).toFixed(2)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="p-4 border-t border-[#222] bg-[#151515]">
                        <div className="space-y-2 mb-4">
                            <div className="flex items-start gap-2 text-xs text-gray-400">
                                <MapPin size={14} className="mt-0.5 text-blue-500 shrink-0"/>
                                <span className="line-clamp-2">{order.delivery_address || 'Endereço não informado'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Phone size={14} className="mt-0.5 text-green-500 shrink-0"/>
                                <span>{order.customer_phone}</span>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center pt-3 border-t border-[#333]">
                            <span className="text-gray-400 text-sm font-medium">Total</span>
                            <span className="text-xl font-bold text-green-400">
                                R$ {Number(order.total_value).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  )
}