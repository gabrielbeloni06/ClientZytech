'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  User, Building, MessageSquare, Save, Lock, 
  Smartphone, Clock, MapPin, Globe 
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

  if (loading) return <div className="p-8 text-white">Carregando configurações...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-white pb-20">
      
      <div className="border-b border-[#333] pb-6">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-gray-400 mt-1">Gerencie seu perfil e preferências do sistema.</p>
      </div>

      <div className="flex gap-2 p-1 bg-[#111] rounded-xl border border-[#333] w-fit">
        <button 
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'profile' ? 'bg-[#222] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <User size={16}/> Meu Perfil
        </button>
        <button 
          onClick={() => setActiveTab('company')}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'company' ? 'bg-[#222] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Building size={16}/> Dados da Empresa
        </button>
        {role !== 'super_admin' && (
            <button 
            onClick={() => setActiveTab('bot')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'bot' ? 'bg-[#222] text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            >
            <MessageSquare size={16}/> Configurar Robô
            </button>
        )}
      </div>

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="md:col-span-1">
                <h3 className="text-lg font-bold text-white">Informações Pessoais</h3>
                <p className="text-sm text-gray-500 mt-1">Seus dados de acesso e identificação na plataforma.</p>
            </div>
            <div className="md:col-span-2 bg-[#111] border border-[#333] rounded-xl p-6">
                <form onSubmit={updateProfile} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                        <input 
                            type="text" 
                            className="w-full bg-black border border-[#333] rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                            value={profileForm.fullName}
                            onChange={e => setProfileForm({...profileForm, fullName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                        <input 
                            type="email" disabled
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-gray-400 cursor-not-allowed"
                            value={profileForm.email}
                        />
                        <p className="text-xs text-gray-600 mt-1 flex items-center gap-1"><Lock size={10}/> O email não pode ser alterado.</p>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                            <Save size={18}/> Salvar Perfil
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {activeTab === 'company' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="md:col-span-1">
                <h3 className="text-lg font-bold text-white">Dados Comerciais</h3>
                <p className="text-sm text-gray-500 mt-1">Informações visíveis nos relatórios e faturas.</p>
            </div>
            <div className="md:col-span-2 bg-[#111] border border-[#333] rounded-xl p-6">
                <form onSubmit={updateCompany} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Empresa</label>
                        <input 
                            type="text" 
                            className="w-full bg-black border border-[#333] rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                            value={companyForm.name}
                            onChange={e => setCompanyForm({...companyForm, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Negócio</label>
                        <div className="flex items-center gap-2 p-3 bg-[#1a1a1a] border border-[#333] rounded-lg text-gray-400">
                            <Globe size={16}/> <span className="capitalize">{companyForm.type}</span>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button className="bg-white hover:bg-gray-200 text-black px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                            <Save size={18}/> Salvar Empresa
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {activeTab === 'bot' && role !== 'super_admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="md:col-span-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Smartphone size={20} className="text-blue-400"/> Inteligência do Bot</h3>
                <p className="text-sm text-gray-500 mt-2">Configure como o robô responde aos seus clientes no WhatsApp.</p>
                
                <div className="mt-6 p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-300 font-bold mb-2">DICA PRO:</p>
                    <p className="text-xs text-blue-400/70">Mantenha a mensagem de boas-vindas curta e direta para aumentar a conversão.</p>
                </div>
            </div>
            
            <div className="md:col-span-2 bg-[#111] border border-[#333] rounded-xl p-6">
                <form onSubmit={updateBotConfig} className="space-y-6">
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Mensagem de Boas-vindas</label>
                        <textarea 
                            className="w-full h-24 bg-black border border-[#333] rounded-lg p-3 text-white focus:border-blue-500 outline-none resize-none"
                            placeholder="Ex: Olá! Bem-vindo à Pizzaria X. Digite 1 para ver o cardápio."
                            value={botConfig.welcome_message}
                            onChange={e => setBotConfig({...botConfig, welcome_message: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Clock size={12}/> Horário de Funcionamento</label>
                            <input 
                                type="text" 
                                className="w-full bg-black border border-[#333] rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                placeholder="Ex: 18:00 às 23:00"
                                value={botConfig.opening_hours}
                                onChange={e => setBotConfig({...botConfig, opening_hours: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><MapPin size={12}/> Endereço / Área</label>
                            <input 
                                type="text" 
                                className="w-full bg-black border border-[#333] rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                placeholder="Ex: Centro e Região"
                                value={botConfig.address}
                                onChange={e => setBotConfig({...botConfig, address: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chave PIX (Para Pagamento)</label>
                            <input 
                                type="text" 
                                className="w-full bg-black border border-[#333] rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                placeholder="Email, CPF ou Aleatória"
                                value={botConfig.pix_key}
                                onChange={e => setBotConfig({...botConfig, pix_key: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha do Wi-Fi (Opcional)</label>
                            <input 
                                type="text" 
                                className="w-full bg-black border border-[#333] rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                placeholder="Para clientes presenciais"
                                value={botConfig.wifi_pass}
                                onChange={e => setBotConfig({...botConfig, wifi_pass: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end border-t border-[#333]">
                        <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20">
                            <Save size={18}/> Salvar Configuração do Robô
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  )
}