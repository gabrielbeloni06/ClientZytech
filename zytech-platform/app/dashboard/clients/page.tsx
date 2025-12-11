'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { 
  Plus, Search, MoreHorizontal, X, Save, 
  Briefcase, ShoppingCart, Globe, Cpu, Calendar, ChevronRight, Truck
} from 'lucide-react'

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientType, setNewClientType] = useState('commerce') 
  const [newClientPlan, setNewClientPlan] = useState('')
  const [newClientValue, setNewClientValue] = useState('')
  const [newClientCycle, setNewClientCycle] = useState('mensal')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .neq('name', 'Zytech HQ')
      .order('created_at', { ascending: false })

    if (data) setClients(data)
    setLoading(false)
  }

  function calculateExpiration(cycle: string) {
    const now = new Date()
    if (cycle === 'mensal') now.setMonth(now.getMonth() + 1)
    if (cycle === 'trimestral') now.setMonth(now.getMonth() + 3)
    if (cycle === 'semestral') now.setMonth(now.getMonth() + 6)
    if (cycle === 'anual') now.setFullYear(now.getFullYear() + 1)
    return now.toISOString()
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)

    const finalPlan = newClientType === 'consulting' ? 'consulting_unique' : newClientPlan
    const valueFormatted = parseFloat(newClientValue.replace(',', '.')) || 0

    const { error } = await supabase
      .from('organizations')
      .insert([{
          name: newClientName,
          plan: finalPlan,
          business_type: newClientType,
          status: 'active',
          subscription_value: valueFormatted,
          subscription_cycle: newClientCycle,
          subscription_valid_until: calculateExpiration(newClientCycle)
      }])

    if (error) {
      alert('Erro: ' + error.message)
    } else {
      setIsModalOpen(false)
      setNewClientName('')
      setNewClientPlan('')
      setNewClientValue('')
      setNewClientCycle('mensal')
      fetchClients()
    }
    setIsSaving(false)
  }

  const getPlanColorClass = (planName: string) => {
    if (!planName) return 'bg-gray-800 text-gray-400 border-gray-700'
    const name = planName.toLowerCase()
    
    if (name.includes('start')) return 'bg-orange-900/20 text-orange-400 border-orange-900/50' 
    if (name.includes('control')) return 'bg-gray-800 text-gray-300 border-gray-600' 
    if (name.includes('botai') || name.includes('zyauto') || (name.includes('website') && name.includes('core'))) return 'bg-yellow-900/20 text-yellow-400 border-yellow-900/50'
    if (name.includes('zycore')) return 'bg-cyan-900/20 text-cyan-400 border-cyan-900/50' 
    
    return 'bg-[#222] border-[#333] text-white'
  }

  const getTypeStyle = (type: string) => {
    switch(type) {
      case 'commerce': return { icon: <ShoppingCart size={16}/>, color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', label: 'Comércio' }
      case 'delivery': return { icon: <Truck size={16}/>, color: 'text-green-400 bg-green-400/10 border-green-400/20', label: 'Delivery' }
      case 'website': return { icon: <Globe size={16}/>, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', label: 'Website' }
      case 'automation': return { icon: <Cpu size={16}/>, color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', label: 'Automação' }
      case 'consulting': return { icon: <Briefcase size={16}/>, color: 'text-gray-400 bg-gray-400/10 border-gray-400/20', label: 'Consultoria' }
      default: return { icon: <Briefcase size={16}/>, color: 'text-gray-400', label: type }
    }
  }

  function PlanButton({ plan, current, set }: any) {
    let colorClass = 'border-[#333] text-gray-500 hover:border-gray-500 bg-black'
    if (current === plan) {
        if (plan.includes('Start')) colorClass = 'bg-orange-900/20 border-orange-500 text-orange-400'
        else if (plan.includes('Control')) colorClass = 'bg-gray-800 border-gray-400 text-gray-200'
        else if (plan.includes('BotAI') || plan.includes('ZyAuto') || (plan.includes('Website') && plan.includes('Core'))) colorClass = 'bg-yellow-900/20 border-yellow-500 text-yellow-400'
        else if (plan.includes('ZyCore')) colorClass = 'bg-cyan-900/20 border-cyan-500 text-cyan-400'
    }

    return (
      <button
        type="button"
        onClick={() => set(plan)}
        className={`py-2 px-2 rounded-lg border text-xs font-bold uppercase transition-all ${colorClass}`}
      >
        {plan}
      </button>
    )
  }

  return (
    <div className="space-y-6 text-white relative">
      
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#111] border border-[#333] w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-[#333] bg-[#151515]">
              <h3 className="text-xl font-bold text-white">Novo Cliente Zytech</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddClient} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nome do Cliente</label>
                <input 
                  autoFocus type="text" placeholder="Ex: Pizzaria do João"
                  className="w-full bg-black border border-[#333] rounded-lg p-3 text-white focus:border-blue-600 outline-none transition-all"
                  value={newClientName} onChange={(e) => setNewClientName(e.target.value)} required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Categoria</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'delivery', label: 'Delivery', icon: Truck },
                    { id: 'commerce', label: 'Comércio', icon: ShoppingCart },
                    { id: 'website', label: 'Website', icon: Globe },
                    { id: 'automation', label: 'Automação', icon: Cpu },
                    { id: 'consulting', label: 'Consultoria', icon: Briefcase },
                  ].map((type) => (
                    <button
                      key={type.id} type="button"
                      onClick={() => { setNewClientType(type.id); setNewClientPlan('') }}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                        newClientType === type.id ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-black border-[#333] text-gray-400 hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <type.icon size={16} /> {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {newClientType !== 'consulting' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Plano Contratado</label>
                  <div className="grid grid-cols-2 gap-2">
                    {newClientType === 'automation' && ['ZyAuto'].map(plan => <PlanButton key={plan} plan={plan} current={newClientPlan} set={setNewClientPlan} />)}
                    {(newClientType === 'commerce' || newClientType === 'delivery') && ['ZyStart', 'ZyControl', 'ZyBotAI', 'ZyCore'].map(plan => <PlanButton key={plan} plan={plan} current={newClientPlan} set={setNewClientPlan} />)}
                    {newClientType === 'website' && ['Website Start', 'Website Control', 'Website Core'].map(plan => <PlanButton key={plan} plan={plan} current={newClientPlan} set={setNewClientPlan} />)}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#333]">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Valor (R$)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500 text-sm">R$</span>
                        <input type="text" placeholder="0,00" className="w-full bg-black border border-[#333] rounded-lg p-3 pl-9 text-white focus:border-green-500 outline-none"
                        value={newClientValue} onChange={(e) => setNewClientValue(e.target.value)} required />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Ciclo</label>
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-3.5 text-gray-500"/>
                        <select value={newClientCycle} onChange={(e) => setNewClientCycle(e.target.value)} className="w-full bg-black border border-[#333] rounded-lg p-3 pl-9 text-white focus:border-blue-500 outline-none appearance-none">
                            <option value="mensal">Mensal</option>
                            <option value="trimestral">Trimestral</option>
                            <option value="semestral">Semestral</option>
                            <option value="anual">Anual</option>
                            <option value="unico">Único</option>
                        </select>
                    </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#333] mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50">
                  {isSaving ? 'Salvando...' : <><Save size={16} /> Confirmar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Carteira</h2>
          <p className="text-gray-400 text-sm">Administre seus contratos Zytech</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]">
          <Plus size={18} /> Novo Contrato
        </button>
      </div>

      <div className="bg-[#111] border border-[#333] rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1a1a1a] text-gray-400 text-sm border-b border-[#333]">
              <th className="p-4 font-medium">Cliente</th>
              <th className="p-4 font-medium">Categoria</th>
              <th className="p-4 font-medium">Plano / Valor</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333]">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando carteira...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum contrato ativo.</td></tr>
            ) : (
              clients.map((client) => {
                const style = getTypeStyle(client.business_type)
                const detailsLink = `/dashboard/clients/${client.id}`
                const planColor = getPlanColorClass(client.plan)

                return (
                  <tr key={client.id} className="hover:bg-[#161616] transition-colors group">
                    <td className="p-4">
                        <Link href={detailsLink} className="font-bold text-white hover:text-blue-400 transition-colors block">
                            {client.name}
                        </Link>
                    </td>
                    
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border ${style.color}`}>
                        {style.icon} {style.label}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase border mb-1 ${planColor}`}>
                            {client.business_type === 'consulting' ? 'SOB MEDIDA' : client.plan}
                        </span>
                        <span className="text-sm font-medium text-green-400 flex items-center gap-1">
                            R$ {Number(client.subscription_value || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                            <span className="text-gray-600 text-xs font-normal">/{client.subscription_cycle}</span>
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="text-green-400 text-xs font-medium bg-green-900/20 px-2 py-1 rounded border border-green-900/30">
                        Ativo
                      </span>
                    </td>
                    
                    <td className="p-4 text-right">
                      <Link 
                        href={detailsLink}
                        className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-white hover:bg-[#222] rounded transition-colors"
                        title="Ver Detalhes"
                      >
                        <ChevronRight size={20} />
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}