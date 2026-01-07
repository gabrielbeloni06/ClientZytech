'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { 
  TrendingUp, Power, FileText, Bot, Sparkles, RefreshCcw, Briefcase, Save, 
  Home, Scissors, Package, Plus, MapPin, Clock, CheckCircle, XCircle, Truck, 
  ChefHat, Phone, Calendar, ExternalLink, MessageCircle, Filter, User, Link as LinkIcon,
  ShoppingCart, List, X, Settings, Brain, Trash2, ArrowRight, HelpCircle, Bell, UserPlus,
  MessageSquare, Search, Send, Loader2, QrCode, Smartphone, ArrowUpRight, Ban, Play, ShieldAlert,
  Zap, Eye, Key, Lock, CreditCard
} from 'lucide-react'


const Card = ({ children, className = "" }: any) => (
  <div className={`bg-[#0F0F11] border border-white/[0.08] rounded-xl overflow-hidden shadow-sm ${className}`}>
    {children}
  </div>
)

const Badge = ({ children, color = "gray" }: any) => {
    const colors: any = {
        green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        red: "bg-red-500/10 text-red-400 border-red-500/20",
        yellow: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        gray: "bg-zinc-800 text-zinc-400 border-zinc-700",
        purple: "bg-purple-500/10 text-purple-400 border-purple-500/20"
    }
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colors[color] || colors.gray}`}>{children}</span>
}


export const OverviewTab = ({ 
    monthlyStats, loadingStats, notes, setNotes, handleSaveNotes, isSavingNotes, 
    unit = "R$", statLabel = "Performance", kpiData 
}: any) => {
    
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 relative group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp size={48} /></div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Total ({statLabel})</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{unit} {kpiData?.total?.toLocaleString('pt-BR') || 0}</h3>
                    <div className="mt-2 text-xs text-zinc-500 flex items-center gap-1">Dados reais do banco</div>
                </Card>

                <Card className="p-6 relative group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><MessageSquare size={48} /></div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Interações (30 dias)</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{kpiData?.interactions || 0}</h3>
                    <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">Mensagens trocadas</div>
                </Card>

                <Card className="p-6 relative group border-purple-500/20 bg-purple-500/[0.02]">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Bot size={48} /></div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Status da IA</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                        {kpiData?.botActive ? 'Ativo' : 'Pausado'}
                        <span className={`w-3 h-3 rounded-full ${kpiData?.botActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                    </h3>
                    <div className="mt-2 text-xs text-zinc-400">Sistema {kpiData?.botActive ? 'Operacional' : 'Interrompido'}</div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6 flex flex-col justify-between min-h-[300px]">
                     <div className="flex justify-between items-center mb-6">
                        <div>
                            <h4 className="text-white font-bold text-lg">Evolução Mensal</h4>
                            <p className="text-zinc-500 text-xs">Histórico dos últimos 6 meses.</p>
                        </div>
                        <Badge color="blue">Dinâmico</Badge>
                     </div>
                     <div className="flex-1 w-full flex items-end gap-2 h-48 border-b border-white/5 pb-2">
                        {loadingStats ? <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-zinc-600"/></div> : 
                         monthlyStats.length === 0 || monthlyStats.every((s:any) => s.value === 0) ? 
                         <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 text-xs gap-2"><TrendingUp size={24} className="opacity-20"/><span>Sem dados suficientes para o gráfico.</span></div> :
                         monthlyStats.map((stat:any, idx:number) => {
                             const max = Math.max(...monthlyStats.map((s:any)=>s.value)) || 1;
                             const height = Math.max((stat.value / max) * 100, 5);
                             return (
                                 <div key={idx} className="flex-1 flex flex-col justify-end gap-2 group cursor-pointer">
                                     <div className="w-full bg-zinc-800 rounded-t-sm hover:bg-blue-600 transition-all relative" style={{height: `${height}%`}}>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-zinc-700 z-10 font-mono">
                                            {stat.value}
                                        </div>
                                     </div>
                                     <span className="text-[10px] text-zinc-600 text-center font-mono uppercase truncate">{stat.label}</span>
                                 </div>
                             )
                         })
                        }
                     </div>
                </Card>

                <Card className="flex flex-col">
                    <div className="p-4 border-b border-white/[0.08] flex justify-between items-center bg-zinc-900/50">
                        <span className="text-white font-bold text-sm flex items-center gap-2"><FileText size={14} className="text-zinc-500"/> Notas Internas</span>
                        <button onClick={handleSaveNotes} disabled={isSavingNotes} className="text-xs font-bold text-blue-400 hover:text-blue-300 disabled:opacity-50">
                            {isSavingNotes ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                    <textarea 
                        className="flex-1 bg-transparent p-4 text-sm text-zinc-300 resize-none outline-none placeholder:text-zinc-700 font-mono leading-relaxed" 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        placeholder="Escreva observações importantes sobre este cliente aqui..." 
                    />
                </Card>
            </div>
        </div>
    )
}


export const AppointmentsTab = ({appointmentsList, isRealEstate, loadingAppts}: any) => {
    return (
        <div className="bg-[#0F0F11] border border-white/10 rounded-xl overflow-hidden animate-in fade-in">
            {loadingAppts ? (
                <div className="p-12 flex flex-col items-center justify-center text-zinc-500 gap-3">
                    <Loader2 className="animate-spin text-blue-500" size={24}/>
                    <span className="text-xs">Carregando agendamentos...</span>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-900 text-zinc-500 uppercase text-xs font-bold border-b border-white/5">
                            <tr>
                                <th className="p-4 whitespace-nowrap"><Clock size={12} className="inline mr-1"/> Data/Hora</th>
                                <th className="p-4"><User size={12} className="inline mr-1"/> Cliente</th>
                                <th className="p-4">{isRealEstate ? <Home size={12} className="inline mr-1"/> : <Scissors size={12} className="inline mr-1"/>} {isRealEstate ? 'Imóvel' : 'Serviço'}</th>
                                {isRealEstate && <th className="p-4"><MapPin size={12} className="inline mr-1"/> Bairro</th>}
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {appointmentsList.length === 0 ? (
                                <tr>
                                    <td colSpan={isRealEstate ? 5 : 4} className="p-12 text-center text-zinc-600">
                                        <Calendar className="mx-auto mb-2 opacity-50" size={24}/>
                                        <p>Nenhum agendamento encontrado no banco de dados.</p>
                                    </td>
                                </tr>
                            ) : (
                                appointmentsList.map((a:any) => (
                                    <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4 text-zinc-300 font-mono text-xs">
                                            {new Date(a.appointment_date).toLocaleDateString('pt-BR')} 
                                            <span className="text-zinc-600 mx-2">|</span> 
                                            {new Date(a.appointment_date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                                        </td>
                                        <td className="p-4">
                                            <div className="text-white font-bold text-sm">{a.client_name || 'Visitante'}</div>
                                            <div className="text-[10px] text-zinc-500 font-mono">{a.customer_phone}</div>
                                        </td>
                                        <td className="p-4 text-zinc-400 text-sm">
                                            {isRealEstate 
                                                ? (a.products?.name || 'Imóvel não identificado') 
                                                : (a.service_name || a.products?.name || 'Serviço Padrão')
                                            }
                                            {isRealEstate && a.products?.property_link && (
                                                <a href={a.products.property_link} target="_blank" className="ml-2 text-blue-400 hover:underline text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">Link</a>
                                            )}
                                        </td>
                                        {isRealEstate && <td className="p-4 text-zinc-500 text-xs">{a.products?.neighborhood || '-'}</td>}
                                        <td className="p-4">
                                            <Badge color={a.status==='confirmed'?'green':a.status==='canceled'?'red':'yellow'}>
                                                {a.status === 'confirmed' ? 'Confirmado' : a.status === 'canceled' ? 'Cancelado' : 'Pendente'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}


export const ChatTab = ({ client }: any) => {
  const [contacts, setContacts] = useState<any[]>([])
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [activeCustomer, setActiveCustomer] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchContacts()
    const interval = setInterval(fetchContacts, 10000)
    return () => clearInterval(interval)
  }, [client.id])

  useEffect(() => {
    if (selectedPhone) {
      fetchMessages(selectedPhone)
      const interval = setInterval(() => fetchMessages(selectedPhone), 3000)
      return () => clearInterval(interval)
    }
  }, [selectedPhone])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function fetchContacts() {
    const { data: msgs } = await supabase.from('chat_messages').select('*').eq('organization_id', client.id).order('created_at', { ascending: false })
    const { data: customers } = await supabase.from('customers').select('phone, is_bot_paused, name').eq('organization_id', client.id)

    if (msgs) {
      const uniqueMap = new Map()
      msgs.forEach((msg: any) => {
        if (!uniqueMap.has(msg.phone)) {
            const customerInfo = customers?.find(c => c.phone === msg.phone)
            uniqueMap.set(msg.phone, {
                phone: msg.phone,
                lastMessage: msg.content,
                date: new Date(msg.created_at),
                name: customerInfo?.name || msg.sender_name || 'Desconhecido',
                isBotPaused: customerInfo?.is_bot_paused || false,
                role: msg.role
            })
        }
      })
      setContacts(Array.from(uniqueMap.values()))
    }
    setLoadingContacts(false)
  }

  async function fetchMessages(phone: string) {
    const { data } = await supabase.from('chat_messages').select('*').eq('organization_id', client.id).eq('phone', phone).order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function toggleBotStatus() {
    if (!selectedPhone) return
    const currentStatus = activeCustomer?.isBotPaused || false
    const newStatus = !currentStatus
    setActiveCustomer({...activeCustomer, isBotPaused: newStatus})
    const { error } = await supabase.from('customers').upsert({ organization_id: client.id, phone: selectedPhone, is_bot_paused: newStatus, name: activeCustomer?.name }, { onConflict: 'organization_id, phone' }).select()
    if (error) {
        alert("Erro ao atualizar status do bot.")
        setActiveCustomer({...activeCustomer, isBotPaused: currentStatus})
    } else {
        setContacts(prev => prev.map(c => c.phone === selectedPhone ? {...c, isBotPaused: newStatus} : c))
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!inputText.trim() || !selectedPhone) return
    setSending(true)
    const tempText = inputText
    setInputText('') 
    try {
      const res = await fetch('/api/chat/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orgId: client.id, phone: selectedPhone, text: tempText }) })
      if (!res.ok) throw new Error('Falha no envio')
      await fetchMessages(selectedPhone)
    } catch (error) {
      alert('Erro ao enviar mensagem')
      setInputText(tempText)
    } finally {
      setSending(false)
    }
  }

  const handleSelectContact = (contact: any) => {
      setSelectedPhone(contact.phone)
      setActiveCustomer(contact)
  }

  if (!client.zapi_instance_id && !client.whatsapp_phone_id) {
      return (
          <div className="h-[500px] flex flex-col items-center justify-center bg-[#0F0F11] border border-white/10 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-500"><Smartphone size={32}/></div>
              <h3 className="text-xl font-bold text-white mb-2">WhatsApp Desconectado</h3>
              <p className="text-zinc-400 max-w-md mb-6">Para acessar o chat em tempo real, configure a instância da Z-API na aba <strong>Configurações</strong>.</p>
          </div>
      )
  }

  return (
    <div className="flex h-[650px] bg-[#0F0F11] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in">
      <div className="w-[320px] border-r border-white/[0.08] flex flex-col bg-[#09090b]">
        <div className="p-4 border-b border-white/[0.08]">
          <h3 className="font-bold text-white mb-3 text-sm flex items-center gap-2"><MessageCircle size={16} className="text-blue-500"/> Conversas Recentes</h3>
          <div className="relative group">
            <Search className="absolute left-3 top-2.5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={14} />
            <input type="text" placeholder="Buscar conversa..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-zinc-600" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingContacts ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-zinc-600"/></div>
          ) : contacts.length === 0 ? (
            <div className="text-center p-8 text-zinc-600 text-xs">Nenhuma conversa iniciada.</div>
          ) : (
            contacts.map(contact => (
              <div key={contact.phone} onClick={() => handleSelectContact(contact)} className={`p-4 border-b border-white/[0.03] cursor-pointer hover:bg-white/[0.02] transition-all group ${selectedPhone === contact.phone ? 'bg-blue-500/[0.05] border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'}`}>
                <div className="flex justify-between mb-1">
                  <span className={`font-bold text-sm ${selectedPhone === contact.phone ? 'text-white' : 'text-zinc-300'}`}>{contact.name !== 'Cliente' ? contact.name : contact.phone}</span>
                  <span className="text-[10px] text-zinc-500">{contact.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="flex justify-between items-end">
                    <p className="text-xs text-zinc-500 truncate max-w-[180px] group-hover:text-zinc-400">{contact.role === 'user' ? '👤' : '🤖'} {contact.lastMessage}</p>
                    {contact.isBotPaused && <Badge color="yellow">Humano</Badge>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-[#0c0c0e] relative">
        {selectedPhone ? (
          <>
            <div className="p-4 bg-[#0F0F11]/90 backdrop-blur border-b border-white/[0.08] flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-zinc-300 font-bold border border-white/5">{activeCustomer?.name?.[0] || <User size={18}/>}</div>
                <div><h3 className="font-bold text-white text-sm">{activeCustomer?.name}</h3><p className="text-xs text-zinc-500 font-mono">{selectedPhone}</p></div>
              </div>
              <button onClick={toggleBotStatus} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeCustomer?.isBotPaused ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-600'}`}>
                {activeCustomer?.isBotPaused ? <Play size={14} fill="currentColor"/> : <Ban size={14}/>}{activeCustomer?.isBotPaused ? 'Reativar Bot' : 'Pausar Bot'}
              </button>
            </div>
            {activeCustomer?.isBotPaused && (<div className="bg-amber-500/5 border-b border-amber-500/10 p-2 text-center text-xs text-amber-500 font-medium flex justify-center items-center gap-2"><ShieldAlert size={14}/> Você pausou a IA para este cliente. Responda manualmente.</div>)}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-95">
              {messages.map((msg) => {
                const isUser = msg.role === 'user'
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm relative group ${isUser ? 'bg-[#1f1f22] text-zinc-100 rounded-tl-none border border-white/5' : 'bg-[#2563eb] text-white rounded-tr-none'}`}>
                      {!isUser && (<div className="text-[9px] font-bold mb-1 flex items-center gap-1 opacity-70"><Bot size={10}/> ZyBot AI</div>)}
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <span className={`text-[9px] block text-right mt-1 opacity-50 ${isUser ? 'text-zinc-500' : 'text-blue-200'}`}>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 bg-[#0F0F11] border-t border-white/[0.08] flex gap-3 items-center">
              <input type="text" placeholder="Digite sua mensagem..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500/50 outline-none transition-colors placeholder:text-zinc-600" value={inputText} onChange={(e) => setInputText(e.target.value)} />
              <button type="submit" disabled={sending || !inputText.trim()} className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(37,99,235,0.2)]">{sending ? <Loader2 className="animate-spin" size={20}/> : <Send size={20} />}</button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 opacity-80">
              <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800"><MessageSquare size={32} className="text-zinc-500"/></div>
              <p className="text-zinc-400 font-medium">Selecione um contato para visualizar</p>
          </div>
        )}
      </div>
    </div>
  )
}

export const SettingsTab = ({ 
    role, botConfig, setBotConfig, syncScheduleFromDb, isSyncingSchedule, handleSaveBotConfig, 
    isSavingBot, isEditing, setIsEditing, editForm, setEditForm, handleUpdateClient, 
    filteredTemplates, client, openLoginModal, openPasswordModal 
}: any) => {
  const router = useRouter(); 
  const [zapiForm, setZapiForm] = useState({ instanceId: client.zapi_instance_id || '', token: client.zapi_token || '', clientToken: client.zapi_client_token || '' });
  const [isSavingZapi, setIsSavingZapi] = useState(false);

  const handleSaveZapiKeys = async () => {
      if (role !== 'super_admin') return;
      setIsSavingZapi(true);
      const { error } = await supabase.from('organizations').update({ zapi_instance_id: zapiForm.instanceId, zapi_token: zapiForm.token, zapi_client_token: zapiForm.clientToken }).eq('id', client.id);
      if(error) alert("Erro: " + error.message); else alert("Chaves Z-API atualizadas!");
      setIsSavingZapi(false);
  }

  const handleOpenQrPage = () => {
    if (!botConfig.phoneId) { alert("Defina um Nome da Instância (ID) e salve antes de conectar."); return; }
    router.push(`/dashboard/clients/${client.id}/code?instance=${botConfig.phoneId}`);
  };

  return (
  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="xl:col-span-2 space-y-6">
          <Card className="p-0">
             <div className="p-6 border-b border-white/[0.08] bg-zinc-900/30">
                 <h3 className="font-bold text-lg text-white flex items-center gap-2"><Bot className="text-blue-500"/> Inteligência Artificial (ZyBot)</h3>
                 <p className="text-zinc-500 text-xs mt-1">Configure o comportamento e o conhecimento do seu assistente.</p>
             </div>
             <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status do Bot</label>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setBotConfig({...botConfig, isActive: !botConfig.isActive})} className={`relative w-12 h-6 rounded-full transition-all duration-300 ${botConfig.isActive ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${botConfig.isActive ? 'left-7' : 'left-1'}`}></div>
                            </button>
                            <span className={`text-sm font-medium ${botConfig.isActive ? 'text-emerald-400' : 'text-zinc-500'}`}>{botConfig.isActive ? 'Ativo' : 'Inativo'}</span>
                        </div>
                    </div>
                    {role === 'super_admin' && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Template de Nicho</label>
                            <select className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500/50" value={botConfig.template} onChange={e => setBotConfig({...botConfig, template: e.target.value})}>
                                <option value="">Selecione...</option>
                                {filteredTemplates.map((t:any) => (<option key={t.id} value={t.id}>{t.label}</option>))}
                                <option value="imobiliaria_basico">Imobiliária (Padrão)</option>
                            </select>
                        </div>
                    )}
                </div>
                <div className="border-t border-white/[0.05] my-2"></div>
                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1"><HelpCircle size={12}/> Perguntas Frequentes (FAQ)</label>
                        <textarea className="w-full bg-[#18181b] border border-white/10 rounded-lg p-3 text-zinc-300 text-sm focus:border-blue-500/50 font-mono min-h-[100px]" placeholder="Ex: Qual o horário? R: 08h às 18h." value={botConfig.aiFaq} onChange={e => setBotConfig({...botConfig, aiFaq: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1"><Clock size={12}/> Horários de Atendimento</label>
                            <button onClick={syncScheduleFromDb} disabled={isSyncingSchedule} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">{isSyncingSchedule ? <RefreshCcw size={10} className="animate-spin"/> : 'Sincronizar da Agenda'}</button>
                        </div>
                        <input type="text" className="w-full bg-[#18181b] border border-white/10 rounded-lg p-2.5 text-zinc-300 text-sm focus:border-blue-500/50" value={botConfig.openingHours} onChange={e => setBotConfig({...botConfig, openingHours: e.target.value})} />
                    </div>
                    {role === 'super_admin' && (
                        <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-green-500 uppercase flex items-center gap-1"><Smartphone size={12}/> ID da Instância</label>
                                <button type="button" onClick={handleOpenQrPage} disabled={!botConfig.phoneId} className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded hover:bg-green-500/20 flex items-center gap-1 disabled:opacity-50"><QrCode size={12}/> Abrir QR Code</button>
                            </div>
                            <input className="w-full bg-[#18181b] border border-white/10 rounded-lg p-2.5 text-zinc-300 text-sm font-mono" value={botConfig.phoneId} onChange={e => setBotConfig({...botConfig, phoneId: e.target.value})} placeholder="Ex: imobiliaria_client_01"/>
                        </div>
                    )}
                    {(botConfig.planLevel.includes('ZyCore') || role === 'super_admin') && (
                        <div className="space-y-2 pt-2">
                            <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1"><Brain size={12}/> Personalidade (Persona)</label>
                            <textarea className="w-full bg-purple-500/[0.03] border border-purple-500/20 rounded-lg p-3 text-zinc-300 text-sm focus:border-purple-500/50 font-mono" rows={2} placeholder="Comportamento da IA..." value={botConfig.aiPersona} onChange={e => setBotConfig({...botConfig, aiPersona: e.target.value})} />
                        </div>
                    )}
                </div>
                <div className="pt-4">
                    <button onClick={handleSaveBotConfig} disabled={isSavingBot} className="bg-white text-black hover:bg-zinc-200 px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50">{isSavingBot ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Salvar Configurações</button>
                </div>
             </div>
          </Card>
      </div>
      
      <div className="space-y-6">
          {role === 'super_admin' && (
              <>
                <Card className="border-red-500/20 bg-red-500/[0.02]">
                    <div className="p-4 border-b border-red-500/10 flex items-center gap-2"><ShieldAlert size={16} className="text-red-500"/><h3 className="font-bold text-sm text-white">Conexão Z-API (Admin)</h3></div>
                    <div className="p-4 space-y-4">
                        <div className="space-y-1"><label className="text-[10px] text-red-300 uppercase font-bold">Instance ID</label><input className="w-full bg-[#0F0F11] border border-red-500/20 rounded px-2 py-1.5 text-xs text-zinc-300 font-mono" value={zapiForm.instanceId} onChange={e => setZapiForm({...zapiForm, instanceId: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] text-red-300 uppercase font-bold">Instance Token</label><input type="password" className="w-full bg-[#0F0F11] border border-red-500/20 rounded px-2 py-1.5 text-xs text-zinc-300 font-mono" value={zapiForm.token} onChange={e => setZapiForm({...zapiForm, token: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] text-red-300 uppercase font-bold">Client Token</label><input type="password" className="w-full bg-[#0F0F11] border border-red-500/20 rounded px-2 py-1.5 text-xs text-zinc-300 font-mono" value={zapiForm.clientToken} onChange={e => setZapiForm({...zapiForm, clientToken: e.target.value})} /></div>
                        <button onClick={handleSaveZapiKeys} disabled={isSavingZapi} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 py-2 rounded text-xs font-bold transition-all">{isSavingZapi ? 'Salvando...' : 'Atualizar Credenciais'}</button>
                    </div>
                </Card>
                
                <Card className="border-purple-500/20 bg-purple-500/[0.02]">
                     <div className="p-4 border-b border-purple-500/10 flex items-center gap-2"><Key size={16} className="text-purple-500"/><h3 className="font-bold text-sm text-white">Acesso & Segurança</h3></div>
                     <div className="p-4 flex gap-2">
                        <button onClick={openLoginModal} className="flex-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"><UserPlus size={14}/> Gerar Acesso</button>
                        <button onClick={openPasswordModal} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"><Lock size={14}/> Redefinir Senha</button>
                     </div>
                </Card>
              </>
          )}

          <Card>
              <div className="p-4 border-b border-white/[0.08] flex justify-between items-center">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2"><Briefcase size={16} className="text-zinc-500"/> Contrato</h3>
                  {role === 'super_admin' && <button onClick={() => setIsEditing(!isEditing)} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase">{isEditing ? 'Cancelar' : 'Editar'}</button>}
              </div>
              <form onSubmit={handleUpdateClient} className="p-4 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Empresa</label>
                        <input disabled={!isEditing} className="w-full bg-[#18181b] border border-white/10 rounded px-3 py-2 text-sm text-white disabled:opacity-50" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Plano</label>
                            <select disabled={!isEditing} className="w-full bg-[#18181b] border border-white/10 rounded px-3 py-2 text-sm text-white disabled:opacity-50" value={editForm.plan} onChange={e => { setEditForm({...editForm, plan: e.target.value}); setBotConfig((prev:any) => ({...prev, planLevel: e.target.value})) }}>
                                <option value="ZyStart">ZyStart</option><option value="ZyControl">ZyControl</option><option value="ZyBotAI">ZyBotAI</option><option value="ZyCore">ZyCore</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                             <label className="text-[10px] font-bold text-zinc-500 uppercase">Valor (R$)</label>
                             <input disabled={!isEditing} className="w-full bg-[#18181b] border border-white/10 rounded px-3 py-2 text-sm text-emerald-400 font-mono disabled:opacity-50" value={editForm.value} onChange={e => setEditForm({...editForm, value: e.target.value})}/>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Ciclo</label>
                            <select disabled={!isEditing} className="w-full bg-[#18181b] border border-white/10 rounded px-3 py-2 text-sm text-white disabled:opacity-50" value={editForm.cycle} onChange={e => setEditForm({...editForm, cycle: e.target.value})}>
                                <option value="mensal">Mensal</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option>
                            </select>
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Vencimento</label>
                            <input type="date" disabled={!isEditing} className="w-full bg-[#18181b] border border-white/10 rounded px-3 py-2 text-sm text-white disabled:opacity-50" value={editForm.valid_until} onChange={e => setEditForm({...editForm, valid_until: e.target.value})}/>
                         </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Pagamento</label>
                        <select disabled={!isEditing} className="w-full bg-[#18181b] border border-white/10 rounded px-3 py-2 text-sm text-white disabled:opacity-50" value={editForm.payment_method} onChange={e => setEditForm({...editForm, payment_method: e.target.value})}>
                            <option value="pix">PIX</option><option value="boleto">Boleto</option><option value="cartao">Cartão</option>
                        </select>
                    </div>
                    {isEditing && <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-xs font-bold">Salvar Contrato</button>}
              </form>
          </Card>
      </div>
  </div>
  )
}

export const NotificationsTab = ({ notifications, markAsRead, loadingNotifications, fetchNotifications }: any) => ( <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in"> <div className="flex justify-between items-center mb-4"><h3 className="text-white font-bold text-lg">Notificações</h3><button onClick={fetchNotifications} className="text-zinc-500 hover:text-white"><RefreshCcw size={16}/></button></div> {loadingNotifications ? <div className="text-center text-zinc-600 py-10">Carregando...</div> : notifications.length === 0 ? <div className="text-center py-10 border border-dashed border-white/10 rounded-xl"><Bell className="mx-auto mb-2 text-zinc-700"/><p className="text-zinc-500 text-sm">Nenhuma notificação.</p></div> : notifications.map((n:any) => ( <div key={n.id} className="bg-[#0F0F11] border border-white/10 p-4 rounded-xl flex gap-4"> <div className="text-red-500 mt-1"><Bell size={16}/></div> <div className="flex-1"> <p className="text-sm text-zinc-200">{n.content}</p> <div className="flex gap-4 mt-2"><button onClick={()=>markAsRead(n.id)} className="text-xs text-blue-400 font-bold">Marcar como lido</button></div> </div> </div> )) } </div> )
export const CatalogTab = ({ client, isRealEstate, products, setIsProductModalOpen, labels, toggleProductStatus, handleDeleteProduct }: any) => ( <div className="space-y-6 animate-in fade-in"> <div className="flex justify-between items-center"> <h2 className="text-xl font-bold text-white">{isRealEstate ? 'Imóveis' : 'Catálogo'}</h2> <button onClick={() => setIsProductModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16}/> {labels.add}</button> </div> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {products.map((p:any) => ( <div key={p.id} className="bg-[#0F0F11] border border-white/10 p-4 rounded-xl group hover:border-blue-500/30 transition-all"> <div className="flex justify-between items-start mb-2"> <Badge color="gray">{p.category}</Badge> <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={()=>toggleProductStatus(p)} className="text-zinc-500 hover:text-emerald-500"><Power size={16}/></button><button onClick={()=>handleDeleteProduct(p.id)} className="text-zinc-500 hover:text-red-500"><Trash2 size={16}/></button></div> </div> <h4 className="font-bold text-white truncate">{p.name}</h4> <p className="text-emerald-400 font-mono text-sm mt-1">R$ {p.price}</p> </div> ))} </div> </div> )
export const OrdersTab = ({ clientOrders, handleAdvanceStatus, handleCancelOrder }: any) => ( <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in"> {clientOrders.map((o:any) => ( <div key={o.id} className="bg-[#0F0F11] border border-white/10 p-5 rounded-xl flex flex-col justify-between"> <div> <div className="flex justify-between items-start mb-3"><h4 className="font-bold text-white">{o.customer_name}</h4><Badge color="blue">{o.status}</Badge></div> <div className="space-y-1 mb-4">{Array.isArray(o.items_json) && o.items_json.map((i:any, idx:number)=>(<div key={idx} className="flex justify-between text-xs text-zinc-300"><span>{i.qty}x {i.name}</span><span>R$ {i.price}</span></div>))}</div> </div> <div className="pt-4 border-t border-white/5 flex gap-2"><button onClick={()=>handleAdvanceStatus(o)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold">Avançar</button></div> </div> ))} </div> )