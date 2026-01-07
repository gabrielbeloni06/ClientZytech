'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { AVAILABLE_TEMPLATES_LIST } from '@/lib/bots/registry'
import { ArrowLeft, Key, Home, ShoppingCart, Calendar, List, Package, LayoutDashboard, Settings, Bell, MessageSquare, Plus, X, Lock } from 'lucide-react'
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
  const [appointmentsList, setAppointmentsList] = useState<any[]>([])
  const [monthlyStats, setMonthlyStats] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(false)
  
  const [botConfig, setBotConfig] = useState({ isActive: false, phoneId: '', accessToken: '', greeting: '', personality: '', aiPersona: '', openingHours: '', template: '', planLevel: 'ZyStart', aiFaq: '' })
  const [isSavingBot, setIsSavingBot] = useState(false)
  const [isSyncingSchedule, setIsSyncingSchedule] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', plan: '', value: '', cycle: '', payment_method: '', valid_until: '' })
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [prodName, setProdName] = useState(''); const [prodPrice, setProdPrice] = useState('')
  const [prodCategory, setProdCategory] = useState(''); const [prodAddress, setProdAddress] = useState('')
  const [prodNeighborhood, setProdNeighborhood] = useState(''); 
  const [isSavingProd, setIsSavingProd] = useState(false)
  const [notes, setNotes] = useState(''); const [isSavingNotes, setIsSavingNotes] = useState(false)

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [generatedCreds, setGeneratedCreds] = useState<{email:string, pass:string} | null>(null)
  const [isCreatingUser, setIsCreatingUser] = useState(false)

  useEffect(() => { if (clientId) loadAllData() }, [clientId])
  
  useEffect(() => { 
    if (client) {
         if (client.business_type === 'real_estate') fetchRealEstateStats(); else generateMockFinancialData();
         if (client.business_type === 'delivery') { setInterval(fetchClientOrders, 30000); fetchClientOrders() }
    } 
  }, [client])

  useEffect(() => { 
      if (activeTab === 'appointments' && client?.id) fetchClientAppointments() 
      if (activeTab === 'notifications') fetchNotifications()
  }, [activeTab, client?.id])

  async function loadAllData() {
    if (!clientId) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single()
    const userRole = profile?.role || 'org_owner'; setRole(userRole)
    const { data: clientData } = await supabase.from('organizations').select('*').eq('id', clientId).single()
    if (!clientData) { router.push('/dashboard'); return }
    setClient(clientData); setNotes(clientData.notes || '')
    const { data: schedules } = await supabase.from('base_schedules').select('*').eq('organization_id', clientId)
    setBotConfig({
        isActive: clientData.bot_status || false, phoneId: clientData.whatsapp_phone_id || '', accessToken: clientData.whatsapp_access_token || '',
        greeting: clientData.bot_greeting_message || '', personality: clientData.bot_personality || '', aiPersona: clientData.ai_persona || '',
        openingHours: clientData.opening_hours || '09:00 - 18:00', template: clientData.bot_template || '', planLevel: clientData.plan || 'ZyStart', aiFaq: clientData.ai_faq || ''
    })
    setEditForm({
        name: clientData.name, plan: clientData.plan, value: String(clientData.subscription_value || '0'), 
        cycle: clientData.subscription_cycle, payment_method: clientData.payment_method || 'pix', 
        valid_until: clientData.subscription_valid_until ? new Date(clientData.subscription_valid_until).toISOString().split('T')[0] : ''
    })
    if(userRole === 'super_admin') setLoginEmail(`admin@${clientData.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`)
    const { data: prodData } = await supabase.from('products').select('*').eq('organization_id', clientId).order('created_at', { ascending: false })
    setProducts(prodData || [])
    setLoading(false)
  }

  function generatePassword() { return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2); }
  
  async function handleGenerateLogin() { 
      setIsCreatingUser(true); const pass = generatePassword(); 
      try { 
          const response = await fetch('/api/admin/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: loginEmail, password: pass, organization_id: client.id, name: client.name }) }); 
          const data = await response.json(); 
          if (!response.ok) throw new Error(data.error); 
          setGeneratedCreds({ email: loginEmail, pass: pass }) 
      } catch (err: any) { alert('Erro: ' + err.message) } finally { setIsCreatingUser(false) } 
  }

  async function handleResetPassword() {
      if(!newPassword) return;
      setIsCreatingUser(true);
      try {
           const response = await fetch('/api/admin/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organization_id: client.id, new_password: newPassword }) });
           if(!response.ok) throw new Error('Falha ao redefinir');
           alert('Senha alterada com sucesso!'); setIsPasswordModalOpen(false); setNewPassword('');
      } catch (err: any) { alert('Erro: ' + err.message) } finally { setIsCreatingUser(false) }
  }

  async function syncScheduleFromDb() { setIsSyncingSchedule(false) }
  async function fetchClientOrders() { const { data } = await supabase.from('orders').select('*').eq('organization_id', clientId).order('created_at', { ascending: false }).limit(20); setClientOrders(data || []) }
  async function fetchNotifications() { setLoadingNotifications(true); const { data } = await supabase.from('notifications').select('*').eq('organization_id', client?.id).eq('is_read', false); setNotifications(data || []); setLoadingNotifications(false) }
  async function markAsRead(id: string) { setNotifications(notifications.filter(n => n.id !== id)); await supabase.from('notifications').update({ is_read: true }).eq('id', id) }
  
  async function handleSaveBotConfig() {
    setIsSavingBot(true)
    const { error } = await supabase.from('organizations').update({
        bot_status: botConfig.isActive, bot_template: botConfig.template, plan: botConfig.planLevel, ai_persona: botConfig.aiPersona, ai_faq: botConfig.aiFaq, opening_hours: botConfig.openingHours
    }).eq('id', client.id)
    if (!error) { setClient({...client, plan: botConfig.planLevel}); alert('Configurações salvas!') }
    setIsSavingBot(false)
  }

  async function handleUpdateClient(e: React.FormEvent) { 
      e.preventDefault(); 
      const valFloat = parseFloat(String(editForm.value).replace(',', '.'));
      await supabase.from('organizations').update({ name: editForm.name, plan: editForm.plan, subscription_value: isNaN(valFloat) ? 0 : valFloat, subscription_cycle: editForm.cycle, payment_method: editForm.payment_method, subscription_valid_until: new Date(editForm.valid_until).toISOString() }).eq('id', client.id);
      setIsEditing(false); alert('Contrato atualizado!') 
  }

  async function handleAddProduct(e: React.FormEvent) {
      e.preventDefault(); setIsSavingProd(true)
      const { error } = await supabase.from('products').insert([{ organization_id: client.id, name: prodName, price: parseFloat(prodPrice.replace(',', '.')), category: prodCategory || 'Geral', neighborhood: prodNeighborhood, address: prodAddress, is_available: true }])
      if(!error) { setIsProductModalOpen(false); setProdName(''); loadAllData() }
      setIsSavingProd(false)
  }
  async function toggleProductStatus(p: any) { setProducts(products.map(i => i.id === p.id ? {...i, is_available: !i.is_available} : i)); await supabase.from('products').update({ is_available: !p.is_available }).eq('id', p.id) }
  async function handleDeleteProduct(id: string) { if(confirm('Excluir?')) { setProducts(products.filter(p => p.id !== id)); await supabase.from('products').delete().eq('id', id) } }

  async function fetchRealEstateStats() { setLoadingStats(true); setMonthlyStats([{label: 'JAN', value: 12}, {label: 'FEV', value: 19}, {label: 'MAR', value: 15}, {label: 'ABR', value: 22}, {label: 'MAI', value: 28}, {label: 'JUN', value: 35}]); setLoadingStats(false) }
  function generateMockFinancialData() { fetchRealEstateStats() }
  async function handleSaveNotes() { setIsSavingNotes(true); await supabase.from('organizations').update({ notes: notes }).eq('id', client.id); setIsSavingNotes(false) }
  async function fetchClientAppointments() { const { data } = await supabase.from('appointments').select('*, products(name)').eq('organization_id', client.id); setAppointmentsList(data||[]) }

  if (loading) return <div className="h-screen w-full bg-[#09090b] flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
  if (!client) return null

  const isRealEstate = client.business_type === 'real_estate'
  const labels = { add: isRealEstate ? 'Novo Imóvel' : 'Novo Item' }
  const getFilteredTemplates = () => { const allowed = TEMPLATES_BY_PLAN[botConfig.planLevel] || []; return AVAILABLE_TEMPLATES_LIST.filter(t => allowed.includes(t.id)) }
  
  const tabs = [
      { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
      { id: 'chat', label: 'Atendimento', icon: MessageSquare },
      { id: 'contract', label: 'Configurações', icon: Settings },
      { id: 'bot_catalog', label: isRealEstate ? 'Imóveis' : 'Catálogo', icon: isRealEstate ? Home : Package },
      { id: 'appointments', label: 'Agenda', icon: Calendar },
      client.business_type === 'delivery' && { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
      { id: 'notifications', label: 'Alertas', icon: Bell }
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-blue-500/30">
        <div className="border-b border-white/[0.08] bg-[#0c0c0e]/80 backdrop-blur-xl sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4"><button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={18}/></button><div><h1 className="font-bold text-sm text-white flex items-center gap-2">{client.name}<span className={`w-2 h-2 rounded-full ${client.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span></h1><p className="text-[10px] text-zinc-500 uppercase tracking-wider">{client.business_type} • {client.plan}</p></div></div>
                <div className="flex items-center gap-1">{tabs.map((tab: any) => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}><tab.icon size={14}/> {tab.label}</button>))}</div>
                <div className="flex items-center gap-3">{role === 'super_admin' && <button className="p-2 text-zinc-400 hover:text-white"><Key size={16}/></button>}</div>
            </div>
        </div>

        <main className="max-w-7xl mx-auto p-6 md:p-8">
            {activeTab === 'overview' && <OverviewTab monthlyStats={monthlyStats} loadingStats={loadingStats} notes={notes} setNotes={setNotes} handleSaveNotes={handleSaveNotes} isSavingNotes={isSavingNotes} unit={isRealEstate ? '' : 'R$'} statLabel={isRealEstate ? 'Visitas' : 'Vendas'} />}
            {activeTab === 'chat' && <ChatTab client={client} />}
            {activeTab === 'contract' && <SettingsTab role={role} botConfig={botConfig} setBotConfig={setBotConfig} syncScheduleFromDb={syncScheduleFromDb} isSyncingSchedule={isSyncingSchedule} handleSaveBotConfig={handleSaveBotConfig} isSavingBot={isSavingBot} isEditing={isEditing} setIsEditing={setIsEditing} editForm={editForm} setEditForm={setEditForm} handleUpdateClient={handleUpdateClient} filteredTemplates={getFilteredTemplates()} client={client} openLoginModal={() => setIsLoginModalOpen(true)} openPasswordModal={() => setIsPasswordModalOpen(true)} />}
            {activeTab === 'notifications' && <NotificationsTab notifications={notifications} markAsRead={markAsRead} loadingNotifications={loadingNotifications} fetchNotifications={fetchNotifications} />}
            {activeTab === 'bot_catalog' && <CatalogTab client={client} isRealEstate={isRealEstate} products={products} setIsProductModalOpen={setIsProductModalOpen} labels={labels} toggleProductStatus={toggleProductStatus} handleDeleteProduct={handleDeleteProduct} />}
            {activeTab === 'appointments' && <AppointmentsTab appointmentsList={appointmentsList} isRealEstate={isRealEstate} />}
            {activeTab === 'orders' && <OrdersTab clientOrders={clientOrders} fetchClientOrders={fetchClientOrders} />}
        </main>

        {isProductModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-[#0F0F11] border border-white/10 w-full max-w-md rounded-xl p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-white">{labels.add}</h3><button onClick={()=>setIsProductModalOpen(false)}><X size={18}/></button></div>
                    <form onSubmit={handleAddProduct} className="space-y-4">
                        <input className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white text-sm outline-none" placeholder="Nome" value={prodName} onChange={e=>setProdName(e.target.value)} required/>
                        <input className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white text-sm outline-none" placeholder="Preço" value={prodPrice} onChange={e=>setProdPrice(e.target.value)} required/>
                        {isRealEstate && <input className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white text-sm outline-none" placeholder="Bairro" value={prodNeighborhood} onChange={e=>setProdNeighborhood(e.target.value)}/>}
                        <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-sm">{isSavingProd ? 'Salvando...' : 'Adicionar'}</button>
                    </form>
                </div>
            </div>
        )}

        {role === 'super_admin' && isLoginModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
               <div className="bg-[#0F0F11] border border-white/10 w-full max-w-sm rounded-xl p-6 shadow-2xl relative">
                   <div className="flex justify-between items-center mb-6"><div><h3 className="font-bold text-white flex items-center gap-2"><Key className="text-purple-500" size={16}/> Gerar Acesso</h3><p className="text-zinc-500 text-xs mt-1">Cria um usuário para este cliente.</p></div><button onClick={() => setIsLoginModalOpen(false)}><X className="text-zinc-500 hover:text-white"/></button></div>
                   {!generatedCreds ? (<div className="space-y-4"><input type="email" className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-purple-500 outline-none" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Email do cliente"/><button onClick={handleGenerateLogin} disabled={isCreatingUser} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-purple-900/20 disabled:opacity-50">{isCreatingUser ? 'Criando...' : 'Criar Usuário e Senha'}</button></div>) : (<div className="space-y-6"><div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg text-center"><p className="text-emerald-400 font-bold mb-1">Usuário Criado!</p><p className="text-[10px] text-zinc-400">Copie e envie ao cliente.</p></div><div className="space-y-3"><div className="bg-zinc-900 p-3 rounded-lg border border-white/10 font-mono text-zinc-300 text-xs break-all">{generatedCreds.email}</div><div className="bg-zinc-900 p-3 rounded-lg border border-white/10 font-mono text-yellow-400 text-lg tracking-widest text-center select-all">{generatedCreds.pass}</div></div><button onClick={() => { setIsLoginModalOpen(false); setGeneratedCreds(null); }} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-lg border border-white/10">Fechar</button></div>)}
               </div>
           </div>
        )}

        {role === 'super_admin' && isPasswordModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-[#0F0F11] border border-white/10 w-full max-w-sm rounded-xl p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-6"><div><h3 className="font-bold text-white flex items-center gap-2"><Lock className="text-zinc-400" size={16}/> Redefinir Senha</h3><p className="text-zinc-500 text-xs mt-1">Altera a senha do usuário principal.</p></div><button onClick={() => setIsPasswordModalOpen(false)}><X className="text-zinc-500 hover:text-white"/></button></div>
                    <div className="space-y-4">
                        <input type="password" className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-zinc-500 outline-none" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova senha"/>
                        <button onClick={handleResetPassword} disabled={!newPassword || isCreatingUser} className="w-full bg-white text-black hover:bg-zinc-200 font-bold py-3 rounded-lg disabled:opacity-50">{isCreatingUser ? 'Salvando...' : 'Atualizar Senha'}</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  )
}