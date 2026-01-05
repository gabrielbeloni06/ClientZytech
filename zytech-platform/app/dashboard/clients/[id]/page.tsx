'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { AVAILABLE_TEMPLATES_LIST } from '@/lib/bots/registry'
import { 
  ArrowLeft, Key, CreditCard,
  Briefcase, ShoppingCart, Calendar, Scissors, 
  List, Package, User, LayoutDashboard, Sparkles,
  Home, Building, Tag, X, Save, Settings, Plus, Bell,
  MessageCircle, MessageSquare
} from 'lucide-react'
import { OverviewTab, SettingsTab, CatalogTab, AppointmentsTab, OrdersTab, NotificationsTab, ChatTab } from './tabs'

const TEMPLATES_BY_PLAN: Record<string, string[]> = {
    'ZyStart': ['comercio_basico', 'comercio_agendamento', 'delivery_padrao', 'imobiliaria_basico'],
    'ZyControl': ['comercio_control', 'delivery_control'], 
    'ZyBotAI': ['scheduling_botai', 'delivery_botai'],
    'ZyCore': ['scheduling_core', 'delivery_core']
}

export default function ClientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params?.id
  
  const [role, setRole] = useState<string>('')
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview') 
  
  const [products, setProducts] = useState<any[]>([])
  const [clientOrders, setClientOrders] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  
  const [botConfig, setBotConfig] = useState({
    isActive: false, phoneId: '', accessToken: '', greeting: '', personality: '', 
    aiPersona: '', openingHours: '', template: '', planLevel: 'ZyStart', aiFaq: ''
  })
  const [isSavingBot, setIsSavingBot] = useState(false)
  const [isSyncingSchedule, setIsSyncingSchedule] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', plan: '', value: '', cycle: '', payment_method: '', valid_until: '' })

  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [prodName, setProdName] = useState(''); const [prodPrice, setProdPrice] = useState('')
  const [prodCategory, setProdCategory] = useState(''); const [prodHasStockLimit, setProdHasStockLimit] = useState(false)
  const [prodStockQuantity, setProdStockQuantity] = useState(''); const [prodAddress, setProdAddress] = useState('')
  const [prodNeighborhood, setProdNeighborhood] = useState(''); const [prodLink, setProdLink] = useState('')
  const [prodDetails, setProdDetails] = useState('')
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

  const [notes, setNotes] = useState(''); const [isSavingNotes, setIsSavingNotes] = useState(false)

  useEffect(() => { if (clientId) loadAllData() }, [clientId])
  useEffect(() => { 
    if (client) { 
        if (client.business_type === 'real_estate') {
             fetchRealEstateStats()
        } else {
             generateMockFinancialData()
        }
        
        if (client.business_type === 'delivery') { 
            const interval = setInterval(fetchClientOrders, 30000); 
            return () => clearInterval(interval) 
        }
        
        if (client.plan.includes('ZyBotAI') || client.plan.includes('ZyCore')) {
            fetchNotifications()
            const notifInterval = setInterval(fetchNotifications, 60000);
            return () => clearInterval(notifInterval)
        }
    } 
  }, [client, reportDate])
  
  useEffect(() => { if (activeTab === 'appointments' && client?.id) { fetchClientAppointments() } }, [activeTab, apptFilter, client?.id])

  function formatScheduleToString(schedules: any[]) {
    if (!schedules || schedules.length === 0) return ''
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']; let text = '';
    [...schedules].sort((a, b) => a.day_of_week - b.day_of_week).forEach(s => {
        if (s.is_active && s.slots && s.slots.length > 0) text += `${days[s.day_of_week]}: ${s.slots.sort()[0]} às ${s.slots[s.slots.length - 1]}. `
    })
    return text.trim()
  }

  async function syncScheduleFromDb() {
    setIsSyncingSchedule(true)
    try {
        const { data: schedules } = await supabase.from('base_schedules').select('*').eq('organization_id', client.id)
        const scheduleText = formatScheduleToString(schedules || [])
        if (scheduleText) setBotConfig(prev => ({ ...prev, openingHours: scheduleText }))
        else alert('Nenhuma agenda configurada encontrada.')
    } catch (error) { console.error(error) } finally { setIsSyncingSchedule(false) }
  }

  async function fetchClientOrders() {
      if (!clientId) return
      const { data: orderData } = await supabase.from('orders').select('*').eq('organization_id', clientId).order('created_at', { ascending: false }).limit(50)
      setClientOrders(orderData || [])
  }
  
  async function fetchNotifications() {
      setLoadingNotifications(true)
      const { data } = await supabase.from('notifications').select('*').eq('organization_id', client.id).eq('is_read', false).order('created_at', { ascending: false })
      setNotifications(data || [])
      setLoadingNotifications(false)
  }
  
  async function markAsRead(id: string) {
      setNotifications(notifications.filter(n => n.id !== id))
      await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }

  async function loadAllData() {
    if (!clientId) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single()
    const userRole = profile?.role || 'org_owner'; setRole(userRole)
    if (userRole !== 'super_admin' && profile?.organization_id !== clientId) { alert('Acesso negado.'); router.push('/dashboard'); return }
    const { data: clientData, error } = await supabase.from('organizations').select('*').eq('id', clientId).single()
    if (error || !clientData) { router.push(userRole === 'super_admin' ? '/dashboard/clients' : '/dashboard'); return }
    setClient(clientData); setNotes(clientData.notes || '')
    const { data: schedules } = await supabase.from('base_schedules').select('*').eq('organization_id', clientId)
    
    setBotConfig({
        isActive: clientData.bot_status || false, phoneId: clientData.whatsapp_phone_id || '', accessToken: clientData.whatsapp_access_token || '',
        greeting: clientData.bot_greeting_message || '', personality: clientData.bot_personality || '', aiPersona: clientData.ai_persona || '',
        openingHours: clientData.opening_hours || formatScheduleToString(schedules || []) || 'Segunda a Sexta, das 09:00 às 18:00',
        template: clientData.bot_template || '', planLevel: clientData.plan || 'ZyStart', aiFaq: clientData.ai_faq || ''
    })
    let initialCats = clientData.service_categories || []
    if (initialCats.length === 0) {
       const type = clientData.business_type
       if (type === 'service' || type === 'commerce') initialCats = ['Combos', 'Produtos', 'Outros']
       else if (type === 'real_estate') initialCats = ['Casa', 'Apartamento', 'Lote/Terreno', 'Comercial', 'Aluguel']
       else initialCats = ['Lanches', 'Bebidas', 'Combos', 'Sobremesas', 'Outros']
    }
    setCustomCategories(initialCats)
    if (userRole === 'super_admin') setLoginEmail(`admin@${clientData.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`)
    setEditForm({
        name: clientData.name, plan: clientData.plan, value: String(clientData.subscription_value || '0'), cycle: clientData.subscription_cycle,
        payment_method: clientData.payment_method || 'pix', valid_until: clientData.subscription_valid_until ? new Date(clientData.subscription_valid_until).toISOString().split('T')[0] : ''
    })
    const { data: prodData } = await supabase.from('products').select('*').eq('organization_id', clientId).order('created_at', { ascending: false })
    setProducts(prodData || [])
    if (['delivery', 'commerce', 'service'].includes(clientData.business_type)) await fetchClientOrders()
    setLoading(false)
  }

  async function handleCancelOrder(orderId: string) {
    if (!confirm('Cancelar este pedido?')) return;
    setClientOrders(clientOrders.map(o => o.id === orderId ? { ...o, status: 'canceled' } : o))
    await supabase.from('orders').update({ status: 'canceled' }).eq('id', orderId)
  }
  async function handleAdvanceStatus(order: any) {
    const nextStatus: any = { 'pending': 'preparing', 'preparing': 'delivery', 'delivery': 'finished', 'finished': 'finished' }
    const newStatus = nextStatus[order.status] || order.status
    setClientOrders(clientOrders.map(o => o.id === order.id ? { ...o, status: newStatus } : o))
    await supabase.from('orders').update({ status: newStatus }).eq('id', order.id)
  }
  
  async function handleSaveBotConfig() {
    setIsSavingBot(true)
    const { error } = await supabase.from('organizations').update({
        bot_status: botConfig.isActive, whatsapp_phone_id: botConfig.phoneId, whatsapp_access_token: botConfig.accessToken,
        bot_greeting_message: botConfig.greeting, bot_personality: botConfig.personality, ai_persona: botConfig.aiPersona,
        opening_hours: botConfig.openingHours, bot_template: botConfig.template, plan: botConfig.planLevel, ai_faq: botConfig.aiFaq
    }).eq('id', client.id)
    
    if (error) {
        alert('Erro ao salvar: ' + error.message)
    } else {
        alert('Salvo com sucesso!'); 
        setClient({...client, plan: botConfig.planLevel}); 
        setEditForm(prev => ({...prev, plan: botConfig.planLevel}))
    }
    setIsSavingBot(false)
  }
  
  const getFilteredTemplates = () => {
      const allowedIds = TEMPLATES_BY_PLAN[botConfig.planLevel] || []
      return AVAILABLE_TEMPLATES_LIST.filter(t => allowedIds.includes(t.id))
  }
  async function handleAddProduct(e: React.FormEvent) { 
    e.preventDefault(); setIsSavingProd(true); const priceFormatted = parseFloat(prodPrice.replace(',', '.')); 
    const insertData: any = { organization_id: client.id, name: prodName, price: isNaN(priceFormatted) ? 0 : priceFormatted, category: prodCategory || (client.business_type === 'real_estate' ? 'Imóvel' : labels.category), is_available: true, track_stock: prodHasStockLimit, stock_quantity: prodHasStockLimit ? parseInt(prodStockQuantity) : null, property_details: prodDetails };
    if (client.business_type === 'real_estate') { insertData.address = prodAddress; insertData.neighborhood = prodNeighborhood; insertData.property_link = prodLink; insertData.track_stock = false; insertData.stock_quantity = 1; }
    const { error } = await supabase.from('products').insert([insertData]); 
    if (!error) { setIsProductModalOpen(false); setProdName(''); setProdPrice(''); setProdCategory(''); setProdHasStockLimit(false); setProdStockQuantity(''); setProdAddress(''); setProdNeighborhood(''); setProdLink(''); setProdDetails(''); loadAllData() } else alert(error.message); 
    setIsSavingProd(false) 
  }
  async function toggleProductStatus(p: any) { setProducts(products.map(i => i.id === p.id ? {...i, is_available: !i.is_available} : i)); await supabase.from('products').update({ is_available: !p.is_available }).eq('id', p.id) }
  async function handleDeleteProduct(id: string) { if(confirm('Excluir?')) { setProducts(products.filter(p => p.id !== id)); await supabase.from('products').delete().eq('id', id) } }
  
  async function fetchRealFinancialStats() {
    setLoadingStats(true)
    const mock = Array(6).fill(0).map((_, i) => ({ label: 'Mês ' + (i+1), value: Math.random() * 5000, isCurrent: i===5 }))
    setMonthlyStats(mock); setLoadingStats(false)
  }

  async function fetchRealEstateStats() {
      setLoadingStats(true)
      const currentYear = reportDate.getFullYear()
      const currentMonth = reportDate.getMonth()
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)
      const startDate = new Date(currentYear, currentMonth - 5, 1, 0, 0, 0)
      const { data: appts, error } = await supabase.from('appointments').select('appointment_date').eq('organization_id', client.id).eq('status', 'confirmed').gte('appointment_date', startDate.toISOString()).lte('appointment_date', endDate.toISOString())
      if (error) { setLoadingStats(false); return }
      const statsMap = new Map()
      for (let i = 5; i >= 0; i--) {
          const d = new Date(currentYear, currentMonth - i, 1)
          const key = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
          const statsMapVal = { label: d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', ''), fullDate: d, value: 0, isCurrent: i === 0 }
          statsMap.set(key, statsMapVal)
      }
      appts?.forEach(a => {
          const date = new Date(a.appointment_date)
          const key = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
          if (statsMap.has(key)) {
              const current = statsMap.get(key)
              current.value += 1 
              statsMap.set(key, current)
          }
      })
      setMonthlyStats(Array.from(statsMap.values()))
      setLoadingStats(false)
  }

  function generateMockFinancialData() {  }
  function changeReportMonth(direction: 'prev' | 'next') { const newDate = new Date(reportDate); if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1); else newDate.setMonth(newDate.getMonth() + 1); setReportDate(newDate) }
  async function fetchClientAppointments() { 
    if (!client?.id) return; setLoadingAppts(true); 
    let query = supabase.from('appointments').select(`*, products (name, neighborhood, property_link)`).eq('organization_id', client.id).order('appointment_date', { ascending: false }); 
    const { data, error } = await query; 
    if (!error) setAppointmentsList(data || []); setLoadingAppts(false) 
  }

  function generatePassword() { return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2); }
  async function handleGenerateLogin() { setIsCreatingUser(true); const pass = generatePassword(); try { const response = await fetch('/api/admin/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: loginEmail, password: pass, organization_id: client.id, name: client.name }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setGeneratedCreds({ email: loginEmail, pass: pass }) } catch (err: any) { alert('Erro: ' + err.message) } finally { setIsCreatingUser(false) } }
  async function handleUpdateClient(e: React.FormEvent) { e.preventDefault(); if (role !== 'super_admin') return; const valFloat = parseFloat(String(editForm.value).replace(',', '.')); await supabase.from('organizations').update({ name: editForm.name, plan: editForm.plan, subscription_value: isNaN(valFloat) ? 0 : valFloat, subscription_cycle: editForm.cycle, payment_method: editForm.payment_method, subscription_valid_until: new Date(editForm.valid_until).toISOString() }).eq('id', client.id); setIsEditing(false); loadAllData(); alert('Dados atualizados!') }
  async function handleDeleteClient() { if (role !== 'super_admin') return; if (confirm(`Excluir ${client.name}?`)) { await supabase.from('organizations').delete().eq('id', client.id); router.push('/dashboard/clients') } }
  async function handleSaveNotes() { setIsSavingNotes(true); await supabase.from('organizations').update({ notes: notes }).eq('id', client.id); setIsSavingNotes(false) }
  async function handleSaveCategories() { setIsSavingCategories(true); const { error } = await supabase.from('organizations').update({ service_categories: customCategories }).eq('id', client.id); if (error) alert('Erro: ' + error.message); else alert('Categorias atualizadas!'); setIsSavingCategories(false) }
  function handleAddCategory(e: React.FormEvent) { e.preventDefault(); if (!newCategoryInput.trim() || customCategories.includes(newCategoryInput.trim())) return; setCustomCategories([...customCategories, newCategoryInput.trim()]); setNewCategoryInput('') }
  function handleRemoveCategory(cat: string) { if(confirm('Remover?')) setCustomCategories(customCategories.filter(c => c !== cat)) }

  const getBotCapabilities = () => {
    const plan = botConfig.planLevel || client?.plan || ''
    const type = client?.business_type
    const hasAI = plan.includes('ZyBotAI') || plan.includes('ZyCore') || (type === 'delivery' && plan.includes('ZyControl'))
    const customizable = plan.includes('ZyCore')
    let label = ''; let description = ''
    if (plan.includes('ZyStart')) { label = 'Bot Estático (Menu)'; description = 'Apenas menus numéricos. Sem compreensão de linguagem.' } 
    else if (!hasAI) { label = 'Bot Estruturado'; description = 'Fluxo de agendamento passo-a-passo sem IA generativa.' } 
    else if (customizable) { label = 'IA Personalizável 🧠'; description = 'Inteligência Artificial avançada com personalidade única.' } 
    else { label = 'IA Padrão 🤖'; description = 'Inteligência Artificial treinada para vendas.' }
    return { hasAI, customizable, label, description }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#020202] text-blue-500 animate-pulse font-mono">Carregando painel...</div>
  if (!client) return null

  const isDelivery = client?.business_type === 'delivery'; const isCommerce = client?.business_type === 'commerce'; const isService = client?.business_type === 'service'; 
  const isRealEstate = client?.business_type === 'real_estate'; 
  const isServiceType = isService || isCommerce; 
  const showAppointments = isServiceType || isRealEstate; 
  const labels = { item: isServiceType ? 'Serviço' : isRealEstate ? 'Imóvel' : 'Item', menu: isRealEstate ? 'Carteira de Imóveis' : 'Catálogo', add: isServiceType ? 'Adicionar Serviço' : isRealEstate ? 'Adicionar Imóvel' : 'Adicionar Item', category: isServiceType ? 'Serviços' : isRealEstate ? 'Tipos' : 'Geral' }
  const getBotCaps = getBotCapabilities()
  const showNotifications = client.plan.includes('ZyBotAI') || client.plan.includes('ZyCore')

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
                            {isRealEstate ? <Home size={12}/> : isServiceType ? <Scissors size={12}/> : <Tag size={12}/>} 
                            {client.business_type === 'real_estate' ? 'Imobiliária' : client.business_type}
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
                { id: 'chat', label: 'Bate-papo', icon: MessageSquare }, // ABA NOVA
                { id: 'contract', label: 'Configurações', icon: Settings },
                showNotifications && { id: 'notifications', label: 'Alertas', icon: Bell }, 
                { id: 'bot_catalog', label: isRealEstate ? 'Imóveis' : 'Catálogo Bot', icon: isRealEstate ? Home : Package },
                { id: 'categories', label: 'Categorias', icon: List },
                showAppointments && { id: 'appointments', label: 'Agendamentos', icon: Calendar },
                (isDelivery || isCommerce || isService) && { id: 'orders', label: isServiceType ? 'Serviços' : 'Pedidos', icon: ShoppingCart }
            ].filter(Boolean).map((tab: any) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/5'}`}>
                    <tab.icon size={16}/> {tab.label}
                </button>
            ))}
        </div>

        <div className="min-h-[400px]">
            {activeTab === 'overview' && <OverviewTab monthlyStats={monthlyStats} loadingStats={loadingStats} notes={notes} setNotes={setNotes} handleSaveNotes={handleSaveNotes} isSavingNotes={isSavingNotes} unit={isRealEstate ? '' : 'R$'} statLabel={isRealEstate ? 'Visitas Realizadas' : 'Performance'} />}
            {activeTab === 'chat' && <ChatTab client={client} />}
            {activeTab === 'contract' && <SettingsTab role={role} botConfig={botConfig} setBotConfig={setBotConfig} syncScheduleFromDb={syncScheduleFromDb} isSyncingSchedule={isSyncingSchedule} handleSaveBotConfig={handleSaveBotConfig} isSavingBot={isSavingBot} isEditing={isEditing} setIsEditing={setIsEditing} editForm={editForm} setEditForm={setEditForm} handleUpdateClient={handleUpdateClient} botCapabilities={getBotCaps} filteredTemplates={getFilteredTemplates()} client={client} />}
            {activeTab === 'notifications' && showNotifications && <NotificationsTab notifications={notifications} markAsRead={markAsRead} loadingNotifications={loadingNotifications} fetchNotifications={fetchNotifications} />}
            {activeTab === 'bot_catalog' && <CatalogTab client={client} isRealEstate={isRealEstate} isServiceType={isServiceType} products={products} setIsProductModalOpen={setIsProductModalOpen} labels={labels} toggleProductStatus={toggleProductStatus} handleDeleteProduct={handleDeleteProduct} />}
            {activeTab === 'categories' && <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4"><div className="bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-6"><h3 className="font-bold text-lg text-white mb-4">Categorias</h3><div className="flex flex-wrap gap-2 mb-6">{customCategories.map(cat => (<div key={cat} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2"><span className="text-sm font-medium text-gray-300">{cat}</span><button onClick={() => handleRemoveCategory(cat)}><X size={14}/></button></div>))}</div><form onSubmit={handleAddCategory} className="flex gap-2"><input type="text" placeholder="Nova categoria..." className="flex-1 bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-white outline-none" value={newCategoryInput} onChange={e => setNewCategoryInput(e.target.value)} /><button type="submit" className="bg-white/10 text-white px-5 rounded-xl font-bold"><Plus size={20}/></button></form><div className="mt-4 flex justify-end"><button onClick={handleSaveCategories} className="text-blue-400 font-bold">Salvar</button></div></div></div>}
            {showAppointments && activeTab === 'appointments' && <AppointmentsTab client={client} loadingAppts={loadingAppts} apptFilter={apptFilter} setApptFilter={setApptFilter} appointmentsList={appointmentsList} isRealEstate={isRealEstate} router={router} />}
            {(isDelivery || isCommerce || isService) && activeTab === 'orders' && <OrdersTab isServiceType={isServiceType} fetchClientOrders={fetchClientOrders} clientOrders={clientOrders} handleAdvanceStatus={handleAdvanceStatus} handleCancelOrder={handleCancelOrder} client={client} />}
        </div>
      </div>

      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                <div className="p-6 space-y-5">
                    <div className="flex justify-between items-center"><h3 className="text-lg font-bold text-white">{labels.add}</h3><button onClick={() => setIsProductModalOpen(false)} className="text-gray-500 hover:text-white"><X size={20}/></button></div>
                    <form onSubmit={handleAddProduct} className="space-y-4">
                        <input autoFocus placeholder={`Nome do ${labels.item}`} className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none" value={prodName} onChange={e => setProdName(e.target.value)} required />
                        {isRealEstate && (
                            <div className="space-y-4 animate-in slide-in-from-top-2">
                                <input placeholder="Endereço Completo" className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none" value={prodAddress} onChange={e => setProdAddress(e.target.value)} />
                                <div className="grid grid-cols-2 gap-3"><input placeholder="Bairro" className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none" value={prodNeighborhood} onChange={e => setProdNeighborhood(e.target.value)} /><input placeholder="Link do Imóvel (URL)" className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none" value={prodLink} onChange={e => setProdLink(e.target.value)} /></div>
                                <textarea placeholder="Detalhes (Ex: 120m², sol da manhã...)" className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none h-24 resize-none" value={prodDetails} onChange={e => setProdDetails(e.target.value)} />
                            </div>
                        )}
                        <div className="flex gap-3"><input type="number" placeholder="Valor" className="w-1/2 bg-[#050505] border border-white/10 rounded-xl p-3 text-white focus:border-green-500 outline-none" value={prodPrice} onChange={e => setProdPrice(e.target.value)} required /><select className="w-1/2 bg-[#050505] border border-white/10 rounded-xl p-3 text-white outline-none" value={prodCategory} onChange={e => setProdCategory(e.target.value)}><option value="">Tipo/Categoria</option>{customCategories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}</select></div>
                        {!isRealEstate && (<div className="pt-2"><label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Estoque</label><div className="flex gap-4 mb-2"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" className="accent-blue-500" checked={!prodHasStockLimit} onChange={() => setProdHasStockLimit(false)} /><span className="text-sm text-gray-300">Ilimitado</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" className="accent-blue-500" checked={prodHasStockLimit} onChange={() => setProdHasStockLimit(true)} /><span className="text-sm text-gray-300">Controlado</span></label></div>{prodHasStockLimit && <input type="number" placeholder="Qtd. Inicial" className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none" value={prodStockQuantity} onChange={e => setProdStockQuantity(e.target.value)} />}</div>)}
                        <button disabled={isSavingProd} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all mt-2">{isSavingProd ? 'Salvando...' : `Salvar ${labels.item}`}</button>
                    </form>
                </div>
            </div>
        </div>
      )}

      {role === 'super_admin' && isLoginModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                <div className="flex justify-between items-start mb-6"><div><h3 className="text-xl font-bold text-white flex items-center gap-2"><Key className="text-purple-500"/> Acesso do Cliente</h3><p className="text-gray-400 text-sm mt-1">Crie um login para o dono da empresa.</p></div><button onClick={() => setIsLoginModalOpen(false)}><X className="text-gray-500 hover:text-white"/></button></div>
                {!generatedCreds ? (<div className="space-y-4"><input type="email" className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}/><button onClick={handleGenerateLogin} disabled={isCreatingUser} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all disabled:opacity-50">{isCreatingUser ? 'Gerando...' : 'Gerar Senha Segura'}</button></div>) : (<div className="space-y-6"><div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl text-center"><p className="text-green-400 font-bold mb-1">Sucesso!</p><p className="text-xs text-gray-400">Copie os dados abaixo e envie ao cliente.</p></div><div className="space-y-3"><div className="bg-[#050505] p-3 rounded-xl border border-white/10 font-mono text-white text-sm break-all">{generatedCreds.email}</div><div className="bg-[#050505] p-3 rounded-xl border border-white/10 font-mono text-yellow-400 text-lg tracking-widest text-center">{generatedCreds.pass}</div></div><button onClick={() => { setIsLoginModalOpen(false); setGeneratedCreds(null); }} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors border border-white/10">Fechar</button></div>)}
            </div>
        </div>
      )}
    </div>
  )
}