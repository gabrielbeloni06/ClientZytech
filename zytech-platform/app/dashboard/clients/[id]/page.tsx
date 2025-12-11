'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  ArrowLeft, Settings, Save, Power, 
  Plus, Package, Trash2, Tag, X, Key, CreditCard,
  Briefcase, ShoppingCart, Calendar, Scissors, ExternalLink,
  List, CheckCircle, Box, Filter, Clock, User, BarChart3, ChevronLeft, ChevronRight, TrendingUp
} from 'lucide-react'

export default function ClientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  
  const [role, setRole] = useState<string>('')
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview') 
  
  const [products, setProducts] = useState<any[]>([])
  const [clientOrders, setClientOrders] = useState<any[]>([])
  
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', plan: '', value: '', cycle: '', payment_method: '', valid_until: '' })

  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [prodName, setProdName] = useState('')
  const [prodPrice, setProdPrice] = useState('')
  const [prodCategory, setProdCategory] = useState('') 
  
  const [prodHasStockLimit, setProdHasStockLimit] = useState(false)
  const [prodStockQuantity, setProdStockQuantity] = useState('')

  const [isSavingProd, setIsSavingProd] = useState(false)

  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [newCategoryInput, setNewCategoryInput] = useState('')
  const [isSavingCategories, setIsSavingCategories] = useState(false)

  const [appointmentsList, setAppointmentsList] = useState<any[]>([])
  const [apptFilter, setApptFilter] = useState('month')
  const [loadingAppts, setLoadingAppts] = useState(false)

  const [reportDate, setReportDate] = useState(new Date()) 
  const [monthlyStats, setMonthlyStats] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(false) 

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [generatedCreds, setGeneratedCreds] = useState<{email:string, pass:string} | null>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [isCreatingUser, setIsCreatingUser] = useState(false)

  const [notes, setNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  useEffect(() => {
    if (params?.id) loadAllData()
  }, [params?.id])

  useEffect(() => {
    if (client?.id) fetchRealFinancialStats()
  }, [client?.id, reportDate])

  useEffect(() => {
    if (activeTab === 'appointments' && client?.id) {
        fetchClientAppointments()
    }
  }, [activeTab, apptFilter, client?.id])

  async function loadAllData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    
    const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single()
    const userRole = profile?.role || 'org_owner'
    setRole(userRole)

    if (userRole !== 'super_admin' && profile?.organization_id !== params.id) {
        alert('Acesso negado: Você não tem permissão para ver esta empresa.')
        router.push('/dashboard') 
        return
    }

    const { data: clientData, error } = await supabase.from('organizations').select('*').eq('id', params.id).single()

    if (error || !clientData) {
      alert('Empresa não encontrada!')
      router.push(userRole === 'super_admin' ? '/dashboard/clients' : '/dashboard')
      return
    }

    setClient(clientData)
    setNotes(clientData.notes || '')
    
    let initialCats = clientData.service_categories || []
    if (initialCats.length === 0) {
       const isService = ['service', 'commerce'].includes(clientData.business_type)
       if (isService) {
          initialCats = ['Cabelo', 'Barba', 'Combos', 'Produtos', 'Outros']
       } else {
          initialCats = ['Lanches', 'Bebidas', 'Combos', 'Sobremesas', 'Outros']
       }
    }
    setCustomCategories(initialCats)

    if (userRole === 'super_admin') {
        const cleanName = clientData.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        setLoginEmail(`admin@${cleanName}.com`)
    }

    setEditForm({
        name: clientData.name,
        plan: clientData.plan,
        value: String(clientData.subscription_value || '0'),
        cycle: clientData.subscription_cycle,
        payment_method: clientData.payment_method || 'pix', 
        valid_until: clientData.subscription_valid_until ? new Date(clientData.subscription_valid_until).toISOString().split('T')[0] : ''
    })

    const { data: prodData } = await supabase.from('products').select('*').eq('organization_id', params.id).order('created_at', { ascending: false })
    setProducts(prodData || [])

    if (['delivery', 'commerce', 'service'].includes(clientData.business_type)) {
        const { data: orderData } = await supabase.from('orders').select('*').eq('organization_id', params.id).order('created_at', { ascending: false }).limit(20)
        setClientOrders(orderData || [])
    }

    setLoading(false)
  }

  async function fetchRealFinancialStats() {
    setLoadingStats(true)
    
    const currentYear = reportDate.getFullYear()
    const currentMonth = reportDate.getMonth()
    
    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)
    
    const startDate = new Date(currentYear, currentMonth - 5, 1, 0, 0, 0)

    const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, total_value')
        .eq('organization_id', client.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

    if (error) {
        console.error("Erro ao buscar estatísticas:", error)
        setLoadingStats(false)
        return
    }

    const statsMap = new Map() 
    for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1)
        const key = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        statsMap.set(key, {
            label: d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', ''),
            fullDate: d,
            value: 0,
            isCurrent: i === 0 
        })
    }

    orders?.forEach(order => {
        const orderDate = new Date(order.created_at)
        const key = orderDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        
        if (statsMap.has(key)) {
            const current = statsMap.get(key)
            current.value += Number(order.total_value) || 0
            statsMap.set(key, current)
        }
    })

    setMonthlyStats(Array.from(statsMap.values()))
    setLoadingStats(false)
  }

  function changeReportMonth(direction: 'prev' | 'next') {
    const newDate = new Date(reportDate)
    if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1)
    else newDate.setMonth(newDate.getMonth() + 1)
    setReportDate(newDate)
  }
  async function fetchClientAppointments() {
    if (!client?.id) return
    setLoadingAppts(true)

    let query = supabase
        .from('appointments')
        .select('*')
        .eq('organization_id', client.id)
        .order('appointment_date', { ascending: false }) 

    const now = new Date()
    
    if (apptFilter === 'today') {
        const start = new Date(now.setHours(0,0,0,0)).toISOString()
        const end = new Date(now.setHours(23,59,59,999)).toISOString()
        query = query.gte('appointment_date', start).lte('appointment_date', end)
    } else if (apptFilter === 'week') {
        const firstDay = new Date(now.setDate(now.getDate() - now.getDay())).toISOString() 
        const lastDay = new Date(now.setDate(now.getDate() + 6)).toISOString() 
        query = query.gte('appointment_date', firstDay).lte('appointment_date', lastDay)
    } else if (apptFilter === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
        query = query.gte('appointment_date', start).lte('appointment_date', end)
    } else if (apptFilter === 'year') {
        const start = new Date(now.getFullYear(), 0, 1).toISOString()
        const end = new Date(now.getFullYear(), 11, 31).toISOString()
        query = query.gte('appointment_date', start).lte('appointment_date', end)
    } 
    
    if (apptFilter === 'all') {
        query = query.limit(50)
    }

    const { data, error } = await query
    if (!error) {
        setAppointmentsList(data || [])
    }
    setLoadingAppts(false)
  }

  const getPlanColorClass = (planName: string) => {
    if (!planName) return 'bg-gray-800 text-gray-400 border-gray-700'
    const name = planName.toLowerCase()
    
    if (name.includes('start')) return 'bg-orange-900/20 text-orange-400 border-orange-900/50' 
    if (name.includes('control')) return 'bg-gray-800 text-gray-300 border-gray-600' 
    if (name.includes('botai') || name.includes('zyauto')) return 'bg-yellow-900/20 text-yellow-400 border-yellow-900/50' 
    if (name.includes('zycore') || (name.includes('website') && name.includes('core'))) {
       return 'bg-[#9b111e]/10 text-[#9b111e] border-[#9b111e]/50 shadow-[0_0_10px_rgba(155,17,30,0.2)]'
    }
    return 'bg-[#222] border-[#333] text-white'
  }

  const getAvailablePlans = (type: string) => {
    if (type === 'delivery' || type === 'commerce' || type === 'service') return ['ZyStart', 'ZyControl', 'ZyBotAI', 'ZyCore']
    if (type === 'website') return ['Website Start', 'Website Control', 'Website Core']
    if (type === 'automation') return ['ZyAuto']
    return ['Plano Customizado']
  }

  const isDelivery = client?.business_type === 'delivery'
  const isCommerce = client?.business_type === 'commerce'
  const isService = client?.business_type === 'service'
  
  const isServiceType = isService || isCommerce
  const showAppointments = isServiceType

  const labels = {
    item: isServiceType ? 'Serviço' : 'Item',
    menu: 'Catálogo', 
    add: isServiceType ? 'Adicionar Serviço' : 'Adicionar Item',
    category: isServiceType ? 'Serviços' : 'Geral'
  }

  function generatePassword() {
    return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2);
  }

  async function handleGenerateLogin() {
    setIsCreatingUser(true)
    const pass = generatePassword()
    try {
        const response = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: loginEmail, password: pass, organization_id: client.id, name: client.name })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        setGeneratedCreds({ email: loginEmail, pass: pass })
    } catch (err: any) {
        alert('Erro: ' + err.message)
    } finally {
        setIsCreatingUser(false)
    }
  }

  async function handleUpdateClient(e: React.FormEvent) {
    e.preventDefault()
    if (role !== 'super_admin') return;

    const valFloat = parseFloat(String(editForm.value).replace(',', '.'))

    const { error } = await supabase.from('organizations').update({
        name: editForm.name, 
        plan: editForm.plan, 
        subscription_value: isNaN(valFloat) ? 0 : valFloat,
        subscription_cycle: editForm.cycle, 
        payment_method: editForm.payment_method, 
        subscription_valid_until: new Date(editForm.valid_until).toISOString()
    }).eq('id', client.id)

    if (error) alert('Erro ao salvar: ' + error.message)
    else { setIsEditing(false); loadAllData(); alert('Dados atualizados!') }
  }

  async function handleDeleteClient() {
    if (role !== 'super_admin') return;
    const confirmName = prompt(`ATENÇÃO ADMIN: Digite "${client.name}" para confirmar a exclusão PERMANENTE:`)
    if (confirmName === client.name) {
        await supabase.from('organizations').delete().eq('id', client.id)
        router.push('/dashboard/clients')
    }
  }

  async function handleSaveNotes() {
    setIsSavingNotes(true)
    await supabase.from('organizations').update({ notes: notes }).eq('id', client.id)
    setIsSavingNotes(false)
  }

  async function handleSaveCategories() {
    setIsSavingCategories(true)
    const { error } = await supabase
      .from('organizations')
      .update({ service_categories: customCategories })
      .eq('id', client.id)

    if (error) {
        alert('Erro ao salvar categorias: ' + error.message)
    } else {
        alert('Categorias atualizadas com sucesso!')
    }
    setIsSavingCategories(false)
  }

  function handleAddCategory(e: React.FormEvent) {
      e.preventDefault()
      if (!newCategoryInput.trim()) return
      if (customCategories.includes(newCategoryInput.trim())) {
          alert('Categoria já existe!')
          return
      }
      setCustomCategories([...customCategories, newCategoryInput.trim()])
      setNewCategoryInput('')
  }

  function handleRemoveCategory(catToRemove: string) {
      if (confirm(`Remover a categoria "${catToRemove}"?`)) {
          setCustomCategories(customCategories.filter(c => c !== catToRemove))
      }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    setIsSavingProd(true)
    const priceFormatted = parseFloat(prodPrice.replace(',', '.'))
    
    const trackStock = prodHasStockLimit
    const stockQty = prodHasStockLimit ? parseInt(prodStockQuantity) : null

    const { error } = await supabase.from('products').insert([{
      organization_id: client.id, 
      name: prodName, 
      price: isNaN(priceFormatted) ? 0 : priceFormatted,
      category: prodCategory || labels.category, 
      is_available: true,
      track_stock: trackStock,
      stock_quantity: stockQty
    }])

    if (!error) { 
        setIsProductModalOpen(false)
        setProdName('')
        setProdPrice('')
        setProdCategory('')
        setProdHasStockLimit(false)
        setProdStockQuantity('')
        loadAllData() 
    } else {
        alert('Erro ao criar produto: ' + error.message)
    }
    setIsSavingProd(false)
  }

  async function toggleProductStatus(product: any) {
    const newStatus = !product.is_available
    setProducts(products.map(p => p.id === product.id ? {...p, is_available: newStatus} : p))
    await supabase.from('products').update({ is_available: newStatus }).eq('id', product.id)
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm('Tem certeza?')) return
    setProducts(products.filter(p => p.id !== id))
    await supabase.from('products').delete().eq('id', id)
  }

  if (loading) return <div className="p-8 text-white">Carregando painel...</div>
  if (!client) return null

  const maxChartValue = Math.max(...monthlyStats.map(s => s.value), 100)

  return (
    <div className="space-y-6 text-white max-w-6xl mx-auto pb-20 relative">
      
      <div className="flex flex-col gap-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white w-fit transition-colors">
          <ArrowLeft size={18} /> {role === 'super_admin' ? 'Voltar para Lista' : 'Voltar ao Início'}
        </button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#333]">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {client.name}
              <span className={`px-2 py-0.5 text-xs rounded uppercase border ${client.status === 'active' ? 'bg-green-900/20 text-green-400 border-green-900/50' : 'bg-red-900/20 text-red-400 border-red-900/50'}`}>
                {client.status === 'active' ? 'Ativo' : 'Suspenso'}
              </span>
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                <span className="flex items-center gap-1 bg-[#111] px-2 py-0.5 rounded border border-[#333] capitalize">
                    {isServiceType ? <Scissors size={12}/> : <Tag size={12}/>} 
                    {client.business_type === 'commerce' ? 'Comércio' : client.business_type === 'service' ? 'Barbearia/Serviço' : client.business_type}
                </span>
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded border uppercase ${getPlanColorClass(client.plan)}`}>
                    <CreditCard size={12}/> {client.plan}
                </span>
            </div>
          </div>
          
          {role === 'super_admin' && (
              <div className="flex gap-2">
                <button 
                    onClick={() => setIsLoginModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-600/50 hover:bg-purple-600/30 rounded-lg text-sm font-bold transition-colors"
                >
                    <Key size={16} /> Gerar Acesso
                </button>
              </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 border-b border-[#333] overflow-x-auto">
        <button onClick={() => setActiveTab('overview')} className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'border-[#9b111e] text-[#9b111e]' : 'border-transparent text-gray-400'}`}>Visão Geral & Dashboard</button>
        <button onClick={() => setActiveTab('contract')} className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'contract' ? 'border-[#9b111e] text-[#9b111e]' : 'border-transparent text-gray-400'}`}>Dados do Contrato</button>
        <button onClick={() => setActiveTab('categories')} className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'categories' ? 'border-[#9b111e] text-[#9b111e]' : 'border-transparent text-gray-400'}`}>Categorias</button>
        {showAppointments && (
            <button onClick={() => setActiveTab('appointments')} className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'appointments' ? 'border-[#9b111e] text-[#9b111e]' : 'border-transparent text-gray-400'}`}>
                Agendamentos
            </button>
        )}
        {(isDelivery || isCommerce || isService) && (
            <button onClick={() => setActiveTab('orders')} className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'orders' ? 'border-[#9b111e] text-[#9b111e]' : 'border-transparent text-gray-400'}`}>
                {isServiceType ? 'Serviços Realizados' : 'Pedidos / Vendas'} ({clientOrders.length})
            </button>
        )}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            
            <div className="bg-[#111] border border-[#333] rounded-xl p-6 relative overflow-hidden">
                {loadingStats && (
                    <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center backdrop-blur-sm">
                        <span className="text-sm font-bold text-gray-300 animate-pulse">Atualizando dados...</span>
                    </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center gap-4 bg-black border border-[#333] rounded-full px-2 py-1 shadow-lg">
                        <button onClick={() => changeReportMonth('prev')} className="p-2 text-gray-400 hover:text-[#9b111e] transition-colors"><ChevronLeft size={20}/></button>
                        <span className="font-bold text-lg min-w-[140px] text-center capitalize text-white">
                            {reportDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => changeReportMonth('next')} className="p-2 text-gray-400 hover:text-[#9b111e] transition-colors"><ChevronRight size={20}/></button>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total de Vendas no Mês</p>
                        <p className="text-4xl font-bold text-[#9b111e] flex items-center justify-end gap-2">
                            R$ {monthlyStats.length > 0 ? monthlyStats[monthlyStats.length-1].value.toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '0,00'}
                            <TrendingUp size={24} className="text-green-500 opacity-80"/>
                        </p>
                    </div>
                </div>

                <div className="h-64 w-full flex items-end justify-between gap-2 md:gap-4 px-2 pt-8 relative border-b border-[#222] pb-2">
                    {monthlyStats.length === 0 && !loadingStats && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-600 italic">Sem dados para este período</div>
                    )}
                    {monthlyStats.map((item, idx) => {
                        const heightPct = (item.value / maxChartValue) * 100
                        return (
                            <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group">
                                <div className="relative w-full flex justify-center items-end flex-1">
                                    <div 
                                        className={`w-full max-w-[40px] md:max-w-[60px] rounded-t-lg transition-all duration-500 relative group-hover:scale-105 ${item.isCurrent ? 'bg-[#9b111e] shadow-[0_0_15px_rgba(155,17,30,0.4)]' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                                        style={{ height: `${heightPct || 1}%` }} 
                                    >
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-[#333] z-10">
                                            R$ {item.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 text-center w-full">
                                    <span className={`text-[10px] md:text-xs font-bold block mb-1 uppercase ${item.isCurrent ? 'text-white' : 'text-gray-500'}`}>{item.label}</span>
                                    <span className={`text-[10px] md:text-xs font-bold block ${item.isCurrent ? 'text-[#9b111e]' : 'text-gray-400'}`}>
                                        R$ {item.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#111] border border-[#333] rounded-xl p-6 flex items-center justify-between">
                    <div><p className="text-gray-400 text-xs font-bold uppercase mb-1">Status do Sistema</p><h3 className="text-green-400 font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Online</h3></div>
                    <Power size={24} className="text-green-500 opacity-50"/>
                </div>
                <div className="bg-[#111] border border-[#333] rounded-xl p-4 flex flex-col md:col-span-2">
                    <div className="flex justify-between items-center mb-2"><span className="text-gray-400 text-xs font-bold uppercase">Notas Privadas</span><button onClick={handleSaveNotes} disabled={isSavingNotes} className="text-xs text-[#9b111e] hover:text-white">{isSavingNotes ? '...' : 'Salvar'}</button></div>
                    <textarea className="flex-1 bg-[#0a0a0a] border border-[#333] rounded p-2 text-sm text-gray-300 outline-none resize-none focus:border-[#9b111e]/30" value={notes} onChange={e => setNotes(e.target.value)} rows={2}/>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-end mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {isServiceType ? <Scissors className="text-[#9b111e]"/> : (isDelivery ? <Package className="text-blue-500"/> : <Briefcase className="text-blue-500"/>)} 
                        
                        {labels.menu}
                    </h2>
                    <button onClick={() => setIsProductModalOpen(true)} className="bg-[#9b111e] hover:bg-[#7a0d17] text-white px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2"><Plus size={16}/> {labels.add}</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {products.length === 0 && <p className="text-gray-500 col-span-3 py-10 text-center border border-dashed border-[#333] rounded-xl">Lista vazia.</p>}
                    {products.map((prod) => (
                        <div key={prod.id} className={`bg-[#111] border rounded-xl p-4 flex justify-between group ${prod.is_available ? 'border-[#333]' : 'border-red-900/30 opacity-60'}`}>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold uppercase bg-[#222] px-2 py-0.5 rounded text-gray-400">{prod.category}</span>
                                    {prod.track_stock ? (
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${prod.stock_quantity > 0 ? 'bg-blue-900/30 text-blue-400' : 'bg-red-900/30 text-red-400'}`}>
                                            {prod.stock_quantity} un.
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold uppercase bg-[#222] px-2 py-0.5 rounded text-green-400 flex items-center gap-1">
                                            <Box size={10} /> ∞
                                        </span>
                                    )}
                                </div>
                                <h4 className="font-bold text-white">{prod.name}</h4>
                                <p className="text-green-400 text-sm font-mono">R$ {prod.price}</p>
                            </div>
                            <div className="flex flex-col gap-2"><button onClick={() => handleDeleteProduct(prod.id)} className="text-gray-600 hover:text-red-500"><Trash2 size={16}/></button><button onClick={() => toggleProductStatus(prod)} className={`w-3 h-3 rounded-full ${prod.is_available ? 'bg-green-500' : 'bg-red-500'}`}></button></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {activeTab === 'contract' && (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-[#111] border border-[#333] rounded-xl overflow-hidden">
                <div className="p-6 border-b border-[#333] flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Settings size={20} className="text-purple-500"/> Configurações do Contrato</h3>
                    {role === 'super_admin' && <button onClick={() => setIsEditing(!isEditing)} className="text-[#9b111e] text-sm hover:underline">{isEditing ? 'Cancelar' : 'Editar'}</button>}
                </div>
                <form onSubmit={handleUpdateClient} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-gray-500 uppercase font-bold">Nome</label><input type="text" disabled={!isEditing} className="w-full bg-[#0a0a0a] border border-[#333] rounded p-2 mt-1 text-white disabled:opacity-50" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/></div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Plano</label>
                            {isEditing ? (
                                <select className="w-full bg-[#0a0a0a] border border-[#333] rounded p-2 mt-1 text-white focus:border-[#9b111e]" value={editForm.plan} onChange={e => setEditForm({...editForm, plan: e.target.value})}>
                                    {getAvailablePlans(client.business_type).map(p => (<option key={p} value={p}>{p}</option>))}
                                </select>
                            ) : (
                                <input type="text" disabled className="w-full bg-[#0a0a0a] border border-[#333] rounded p-2 mt-1 text-white disabled:opacity-50" value={editForm.plan} />
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#333]">
                        <div><label className="text-xs text-gray-500 uppercase font-bold text-green-500">Valor (R$)</label><input type="text" disabled={!isEditing} className="w-full bg-[#0a0a0a] border border-[#333] rounded p-2 mt-1 text-white disabled:opacity-50" value={editForm.value} onChange={e => setEditForm({...editForm, value: e.target.value})}/></div>
                        <div><label className="text-xs text-gray-500 uppercase font-bold">Ciclo</label><select disabled={!isEditing} className="w-full bg-[#0a0a0a] border border-[#333] rounded p-2 mt-1 text-white disabled:opacity-50" value={editForm.cycle} onChange={e => setEditForm({...editForm, cycle: e.target.value})}><option value="mensal">Mensal</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option><option value="unico">Único</option></select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#333]">
                        <div><label className="text-xs text-gray-500 uppercase font-bold">Próximo Vencimento</label><input type="date" disabled={!isEditing} className="w-full bg-[#0a0a0a] border border-[#333] rounded p-2 mt-1 text-white disabled:opacity-50" value={editForm.valid_until} onChange={e => setEditForm({...editForm, valid_until: e.target.value})}/></div>
                        <div><label className="text-xs text-gray-500 uppercase font-bold">Forma de Pagamento</label><select disabled={!isEditing} className="w-full bg-[#0a0a0a] border border-[#333] rounded p-2 mt-1 text-white disabled:opacity-50 disabled:cursor-not-allowed appearance-none" value={editForm.payment_method} onChange={e => setEditForm({...editForm, payment_method: e.target.value})}><option value="pix">Pix</option><option value="cartao_credito">Cartão de Crédito</option><option value="boleto">Boleto</option><option value="dinheiro">Dinheiro</option></select></div>
                    </div>
                    {role === 'super_admin' && isEditing && <div className="flex justify-end pt-4"><button type="submit" className="bg-[#9b111e] text-white px-6 py-2 rounded font-bold flex items-center gap-2 hover:bg-[#7a0d17]"><Save size={18}/> Salvar</button></div>}
                </form>
                {role === 'super_admin' && <div className="p-6 bg-red-900/10 border-t border-red-900/30"><button onClick={handleDeleteClient} className="text-red-500 hover:text-white text-sm font-bold">Excluir Cliente Permanentemente</button></div>}
            </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><List className="text-[#9b111e]" /> Personalizar Categorias</h3>
            <div className="bg-[#111] border border-[#333] rounded-xl overflow-hidden">
                <div className="p-6 border-b border-[#333]">
                   <p className="text-gray-400 text-sm mb-4">Defina aqui as categorias que aparecerão no seu catálogo/cardápio.</p>
                   <form onSubmit={handleAddCategory} className="flex gap-2">
                      <input type="text" placeholder="Ex: Corte Infantil, Bebidas, Sobremesas..." className="flex-1 bg-black border border-[#333] rounded-lg px-4 py-2 text-white focus:border-[#9b111e] outline-none" value={newCategoryInput} onChange={e => setNewCategoryInput(e.target.value)} />
                      <button type="submit" className="bg-[#222] hover:bg-[#333] text-white px-4 py-2 rounded-lg font-bold border border-[#333] flex items-center gap-2"><Plus size={16}/> Adicionar</button>
                   </form>
                </div>
                <div className="p-6">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Categorias Atuais</h4>
                    <div className="flex flex-wrap gap-3">
                        {customCategories.map(cat => (
                            <div key={cat} className="group bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 flex items-center gap-2 hover:border-[#9b111e]/50 transition-colors">
                                <span className="font-medium">{cat}</span>
                                <button onClick={() => handleRemoveCategory(cat)} className="text-gray-600 hover:text-red-500 opacity-50 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 bg-[#151515] border-t border-[#333] flex justify-end">
                    <button onClick={handleSaveCategories} disabled={isSavingCategories} className="bg-[#9b111e] hover:bg-[#7a0d17] text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">{isSavingCategories ? 'Salvando...' : <><Save size={18}/> Salvar Alterações</>}</button>
                </div>
            </div>
        </div>
      )}

      {showAppointments && activeTab === 'appointments' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Calendar className="text-[#9b111e]" /> Agendamentos
                </h3>
                <button 
                    onClick={() => router.push(`/dashboard/appointments?orgId=${client.id}`)} 
                    className="bg-[#9b111e] hover:bg-[#7a0d17] text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-900/20"
                >
                    <ExternalLink size={18} /> Gerenciar Agenda Completa
                </button>
            </div>

            <div className="bg-[#111] border border-[#333] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[#333] flex flex-wrap gap-2 bg-[#151515]">
                    <span className="flex items-center text-gray-500 text-sm font-bold mr-2"><Filter size={14} className="mr-1"/> Filtros:</span>
                    {[
                        { id: 'today', label: 'Hoje' },
                        { id: 'week', label: 'Esta Semana' },
                        { id: 'month', label: 'Este Mês' },
                        { id: 'year', label: 'Este Ano' },
                        { id: 'all', label: 'Histórico Completo' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setApptFilter(f.id)}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${apptFilter === f.id ? 'bg-[#9b111e] text-white' : 'bg-[#222] text-gray-400 hover:text-white'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {loadingAppts ? (
                    <div className="p-10 text-center text-gray-500 italic">Carregando agendamentos...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#1a1a1a] text-gray-400 border-b border-[#333]">
                                <tr>
                                    <th className="p-4"><Clock size={14} className="inline mr-1"/> Data/Hora</th>
                                    <th className="p-4"><User size={14} className="inline mr-1"/> Cliente</th>
                                    <th className="p-4"><Scissors size={14} className="inline mr-1"/> Serviço</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#222]">
                                {appointmentsList.length > 0 ? appointmentsList.map(appt => (
                                    <tr key={appt.id} className="hover:bg-[#161616]">
                                        <td className="p-4 font-mono text-gray-300">
                                            {new Date(appt.appointment_date).toLocaleDateString('pt-BR')} <span className="text-gray-500">às</span> {new Date(appt.appointment_date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                                        </td>
                                        <td className="p-4 font-bold text-white">{appt.client_name}</td>
                                        <td className="p-4 text-gray-300">{appt.service_name}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase 
                                                ${appt.status === 'confirmed' ? 'bg-green-900/30 text-green-400' : 
                                                  appt.status === 'canceled' ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                                                {appt.status === 'confirmed' ? 'Confirmado' : appt.status === 'canceled' ? 'Cancelado' : 'Pendente'}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-500">
                                            Nenhum agendamento encontrado para este período.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
      )}

      {(isDelivery || isCommerce || isService) && activeTab === 'orders' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                {isServiceType ? <Scissors className="text-[#9b111e]"/> : <ShoppingCart className="text-[#9b111e]"/>}
                {isServiceType ? ' Serviços Realizados / Vendas' : ' Histórico de Vendas/Pedidos'}
            </h3>
            <div className="bg-[#111] border border-[#333] rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#1a1a1a] text-gray-400 border-b border-[#333]"><tr><th className="p-4">Data</th><th className="p-4">Cliente</th><th className="p-4">Valor</th><th className="p-4">Status</th></tr></thead>
                    <tbody className="divide-y divide-[#222]">
                        {clientOrders.length > 0 ? clientOrders.map(order => (
                            <tr key={order.id} className="hover:bg-[#161616]">
                                <td className="p-4 text-gray-400">{new Date(order.created_at).toLocaleDateString('pt-BR')}</td>
                                <td className="p-4 text-white">{order.customer_name}</td>
                                <td className="p-4 text-green-400">R$ {order.total_value}</td>
                                <td className="p-4">{order.status}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} className="p-4 text-center text-gray-500">Nenhuma venda registrada.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#111] border border-[#333] w-full max-w-sm rounded-xl">
            <div className="flex justify-between items-center p-5 border-b border-[#333]"><h3 className="font-bold">Novo {labels.item}</h3><button onClick={() => setIsProductModalOpen(false)}><X/></button></div>
            <form onSubmit={handleAddProduct} className="p-5 space-y-4">
              <input autoFocus placeholder={`Nome do ${labels.item}`} className="w-full bg-black border border-[#333] rounded p-2 text-white" value={prodName} onChange={e => setProdName(e.target.value)} required />
              
              <div className="flex gap-4">
                  <input type="number" placeholder="Preço (0.00)" className="w-full bg-black border border-[#333] rounded p-2 text-white" value={prodPrice} onChange={e => setProdPrice(e.target.value)} required />
                  <select className="w-full bg-black border border-[#333] rounded p-2 text-white" value={prodCategory} onChange={e => setProdCategory(e.target.value)}>
                      <option value="">Selecione a Categoria...</option>
                      {customCategories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                  </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#333]">
                <label className="text-xs font-bold text-gray-500 uppercase">Gerenciamento de Estoque</label>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="stockType" className="accent-[#9b111e]" checked={!prodHasStockLimit} onChange={() => setProdHasStockLimit(false)} />
                        <span className="text-sm text-gray-300">Sem Limite</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="stockType" className="accent-[#9b111e]" checked={prodHasStockLimit} onChange={() => setProdHasStockLimit(true)} />
                        <span className="text-sm text-gray-300">Definir Quantidade</span>
                    </label>
                </div>
                {prodHasStockLimit && (
                    <div className="animate-in fade-in slide-in-from-top-1">
                        <input type="number" placeholder="Quantidade em estoque (Ex: 50)" className="w-full bg-black border border-[#333] rounded p-2 text-white mt-1 focus:border-[#9b111e] outline-none" value={prodStockQuantity} onChange={e => setProdStockQuantity(e.target.value)} />
                    </div>
                )}
              </div>

              <button disabled={isSavingProd} className="w-full bg-[#9b111e] py-2 rounded font-bold text-white hover:bg-[#7a0d17] mt-2">Salvar</button>
            </form>
          </div>
        </div>
      )}

      {role === 'super_admin' && isLoginModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[#111] border border-[#333] w-full max-w-md rounded-xl shadow-2xl p-6">
                <div className="flex justify-between items-start mb-6">
                    <div><h3 className="text-xl font-bold text-white flex items-center gap-2"><Key className="text-purple-500"/> Credenciais de Acesso</h3><p className="text-gray-400 text-sm mt-1">Gere um login real para o cliente.</p></div>
                    <button onClick={() => setIsLoginModalOpen(false)}><X className="text-gray-500 hover:text-white"/></button>
                </div>
                {!generatedCreds ? (
                    <div className="space-y-4">
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Email de Login</label><input type="email" className="w-full bg-black border border-[#333] rounded-lg p-3 text-white mt-1 focus:border-purple-500 outline-none" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}/></div>
                        <button onClick={handleGenerateLogin} disabled={isCreatingUser} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">{isCreatingUser ? 'Criando...' : 'Gerar Senha e Criar Usuário'}</button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-lg text-center"><p className="text-green-400 font-bold mb-1">Usuário Criado!</p><p className="text-xs text-green-300/70">Copie e envie ao cliente.</p></div>
                        <div className="space-y-3">
                            <div><p className="text-xs text-gray-500 uppercase font-bold">Email</p><div className="bg-black p-3 rounded border border-[#333] font-mono text-white select-all">{generatedCreds.email}</div></div>
                            <div><p className="text-xs text-gray-500 uppercase font-bold">Senha</p><div className="bg-black p-3 rounded border border-[#333] font-mono text-yellow-400 text-lg select-all tracking-wider">{generatedCreds.pass}</div></div>
                        </div>
                        <button onClick={() => { setIsLoginModalOpen(false); setGeneratedCreds(null); }} className="w-full bg-[#222] hover:bg-[#333] text-white font-bold py-3 rounded-lg transition-colors border border-[#333]">Fechar</button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  )
}