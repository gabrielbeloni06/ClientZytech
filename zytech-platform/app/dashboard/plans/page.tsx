'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  Plus, Edit, Trash2, Save, X, DollarSign, Tag, CheckCircle, AlertCircle
} from 'lucide-react'

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<any>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    fetchPlans()
  }, [])

  async function fetchPlans() {
    setLoading(true)
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price', { ascending: true })
    
    if (data) setPlans(data)
    if (error) alert('Erro ao buscar planos: ' + error.message)
    setLoading(false)
  }

  function handleOpenModal(plan: any = null) {
    if (plan) {
        setEditingPlan(plan)
        setName(plan.name)
        setPrice(String(plan.price))
        setDescription(plan.description || '')
    } else {
        setEditingPlan(null)
        setName('')
        setPrice('')
        setDescription('')
    }
    setIsModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
      e.preventDefault()
      const priceFloat = parseFloat(price.replace(',', '.'))
      
      if (isNaN(priceFloat)) return alert("Preço inválido")

      const payload = {
          name,
          price: priceFloat,
          description
      }

      let error
      if (editingPlan) {
          const { error: updateError } = await supabase.from('plans').update(payload).eq('id', editingPlan.id)
          error = updateError
      } else {
          const { error: insertError } = await supabase.from('plans').insert([payload])
          error = insertError
      }

      if (error) {
          alert('Erro: ' + error.message)
      } else {
          setIsModalOpen(false)
          fetchPlans()
      }
  }

  async function handleDelete(id: string) {
      if(!confirm("Tem certeza? Isso não afeta contratos já criados, apenas novos.")) return;
      
      const { error } = await supabase.from('plans').delete().eq('id', id)
      if (error) alert("Erro: " + error.message)
      else fetchPlans()
  }

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in">
        <div className="flex justify-between items-end border-b border-white/10 pb-6">
            <div>
                <h2 className="text-3xl font-bold text-white">Planos & Preços</h2>
                <p className="text-zinc-400 text-sm mt-1">Defina os valores que aparecerão no checkout e na criação de contratos.</p>
            </div>
            <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20">
                <Plus size={18}/> Novo Plano
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? <p className="text-zinc-500 col-span-full text-center py-10">Carregando planos...</p> : 
             plans.map(plan => (
                <div key={plan.id} className="bg-[#0F0F11] border border-white/10 rounded-2xl p-6 relative group hover:border-blue-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Tag size={20}/></div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenModal(plan)} className="p-1.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white"><Edit size={16}/></button>
                            <button onClick={() => handleDelete(plan.id)} className="p-1.5 hover:bg-red-500/10 rounded text-zinc-400 hover:text-red-400"><Trash2 size={16}/></button>
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                    <p className="text-3xl font-mono text-emerald-400 font-bold mb-4">R$ {plan.price}</p>
                    <p className="text-sm text-zinc-500 h-10 line-clamp-2">{plan.description}</p>
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-[10px] text-zinc-600 uppercase font-bold tracking-wider">
                        <CheckCircle size={12} className="text-emerald-500"/> Ativo no Sistema
                    </div>
                </div>
             ))
            }
        </div>

        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">{editingPlan ? 'Editar Plano' : 'Novo Plano'}</h3>
                        <button onClick={() => setIsModalOpen(false)}><X className="text-zinc-500 hover:text-white"/></button>
                    </div>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase">Nome do Plano</label>
                            <input className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: ZyUltra" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase">Preço Mensal (R$)</label>
                            <input className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white focus:border-emerald-500 outline-none font-mono" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase">Descrição Curta</label>
                            <textarea className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white focus:border-zinc-500 outline-none resize-none h-24" value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes do plano..." />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold mt-2">Salvar</button>
                    </form>
                </div>
            </div>
        )}
    </div>
  )
}