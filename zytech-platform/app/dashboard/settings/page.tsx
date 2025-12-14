'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  User, Building, MessageSquare, Save, Lock, 
  Smartphone, Clock, MapPin, Globe, Sparkles, Wifi, CreditCard
} from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState('')
  
  const [activeTab, setActiveTab] = useState('profile') 

  const [profileForm, setProfileForm] = useState({ fullName: '', email: '' })
  const [companyForm, setCompanyForm] = useState({ name: '', type: '' })
  const [botConfig, setBotConfig] = useState({
    welcome_message: 'Olá! Bem-vindo à nossa loja. Como posso ajudar?',
    wifi_pass: '',
    address: '',
    opening_hours: '09:00 às 18:00',
    pix_key: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserId(user.id)
    setProfileForm(prev => ({ ...prev, email: user.email || '' }))

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role, organizations(*)')
      .eq('id', user.id)
      .single()

    if (profile) {
      setRole(profile.role)
      setProfileForm(prev => ({ ...prev, fullName: profile.full_name || '' }))
      
      if (profile.organizations) {
        setCompanyForm({
          name: profile.organizations.name,
          type: profile.organizations.business_type
        })
        
        if (profile.organizations.bot_config) {
          setBotConfig({ ...botConfig, ...profile.organizations.bot_config })
        }
      }
    }
    setLoading(false)
  }


  async function updateProfile(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: profileForm.fullName })
      .eq('id', userId)

    if (error) alert('Erro ao atualizar perfil')
    else alert('Perfil atualizado!')
  }

  async function updateCompany(e: React.FormEvent) {
    e.preventDefault()
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', userId).single()
    if (!profile) return

    const { error } = await supabase
      .from('organizations')
      .update({ name: companyForm.name })
      .eq('id', profile.organization_id)

    if (error) alert('Erro ao atualizar empresa')
    else alert('Dados da empresa salvos!')
  }

  async function updateBotConfig(e: React.FormEvent) {
    e.preventDefault()
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', userId).single()
    if (!profile) return

    const { error } = await supabase
      .from('organizations')
      .update({ bot_config: botConfig })
      .eq('id', profile.organization_id)

    if (error) alert('Erro ao salvar configurações do bot')
    else alert('Robô atualizado com sucesso!')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#020202] text-blue-500 animate-pulse font-mono">Carregando configurações...</div>

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-blue-500/30 pb-20 relative overflow-hidden">
      
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-5xl mx-auto p-6 md:p-10 relative z-10 space-y-8">
      
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-6">
            <div>
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 flex items-center gap-3">
                    Configurações
                </h1>
                <p className="text-gray-400 mt-2 text-sm flex items-center gap-2">
                    Gerencie seu perfil e preferências do sistema.
                </p>
            </div>
        </div>

        <div className="flex gap-2 p-1.5 bg-white/5 rounded-xl border border-white/10 w-fit backdrop-blur-sm shadow-lg">
            <button 
            onClick={() => setActiveTab('profile')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all duration-300 ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
            <User size={16}/> Meu Perfil
            </button>
            <button 
            onClick={() => setActiveTab('company')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all duration-300 ${activeTab === 'company' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
            <Building size={16}/> Dados da Empresa
            </button>
            {role !== 'super_admin' && (
                <button 
                onClick={() => setActiveTab('bot')}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all duration-300 ${activeTab === 'bot' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                <MessageSquare size={16}/> Configurar Robô
                </button>
            )}
        </div>

        {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="md:col-span-1 space-y-2">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><User className="text-blue-500" size={20}/> Informações Pessoais</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">Seus dados de acesso e identificação na plataforma. Mantenha-os atualizados para garantir a segurança da conta.</p>
                </div>
                <div className="md:col-span-2 bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={updateProfile} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Nome Completo</label>
                            <input 
                                type="text" 
                                className="w-full bg-[#050505] border border-white/10 rounded-xl p-4 text-white focus:border-blue-500 focus:bg-white/[0.02] outline-none transition-all placeholder:text-gray-700"
                                value={profileForm.fullName}
                                onChange={e => setProfileForm({...profileForm, fullName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Email</label>
                            <input 
                                type="email" disabled
                                className="w-full bg-[#1a1a1a]/50 border border-white/5 rounded-xl p-4 text-gray-400 cursor-not-allowed font-mono text-sm"
                                value={profileForm.email}
                            />
                            <p className="text-xs text-gray-600 mt-2 flex items-center gap-1.5"><Lock size={12}/> O email não pode ser alterado por segurança.</p>
                        </div>
                        <div className="pt-4 flex justify-end">
                            <button className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95">
                                <Save size={18}/> Salvar Alterações
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {activeTab === 'company' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="md:col-span-1 space-y-2">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Building className="text-blue-500" size={20}/> Dados Comerciais</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">Informações visíveis nos relatórios e faturas. Certifique-se que o nome da empresa está correto.</p>
                </div>
                <div className="md:col-span-2 bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={updateCompany} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Nome da Empresa</label>
                            <input 
                                type="text" 
                                className="w-full bg-[#050505] border border-white/10 rounded-xl p-4 text-white focus:border-blue-500 focus:bg-white/[0.02] outline-none transition-all placeholder:text-gray-700"
                                value={companyForm.name}
                                onChange={e => setCompanyForm({...companyForm, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Tipo de Negócio</label>
                            <div className="flex items-center gap-3 p-4 bg-[#050505] border border-white/10 rounded-xl text-gray-300">
                                <Globe size={20} className="text-blue-500"/> 
                                <span className="capitalize font-medium">{companyForm.type}</span>
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end">
                            <button className="bg-white hover:bg-gray-200 text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95">
                                <Save size={18}/> Salvar Empresa
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {activeTab === 'bot' && role !== 'super_admin' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="md:col-span-1 space-y-4">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><Smartphone size={20} className="text-purple-400"/> Inteligência do Bot</h3>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">Configure como o robô responde aos seus clientes no WhatsApp.</p>
                    </div>
                    
                    <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl backdrop-blur-sm">
                        <p className="text-xs text-blue-300 font-bold mb-2 flex items-center gap-2"><Sparkles size={12}/> DICA PRO</p>
                        <p className="text-xs text-blue-200/70 leading-relaxed">Mantenha a mensagem de boas-vindas curta e direta. Clientes preferem ir direto ao ponto.</p>
                    </div>
                </div>
                
                <div className="md:col-span-2 bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={updateBotConfig} className="space-y-6">
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Mensagem de Boas-vindas</label>
                            <textarea 
                                className="w-full h-28 bg-[#050505] border border-white/10 rounded-xl p-4 text-white focus:border-purple-500 focus:bg-white/[0.02] outline-none resize-none transition-all placeholder:text-gray-700 leading-relaxed"
                                placeholder="Ex: Olá! Bem-vindo à Pizzaria X. Digite 1 para ver o cardápio."
                                value={botConfig.welcome_message}
                                onChange={e => setBotConfig({...botConfig, welcome_message: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><Clock size={14}/> Horário de Funcionamento</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-[#050505] border border-white/10 rounded-xl p-4 text-white focus:border-purple-500 focus:bg-white/[0.02] outline-none transition-all placeholder:text-gray-700"
                                    placeholder="Ex: 18:00 às 23:00"
                                    value={botConfig.opening_hours}
                                    onChange={e => setBotConfig({...botConfig, opening_hours: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><MapPin size={14}/> Endereço / Área</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-[#050505] border border-white/10 rounded-xl p-4 text-white focus:border-purple-500 focus:bg-white/[0.02] outline-none transition-all placeholder:text-gray-700"
                                    placeholder="Ex: Centro e Região"
                                    value={botConfig.address}
                                    onChange={e => setBotConfig({...botConfig, address: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><CreditCard size={14}/> Chave PIX</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-[#050505] border border-white/10 rounded-xl p-4 text-white focus:border-purple-500 focus:bg-white/[0.02] outline-none transition-all placeholder:text-gray-700 font-mono"
                                    placeholder="Email, CPF ou Aleatória"
                                    value={botConfig.pix_key}
                                    onChange={e => setBotConfig({...botConfig, pix_key: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><Wifi size={14}/> Senha Wi-Fi</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-[#050505] border border-white/10 rounded-xl p-4 text-white focus:border-purple-500 focus:bg-white/[0.02] outline-none transition-all placeholder:text-gray-700 font-mono"
                                    placeholder="Opcional"
                                    value={botConfig.wifi_pass}
                                    onChange={e => setBotConfig({...botConfig, wifi_pass: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end border-t border-white/5">
                            <button className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-105 active:scale-95">
                                <Save size={18}/> Salvar Robô
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