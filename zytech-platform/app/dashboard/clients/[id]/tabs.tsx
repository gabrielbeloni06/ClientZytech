'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  TrendingUp, Power, FileText, Bot, Sparkles, RefreshCcw, Briefcase, Save, 
  Home, Scissors, Package, Plus, MapPin, Clock, CheckCircle, XCircle, Truck, 
  ChefHat, Phone, Calendar, ExternalLink, MessageCircle, Filter, User, Link as LinkIcon,
  ShoppingCart, List, X, Settings, Brain, Trash2, ArrowRight, HelpCircle, Bell, UserPlus,
  MessageSquare, Search, Send, Loader2, QrCode, Smartphone
} from 'lucide-react'

// --- CHART COMPONENT ---
export const NeonLineChart = ({ currentData, prevTotal }: { currentData: number[], prevTotal: number }) => {
  const height = 60
  const width = 200
  const maxVal = Math.max(...currentData, 1)
  const points = currentData.map((val, i) => {
    const x = (i / (currentData.length - 1)) * width
    const y = height - (val / maxVal) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="relative h-48 w-full bg-gradient-to-b from-blue-500/5 to-transparent rounded-xl border border-blue-500/10 p-4 overflow-hidden group">
      <div className="absolute inset-0 grid grid-rows-4 w-full h-full opacity-20 pointer-events-none">
         <div className="border-t border-blue-500/20 border-dashed"></div>
         <div className="border-t border-blue-500/20 border-dashed"></div>
         <div className="border-t border-blue-500/20 border-dashed"></div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <polyline points={points} fill="none" stroke="url(#line-gradient)" strokeWidth="2" filter="url(#neon-glow)" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
        <polygon points={`0,${height} ${points} ${width},${height}`} fill="url(#line-gradient)" opacity="0.1" />
      </svg>
    </div>
  )
}

// --- OVERVIEW TAB ---
export const OverviewTab = ({ monthlyStats, loadingStats, notes, setNotes, handleSaveNotes, isSavingNotes, unit = "R$", statLabel = "Performance" }: any) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-2 bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>
          <div className="flex justify-between items-center mb-8 relative z-10">
              <div>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><TrendingUp size={14}/> {statLabel}</p>
                  <h2 className="text-4xl font-bold text-white tracking-tight">
                      {unit} {monthlyStats.length > 0 ? monthlyStats[monthlyStats.length-1].value.toLocaleString('pt-BR', {minimumFractionDigits: unit === 'R$' ? 2 : 0}) : '0'}
                  </h2>
              </div>
          </div>
          <div className="h-64 w-full flex items-end justify-between gap-3 relative z-10">
              {monthlyStats.length === 0 && !loadingStats && (<div className="absolute inset-0 flex items-center justify-center text-gray-600 italic">Sem dados</div>)}
              <NeonLineChart currentData={monthlyStats.map((s:any) => s.value)} prevTotal={0} />
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
                  <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                  <span className="text-sm text-green-400 font-mono">Conexão Estável</span>
              </div>
          </div>
          <div className="bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col h-[calc(100%-204px)] shadow-lg">
              <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-500 text-xs font-bold uppercase flex items-center gap-2"><FileText size={14}/> Notas Internas</span>
                  <button onClick={handleSaveNotes} disabled={isSavingNotes} className="text-[10px] font-bold bg-blue-600/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-600/40 transition-colors">{isSavingNotes ? '...' : 'SALVAR'}</button>
              </div>
              <textarea className="flex-1 bg-black/40 border border-white/5 rounded-xl p-3 text-sm text-gray-300 outline-none resize-none focus:border-blue-500/50 focus:bg-black/60 transition-all placeholder:text-gray-700" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Escreva observações sobre este cliente..." />
          </div>
      </div>
  </div>
)

// --- CHAT TAB ---
export const ChatTab = ({ client }: any) => {
  const [contacts, setContacts] = useState<any[]>([])
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
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
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('organization_id', client.id)
      .order('created_at', { ascending: false })

    if (data) {
      const uniqueMap = new Map()
      data.forEach((msg: any) => {
        if (!uniqueMap.has(msg.phone)) {
          uniqueMap.set(msg.phone, {
            phone: msg.phone,
            lastMessage: msg.content,
            date: new Date(msg.created_at),
            name: msg.sender_name || 'Desconhecido'
          })
        }
      })
      setContacts(Array.from(uniqueMap.values()))
    }
    setLoadingContacts(false)
  }

  async function fetchMessages(phone: string) {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('organization_id', client.id)
      .eq('phone', phone)
      .order('created_at', { ascending: true })
    
    if (data) setMessages(data)
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!inputText.trim() || !selectedPhone) return

    setSending(true)
    const tempText = inputText
    setInputText('') 

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: client.id,
          phone: selectedPhone,
          text: tempText
        })
      })
      
      if (!res.ok) throw new Error('Falha no envio')
      await fetchMessages(selectedPhone)
      
    } catch (error) {
      alert('Erro ao enviar mensagem')
      setInputText(tempText)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-[600px] bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4">
      <div className="w-1/3 border-r border-white/10 flex flex-col bg-[#050505]">
        <div className="p-4 border-b border-white/10 bg-[#0a0a0a]">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <MessageSquare size={18} className="text-blue-500"/> Conversas
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
            <input type="text" placeholder="Buscar número..." className="w-full bg-[#111] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingContacts ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500"/></div>
          ) : contacts.length === 0 ? (
            <div className="text-center p-8 text-gray-500 text-sm">Nenhuma conversa iniciada.</div>
          ) : (
            contacts.map(contact => (
              <div key={contact.phone} onClick={() => setSelectedPhone(contact.phone)} className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${selectedPhone === contact.phone ? 'bg-blue-900/20 border-l-2 border-l-blue-500' : ''}`}>
                <div className="flex justify-between mb-1">
                  <span className="font-bold text-gray-200 text-sm">{contact.name !== 'Cliente' ? contact.name : contact.phone}</span>
                  <span className="text-[10px] text-gray-500">{contact.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p className="text-xs text-gray-400 truncate max-w-[200px]">{contact.lastMessage}</p>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-opacity-5">
        {selectedPhone ? (
          <>
            <div className="p-4 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center"><User size={20} className="text-white"/></div>
                <div><h3 className="font-bold text-white">{selectedPhone}</h3><span className="text-xs text-green-400 flex items-center gap-1">● Online via WhatsApp</span></div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((msg) => {
                const isUser = msg.role === 'user'
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] rounded-2xl p-3 text-sm shadow-md relative ${isUser ? 'bg-[#202c33] text-white rounded-tl-none' : 'bg-[#005c4b] text-white rounded-tr-none'}`}>
                      {!isUser && <div className="text-[10px] text-green-200 font-bold mb-1 flex items-center gap-1">{msg.sender_name === 'Atendente Humano' ? <User size={10}/> : <Bot size={10}/>} {msg.sender_name === 'Atendente Humano' ? 'Você' : 'Bot AI'}</div>}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <span className="text-[10px] text-gray-400 block text-right mt-1 opacity-70">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 bg-[#0a0a0a] border-t border-white/10 flex gap-2">
              <input type="text" placeholder="Digite sua mensagem..." className="flex-1 bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors" value={inputText} onChange={(e) => setInputText(e.target.value)} />
              <button type="submit" disabled={sending || !inputText.trim()} className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">{sending ? <Loader2 className="animate-spin"/> : <Send size={20} />}</button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 opacity-50"><Phone size={64} className="mb-4 text-gray-700"/><p>Selecione um contato para iniciar o atendimento</p></div>
        )}
      </div>
    </div>
  )
}

// --- SETTINGS TAB (COM LÓGICA QR CODE ORIGINAL) ---
export const SettingsTab = ({ role, botConfig, setBotConfig, syncScheduleFromDb, isSyncingSchedule, handleSaveBotConfig, isSavingBot, isEditing, setIsEditing, editForm, setEditForm, handleUpdateClient, botCapabilities, filteredTemplates }: any) => {
  // Estados do QR Code
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<'idle' | 'loading' | 'qrcode' | 'connected' | 'error'>('idle');
  const [qrError, setQrError] = useState<string | null>(null);
  const retryTimer = useRef<NodeJS.Timeout | null>(null);

  // Limpa o timer ao desmontar
  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [])

  // Função para requisitar QR Code (Lógica Original Restaurada)
  const handleRequestQr = async () => {
    if (!botConfig.phoneId) {
        alert("Defina um Nome da Instância (ID) e salve antes de conectar.");
        return;
    }

    setQrStatus('loading');
    setQrCode(null);
    setQrError(null);

    try {
        const res = await fetch('/api/bot/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instanceName: botConfig.phoneId })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Erro ao gerar QR');
        }

        if (data.status === 'connected') {
             setQrStatus('connected');
             return;
        }

        if (data.qrcode) {
            setQrCode(data.qrcode);
            setQrStatus('qrcode');

            // Auto-refresh a cada 25s pois o QR do WhatsApp expira
            if (retryTimer.current) clearTimeout(retryTimer.current);
            retryTimer.current = setTimeout(() => {
                handleRequestQr();
            }, 25000);
        } else {
             throw new Error('QR não retornado pela API');
        }

    } catch (err: any) {
        setQrError(err.message);
        setQrStatus('error');
    }
  };

  return (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div><h3 className="font-bold text-lg flex items-center gap-2 text-white"><Bot className="text-purple-500" size={20}/> Bot Intelligence</h3><p className="text-xs text-gray-500 mt-1">Configuração da IA e conexão WhatsApp</p></div>
              {role === 'super_admin' && (<button onClick={() => setBotConfig({...botConfig, isActive: !botConfig.isActive})} className={`relative w-11 h-6 rounded-full transition-all duration-300 ${botConfig.isActive ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-gray-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${botConfig.isActive ? 'left-6' : 'left-1'}`}></div></button>)}
          </div>
          <div className="p-6 space-y-6">
              <div className="space-y-4">
                  {role === 'super_admin' ? (
                      <>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Plano</label><select className="w-full bg-[#050505] border border-white/10 rounded-lg p-2.5 text-white text-sm focus:border-purple-500 outline-none" value={botConfig.planLevel} onChange={e => setBotConfig({...botConfig, planLevel: e.target.value})}><option value="ZyStart">ZyStart</option><option value="ZyControl">ZyControl</option><option value="ZyBotAI">ZyBotAI</option><option value="ZyCore">ZyCore</option></select></div>
                              <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Template</label><select className="w-full bg-[#050505] border border-white/10 rounded-lg p-2.5 text-white text-sm focus:border-purple-500 outline-none" value={botConfig.template} onChange={e => setBotConfig({...botConfig, template: e.target.value})}>{filteredTemplates.length > 0 ? filteredTemplates.map((t:any) => (<option key={t.id} value={t.id}>{t.label}</option>)) : (<option value="">Sem template</option>)}</select></div>
                          </div>
                          <div className="space-y-1"><label className="text-[10px] font-bold text-yellow-500 uppercase flex items-center gap-1"><Sparkles size={10}/> Prompt Mestre (Admin)</label><textarea className="w-full bg-[#050505] border border-yellow-500/20 rounded-lg p-3 text-gray-300 text-sm focus:border-yellow-500/50 font-mono" rows={3} value={botConfig.aiPersona} onChange={e => setBotConfig({...botConfig, aiPersona: e.target.value})} /></div>
                          <div className="space-y-1"><div className="flex justify-between"><label className="text-[10px] font-bold text-blue-400 uppercase">Contexto: Horários</label><button onClick={syncScheduleFromDb} disabled={isSyncingSchedule} className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1">{isSyncingSchedule ? <RefreshCcw size={10} className="animate-spin"/> : 'Sincronizar'}</button></div><input type="text" className="w-full bg-[#050505] border border-blue-500/20 rounded-lg p-2.5 text-gray-300 text-sm focus:border-blue-500/50" value={botConfig.openingHours} onChange={e => setBotConfig({...botConfig, openingHours: e.target.value})} /></div>
                          
                          {/* AREA DE CONEXÃO WHATSAPP (EVOLUTION) */}
                          <div className="pt-4 border-t border-white/5 space-y-4 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                              <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-green-500 uppercase flex items-center gap-1"><Smartphone size={12}/> Nome da Instância (ID)</label>
                                  <input placeholder="Ex: imobiliaria_clientzy_01" className="w-full bg-[#050505] border border-white/10 rounded-lg p-2 text-xs font-mono text-gray-400 focus:border-green-500 outline-none" value={botConfig.phoneId} onChange={e => setBotConfig({...botConfig, phoneId: e.target.value})} />
                                  <p className="text-[9px] text-gray-500">Este ID cria a conexão na VPS.</p>
                              </div>
                              
                              {/* PAINEL DE QR CODE */}
                              <div className="pt-2 flex flex-col items-center">
                                  {qrStatus === 'connected' ? (
                                      <div className="w-full p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-center text-green-400 font-bold text-sm flex items-center justify-center gap-2 animate-in zoom-in">
                                          <CheckCircle size={18}/> WhatsApp Conectado e Operante!
                                      </div>
                                  ) : qrStatus === 'loading' ? (
                                      <div className="w-full py-6 text-center text-gray-400 animate-pulse flex flex-col items-center">
                                          <Loader2 size={24} className="animate-spin mb-2 text-green-500"/>
                                          <span className="text-xs">Gerando QR Code... Aguarde o servidor.</span>
                                      </div>
                                  ) : qrStatus === 'qrcode' && qrCode ? (
                                      <div className="text-center space-y-3 animate-in zoom-in duration-300">
                                          <p className="text-xs text-white font-bold">Escaneie com o WhatsApp:</p>
                                          <div className="bg-white p-2 rounded-lg inline-block">
                                              <img src={`data:image/png;base64,${qrCode}`} alt="QR Code WhatsApp" className="w-48 h-48 object-contain" />
                                          </div>
                                          <p className="text-[10px] text-gray-500 flex items-center justify-center gap-1">
                                            <RefreshCcw size={10} className="animate-spin"/> Atualiza a cada 25s
                                          </p>
                                      </div>
                                  ) : (
                                      <div className="w-full">
                                          {qrStatus === 'error' && (
                                              <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] text-red-400 text-center">
                                                  {qrError} <br/> <span className="underline cursor-pointer" onClick={handleRequestQr}>Tentar novamente</span>
                                              </div>
                                          )}
                                          <button 
                                            type="button"
                                            onClick={handleRequestQr}
                                            disabled={!botConfig.phoneId}
                                            className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/20 disabled:opacity-50"
                                          >
                                              <QrCode size={16}/> Gerar QR Code de Conexão
                                          </button>
                                      </div>
                                  )}
                              </div>
                              
                              <div className="hidden">
                                  <input type="password" value={botConfig.accessToken} onChange={e => setBotConfig({...botConfig, accessToken: e.target.value})} />
                              </div>
                          </div>
                      </>
                  ) : <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400 flex items-center gap-2"><CheckCircle size={16}/> Configuração gerenciada pela Zytech.</div>}
                  
                  <div className="space-y-1 mt-4"><label className="text-[10px] font-bold text-cyan-500 uppercase flex items-center gap-1"><HelpCircle size={10}/> Perguntas Frequentes (FAQ)</label><textarea className="w-full bg-[#050505] border border-cyan-500/20 rounded-lg p-3 text-gray-300 text-sm focus:border-cyan-500/50 font-mono" rows={3} placeholder="Ex: Aceitamos fiador? Sim." value={botConfig.aiFaq} onChange={e => setBotConfig({...botConfig, aiFaq: e.target.value})} /></div>
                  <button onClick={handleSaveBotConfig} disabled={isSavingBot} className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all">{isSavingBot ? 'Salvando...' : <><Save size={16}/> Salvar Configuração</>}</button>
              </div>
          </div>
      </div>
      
      {/* CARD DIREITO (CONTRATO) MANTIDO IGUAL */}
      <div className="bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl h-fit">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div><h3 className="font-bold text-lg flex items-center gap-2 text-white"><Briefcase size={20} className="text-blue-500"/> Contrato</h3><p className="text-xs text-gray-500 mt-1">Detalhes de faturamento e plano.</p></div>
              {role === 'super_admin' && <button onClick={() => setIsEditing(!isEditing)} className="text-blue-400 text-xs font-bold hover:text-blue-300 uppercase tracking-wider border border-blue-500/30 px-3 py-1 rounded-lg hover:bg-blue-500/10 transition-all">{isEditing ? 'Cancelar Edição' : 'Editar Dados'}</button>}
          </div>
          <form onSubmit={handleUpdateClient} className="p-6 space-y-5">
              <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Nome da Empresa</label><input type="text" disabled={!isEditing} className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white text-sm disabled:opacity-50 focus:border-blue-500 outline-none" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/></div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Plano</label><select disabled={!isEditing} className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white text-sm disabled:opacity-50 outline-none" value={editForm.plan} onChange={e => { setEditForm({...editForm, plan: e.target.value}); setBotConfig((prev:any) => ({...prev, planLevel: e.target.value})) }}><option value="ZyStart">ZyStart</option><option value="ZyControl">ZyControl</option><option value="ZyBotAI">ZyBotAI</option><option value="ZyCore">ZyCore</option></select></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-green-500 uppercase">Valor (R$)</label><input type="text" disabled={!isEditing} className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white text-sm disabled:opacity-50 focus:border-green-500 outline-none font-mono" value={editForm.value} onChange={e => setEditForm({...editForm, value: e.target.value})}/></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Ciclo</label><select disabled={!isEditing} className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white text-sm disabled:opacity-50 outline-none" value={editForm.cycle} onChange={e => setEditForm({...editForm, cycle: e.target.value})}><option value="mensal">Mensal</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option><option value="unico">Único</option></select></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Vencimento</label><input type="date" disabled={!isEditing} className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-white text-sm disabled:opacity-50 outline-none text-gray-400" value={editForm.valid_until} onChange={e => setEditForm({...editForm, valid_until: e.target.value})}/></div>
              </div>
              {role === 'super_admin' && isEditing && <div className="pt-4 flex justify-end"><button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all"><Save size={18}/> Salvar Alterações</button></div>}
          </form>
      </div>
  </div>
  )
}

// --- NOTIFICATIONS TAB ---
export const NotificationsTab = ({ notifications, markAsRead, loadingNotifications, fetchNotifications }: any) => (
  <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center gap-2"><Bell className="text-red-500" /> Central de Alertas</h3>
            <p className="text-sm text-gray-400 mt-1">Solicitações de atendimento humano e avisos importantes.</p>
          </div>
          <button onClick={fetchNotifications} className="p-2 bg-white/5 rounded-lg hover:bg-white/10"><RefreshCcw size={16}/></button>
      </div>
      
      <div className="space-y-3">
          {loadingNotifications ? (
              <div className="p-10 text-center text-gray-500">Carregando notificações...</div>
          ) : notifications.length === 0 ? (
              <div className="p-10 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                  <CheckCircle size={32} className="mx-auto text-green-500 mb-2 opacity-50"/>
                  <p className="text-gray-400">Tudo limpo! Nenhuma pendência.</p>
              </div>
          ) : (
              notifications.map((notif:any) => (
                  <div key={notif.id} className={`p-4 rounded-xl border flex gap-4 transition-all ${notif.is_read ? 'bg-[#0a0a0a] border-white/5 opacity-60' : 'bg-red-900/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]'}`}>
                      <div className={`mt-1 p-2 rounded-full h-fit ${notif.is_read ? 'bg-gray-800 text-gray-500' : 'bg-red-500 text-white'}`}>
                          {notif.type === 'human_request' ? <UserPlus size={16}/> : <Bell size={16}/>}
                      </div>
                      <div className="flex-1">
                          <div className="flex justify-between items-start">
                              <h4 className={`font-bold text-sm ${notif.is_read ? 'text-gray-400' : 'text-white'}`}>{notif.customer_name || notif.customer_phone}</h4>
                              <span className="text-[10px] text-gray-500 font-mono">{new Date(notif.created_at).toLocaleString('pt-BR')}</span>
                          </div>
                          <p className="text-sm text-gray-300 mt-1">{notif.content}</p>
                          <div className="flex gap-4 mt-3">
                              <a href={`https://wa.me/${notif.customer_phone}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-green-400 hover:underline flex items-center gap-1"><Phone size={12}/> Chamar no WhatsApp</a>
                              {!notif.is_read && <button onClick={() => markAsRead(notif.id)} className="text-xs font-bold text-gray-500 hover:text-white flex items-center gap-1"><CheckCircle size={12}/> Marcar como resolvido</button>}
                          </div>
                      </div>
                  </div>
              ))
          )}
      </div>
  </div>
)

// --- CATALOG TAB ---
export const CatalogTab = ({ client, isRealEstate, isServiceType, products, setIsProductModalOpen, labels, toggleProductStatus, handleDeleteProduct }: any) => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
          <div>
              <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                  {isRealEstate ? <Home className="text-indigo-500"/> : isServiceType ? <Scissors className="text-purple-500"/> : <Package className="text-blue-500"/>} 
                  {isRealEstate ? 'Carteira de Imóveis' : 'Itens do Bot'}
              </h2>
              <p className="text-gray-400 text-sm mt-1">{isRealEstate ? 'Gerencie os imóveis disponíveis para venda ou aluguel.' : 'Gerencie os produtos/serviços que o bot oferece.'}</p>
          </div>
          <button onClick={() => setIsProductModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all">
              <Plus size={18}/> {labels.add}
          </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.length === 0 && <div className="col-span-full py-16 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]"><p className="text-gray-500">Nenhum {isRealEstate ? 'imóvel' : 'item'} cadastrado.</p></div>}
          {products.map((prod:any) => (
              <div key={prod.id} className={`group bg-[#0a0a0a]/50 backdrop-blur-sm border rounded-2xl p-5 flex justify-between transition-all hover:border-blue-500/30 hover:bg-white/[0.03] ${prod.is_available ? 'border-white/10' : 'border-red-900/20 opacity-60'}`}>
                  <div>
                      <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase bg-white/10 px-2 py-0.5 rounded text-gray-300 border border-white/5">{prod.category}</span>
                          {!isRealEstate && prod.track_stock && <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${prod.stock_quantity > 0 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{prod.stock_quantity} un.</span>}
                      </div>
                      <h4 className="font-bold text-white text-lg">{prod.name}</h4>
                      {isRealEstate ? (
                          <div className="mt-2 space-y-1">
                              <p className="text-gray-400 text-xs flex items-center gap-1"><MapPin size={12}/> {prod.neighborhood || 'Bairro não inf.'}</p>
                              <p className="text-green-400 font-mono font-bold">R$ {prod.price}</p>
                          </div>
                      ) : <p className="text-green-400 font-mono mt-1">R$ {prod.price}</p>}
                  </div>
                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleProductStatus(prod)} className={`p-2 rounded-lg transition-colors ${prod.is_available ? 'text-green-500 hover:bg-green-500/10' : 'text-gray-500 hover:bg-gray-500/10'}`} title={prod.is_available ? "Ativo" : "Inativo"}><Power size={18}/></button>
                      <button onClick={() => handleDeleteProduct(prod.id)} className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={18}/></button>
                  </div>
              </div>
          ))}
      </div>
  </div>
)

// --- APPOINTMENTS TAB ---
export const AppointmentsTab = ({ client, loadingAppts, apptFilter, setApptFilter, appointmentsList, isRealEstate, router }: any) => (
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
                          <tr>
                              <th className="p-4"><Clock size={14} className="inline mr-1"/> Data/Hora</th>
                              <th className="p-4"><User size={14} className="inline mr-1"/> Cliente</th>
                              {isRealEstate ? (
                                  <>
                                      <th className="p-4"><Home size={14} className="inline mr-1"/> Imóvel</th>
                                      <th className="p-4"><MapPin size={14} className="inline mr-1"/> Bairro</th>
                                      <th className="p-4"><LinkIcon size={14} className="inline mr-1"/> Link</th>
                                  </>
                              ) : (
                                  <th className="p-4"><Scissors size={14} className="inline mr-1"/> Serviço</th>
                              )}
                              <th className="p-4">Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {appointmentsList.length > 0 ? appointmentsList.map((appt:any) => (
                              <tr key={appt.id} className="hover:bg-white/[0.03] transition-colors">
                                  <td className="p-4 font-mono text-gray-300">{new Date(appt.appointment_date).toLocaleDateString('pt-BR')} <span className="text-gray-500">às</span> {new Date(appt.appointment_date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</td>
                                  <td className="p-4">
                                      <div className="font-bold text-white">{appt.client_name || appt.customer_phone || 'Cliente sem nome'}</div>
                                      <div className="text-xs text-gray-500">{appt.customer_phone}</div>
                                  </td>
                                  {isRealEstate ? (
                                      <>
                                          <td className="p-4 text-gray-300">{appt.products?.name || appt.service_name || '-'}</td>
                                          <td className="p-4 text-gray-400 text-xs">{appt.products?.neighborhood || '-'}</td>
                                          <td className="p-4">
                                              {appt.products?.property_link ? (
                                                  <a href={appt.products.property_link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline text-xs">Ver Imóvel</a>
                                              ) : <span className="text-gray-600 text-xs">-</span>}
                                          </td>
                                      </>
                                  ) : (
                                      <td className="p-4 text-gray-300">{appt.service_name || '-'}</td>
                                  )}
                                  <td className="p-4"><span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${appt.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : appt.status === 'canceled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>{appt.status === 'confirmed' ? 'Confirmado' : appt.status === 'canceled' ? 'Cancelado' : 'Pendente'}</span></td>
                              </tr>
                          )) : (<tr><td colSpan={isRealEstate ? 6 : 4} className="p-8 text-center text-gray-500">Nenhum agendamento encontrado para este período.</td></tr>)}
                      </tbody>
                  </table>
              </div>
          )}
      </div>
  </div>
)

// --- ORDERS TAB ---
export const OrdersTab = ({ isServiceType, fetchClientOrders, clientOrders, handleAdvanceStatus, handleCancelOrder, client }: any) => {
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

    return (
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
                    {clientOrders.map((order:any) => {
                        const statusStyle = getStatusStyle(order.status)
                        const StatusIcon = statusStyle.icon
                        return (
                            <div key={order.id} className={`bg-[#0a0a0a]/60 backdrop-blur-md border rounded-2xl overflow-hidden transition-all duration-300 group hover:-translate-y-1 shadow-xl ${order.status === 'canceled' ? 'border-red-900/20 opacity-60 grayscale-[0.5]' : 'border-white/10 hover:border-blue-500/30'}`}>
                                <div className="p-5 border-b border-white/5 flex justify-between items-start bg-white/[0.02]">
                                    <div>
                                        <h3 className="font-bold text-white text-lg truncate w-40 tracking-tight" title={order.customer_name}>{order.customer_name}</h3>
                                        <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1 font-mono"><Clock size={12} className="text-blue-500"/> {new Date(order.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border flex items-center gap-1.5 shadow-lg ${statusStyle.bg} ${statusStyle.color} ${statusStyle.border} ${statusStyle.shadow}`}><StatusIcon size={12} /> {statusStyle.label}</span>
                                </div>
                                <div className="p-5 min-h-[100px] bg-gradient-to-b from-transparent to-black/20">
                                    <ul className="space-y-2 text-sm">
                                        {Array.isArray(order.items_json) && order.items_json.map((item: any, idx: number) => (
                                            <li key={idx} className="flex justify-between items-start text-gray-300">
                                                <div className="flex gap-2"><span className="bg-white/10 text-white font-bold font-mono px-1.5 rounded text-xs h-fit min-w-[24px] text-center border border-white/5">{item.qty || 1}x</span><span className="leading-snug text-xs text-gray-200">{item.name}</span></div>
                                                <span className="text-gray-500 text-xs font-mono mt-0.5">R$ {Number(item.price).toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="p-5 border-t border-white/5 bg-[#050505] space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-3 text-xs text-gray-400"><div className="p-1.5 bg-blue-500/10 rounded-md shrink-0"><MapPin size={12} className="text-blue-400"/></div><span className="line-clamp-2 leading-relaxed">{order.delivery_address || 'Retirada / Local'}</span></div>
                                        <div className="flex items-center gap-3 text-xs text-gray-400"><div className="p-1.5 bg-green-500/10 rounded-md shrink-0"><Phone size={12} className="text-green-400"/></div><span className="font-mono tracking-wide">{order.customer_phone}</span></div>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-white/5"><span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total</span><span className="text-lg font-bold text-white tracking-tight text-green-400">R$ {Number(order.total_value).toFixed(2)}</span></div>
                                    {client.business_type === 'delivery' && order.status !== 'canceled' && order.status !== 'finished' && (
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <button onClick={() => handleAdvanceStatus(order)} className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 flex items-center justify-center gap-2 group/btn">Avançar <ArrowRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform"/></button>
                                            <button onClick={() => handleCancelOrder(order.id)} className="py-2.5 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/20 rounded-xl text-xs font-bold transition-all">Cancelar</button>
                                        </div>
                                    )}
                                    {order.status === 'canceled' && <div className="pt-2 text-center text-[10px] font-bold text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg py-2 uppercase tracking-wider">Pedido Cancelado</div>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}