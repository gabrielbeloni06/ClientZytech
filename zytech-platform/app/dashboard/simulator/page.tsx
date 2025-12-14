'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Send, User, Bot, RefreshCw } from 'lucide-react'

export default function SimulatorPage() {
  const [orgs, setOrgs] = useState<any[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [inputText, setInputText] = useState('')
  const [testPhone, setTestPhone] = useState('5511999999999')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchOrgs()
  }, [])

  useEffect(() => {
    if (selectedOrgId) {
        fetchMessages()
        const channel = supabase
            .channel('chat_simulation')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `organization_id=eq.${selectedOrgId}` }, 
            (payload) => {
                if (payload.new.chat_id === testPhone) {
                    setMessages(prev => [...prev, payload.new])
                }
            })
            .subscribe()
            
        return () => { supabase.removeChannel(channel) }
    }
  }, [selectedOrgId, testPhone])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchOrgs() {
    const { data } = await supabase.from('organizations').select('id, name, plan').order('name')
    if (data) setOrgs(data)
  }

  async function fetchMessages() {
    const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('organization_id', selectedOrgId)
        .eq('chat_id', testPhone)
        .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!inputText.trim() || !selectedOrgId) return

    const text = inputText
    setInputText('')

    await fetch('/api/webhook/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            object: 'simulator',
            organization_id: selectedOrgId,
            phone: testPhone,
            message: text
        })
    })
  }

  return (
    <div className="h-[calc(100vh-100px)] flex gap-4 text-white">
        
        <div className="w-1/3 bg-[#111] border border-[#333] rounded-xl p-4 flex flex-col gap-4">
            <h2 className="font-bold text-xl flex items-center gap-2"><Bot className="text-green-500"/> Simulador WhatsApp</h2>
            
            <div>
                <label className="text-xs text-gray-500 uppercase font-bold">Selecionar Empresa</label>
                <select 
                    className="w-full bg-black border border-[#333] rounded p-2 mt-1 text-sm"
                    value={selectedOrgId}
                    onChange={e => setSelectedOrgId(e.target.value)}
                >
                    <option value="">Selecione...</option>
                    {orgs.map(o => <option key={o.id} value={o.id}>{o.name} ({o.plan})</option>)}
                </select>
            </div>

            <div>
                <label className="text-xs text-gray-500 uppercase font-bold">Número do "Cliente"</label>
                <input 
                    type="text" 
                    className="w-full bg-black border border-[#333] rounded p-2 mt-1 text-sm"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                />
            </div>

            <div className="mt-auto p-4 bg-blue-900/20 rounded-lg text-xs text-blue-300">
                <p className="font-bold mb-1">Como usar:</p>
                <ul className="list-disc pl-4 space-y-1">
                    <li>Selecione a empresa que quer testar.</li>
                    <li>O webhook será acionado internamente.</li>
                    <li>A lógica do plano (ZyStart, etc) será aplicada.</li>
                    <li>Nenhuma mensagem real é enviada.</li>
                </ul>
            </div>
            
            <button onClick={() => { setMessages([]); fetchMessages() }} className="flex items-center justify-center gap-2 bg-[#222] hover:bg-[#333] py-2 rounded text-sm"><RefreshCw size={14}/> Limpar Chat</button>
        </div>

        <div className="flex-1 bg-black border border-[#333] rounded-xl flex flex-col overflow-hidden relative">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")'}}></div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
                {messages.length === 0 && (
                    <div className="text-center text-gray-600 mt-20">
                        <p>Inicie a conversa para testar o bot.</p>
                        <p className="text-xs">Tente dizer "Oi" ou "Agendar"</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-[#005c4b] text-white rounded-tr-none' : 'bg-[#202c33] text-white rounded-tl-none'}`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <span className="text-[10px] text-gray-400 block text-right mt-1">
                                {new Date(msg.created_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-[#202c33] flex gap-2 relative z-10">
                <input 
                    type="text" 
                    className="flex-1 bg-[#2a3942] rounded-lg px-4 py-2 text-white outline-none placeholder-gray-500"
                    placeholder="Digite uma mensagem..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    disabled={!selectedOrgId}
                />
                <button disabled={!selectedOrgId} className="bg-[#00a884] p-2 rounded-full text-white hover:bg-[#008f6f] disabled:opacity-50">
                    <Send size={20} />
                </button>
            </form>
        </div>
    </div>
  )
}