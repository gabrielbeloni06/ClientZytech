"use client"
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { 
    Mail, Lock, ArrowRight, Loader2, Sparkles, ShieldCheck, 
    Briefcase, Truck, Home, ShoppingCart, ChevronLeft, CheckCircle, CreditCard, Globe, Cpu
} from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [regName, setRegName] = useState('')
  const [regType, setRegType] = useState('') 
  const [regSubtype, setRegSubtype] = useState('') 
  const [regPlan, setRegPlan] = useState('')
  const [regPayment, setRegPayment] = useState('pix')

  useEffect(() => {
    const clearSession = async () => { await supabase.auth.signOut() }
    clearSession()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/dashboard')
    } catch (err: any) {
      alert('Erro ao entrar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setLoading(true)
    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        })
        if (authError) throw authError
        if (!authData.user) throw new Error("Erro ao criar usuário.")

        let finalBusinessType = regType === 'delivery' ? 'delivery' : regSubtype;
        
        const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .insert([{
                name: regName,
                business_type: finalBusinessType,
                plan: regPlan,
                payment_method: regPayment,
                approval_status: 'analysis',
                status: 'active', 
                subscription_cycle: 'mensal',
                subscription_value: regPlan.includes('Start') ? 97 : regPlan.includes('Core') ? 297 : 197
            }])
            .select()
            .single()

        if (orgError) throw orgError

        const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
                id: authData.user.id,
                email: email,
                role: 'org_owner',
                organization_id: orgData.id
            }])

        if (profileError) throw profileError

        await supabase.auth.signInWithPassword({ email, password })
        router.push('/dashboard')

    } catch (err: any) {
        alert('Erro no cadastro: ' + err.message)
    } finally {
        setLoading(false)
    }
  }


  const renderLogin = () => (
    <form onSubmit={handleLogin} className="mt-8 space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="space-y-4">
            <div className="group/input">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Email Corporativo</label>
                <div className="relative">
                    <Mail size={18} className="absolute left-4 top-3.5 text-gray-500"/>
                    <input type="email" required className="w-full pl-11 pr-4 py-3.5 bg-[#050505] border border-white/10 rounded-xl focus:border-blue-500/50 outline-none text-white transition-all text-sm" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)}/>
                </div>
            </div>
            <div className="group/input">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Senha de Acesso</label>
                <div className="relative">
                    <Lock size={18} className="absolute left-4 top-3.5 text-gray-500"/>
                    <input type="password" required className="w-full pl-11 pr-4 py-3.5 bg-[#050505] border border-white/10 rounded-xl focus:border-purple-500/50 outline-none text-white transition-all text-sm" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}/>
                </div>
            </div>
        </div>
        <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50">
            {loading ? <Loader2 size={18} className="animate-spin"/> : <ArrowRight size={18} />} {loading ? 'Entrando...' : 'Acessar Painel'}
        </button>
        <p className="text-center text-xs text-gray-500 mt-4">
            Ainda não é cliente? <button type="button" onClick={() => setMode('register')} className="text-blue-400 hover:text-white font-bold underline decoration-blue-500/30 ml-1">Criar conta</button>
        </p>
    </form>
  )

  const renderRegisterStep1 = () => (
      <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
              <h3 className="text-white font-bold text-lg">Dados de Acesso</h3>
          </div>
          <div className="space-y-4">
            <div>
                <label className="text-xs text-gray-500 font-bold uppercase ml-1">Email</label>
                <input type="email" placeholder="Seu melhor email" className="w-full bg-[#050505] border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-blue-500 mt-1" value={email} onChange={e=>setEmail(e.target.value)}/>
            </div>
            <div>
                <label className="text-xs text-gray-500 font-bold uppercase ml-1">Senha</label>
                <input type="password" placeholder="Crie uma senha forte" className="w-full bg-[#050505] border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-blue-500 mt-1" value={password} onChange={e=>setPassword(e.target.value)}/>
            </div>
          </div>
          <button onClick={() => { if(email && password) setStep(2); else alert("Preencha email e senha") }} className="w-full bg-white text-black py-3 rounded-xl font-bold mt-2 hover:bg-gray-200 transition-colors">Continuar</button>
          <button onClick={() => setMode('login')} className="w-full text-xs text-gray-500 py-2 hover:text-white">Já tenho conta</button>
      </div>
  )

  const renderRegisterStep2 = () => (
      <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <h3 className="text-white font-bold text-lg">Sobre o Negócio</h3>
              </div>
              <button onClick={() => setStep(1)} className="text-gray-500 hover:text-white text-xs flex items-center gap-1"><ChevronLeft size={12}/> Voltar</button>
          </div>
          
          <input type="text" placeholder="Nome da Empresa (ex: Pizzaria Top)" className="w-full bg-[#050505] border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-blue-500 mb-2" value={regName} onChange={e=>setRegName(e.target.value)}/>
          
          <label className="text-xs text-gray-500 font-bold uppercase ml-1">Tipo de Negócio</label>
          <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setRegType('company'); setRegSubtype('') }} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${regType === 'company' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'}`}>
                  <Briefcase size={24}/> <span className="text-xs font-bold">Empresa Física</span>
              </button>
              <button onClick={() => { setRegType('delivery'); setRegSubtype('') }} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${regType === 'delivery' ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'}`}>
                  <Truck size={24}/> <span className="text-xs font-bold">Delivery</span>
              </button>
          </div>

          {regType === 'company' && (
              <div className="space-y-2 pt-2 animate-in slide-in-from-top-2">
                  <p className="text-xs text-gray-500 uppercase font-bold ml-1">Segmento</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setRegSubtype('commerce')} className={`p-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 ${regSubtype === 'commerce' ? 'bg-white text-black' : 'bg-white/5 border-transparent text-gray-400'}`}><ShoppingCart size={14}/> Comércio</button>
                    <button onClick={() => setRegSubtype('real_estate')} className={`p-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 ${regSubtype === 'real_estate' ? 'bg-white text-black' : 'bg-white/5 border-transparent text-gray-400'}`}><Home size={14}/> Imobiliária</button>
                  </div>
              </div>
          )}

          <button 
            onClick={() => { if(regName && regType && (regType === 'delivery' || regSubtype)) setStep(3); else alert("Preencha todos os dados") }} 
            className="w-full bg-white text-black py-3 rounded-xl font-bold mt-4 disabled:opacity-50 hover:bg-gray-200 transition-colors"
          >
              Próximo Passo
          </button>
      </div>
  )

  const renderRegisterStep3 = () => (
      <div className="mt-6 space-y-5 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <h3 className="text-white font-bold text-lg">Plano e Ativação</h3>
              </div>
              <button onClick={() => setStep(2)} className="text-gray-500 hover:text-white text-xs flex items-center gap-1"><ChevronLeft size={12}/> Voltar</button>
          </div>
          
          <div>
              <label className="text-xs text-gray-500 font-bold uppercase mb-2 block ml-1">Selecione o Plano</label>
              <div className="space-y-2">
                  {['ZyStart', 'ZyControl', 'ZyBotAI', 'ZyCore'].map(plan => (
                      <button 
                        key={plan}
                        onClick={()=>setRegPlan(plan)}
                        className={`w-full p-3 rounded-xl border text-left flex justify-between items-center transition-all ${regPlan === plan ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`}
                      >
                          <span className="text-sm font-bold">{plan}</span>
                          {regPlan === plan && <CheckCircle size={16} className="text-blue-500"/>}
                      </button>
                  ))}
              </div>
          </div>

          <div>
              <label className="text-xs text-gray-500 font-bold uppercase mb-2 block ml-1">Como prefere pagar?</label>
              <div className="flex gap-3">
                  <button onClick={()=>setRegPayment('pix')} className={`flex-1 p-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 ${regPayment === 'pix' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-white/5 border-transparent text-gray-400'}`}><Sparkles size={14}/> PIX</button>
                  <button onClick={()=>setRegPayment('cartao')} className={`flex-1 p-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 ${regPayment === 'cartao' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/5 border-transparent text-gray-400'}`}><CreditCard size={14}/> Cartão</button>
              </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl mt-4">
              <p className="text-yellow-500 text-xs flex gap-2 leading-relaxed">
                  <ShieldCheck size={14} className="shrink-0"/> 
                  <span>Após o cadastro, sua conta entrará em <strong>análise de segurança</strong>. Você será notificado assim que o acesso for liberado.</span>
              </p>
          </div>

          <button onClick={handleRegister} disabled={loading || !regPlan} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-4 transition-all hover:scale-[1.02]">
              {loading ? <Loader2 className="animate-spin"/> : <CheckCircle size={18}/>} Finalizar Cadastro
          </button>
      </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020202] text-white p-4 relative overflow-hidden font-sans selection:bg-blue-500/30">
      
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        
        <div className="w-full bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

          <div className="text-center flex flex-col items-center">
            <div className="relative w-16 h-16 mb-4 rounded-xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                <Image src="/icon.jpg" alt="Zytech" fill className="object-cover" priority/>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              ZYTECH <span className="text-blue-500">CLIENT</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">
                {mode === 'login' ? 'Acesso ao Painel de Gestão' : 'Crie sua conta em 3 passos'}
            </p>
          </div>

          {mode === 'login' && renderLogin()}
          {mode === 'register' && step === 1 && renderRegisterStep1()}
          {mode === 'register' && step === 2 && renderRegisterStep2()}
          {mode === 'register' && step === 3 && renderRegisterStep3()}
          
        </div>
        
        <div className="mt-8 text-center space-y-2 opacity-60 hover:opacity-100 transition-opacity">
            <p className="text-[10px] text-gray-600 font-mono flex items-center justify-center gap-2">
                <ShieldCheck size={10} /> SECURE CONNECTION • ENCRYPTED END-TO-END
            </p>
            <div className="pt-2 border-t border-white/5 w-full max-w-[200px] mx-auto"></div>
            <div className="flex flex-col gap-0.5">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">GABRIEL EGIDIO SANTOS BELONI</p>
                <p className="text-[10px] text-gray-600 font-mono">CNPJ: 64.137.389/0001-02</p>
            </div>
        </div>

      </div>
    </div>
  )
}