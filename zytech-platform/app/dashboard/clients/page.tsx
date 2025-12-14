'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { 
  Plus, Search, MoreHorizontal, X, Save, 
  Briefcase, ShoppingCart, Globe, Cpu, Calendar, ChevronRight, Truck,
  Sparkles, Filter
} from 'lucide-react'

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
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

  const filteredClients = clients.filter(client => 
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPlanColorClass = (planName: string) => {
    if (!planName) return 'bg-gray-800/50 text-gray-400 border-gray-700/50'
    const name = planName.toLowerCase()
    
    if (name.includes('start')) return 'bg-orange-900/20 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]' 
    if (name.includes('control')) return 'bg-gray-800/50 text-gray-300 border-gray-500/30' 
    if (name.includes('botai') || name.includes('zyauto') || (name.includes('website') && name.includes('core'))) return 'bg-yellow-900/20 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]'
    if (name.includes('zycore')) return 'bg-cyan-900/20 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
    
    return 'bg-white/5 border-white/10 text-white'
  }

  const getTypeStyle = (type: string) => {
    switch(type) {
      case 'commerce': return { icon: <ShoppingCart size={14}/>, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.1)]', label: 'Comércio' }
      case 'delivery': return { icon: <Truck size={14}/>, color: 'text-green-400 bg-green-500/10 border-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.1)]', label: 'Delivery' }
      case 'website': return { icon: <Globe size={14}/>, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.1)]', label: 'Website' }
      case 'automation': return { icon: <Cpu size={14}/>, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.1)]', label: 'Automação' }
      case 'consulting': return { icon: <Briefcase size={14}/>, color: 'text-gray-400 bg-gray-500/10 border-gray-500/20', label: 'Consultoria' }
      default: return { icon: <Briefcase size={14}/>, color: 'text-gray-400', label: type }
    }
  }

  function PlanButton({ plan, current, set }: any) {
    let colorClass = 'border-white/10 text-gray-500 hover:border-gray-500 hover:text-gray-300 bg-transparent'
    if (current === plan) {
        if (plan.includes('Start')) colorClass = 'bg-orange-500/10 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
        else if (plan.includes('Control')) colorClass = 'bg-gray-700/50 border-gray-400 text-gray-200'
        else if (plan.includes('BotAI') || plan.includes('ZyAuto') || (plan.includes('Website') && plan.includes('Core'))) colorClass = 'bg-yellow-500/10 border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
        else if (plan.includes('ZyCore')) colorClass = 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
    }

    return (
      <button
        type="button"
        onClick={() => set(plan)}
        className={`py-2 px-3 rounded-lg border text-xs font-bold uppercase transition-all duration-300 ${colorClass}`}
      >
        {plan}
      </button>
    )
  }

  return (
    <div className="space-y-8 text-white relative">
      
      <div className="fixed top-20 right-20 w-96 h-96 bg-blue-600/5 blur-[100px] rounded-full pointer-events-none -z-10"></div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>
            
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/5">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles size={16} className="text-blue-500"/> Novo Cliente</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddClient} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nome do Cliente</label>
                <input 
                  autoFocus type="text" placeholder="Ex: Pizzaria do João"
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-gray-700"
                  value={newClientName} onChange={(e) => setNewClientName(e.target.value)} required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Categoria</label>
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
                      className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all duration-300 ${
                        newClientType === type.id 
                          ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.15)]' 
                          : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10 hover:text-gray-300'
                      }`}
                    >
                      <type.icon size={16} /> {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {newClientType !== 'consulting' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Plano Contratado</label>
                  <div className="grid grid-cols-2 gap-2">
                    {newClientType === 'automation' && ['ZyAuto'].map(plan => <PlanButton key={plan} plan={plan} current={newClientPlan} set={setNewClientPlan} />)}
                    {(newClientType === 'commerce' || newClientType === 'delivery') && ['ZyStart', 'ZyControl', 'ZyBotAI', 'ZyCore'].map(plan => <PlanButton key={plan} plan={plan} current={newClientPlan} set={setNewClientPlan} />)}
                    {newClientType === 'website' && ['Website Start', 'Website Control', 'Website Core'].map(plan => <PlanButton key={plan} plan={plan} current={newClientPlan} set={setNewClientPlan} />)}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Valor (R$)</label>
                    <div className="relative group">
                        <span className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-blue-500 transition-colors text-sm">R$</span>
                        <input type="text" placeholder="0,00" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 pl-9 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500/50 outline-none transition-all placeholder:text-gray-700 font-mono"
                        value={newClientValue} onChange={(e) => setNewClientValue(e.target.value)} required />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ciclo</label>
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-3.5 text-gray-500"/>
                        <select value={newClientCycle} onChange={(e) => setNewClientCycle(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 pl-9 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none appearance-none cursor-pointer hover:bg-white/5 transition-colors">
                            <option value="mensal">Mensal</option>
                            <option value="trimestral">Trimestral</option>
                            <option value="semestral">Semestral</option>
                            <option value="anual">Anual</option>
                            <option value="unico">Único</option>
                        </select>
                    </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSaving ? 'Salvando...' : <><Save size={16} /> Confirmar Contrato</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">Gestão de Carteira</h2>
          <p className="text-gray-500 mt-1 flex items-center gap-2"><Filter size={14} className="text-blue-500"/> Administre seus contratos Zytech</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
                <Search size={16} className="absolute left-3 top-3 text-gray-600"/>
                <input 
                  type="text" 
                  placeholder="Buscar cliente..." 
                  className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-300 focus:border-blue-500/50 focus:bg-white/10 outline-none w-64 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)] hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 active:translate-y-0">
                <Plus size={18} /> Novo Contrato
            </button>
        </div>
      </div>

      <div className="bg-[#0a0a0a]/50 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider border-b border-white/5">
                    <th className="p-5 font-semibold">Cliente</th>
                    <th className="p-5 font-semibold">Categoria</th>
                    <th className="p-5 font-semibold">Plano / Valor</th>
                    <th className="p-5 font-semibold">Status</th>
                    <th className="p-5 font-semibold text-right">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-gray-500 animate-pulse">Carregando carteira de clientes...</td></tr>
                ) : filteredClients.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-gray-500">Nenhum contrato encontrado.</td></tr>
                ) : (
                filteredClients.map((client) => {
                    const style = getTypeStyle(client.business_type)
                    const detailsLink = `/dashboard/clients/${client.id}`
                    const planColor = getPlanColorClass(client.plan)

                    return (
                    <tr key={client.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="p-5">
                            <Link href={detailsLink} className="font-bold text-white hover:text-blue-400 transition-colors block text-base group-hover:translate-x-1 duration-300">
                                {client.name}
                            </Link>
                            <span className="text-[10px] text-gray-600 font-mono">{client.id.split('-')[0]}...</span>
                        </td>
                        
                        <td className="p-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-300 ${style.color}`}>
                            {style.icon} {style.label}
                        </span>
                        </td>

                        <td className="p-5">
                        <div className="flex flex-col gap-1">
                            <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wide ${planColor}`}>
                                {client.business_type === 'consulting' ? 'SOB MEDIDA' : client.plan}
                            </span>
                            <span className="text-sm font-medium text-gray-300 flex items-center gap-1 font-mono">
                                R$ {Number(client.subscription_value || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                <span className="text-gray-600 text-[10px] uppercase">/{client.subscription_cycle}</span>
                            </span>
                        </div>
                        </td>

                        <td className="p-5">
                        <span className="inline-flex items-center gap-1.5 text-green-400 text-xs font-bold bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            Ativo
                        </span>
                        </td>
                        
                        <td className="p-5 text-right">
                        <Link 
                            href={detailsLink}
                            className="inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all hover:scale-110 active:scale-95"
                            title="Ver Detalhes"
                        >
                            <ChevronRight size={18} />
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
    </div>
  )
}