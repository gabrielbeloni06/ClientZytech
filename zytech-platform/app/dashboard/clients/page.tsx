'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Plus, Search, MoreHorizontal } from 'lucide-react'

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .neq('name', 'Zytech HQ')
      .order('created_at', { ascending: false })

    if (data) setClients(data)
    setLoading(false)
  }

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Meus Clientes</h2>
          <p className="text-gray-400 text-sm">Gerencie as hamburguerias parceiras</p>
        </div>
        
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors">
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      <div className="flex gap-4 bg-[#111] p-2 rounded-lg border border-[#333]">
        <div className="flex-1 flex items-center gap-2 px-3">
          <Search size={18} className="text-gray-500" />
          <input 
            type="text" 
            placeholder="Buscar hamburgueria..." 
            className="bg-transparent border-none outline-none text-white w-full placeholder-gray-600"
          />
        </div>
      </div>
      <div className="bg-[#111] border border-[#333] rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1a1a1a] text-gray-400 text-sm border-b border-[#333]">
              <th className="p-4 font-medium">Nome da Empresa</th>
              <th className="p-4 font-medium">Plano</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Vencimento</th>
              <th className="p-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333]">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">Carregando clientes...</td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  Nenhum cliente encontrado. Clique em "Novo Cliente" para começar.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="hover:bg-[#161616] transition-colors">
                  <td className="p-4 font-medium text-white">{client.name}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${
                      client.plan === 'ouro' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                      client.plan === 'prata' ? 'bg-gray-400/10 text-gray-300 border-gray-400/20' :
                      'bg-orange-700/10 text-orange-400 border-orange-700/20'
                    }`}>
                      {client.plan}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`flex items-center gap-2 text-sm ${
                      client.status === 'active' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        client.status === 'active' ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                      {client.status === 'active' ? 'Ativo' : 'Suspenso'}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 text-sm">
                    {client.subscription_valid_until 
                      ? new Date(client.subscription_valid_until).toLocaleDateString() 
                      : '-'}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-gray-500 hover:text-white transition-colors">
                      <MoreHorizontal size={20} />
                    </button>
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