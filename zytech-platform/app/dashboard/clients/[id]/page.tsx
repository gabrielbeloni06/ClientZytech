'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  ArrowLeft, CreditCard, Settings, Save, Power, 
  Plus, Package, Trash2, Tag, X, DollarSign 
} from 'lucide-react'

export default function ClientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [prodName, setProdName] = useState('')
  const [prodPrice, setProdPrice] = useState('')
  const [prodCategory, setProdCategory] = useState('Lanches')
  const [isSavingProd, setIsSavingProd] = useState(false)

  useEffect(() => {
    if (params?.id) {
      fetchClientAndProducts()
    }
  }, [params?.id])

  async function fetchClientAndProducts() {
    const { data: clientData, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      alert('Cliente não encontrado!')
      router.push('/dashboard/clients')
      return
    }

    setClient(clientData)
    setNotes(clientData.notes || '')

    const { data: prodData } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', params.id)
      .order('created_at', { ascending: false })
    
    if (prodData) setProducts(prodData)
    setLoading(false)
  }


  async function handleSaveNotes() {
    setIsSavingNotes(true)
    await supabase.from('organizations').update({ notes: notes }).eq('id', client.id)
    setIsSavingNotes(false)
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    setIsSavingProd(true)

    const priceFormatted = parseFloat(prodPrice.replace(',', '.'))

    const { error } = await supabase.from('products').insert([{
      organization_id: client.id,
      name: prodName,
      price: isNaN(priceFormatted) ? 0 : priceFormatted,
      category: prodCategory,
      is_available: true
    }])

    if (error) {
      alert('Erro: ' + error.message)
    } else {
      setIsProductModalOpen(false)
      setProdName('')
      setProdPrice('')
      fetchClientAndProducts()
    }
    setIsSavingProd(false)
  }

  async function toggleProductStatus(product: any) {
    const newStatus = !product.is_available
    setProducts(products.map(p => p.id === product.id ? {...p, is_available: newStatus} : p))
    await supabase.from('products').update({ is_available: newStatus }).eq('id', product.id)
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm('Tem certeza que quer apagar este item?')) return
    setProducts(products.filter(p => p.id !== id))
    await supabase.from('products').delete().eq('id', id)
  }

  if (loading) return <div className="p-8 text-white">Carregando painel do cliente...</div>
  if (!client) return null

  return (
    <div className="space-y-8 text-white max-w-6xl mx-auto relative pb-20">
      
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-[#333] w-full max-w-sm rounded-xl animate-in fade-in zoom-in duration-200 shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-[#333]">
              <h3 className="font-bold text-white flex items-center gap-2"><Plus size={18} className="text-blue-500"/> Novo Item</h3>
              <button onClick={() => setIsProductModalOpen(false)}><X size={20} className="text-gray-500 hover:text-white"/></button>
            </div>
            
            <form onSubmit={handleAddProduct} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Nome do Item</label>
                <input 
                  autoFocus 
                  type="text" 
                  className="w-full bg-black border border-[#333] rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors" 
                  placeholder="Ex: X-Bacon Supremo" 
                  value={prodName} 
                  onChange={e => setProdName(e.target.value)} 
                  required 
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                    <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Preço (R$)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500 text-sm">R$</span>
                        <input 
                          type="number" step="0.01" 
                          className="w-full bg-black border border-[#333] rounded-lg p-3 pl-9 text-white focus:border-green-500 outline-none transition-colors" 
                          placeholder="0,00" 
                          value={prodPrice} 
                          onChange={e => setProdPrice(e.target.value)} 
                          required 
                        />
                    </div>
                </div>
                <div className="flex-1">
                    <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Categoria</label>
                    <select 
                      className="w-full bg-black border border-[#333] rounded-lg p-3 text-white outline-none focus:border-blue-500"
                      value={prodCategory} 
                      onChange={e => setProdCategory(e.target.value)}
                    >
                        <option>Lanches</option>
                        <option>Bebidas</option>
                        <option>Combos</option>
                        <option>Sobremesas</option>
                        <option>Serviços</option>
                        <option>Outros</option>
                    </select>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSavingProd} 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold mt-2 transition-all disabled:opacity-50"
              >
                {isSavingProd ? 'Salvando...' : 'Adicionar ao Cardápio'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div>
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform"/> Voltar para Lista
        </button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#333] pb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {client.name}
              <span className={`px-2 py-0.5 text-xs rounded uppercase border ${client.status === 'active' ? 'bg-green-900/20 text-green-400 border-green-900/50' : 'bg-red-900/20 text-red-400 border-red-900/50'}`}>
                {client.status === 'active' ? 'Ativo' : 'Suspenso'}
              </span>
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                <span className="flex items-center gap-1 bg-[#111] px-2 py-0.5 rounded border border-[#333]"><Tag size={12}/> {client.business_type}</span>
                <span className="flex items-center gap-1 bg-[#111] px-2 py-0.5 rounded border border-[#333] uppercase"><CreditCard size={12}/> {client.plan}</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-[#111] border border-[#333] hover:border-gray-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-gray-300 hover:text-white">
                <Settings size={16} /> Configurar Bot
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-[#111] border border-[#333] rounded-xl p-6 flex items-center justify-between group hover:border-blue-500/30 transition-colors">
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase mb-1">Status do Bot</p>
                <h3 className="text-green-400 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Online
                </h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Power size={20} className="text-green-500"/>
            </div>
        </div>

        <div className="bg-[#111] border border-[#333] rounded-xl p-6 group hover:border-purple-500/30 transition-colors">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase mb-1">Assinatura</p>
                    <p className="text-white font-bold text-lg">
                        {client.subscription_valid_until ? new Date(client.subscription_valid_until).toLocaleDateString('pt-BR') : '-'}
                    </p>
                    <p className="text-xs text-blue-400 mt-1">Renovação automática</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <CreditCard size={20} className="text-purple-500"/>
                </div>
            </div>
        </div>

        <div className="bg-[#111] border border-[#333] rounded-xl p-4 flex flex-col h-full hover:border-gray-500/30 transition-colors">
            <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-xs font-bold uppercase">Notas Privadas</span>
                <button onClick={handleSaveNotes} disabled={isSavingNotes} className="text-xs text-blue-400 hover:text-white transition-colors font-medium">
                    {isSavingNotes ? 'Salvando...' : 'Salvar'}
                </button>
            </div>
            <textarea 
                className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg p-2 text-sm text-gray-300 outline-none resize-none focus:border-blue-500/30 transition-colors"
                placeholder="Ex: Cliente pediu alteração no menu..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
            />
        </div>
      </div>

      <div className="pt-4">
        <div className="flex justify-between items-end mb-6">
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Package className="text-blue-500"/> 
                    Catálogo de Produtos
                </h2>
                <p className="text-gray-400 text-sm mt-1">Gerencie os itens que o chatbot vai vender.</p>
            </div>
            <button 
                onClick={() => setIsProductModalOpen(true)} 
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]"
            >
                <Plus size={18}/> Adicionar Item
            </button>
        </div>

        {products.length === 0 ? (
            <div className="bg-[#111] border border-dashed border-[#333] rounded-xl p-12 text-center">
                <div className="w-16 h-16 bg-[#222] rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
                    <Package size={32}/>
                </div>
                <h3 className="text-white font-bold text-lg">Cardápio Vazio</h3>
                <p className="text-gray-500 mb-6">Cadastre o primeiro item para começar a vender.</p>
                <button onClick={() => setIsProductModalOpen(true)} className="text-blue-400 hover:text-blue-300 font-medium text-sm">
                    + Cadastrar agora
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((prod) => (
                    <div key={prod.id} className={`group relative bg-[#111] border rounded-xl p-5 transition-all hover:-translate-y-1 hover:shadow-lg ${prod.is_available ? 'border-[#333] hover:border-blue-500/30' : 'border-red-900/30 opacity-60 hover:opacity-100'}`}>
                        
                        <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#222] text-gray-400 px-2 py-1 rounded">
                                {prod.category}
                            </span>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDeleteProduct(prod.id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-900/20 rounded transition-colors" title="Excluir">
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        </div>

                        <h4 className={`font-bold text-lg mb-1 ${prod.is_available ? 'text-white' : 'text-gray-500 line-through'}`}>
                            {prod.name}
                        </h4>
                        
                        <div className="flex justify-between items-end mt-4">
                            <p className="text-xl font-mono font-medium text-green-400">
                                <span className="text-sm text-gray-500 mr-1">R$</span>
                                {Number(prod.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>

                            <button 
                                onClick={() => toggleProductStatus(prod)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${prod.is_available ? 'bg-green-900/20 text-green-400 border border-green-900/50 hover:bg-green-900/40' : 'bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40'}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${prod.is_available ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                {prod.is_available ? 'Em Estoque' : 'Esgotado'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  )
}