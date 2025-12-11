'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  LifeBuoy, MessageSquare, Plus, X, Send, 
  CheckCircle, Clock, Search, AlertCircle, HelpCircle, DollarSign, FileText, ChevronLeft, Lock
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
        case 'bug': return <AlertCircle className="text-red-500" />
        case 'finance': return <DollarSign className="text-green-500" />
        case 'help': return <HelpCircle className="text-blue-500" />
        default: return <FileText className="text-gray-500" />
    }
  }

  return (
    <div className="space-y-6 text-white pb-20 relative min-h-screen">
      
      {view === 'list' && (
        <>
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-[#333] pb-6">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-2">
                        <LifeBuoy className="text-blue-500" /> Central de Suporte
                    </h2>
                    <p className="text-gray-400 mt-1">
                        {role === 'super_admin' ? 'Gerencie os chamados dos seus clientes.' : 'Precisa de ajuda? Abra um ticket abaixo.'}
                    </p>
                </div>
                
                {role === 'super_admin' ? (
                    <div className="flex bg-[#111] p-1 rounded-lg border border-[#333]">
                        <button 
                            onClick={() => setAdminTab('open')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${adminTab === 'open' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Em Aberto
                        </button>
                        <button 
                            onClick={() => setAdminTab('closed')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${adminTab === 'closed' ? 'bg-[#222] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Fechados
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all"
                    >
                        <Plus size={20}/> Novo Chamado
                    </button>
                )}
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-500">Carregando tickets...</div>
            ) : tickets.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-[#333] rounded-xl bg-[#111]/50">
                    <MessageSquare size={48} className="mx-auto text-gray-600 mb-4" />
                    <h3 className="text-lg font-bold text-gray-400">Tudo tranquilo por aqui</h3>
                    <p className="text-sm text-gray-600">Nenhum chamado encontrado nesta lista.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tickets.map((ticket) => (
                        <div 
                            key={ticket.id} 
                            onClick={() => openTicket(ticket)}
                            className="bg-[#111] border border-[#333] p-4 rounded-xl flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[#1a1a1a] rounded-full border border-[#333]">
                                    {getCategoryIcon(ticket.category)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-white text-lg">{ticket.title}</h4>
                                        {role === 'super_admin' && (
                                            <span className="text-xs bg-[#222] text-gray-400 px-2 py-0.5 rounded border border-[#333]">
                                                {ticket.organizations?.name}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-500 text-sm line-clamp-1">{ticket.description}</p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${ticket.status === 'open' ? 'bg-green-900/20 text-green-500 border-green-900/50' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                                    {ticket.status === 'open' ? 'Aberto' : 'Resolvido'}
                                </span>
                                <span className="text-xs text-gray-600 flex items-center gap-1">
                                    <Clock size={10}/> {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
      )}

      {view === 'detail' && selectedTicket && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-[80vh]">
        
            <div className="flex items-center justify-between border-b border-[#333] pb-4 mb-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('list')} className="p-2 hover:bg-[#222] rounded-full transition-colors text-gray-400 hover:text-white">
                        <ChevronLeft size={24}/>
                    </button>
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            {selectedTicket.title}
                            {selectedTicket.status === 'closed' && <Lock size={16} className="text-gray-500"/>}
                        </h3>
                        <p className="text-xs text-gray-500">ID: {selectedTicket.id}</p>
                    </div>
                </div>
                {role === 'super_admin' && selectedTicket.status === 'open' && (
                    <button 
                        onClick={handleCloseTicket}
                        className="bg-green-600/20 text-green-500 border border-green-600/50 hover:bg-green-600/30 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <CheckCircle size={16}/> Marcar como Resolvido
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-[#111] border border-[#333] rounded-xl mb-4">
                {messages.map((msg) => {
                    const isMe = (role === 'super_admin' && msg.sender_role === 'admin') || (role !== 'super_admin' && msg.sender_role === 'client')
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-xl text-sm ${
                                isMe 
                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                : 'bg-[#222] text-gray-300 border border-[#333] rounded-tl-none'
                            }`}>
                                <p className="text-[10px] font-bold uppercase mb-1 opacity-70">
                                    {msg.sender_role === 'admin' ? 'Suporte Zytech' : 'Cliente'}
                                </p>
                                <p className="whitespace-pre-wrap">{msg.message}</p>
                                <p className="text-[10px] text-right mt-2 opacity-50">
                                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {selectedTicket.status === 'open' ? (
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Digite sua mensagem..." 
                        className="flex-1 bg-[#111] border border-[#333] rounded-xl p-4 text-white outline-none focus:border-blue-500 transition-colors"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                    />
                    <button 
                        type="submit" 
                        disabled={!newMessage.trim() || isSending}
                        className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSending ? '...' : <Send size={20}/>}
                    </button>
                </form>
            ) : (
                <div className="bg-[#222] border border-[#333] p-4 rounded-xl text-center text-gray-500 text-sm">
                    Este chamado foi encerrado. Crie um novo se precisar de mais ajuda.
                </div>
            )}
        </div>
      )}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#111] border border-[#333] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-[#333] bg-[#151515]">
                    <h3 className="text-xl font-bold text-white">Abrir Novo Chamado</h3>
                    <button onClick={() => setIsModalOpen(false)}><X className="text-gray-500 hover:text-white"/></button>
                </div>
                
                <form onSubmit={handleCreateTicket} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2 uppercase">Qual o tipo de solicitação?</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                {id: 'bug', label: 'Problema Técnico', icon: AlertCircle},
                                {id: 'help', label: 'Ajuda / Dúvida', icon: HelpCircle},
                                {id: 'finance', label: 'Financeiro', icon: DollarSign},
                                {id: 'suggestion', label: 'Sugestão / Outros', icon: FileText},
                            ].map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setNewTicketCategory(cat.id)}
                                    className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                                        newTicketCategory === cat.id 
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                                        : 'bg-black border-[#333] text-gray-400 hover:bg-[#1a1a1a]'
                                    }`}
                                >
                                    <cat.icon size={16}/> {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2 uppercase">Descrição Detalhada</label>
                        <textarea 
                            className="w-full h-32 bg-black border border-[#333] rounded-xl p-4 text-white outline-none focus:border-blue-500 resize-none"
                            placeholder="Descreva o que está acontecendo ou como podemos ajudar..."
                            value={newTicketDesc}
                            onChange={e => setNewTicketDesc(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex justify-end pt-4 border-t border-[#333]">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-gray-400 hover:text-white mr-2"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSending}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                        >
                            {isSending ? 'Enviando...' : 'Abrir Ticket'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  )
}