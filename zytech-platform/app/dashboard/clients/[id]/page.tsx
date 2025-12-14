'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { AVAILABLE_TEMPLATES_LIST } from '@/lib/bots/registry'
import { 
  ArrowLeft, Settings, Save, Power, 
  Plus, Package, Trash2, Tag, X, Key, CreditCard,
  Briefcase, ShoppingCart, Calendar, Scissors, ExternalLink,
  List, CheckCircle, Box, Filter, Clock, User, ChevronLeft, ChevronRight, TrendingUp, MessageCircle, Lock, Brain, Bot, Zap, Clock3, FileText, RefreshCcw, LayoutDashboard, Sparkles,
  ChefHat, Truck, ArrowRight, XCircle, MapPin, Phone
} from 'lucide-react'

const TEMPLATES_BY_PLAN: Record<string, string[]> = {
    'ZyStart': ['comercio_basico', 'comercio_agendamento', 'delivery_padrao'],
    'ZyControl': ['comercio_control', 'delivery_control'], 
    'ZyBotAI': ['scheduling_botai', 'delivery_botai'],
    'ZyCore': ['scheduling_core', 'delivery_core']
}

export default function ClientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  
  const [role, setRole] = useState<string>('')
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview') 
  
  const [products, setProducts] = useState<any[]>([])
  const [clientOrders, setClientOrders] = useState<any[]>([])
  
  const [botConfig, setBotConfig] = useState({
    isActive: false,
    phoneId: '',
    accessToken: '',
    greeting: '',
    personality: '', 
    aiPersona: '',   
    openingHours: '', 
    template: '', 
    planLevel: 'ZyStart' 
  })
  const [isSavingBot, setIsSavingBot] = useState(false)
  const [isSyncingSchedule, setIsSyncingSchedule] = useState(false)

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
    if (client) {
        generateMockFinancialData()
        if (client.business_type === 'delivery') {
            const interval = setInterval(fetchClientOrders, 30000)
            return () => clearInterval(interval)
        }
    }
  }, [client, reportDate])

  useEffect(() => {
    if (activeTab === 'appointments' && client?.id) {
        fetchClientAppointments()
    }
  }, [activeTab, apptFilter, client?.id])

  function formatScheduleToString(schedules: any[]) {
    if (!schedules || schedules.length === 0) return ''
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    let text = ''
    const sorted = [...schedules].sort((a, b) => a.day_of_week - b.day_of_week)
    sorted.forEach(s => {
        if (s.is_active && s.slots && s.slots.length > 0) {
            const timeSlots = s.slots.sort()
            const start = timeSlots[0]
            const end = timeSlots[timeSlots.length - 1]
            text += `${days[s.day_of_week]}: ${start} às ${end}. `
        }
    })
    return text.trim()
  }

  async function syncScheduleFromDb() {
    setIsSyncingSchedule(true)
    try {
        const { data: schedules } = await supabase.from('base_schedules').select('*').eq('organization_id', client.id)
        const scheduleText = formatScheduleToString(schedules || [])
        if (scheduleText) {
            setBotConfig(prev => ({ ...prev, openingHours: scheduleText }))
        } else {
            alert('Nenhuma agenda configurada encontrada para este cliente.')
        }
    } catch (error) {
        console.error('Erro ao sincronizar agenda:', error)
    } finally {
        setIsSyncingSchedule(false)
    }
  }

  async function fetchClientOrders() {
      const { data: orderData } = await supabase.from('orders').select('*').eq('organization_id', params.id).order('created_at', { ascending: false }).limit(50)
      setClientOrders(orderData || [])
  }

  async function loadAllData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    
    const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single()
    const userRole = profile?.role || 'org_owner'
    setRole(userRole)

    if (userRole !== 'super_admin' && profile?.organization_id !== params.id) {
        alert('Acesso negado.')
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
    
    const { data: schedules } = await supabase.from('base_schedules').select('*').eq('organization_id', params.id)
    const generatedScheduleString = formatScheduleToString(schedules || [])
    
    setBotConfig({
        isActive: clientData.bot_status || false,
        phoneId: clientData.whatsapp_phone_id || '',
        accessToken: clientData.whatsapp_access_token || '',
        greeting: clientData.bot_greeting_message || '',
        personality: clientData.bot_personality || '',
        aiPersona: clientData.ai_persona || 'Você é a assistente virtual de agendamentos da empresa (ZyBotAI). Seja educada e eficiente.',
        openingHours: clientData.opening_hours || generatedScheduleString || 'Segunda a Sexta, das 09:00 às 18:00',
        template: clientData.bot_template || '',
        planLevel: clientData.plan || 'ZyStart'
    })

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
        await fetchClientOrders()
    }

    setLoading(false)
  }

  async function handleCancelOrder(orderId: string) {
    if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;
    setClientOrders(clientOrders.map(o => o.id === orderId ? { ...o, status: 'canceled' } : o))
    await supabase.from('orders').update({ status: 'canceled' }).eq('id', orderId)
  }

  async function handleAdvanceStatus(order: any) {
    const nextStatus: any = {
        'pending': 'preparing',
        'preparing': 'delivery',
        'delivery': 'finished',
        'finished': 'finished'
    }
    const newStatus = nextStatus[order.status] || order.status
    
    setClientOrders(clientOrders.map(o => o.id === order.id ? { ...o, status: newStatus } : o))
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

  async function handleSaveBotConfig() {
    setIsSavingBot(true)
    const { error } = await supabase.from('organizations').update({
        bot_status: botConfig.isActive,
        whatsapp_phone_id: botConfig.phoneId,
        whatsapp_access_token: botConfig.accessToken,
        bot_greeting_message: botConfig.greeting,
        bot_personality: botConfig.personality,
        ai_persona: botConfig.aiPersona,
        opening_hours: botConfig.openingHours,
        bot_template: botConfig.template,
        plan: botConfig.planLevel 
    }).eq('id', client.id)

    if (error) alert('Erro ao salvar bot: ' + error.message)
    else {
        alert('Configurações salvas!')
        setClient({...client, plan: botConfig.planLevel})
        setEditForm(prev => ({...prev, plan: botConfig.planLevel}))
    }
    setIsSavingBot(false)
  }

  const getBotCapabilities = () => {
    const plan = botConfig.planLevel || client?.plan || ''
    const type = client?.business_type
    const hasAI = plan.includes('ZyBotAI') || plan.includes('ZyCore') || (type === 'delivery' && plan.includes('ZyControl'))
    const customizable = plan.includes('ZyCore')
    
    let label = ''
    let description = ''

    if (plan.includes('ZyStart')) {
        label = 'Bot Estático (Menu)'
        description = 'Apenas menus numéricos. Sem compreensão de linguagem.'
    } else if (!hasAI) {
        label = 'Bot Estruturado'
        description = 'Fluxo de agendamento passo-a-passo sem IA generativa.'
    } else if (customizable) {
        label = 'IA Personalizável 🧠'
        description = 'Inteligência Artificial avançada com personalidade única.'
    } else {
        label = 'IA Padrão 🤖'
        description = 'Inteligência Artificial treinada para vendas.'
    }

    return { hasAI, customizable, label, description }
  }

  const getFilteredTemplates = () => {
      const allowedIds = TEMPLATES_BY_PLAN[botConfig.planLevel] || []
      return AVAILABLE_TEMPLATES_LIST.filter(t => allowedIds.includes(t.id))
  }

  const showDashboard = true 

  async function fetchRealFinancialStats() {
    setLoadingStats(true)
    const currentYear = reportDate.getFullYear()
    const currentMonth = reportDate.getMonth()
    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)
    const startDate = new Date(currentYear, currentMonth - 5, 1, 0, 0, 0)
    const { data: orders, error } = await supabase.from('orders').select('created_at, total_value').eq('organization_id', client.id).gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString())
    if (error) { setLoadingStats(false); return }
    const statsMap = new Map()
    for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1)
        const key = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        const statsMapVal = { label: d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', ''), fullDate: d, value: 0, isCurrent: i === 0 }
        statsMap.set(key, statsMapVal)
    }
    orders?.forEach(order => {
        const orderDate = new Date(order.created_at)
        const key = orderDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        if (statsMap.has(key)) { const current = statsMap.get(key); current.value += Number(order.total_value) || 0; statsMap.set(key, current) }
    })
    setMonthlyStats(Array.from(statsMap.values()))
    setLoadingStats(false)
  }
  function generateMockFinancialData() { fetchRealFinancialStats() }
  function changeReportMonth(direction: 'prev' | 'next') { const newDate = new Date(reportDate); if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1); else newDate.setMonth(newDate.getMonth() + 1); setReportDate(newDate) }
  
  async function fetchClientAppointments() { if (!client?.id) return; setLoadingAppts(true); let query = supabase.from('appointments').select('*').eq('organization_id', client.id).order('appointment_date', { ascending: false }); const now = new Date(); if (apptFilter === 'today') { const start = new Date(now.setHours(0,0,0,0)).toISOString(); const end = new Date(now.setHours(23,59,59,999)).toISOString(); query = query.gte('appointment_date', start).lte('appointment_date', end) } else if (apptFilter === 'week') { const firstDay = new Date(now.setDate(now.getDate() - now.getDay())).toISOString(); const lastDay = new Date(now.setDate(now.getDate() + 6)).toISOString(); query = query.gte('appointment_date', firstDay).lte('appointment_date', lastDay) } else if (apptFilter === 'month') { const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString(); const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(); query = query.gte('appointment_date', start).lte('appointment_date', end) } else if (apptFilter === 'year') { const start = new Date(now.getFullYear(), 0, 1).toISOString(); const end = new Date(now.getFullYear(), 11, 31).toISOString(); query = query.gte('appointment_date', start).lte('appointment_date', end) } if (apptFilter === 'all') query = query.limit(50); const { data, error } = await query; if (!error) setAppointmentsList(data || []); setLoadingAppts(false) }
  const getPlanColorClass = (planName: string) => { const name = planName.toLowerCase(); if (name.includes('start')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]'; if (name.includes('control')) return 'bg-gray-800/50 text-gray-300 border-gray-600/30'; if (name.includes('botai')) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]'; if (name.includes('zycore') || (name.includes('website') && name.includes('core'))) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]'; return 'bg-white/5 border-white/10 text-white' }
  const isDelivery = client?.business_type === 'delivery'; const isCommerce = client?.business_type === 'commerce'; const isService = client?.business_type === 'service'; const isServiceType = isService || isCommerce; const showAppointments = isServiceType;
  const labels = { item: isServiceType ? 'Serviço' : 'Item', menu: 'Catálogo', add: isServiceType ? 'Adicionar Serviço' : 'Adicionar Item', category: isServiceType ? 'Serviços' : 'Geral' }
  
  function generatePassword() { return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2); }
  async function handleGenerateLogin() { setIsCreatingUser(true); const pass = generatePassword(); try { const response = await fetch('/api/admin/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: loginEmail, password: pass, organization_id: client.id, name: client.name }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setGeneratedCreds({ email: loginEmail, pass: pass }) } catch (err: any) { alert('Erro: ' + err.message) } finally { setIsCreatingUser(false) } }
  async function handleUpdateClient(e: React.FormEvent) { e.preventDefault(); if (role !== 'super_admin') return; const valFloat = parseFloat(String(editForm.value).replace(',', '.')); const { error } = await supabase.from('organizations').update({ name: editForm.name, plan: editForm.plan, subscription_value: isNaN(valFloat) ? 0 : valFloat, subscription_cycle: editForm.cycle, payment_method: editForm.payment_method, subscription_valid_until: new Date(editForm.valid_until).toISOString() }).eq('id', client.id); if (error) alert('Erro ao salvar: ' + error.message); else { setIsEditing(false); loadAllData(); alert('Dados atualizados!') } }
  async function handleDeleteClient() { if (role !== 'super_admin') return; if (confirm(`Excluir ${client.name}?`)) { await supabase.from('organizations').delete().eq('id', client.id); router.push('/dashboard/clients') } }
  async function handleSaveNotes() { setIsSavingNotes(true); await supabase.from('organizations').update({ notes: notes }).eq('id', client.id); setIsSavingNotes(false) }
  async function handleSaveCategories() { setIsSavingCategories(true); const { error } = await supabase.from('organizations').update({ service_categories: customCategories }).eq('id', client.id); if (error) alert('Erro: ' + error.message); else alert('Categorias atualizadas!'); setIsSavingCategories(false) }
  function handleAddCategory(e: React.FormEvent) { e.preventDefault(); if (!newCategoryInput.trim() || customCategories.includes(newCategoryInput.trim())) return; setCustomCategories([...customCategories, newCategoryInput.trim()]); setNewCategoryInput('') }
  function handleRemoveCategory(cat: string) { if(confirm('Remover?')) setCustomCategories(customCategories.filter(c => c !== cat)) }
  async function handleAddProduct(e: React.FormEvent) { e.preventDefault(); setIsSavingProd(true); const priceFormatted = parseFloat(prodPrice.replace(',', '.')); const { error } = await supabase.from('products').insert([{ organization_id: client.id, name: prodName, price: isNaN(priceFormatted) ? 0 : priceFormatted, category: prodCategory || labels.category, is_available: true, track_stock: prodHasStockLimit, stock_quantity: prodHasStockLimit ? parseInt(prodStockQuantity) : null }]); if (!error) { setIsProductModalOpen(false); setProdName(''); setProdPrice(''); setProdCategory(''); setProdHasStockLimit(false); setProdStockQuantity(''); loadAllData() } else alert(error.message); setIsSavingProd(false) }
  async function toggleProductStatus(p: any) { setProducts(products.map(i => i.id === p.id ? {...i, is_available: !i.is_available} : i)); await supabase.from('products').update({ is_available: !p.is_available }).eq('id', p.id) }
  async function handleDeleteProduct(id: string) { if(confirm('Excluir?')) { setProducts(products.filter(p => p.id !== id)); await supabase.from('products').delete().eq('id', id) } }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#020202] text-blue-500 animate-pulse font-mono">Carregando painel...</div>
  if (!client) return null

  const maxChartValue = Math.max(...monthlyStats.map(s => s.value), 100)
  const botCapabilities = getBotCapabilities()
  const filteredTemplates = getFilteredTemplates()

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-blue-500/30">
      
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto p-6 md:p-10 relative z-10 space-y-8">
      
        <div className="flex flex-col gap-6">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-white w-fit transition-colors group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform"/> {role === 'super_admin' ? 'Voltar para Lista' : 'Voltar ao Início'}
            </button>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-white/5">
                <div>
                    <h1 className="text-4xl font-bold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    {client.name}
                    </h1>
                    <div className="flex items-center gap-3 mt-3 text-sm">
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] uppercase font-bold tracking-wider ${client.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{client.status === 'active' ? '● Ativo' : '● Suspenso'}</span>
                        <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-0.5 rounded-md border border-white/5 capitalize text-gray-300">
                            {isServiceType ? <Scissors size={12}/> : <Tag size={12}/>} {client.business_type === 'commerce' ? 'Comércio' : client.business_type}
                        </span>
                        <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border uppercase text-xs font-bold ${getPlanColorClass(client.plan)}`}>
                            <CreditCard size={12}/> {client.plan}
                        </span>
                    </div>
                </div>
                {role === 'super_admin' && (
                    <div className="flex gap-3">
                        <button onClick={() => setIsLoginModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                            <Key size={14} /> Gerar Acesso
                        </button>
                    </div>
                )}
            </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
                { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
                { id: 'contract', label: 'Configurações', icon: Settings },
                { id: 'bot_catalog', label: 'Catálogo Bot', icon: Package },
                { id: 'categories', label: 'Categorias', icon: List },
                showAppointments && { id: 'appointments', label: 'Agendamentos', icon: Calendar },
                (isDelivery || isCommerce || isService) && { id: 'orders', label: isServiceType ? 'Serviços' : 'Pedidos', icon: ShoppingCart }
            ].filter(Boolean).map((tab: any) => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)} 
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                        activeTab === tab.id 
                        ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' 
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/5'
                    }`}
                >
                    <tab.icon size={16}/> {tab.label}
                </button>
            ))}
        </div>

        {(isDelivery || isCommerce || isService) && activeTab === 'orders' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-end">
                    <div>
                        <h3 className="text-xl font-bold mb-1 flex items-center gap-2 text-white">
                            {isServiceType ? <Scissors className="text-purple-500"/> : <ShoppingCart className="text-blue-500"/>} 
                            {isServiceType ? ' Serviços Realizados' : ' Gestão de Pedidos'}
                        </h3>
                        <p className="text-gray-400 text-sm">Acompanhe o status e gerencie entregas.</p>
                    </div>
                    <button onClick={fetchClientOrders} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
                        <RefreshCcw size={16}/> Atualizar
                    </button>
                </div>

                {clientOrders.length === 0 ? (
                    <div className="col-span-full py-16 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                        <Package size={48} className="mx-auto text-gray-600 mb-4"/>
                        <p className="text-gray-500">Nenhum pedido registrado ainda.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {clientOrders.map((order) => {
                            const statusStyle = getStatusStyle(order.status)
                            const StatusIcon = statusStyle.icon

                            return (
                                <div key={order.id} className={`bg-[#0a0a0a]/60 backdrop-blur-md border rounded-2xl overflow-hidden transition-all duration-300 group hover:-translate-y-1 shadow-xl ${order.status === 'canceled' ? 'border-red-900/20 opacity-60 grayscale-[0.5]' : 'border-white/10 hover:border-blue-500/30'}`}>
                                    
                                    <div className="p-5 border-b border-white/5 flex justify-between items-start bg-white/[0.02]">
                                        <div>
                                            <h3 className="font-bold text-white text-lg truncate w-40 tracking-tight" title={order.customer_name}>
                                                {order.customer_name}
                                            </h3>
                                            <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1 font-mono">
                                                <Clock size={12} className="text-blue-500"/> 
                                                {new Date(order.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                            </p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border flex items-center gap-1.5 shadow-lg ${statusStyle.bg} ${statusStyle.color} ${statusStyle.border} ${statusStyle.shadow}`}>
                                            <StatusIcon size={12} /> {statusStyle.label}
                                        </span>
                                    </div>

                                    <div className="p-5 min-h-[100px] bg-gradient-to-b from-transparent to-black/20">
                                        <ul className="space-y-2 text-sm">
                                            {Array.isArray(order.items_json) && order.items_json.map((item: any, idx: number) => (
                                                <li key={idx} className="flex justify-between items-start text-gray-300">
                                                    <div className="flex gap-2">
                                                        <span className="bg-white/10 text-white font-bold font-mono px-1.5 rounded text-xs h-fit min-w-[24px] text-center border border-white/5">{item.qty || 1}x</span>
                                                        <span className="leading-snug text-xs text-gray-200">{item.name}</span>
                                                    </div>
                                                    <span className="text-gray-500 text-xs font-mono mt-0.5">R$ {Number(item.price).toFixed(2)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="p-5 border-t border-white/5 bg-[#050505] space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-start gap-3 text-xs text-gray-400">
                                                <div className="p-1.5 bg-blue-500/10 rounded-md shrink-0"><MapPin size={12} className="text-blue-400"/></div>
                                                <span className="line-clamp-2 leading-relaxed">{order.delivery_address || 'Retirada / Local'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                                <div className="p-1.5 bg-green-500/10 rounded-md shrink-0"><Phone size={12} className="text-green-400"/></div>
                                                <span className="font-mono tracking-wide">{order.customer_phone}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-between items-center pt-3 border-t border-white/5">
                                            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total</span>
                                            <span className="text-lg font-bold text-white tracking-tight text-green-400">
                                                R$ {Number(order.total_value).toFixed(2)}
                                            </span>
                                        </div>

                                        {client.business_type === 'delivery' && order.status !== 'canceled' && order.status !== 'finished' && (
                                            <div className="grid grid-cols-2 gap-3 pt-2">
                                                <button 
                                                    onClick={() => handleAdvanceStatus(order)}
                                                    className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 flex items-center justify-center gap-2 group/btn"
                                                >
                                                    Avançar <ArrowRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform"/>
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
                                            <div className="pt-2 text-center text-[10px] font-bold text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg py-2 uppercase tracking-wider">
                                                Pedido Cancelado
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'overview' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="lg:col-span-2 bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>
                        {loadingStats && <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center backdrop-blur-sm"><span className="text-sm font-bold text-blue-400 animate-pulse">Atualizando dados...</span></div>}
                        
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><TrendingUp size={14}/> Performance de Vendas</p>
                                <div className="flex items-end gap-3">
                                    <h2 className="text-4xl font-bold text-white tracking-tight">
                                        R$ {monthlyStats.length > 0 ? monthlyStats[monthlyStats.length-1].value.toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '0,00'}
                                    </h2>
                                    <span className="text-sm text-green-400 mb-1.5 font-mono bg-green-500/10 px-1.5 rounded border border-green-500/20">+12%</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-1">
                                <button onClick={() => changeReportMonth('prev')} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><ChevronLeft size={16}/></button>
                                <span className="text-sm font-bold text-gray-300 min-w-[100px] text-center capitalize">{reportDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</span>
                                <button onClick={() => changeReportMonth('next')} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><ChevronRight size={16}/></button>
                            </div>
                        </div>

                        <div className="h-64 w-full flex items-end justify-between gap-3 relative z-10">
                            {monthlyStats.length === 0 && !loadingStats && (<div className="absolute inset-0 flex items-center justify-center text-gray-600 italic">Sem dados</div>)}
                            {monthlyStats.map((item, idx) => {
                                const heightPct = (item.value / 100) * 100
                                return (
                                    <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group">
                                        <div className="relative w-full flex justify-center items-end flex-1">
                                            <div className={`w-full max-w-[50px] rounded-t-sm transition-all duration-500 relative group-hover:opacity-100 ${item.isCurrent ? 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] opacity-90' : 'bg-white/10 hover:bg-white/20 opacity-60'}`} style={{ height: `${(item.value / (Math.max(...monthlyStats.map(s => s.value), 100)) * 100) || 2}%` }}>
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#111] border border-white/10 text-white text-[10px] px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-mono z-20">
                                                    R$ {item.value.toLocaleString('pt-BR', {minimumFractionDigits: 0})}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 text-center w-full border-t border-white/5 pt-2">
                                            <span className={`text-[10px] font-bold block uppercase tracking-wider ${item.isCurrent ? 'text-blue-400' : 'text-gray-600'}`}>{item.label}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col justify-between h-[180px] shadow-lg group hover:border-green-500/30 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-500 text-xs font-bold uppercase mb-1">Status do Sistema</p>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">Operacional</h3>
                                </div>
                                <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20"><Power size={20} className="text-green-500"/></div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                <span className="text-sm text-green-400 font-mono">Conexão Estável</span>
                            </div>
                        </div>

                        <div className="bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col h-[calc(100%-204px)] shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-gray-500 text-xs font-bold uppercase flex items-center gap-2"><FileText size={14}/> Notas Internas</span>
                                <button onClick={handleSaveNotes} disabled={isSavingNotes} className="text-[10px] font-bold bg-blue-600/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-600/40 transition-colors">{isSavingNotes ? '...' : 'SALVAR'}</button>
                            </div>
                            <textarea 
                                className="flex-1 bg-black/40 border border-white/5 rounded-xl p-3 text-sm text-gray-300 outline-none resize-none focus:border-blue-500/50 focus:bg-black/60 transition-all placeholder:text-gray-700" 
                                value={notes} 
                                onChange={e => setNotes(e.target.value)} 
                                placeholder="Escreva observações sobre este cliente..."
                            />
                        </div>
                    </div>
             </div>
        )}

        {activeTab === 'contract' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2 text-white"><Bot className="text-purple-500" size={20}/> Bot Intelligence</h3>
                                <p className="text-xs text-gray-500 mt-1">Configuração da IA e conexão WhatsApp</p>
                            </div>
                            {role === 'super_admin' && (
                                <button onClick={() => setBotConfig({...botConfig, isActive: !botConfig.isActive})} className={`relative w-11 h-6 rounded-full transition-all duration-300 ${botConfig.isActive ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-gray-700'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${botConfig.isActive ? 'left-6' : 'left-1'}`}></div>
                                </button>
                            )}
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                {role === 'super_admin' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase">Plano</label>
                                                <select className="w-full bg-[#050505] border border-white/10 rounded-lg p-2.5 text-white text-sm focus:border-purple-500 outline-none" value={botConfig.planLevel} onChange={e => setBotConfig({...botConfig, planLevel: e.target.value})}>
                                                    <option value="ZyStart">ZyStart</option><option value="ZyControl">ZyControl</option><option value="ZyBotAI">ZyBotAI</option><option value="ZyCore">ZyCore</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase">Template</label>
                                                <select className="w-full bg-[#050505] border border-white/10 rounded-lg p-2.5 text-white text-sm focus:border-purple-500 outline-none" value={botConfig.template} onChange={e => setBotConfig({...botConfig, template: e.target.value})}>
                                                    {getFilteredTemplates().length > 0 ? getFilteredTemplates().map(t => (<option key={t.id} value={t.id}>{t.label}</option>)) : (<option value="">Sem template</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-yellow-500 uppercase flex items-center gap-1"><Sparkles size={10}/> Prompt Mestre (Admin)</label>
                                            <textarea className="w-full bg-[#050505] border border-yellow-500/20 rounded-lg p-3 text-gray-300 text-sm focus:border-yellow-500/50 font-mono" rows={3} value={botConfig.aiPersona} onChange={e => setBotConfig({...botConfig, aiPersona: e.target.value})} />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <label className="text-[10px] font-bold text-blue-400 uppercase">Contexto: Horários</label>
                                                <button onClick={syncScheduleFromDb} disabled={isSyncingSchedule} className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1">{isSyncingSchedule ? <RefreshCcw size={10} className="animate-spin"/> : 'Sincronizar'}</button>
                                            </div>
                                            <input type="text" className="w-full bg-[#050505] border border-blue-500/20 rounded-lg p-2.5 text-gray-300 text-sm focus:border-blue-500/50" value={botConfig.openingHours} onChange={e => setBotConfig({...botConfig, openingHours: e.target.value})} />
                                        </div>

                                        <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                                            <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Phone ID</label><input className="w-full bg-[#050505] border border-white/10 rounded-lg p-2 text-xs font-mono text-gray-400" value={botConfig.phoneId} onChange={e => setBotConfig({...botConfig, phoneId: e.target.value})} /></div>
                                            <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Token</label><input type="password" className="w-full bg-[#050505] border border-white/10 rounded-lg p-2 text-xs font-mono text-gray-400" value={botConfig.accessToken} onChange={e => setBotConfig({...botConfig, accessToken: e.target.value})} /></div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400 flex items-center gap-2"><CheckCircle size={16}/> Configuração gerenciada pela Zytech.</div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Saudação Inicial</label>
                                    <textarea className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-sm text-gray-300 focus:border-white/30" rows={2} value={botConfig.greeting} onChange={e => setBotConfig({...botConfig, greeting: e.target.value})} />
                                </div>

                                <button onClick={handleSaveBotConfig} disabled={isSavingBot} className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                                    {isSavingBot ? 'Salvando...' : <><Save size={16}/> Atualizar Inteligência</>}
                                </button>
                            </div>
                        </div>
                    </div>
             </div>
        )}

        {activeTab === 'bot_catalog' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                                {isServiceType ? <Scissors className="text-purple-500"/> : <Package className="text-blue-500"/>} 
                                Itens do Bot
                            </h2>
                            <p className="text-gray-400 text-sm mt-1">Gerencie os produtos/serviços que o bot oferece.</p>
                        </div>
                        <button onClick={() => setIsProductModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all">
                            <Plus size={18}/> Adicionar Novo
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.length === 0 && (
                            <div className="col-span-full py-16 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                                <Package size={48} className="mx-auto text-gray-600 mb-4"/>
                                <p className="text-gray-500">Nenhum item cadastrado.</p>
                            </div>
                        )}
                        {products.map((prod) => (
                            <div key={prod.id} className={`group bg-[#0a0a0a]/50 backdrop-blur-sm border rounded-2xl p-5 flex justify-between transition-all hover:border-blue-500/30 hover:bg-white/[0.03] ${prod.is_available ? 'border-white/10' : 'border-red-900/20 opacity-60'}`}>
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-bold uppercase bg-white/10 px-2 py-0.5 rounded text-gray-300 border border-white/5">{prod.category}</span>
                                        {prod.track_stock ? (
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${prod.stock_quantity > 0 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                {prod.stock_quantity} un.
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold uppercase bg-green-500/10 px-2 py-0.5 rounded text-green-400 border border-green-500/20 flex items-center gap-1"><Box size={10} /> ∞</span>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-white text-lg">{prod.name}</h4>
                                    <p className="text-green-400 font-mono mt-1">R$ {prod.price}</p>
                                </div>
                                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => toggleProductStatus(prod)} className={`p-2 rounded-lg transition-colors ${prod.is_available ? 'text-green-500 hover:bg-green-500/10' : 'text-gray-500 hover:bg-gray-500/10'}`} title={prod.is_available ? "Ativo" : "Inativo"}>
                                        <Power size={18}/>
                                    </button>
                                    <button onClick={() => handleDeleteProduct(prod.id)} className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
             </div>
        )}

        {activeTab === 'categories' && (
             <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                            <h3 className="font-bold text-lg text-white flex items-center gap-2"><List className="text-blue-500"/> Categorias do Cardápio</h3>
                            <p className="text-xs text-gray-500 mt-1">Organize como os itens aparecem para o cliente.</p>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-wrap gap-2 mb-6">
                                {customCategories.map(cat => (
                                    <div key={cat} className="group bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2 hover:border-blue-500/50 transition-colors">
                                        <span className="text-sm font-medium text-gray-300">{cat}</span>
                                        <button onClick={() => handleRemoveCategory(cat)} className="text-gray-600 hover:text-red-400"><X size={14}/></button>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={handleAddCategory} className="flex gap-2">
                                <input type="text" placeholder="Nova categoria..." className="flex-1 bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors" value={newCategoryInput} onChange={e => setNewCategoryInput(e.target.value)} />
                                <button type="submit" className="bg-white/10 hover:bg-white/20 text-white px-5 rounded-xl font-bold border border-white/10"><Plus size={20}/></button>
                            </form>
                        </div>
                        <div className="p-4 bg-white/[0.02] border-t border-white/5 flex justify-end">
                            <button onClick={handleSaveCategories} disabled={isSavingCategories} className="text-blue-400 text-sm font-bold hover:text-white transition-colors uppercase tracking-wider">{isSavingCategories ? 'Salvando...' : 'Salvar Alterações'}</button>
                        </div>
                    </div>
             </div>
        )}
        {showAppointments && activeTab === 'appointments' && (
             <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-white"><Calendar className="text-purple-500" /> Agendamentos</h3>
                        <button onClick={() => router.push(`/dashboard/appointments?orgId=${client.id}`)} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-900/20"><ExternalLink size={18} /> Gerenciar Agenda Completa</button>
                    </div>
                    {client.plan.includes('ZyStart') && (<div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg flex items-center gap-3 text-sm text-blue-300"><MessageCircle size={18} /><span>No plano ZyStart, os agendamentos são recebidos exclusivamente via WhatsApp e sincronizados aqui.</span></div>)}
                    <div className="bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-white/5 flex flex-wrap gap-2 bg-white/[0.02]">
                            <span className="flex items-center text-gray-500 text-sm font-bold mr-2"><Filter size={14} className="mr-1"/> Filtros:</span>
                            {[{ id: 'today', label: 'Hoje' }, { id: 'week', label: 'Esta Semana' }, { id: 'month', label: 'Este Mês' }, { id: 'year', label: 'Este Ano' }, { id: 'all', label: 'Histórico Completo' }].map(f => (
                                <button key={f.id} onClick={() => setApptFilter(f.id)} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${apptFilter === f.id ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>{f.label}</button>
                            ))}
                        </div>
                        {loadingAppts ? (
                            <div className="p-10 text-center text-gray-500 italic animate-pulse">Carregando agendamentos...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white/5 text-gray-400 border-b border-white/5 uppercase text-xs">
                                        <tr><th className="p-4"><Clock size={14} className="inline mr-1"/> Data/Hora</th><th className="p-4"><User size={14} className="inline mr-1"/> Cliente</th><th className="p-4"><Scissors size={14} className="inline mr-1"/> Serviço</th><th className="p-4">Status</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {appointmentsList.length > 0 ? appointmentsList.map(appt => (
                                            <tr key={appt.id} className="hover:bg-white/[0.03] transition-colors">
                                                <td className="p-4 font-mono text-gray-300">{new Date(appt.appointment_date).toLocaleDateString('pt-BR')} <span className="text-gray-500">às</span> {new Date(appt.appointment_date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</td>
                                                <td className="p-4 font-bold text-white">{appt.client_name}</td>
                                                <td className="p-4 text-gray-300">{appt.service_name}</td>
                                                <td className="p-4"><span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${appt.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : appt.status === 'canceled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>{appt.status === 'confirmed' ? 'Confirmado' : appt.status === 'canceled' ? 'Cancelado' : 'Pendente'}</span></td>
                                            </tr>
                                        )) : (<tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum agendamento encontrado para este período.</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
             </div>
        )}

      </div>

      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                <div className="p-6 space-y-5">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white">Adicionar Item</h3>
                        <button onClick={() => setIsProductModalOpen(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleAddProduct} className="space-y-4">
                        <input autoFocus placeholder="Nome do item" className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none" value={prodName} onChange={e => setProdName(e.target.value)} required />
                        <div className="flex gap-3">
                            <input type="number" placeholder="Preço" className="w-1/2 bg-[#050505] border border-white/10 rounded-xl p-3 text-white focus:border-green-500 outline-none" value={prodPrice} onChange={e => setProdPrice(e.target.value)} required />
                            <select className="w-1/2 bg-[#050505] border border-white/10 rounded-xl p-3 text-white outline-none" value={prodCategory} onChange={e => setProdCategory(e.target.value)}>
                                <option value="">Categoria</option>
                                {customCategories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                            </select>
                        </div>
                        <div className="pt-2">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Estoque</label>
                            <div className="flex gap-4 mb-2">
                                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" className="accent-blue-500" checked={!prodHasStockLimit} onChange={() => setProdHasStockLimit(false)} /><span className="text-sm text-gray-300">Ilimitado</span></label>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" className="accent-blue-500" checked={prodHasStockLimit} onChange={() => setProdHasStockLimit(true)} /><span className="text-sm text-gray-300">Controlado</span></label>
                            </div>
                            {prodHasStockLimit && <input type="number" placeholder="Qtd. Inicial" className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none" value={prodStockQuantity} onChange={e => setProdStockQuantity(e.target.value)} />}
                        </div>
                        <button disabled={isSavingProd} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all mt-2">
                            {isSavingProd ? 'Salvando...' : 'Adicionar ao Catálogo'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
      )}

      {role === 'super_admin' && isLoginModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                <div className="flex justify-between items-start mb-6">
                    <div><h3 className="text-xl font-bold text-white flex items-center gap-2"><Key className="text-purple-500"/> Acesso do Cliente</h3><p className="text-gray-400 text-sm mt-1">Crie um login para o dono da empresa.</p></div>
                    <button onClick={() => setIsLoginModalOpen(false)}><X className="text-gray-500 hover:text-white"/></button>
                </div>
                {!generatedCreds ? (
                    <div className="space-y-4">
                        <input type="email" className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}/>
                        <button onClick={handleGenerateLogin} disabled={isCreatingUser} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all disabled:opacity-50">{isCreatingUser ? 'Gerando...' : 'Gerar Senha Segura'}</button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl text-center"><p className="text-green-400 font-bold mb-1">Sucesso!</p><p className="text-xs text-gray-400">Copie os dados abaixo e envie ao cliente.</p></div>
                        <div className="space-y-3">
                            <div className="bg-[#050505] p-3 rounded-xl border border-white/10 font-mono text-white text-sm break-all">{generatedCreds.email}</div>
                            <div className="bg-[#050505] p-3 rounded-xl border border-white/10 font-mono text-yellow-400 text-lg tracking-widest text-center">{generatedCreds.pass}</div>
                        </div>
                        <button onClick={() => { setIsLoginModalOpen(false); setGeneratedCreds(null); }} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors border border-white/10">Fechar</button>
                    </div>
                )}
            </div>
        </div>
      )}

    </div>
  )
}