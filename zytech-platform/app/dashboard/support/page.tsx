'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  LifeBuoy, MessageSquare, Plus, X, Send, 
  CheckCircle, Clock, Search, AlertCircle, HelpCircle, DollarSign, FileText, ChevronLeft, Lock, Filter
} from 'lucide-react'

export default function SupportPage() {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<any[]>([])
  const [userId, setUserId] = useState<string>('')
  const [orgId, setOrgId] = useState<string>('')

  const [view, setView] = useState<'list' | 'detail'>('list')
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [adminTab, setAdminTab] = useState<'open' | 'closed'>('open')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTicketCategory, setNewTicketCategory] = useState('help')
  const [newTicketDesc, setNewTicketDesc] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    loadUserAndTickets()
  }, [adminTab]) 

  async function loadUserAndTickets() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserId(user.id)

     const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (profile) {
      setRole(profile.role)
      setOrgId(profile.organization_id)

       let query = supabase
        .from('tickets')
        .select('*, organizations(name)')
        .order('created_at', { ascending: false })

      if (profile.role === 'super_admin') {
         query = query.eq('status', adminTab)
      } else {
         query = query.eq('organization_id', profile.organization_id)
      }

      const { data: ticketData } = await query
      setTickets(ticketData || [])
    }
    setLoading(false)
  }

   async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault()
    setIsSending(true)

    const titleMap: any = {
        'bug': 'Problema Técnico',
        'help': 'Ajuda / Dúvida',
        'finance': 'Financeiro',
        'suggestion': 'Sugestão / Outros'
    }

     const { data: newTicket, error } = await supabase
      .from('tickets')
      .insert([{
        organization_id: orgId,
        category: newTicketCategory,
        title: titleMap[newTicketCategory],
        description: newTicketDesc,
        status: 'open'
      }])
      .select()
      .single()

    if (error) {
        alert('Erro ao criar ticket: ' + error.message)
    } else {
         await supabase.from('ticket_messages').insert([{
            ticket_id: newTicket.id,
            sender_role: 'client',
            message: newTicketDesc
        }])
        
        setIsModalOpen(false)
        setNewTicketDesc('')
        loadUserAndTickets()
    }
    setIsSending(false)
  }

   async function openTicket(ticket: any) {
    setSelectedTicket(ticket)
     const { data } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true })
    
    setMessages(data || [])
    setView('detail')
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim()) return

    setIsSending(true)
    const sender = role === 'super_admin' ? 'admin' : 'client'

    const { error } = await supabase.from('ticket_messages').insert([{
        ticket_id: selectedTicket.id,
        sender_role: sender,
        message: newMessage
    }])

    if (!error) {
        setNewMessage('')
         const { data } = await supabase
            .from('ticket_messages')
            .select('*')
            .eq('ticket_id', selectedTicket.id)
            .order('created_at', { ascending: true })
        setMessages(data || [])
    }
    setIsSending(false)
  }

  async function handleCloseTicket() {
    if(!confirm("Deseja marcar este chamado como resolvido?")) return;
    
    await supabase.from('tickets').update({ status: 'closed' }).eq('id', selectedTicket.id)
    setSelectedTicket({...selectedTicket, status: 'closed'})
    loadUserAndTickets()
  }

   const getCategoryIcon = (cat: string) => {
    switch(cat) {
        case 'bug': return <AlertCircle size={20} className="text-red-400" />
        case 'finance': return <DollarSign size={20} className="text-green-400" />
        case 'help': return <HelpCircle size={20} className="text-blue-400" />
        default: return <FileText size={20} className="text-gray-400" />
    }
  }

  const getCategoryStyle = (cat: string) => {
    switch(cat) {
        case 'bug': return 'bg-red-500/10 border-red-500/20 shadow-[0_0_10px_rgba(248,113,113,0.15)]'
        case 'finance': return 'bg-green-500/10 border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.15)]'
        case 'help': return 'bg-blue-500/10 border-blue-500/20 shadow-[0_0_10px_rgba(96,165,250,0.15)]'
        default: return 'bg-gray-500/10 border-gray-500/20'
    }
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-blue-500/30 pb-20 relative overflow-hidden">
      
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-5xl mx-auto p-6 md:p-10 relative z-10 space-y-8">
      
        {view === 'list' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-6">
                    <div>
                        <h2 className="text-4xl font-bold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                            <LifeBuoy className="text-blue-500" size={32} /> Central de Suporte
                        </h2>
                        <p className="text-gray-400 mt-2 text-sm flex items-center gap-2">
                            {role === 'super_admin' ? 'Painel de controle de tickets e solicitações.' : 'Precisa de ajuda? Abra um ticket e responderemos em breve.'}
                        </p>
                    </div>
                    
                    {role === 'super_admin' ? (
                        <div className="flex bg-[#0a0a0a] p-1.5 rounded-xl border border-white/10 shadow-lg">
                            <button 
                                onClick={() => setAdminTab('open')}
                                className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${adminTab === 'open' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                            >
                                Em Aberto
                            </button>
                            <button 
                                onClick={() => setAdminTab('closed')}
                                className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${adminTab === 'closed' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                            >
                                Fechados
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <Plus size={20}/> Novo Chamado
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="flex flex-col items-center gap-4 animate-pulse">
                            <div className="w-12 h-12 rounded-full bg-white/5"></div>
                            <div className="text-gray-500 font-mono text-sm">Carregando tickets...</div>
                        </div>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare size={32} className="text-gray-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-300">Tudo tranquilo por aqui</h3>
                        <p className="text-sm text-gray-500 mt-1">Nenhum chamado encontrado nesta lista.</p>
                        {role !== 'super_admin' && (
                            <button onClick={() => setIsModalOpen(true)} className="mt-6 text-blue-400 text-sm font-bold hover:text-blue-300">Criar o primeiro ticket &rarr;</button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {tickets.map((ticket) => (
                            <div 
                                key={ticket.id} 
                                onClick={() => openTicket(ticket)}
                                className="group bg-[#0a0a0a]/50 backdrop-blur-sm border border-white/5 p-5 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white/[0.03] hover:border-blue-500/20 transition-all duration-300 shadow-sm hover:shadow-lg"
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`p-4 rounded-xl border transition-all duration-300 group-hover:scale-110 ${getCategoryStyle(ticket.category)}`}>
                                        {getCategoryIcon(ticket.category)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{ticket.title}</h4>
                                            {role === 'super_admin' && (
                                                <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded border border-white/5 uppercase tracking-wide font-bold">
                                                    {ticket.organizations?.name}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-500 text-sm mt-1 line-clamp-1 max-w-md group-hover:text-gray-400">{ticket.description}</p>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${ticket.status === 'open' ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-white/5 text-gray-500 border-white/10'}`}>
                                        {ticket.status === 'open' ? '● Aberto' : 'Resolvido'}
                                    </span>
                                    <span className="text-xs text-gray-600 flex items-center gap-1.5 font-mono">
                                        <Clock size={12}/> {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {view === 'detail' && selectedTicket && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 flex flex-col h-[85vh] bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
                
                <div className="flex items-center justify-between border-b border-white/5 p-6 bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('list')} className="p-3 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white group border border-transparent hover:border-white/10">
                            <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform"/>
                        </button>
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                {selectedTicket.title}
                                {selectedTicket.status === 'closed' && <span className="bg-gray-800 text-gray-400 text-[10px] px-2 py-0.5 rounded border border-gray-700 uppercase font-bold flex items-center gap-1"><Lock size={10}/> Fechado</span>}
                            </h3>
                            <p className="text-xs text-gray-500 font-mono mt-1">Ticket ID: <span className="text-gray-400">#{selectedTicket.id.split('-')[0]}</span></p>
                        </div>
                    </div>
                    {role === 'super_admin' && selectedTicket.status === 'open' && (
                        <button 
                            onClick={handleCloseTicket}
                            className="bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                        >
                            <CheckCircle size={16}/> Marcar como Resolvido
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 p-6 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
                    <div className="flex justify-center">
                        <span className="text-[10px] text-gray-600 font-mono bg-white/5 px-3 py-1 rounded-full">Início da conversa</span>
                    </div>
                    {messages.map((msg) => {
                        const isMe = (role === 'super_admin' && msg.sender_role === 'admin') || (role !== 'super_admin' && msg.sender_role === 'client')
                        const isAdmin = msg.sender_role === 'admin'
                        
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] p-5 rounded-2xl text-sm relative group transition-all duration-300 ${
                                    isMe 
                                    ? 'bg-blue-600 text-white rounded-tr-sm shadow-[0_0_20px_rgba(37,99,235,0.2)]' 
                                    : isAdmin 
                                        ? 'bg-purple-900/40 text-gray-200 border border-purple-500/30 rounded-tl-sm shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                                        : 'bg-[#1a1a1a] text-gray-300 border border-white/10 rounded-tl-sm'
                                }`}>
                                    <p className={`text-[10px] font-bold uppercase mb-2 flex items-center gap-2 ${isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                                        {msg.sender_role === 'admin' ? <><LifeBuoy size={12}/> Suporte Zytech</> : 'Cliente'}
                                    </p>
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                    <p className={`text-[10px] text-right mt-3 font-mono opacity-50`}>
                                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {selectedTicket.status === 'open' ? (
                    <div className="p-6 border-t border-white/5 bg-[#050505]">
                        <form onSubmit={handleSendMessage} className="flex gap-3 relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-0 group-focus-within:opacity-20 transition duration-500 blur"></div>
                            <input 
                                type="text" 
                                placeholder="Digite sua mensagem..." 
                                className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-blue-500/50 focus:bg-white/5 transition-all placeholder:text-gray-600 relative z-10"
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                            />
                            <button 
                                type="submit" 
                                disabled={!newMessage.trim() || isSending}
                                className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95 relative z-10"
                            >
                                {isSending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Send size={20}/>}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="p-6 bg-white/[0.02] border-t border-white/5">
                        <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-center flex flex-col items-center gap-2">
                            <Lock size={20} className="text-gray-500"/>
                            <p className="text-gray-400 text-sm">Este chamado foi encerrado.</p>
                            {role !== 'super_admin' && <button onClick={() => { setView('list'); setIsModalOpen(true) }} className="text-blue-400 text-xs font-bold hover:underline">Abrir novo ticket</button>}
                        </div>
                    </div>
                )}
            </div>
        )}

        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>
                    
                    <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/[0.02]">
                        <h3 className="text-xl font-bold text-white">Abrir Novo Chamado</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors"><X size={20}/></button>
                    </div>
                    
                    <form onSubmit={handleCreateTicket} className="p-6 space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Qual o tipo de solicitação?</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    {id: 'bug', label: 'Problema Técnico', icon: AlertCircle, color: 'text-red-400', active: 'border-red-500 bg-red-500/10'},
                                    {id: 'help', label: 'Ajuda / Dúvida', icon: HelpCircle, color: 'text-blue-400', active: 'border-blue-500 bg-blue-500/10'},
                                    {id: 'finance', label: 'Financeiro', icon: DollarSign, color: 'text-green-400', active: 'border-green-500 bg-green-500/10'},
                                    {id: 'suggestion', label: 'Outros', icon: FileText, color: 'text-purple-400', active: 'border-purple-500 bg-purple-500/10'},
                                ].map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setNewTicketCategory(cat.id)}
                                        className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium transition-all duration-300 ${
                                            newTicketCategory === cat.id 
                                            ? `${cat.active} text-white shadow-lg` 
                                            : 'bg-[#111] border-white/5 text-gray-400 hover:bg-white/5 hover:border-white/10'
                                        }`}
                                    >
                                        <cat.icon size={18} className={newTicketCategory === cat.id ? 'text-white' : cat.color}/> 
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Descrição Detalhada</label>
                            <textarea 
                                className="w-full h-32 bg-[#050505] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500 focus:bg-white/[0.02] resize-none transition-all placeholder:text-gray-700"
                                placeholder="Descreva o que está acontecendo ou como podemos ajudar..."
                                value={newTicketDesc}
                                onChange={e => setNewTicketDesc(e.target.value)}
                                required
                            />
                        </div>

                        <div className="flex justify-end pt-4 border-t border-white/5 gap-3">
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSending}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {isSending ? 'Enviando...' : 'Abrir Ticket'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

      </div>
    </div>
  )
}