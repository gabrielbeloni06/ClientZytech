'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Mail, Lock, ArrowRight, Loader2, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const clearSession = async () => {
      await supabase.auth.signOut()
    }
    clearSession()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        alert('Erro ao entrar: ' + error.message)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      alert('Erro inesperado. Tente recarregar a página.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020202] text-white p-4 relative overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* Background Ambience */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500">
        
        {/* Glass Card */}
        <div className="bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden group">
          
          {/* Top Decor Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

          <div className="text-center flex flex-col items-center">
            {/* LOGO COM GLOW */}
            <div className="relative w-20 h-20 mb-6 rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] transition-all duration-500">
                <Image 
                    src="/icon.jpg" 
                    alt="Zytech Logo" 
                    fill 
                    className="object-cover"
                    priority
                />
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white mb-2 flex items-center justify-center gap-2">
              ZYTECH <Sparkles size={18} className="text-blue-500 animate-pulse"/>
            </h1>
            <p className="text-sm text-gray-400">Sistema de Gestão Integrada</p>
          </div>

          <form onSubmit={handleLogin} className="mt-10 space-y-5">
            <div className="space-y-4">
              <div className="group/input">
                <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1 transition-colors group-focus-within/input:text-blue-400">Email Corporativo</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail size={18} className="text-gray-500 group-focus-within/input:text-white transition-colors"/>
                    </div>
                    <input
                        id="email"
                        type="email"
                        required
                        className="w-full pl-11 pr-4 py-3.5 bg-[#050505] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.02] text-white placeholder-gray-600 transition-all text-sm"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
              </div>
              
              <div className="group/input">
                <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1 transition-colors group-focus-within/input:text-purple-400">Senha de Acesso</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock size={18} className="text-gray-500 group-focus-within/input:text-white transition-colors"/>
                    </div>
                    <input
                        id="password"
                        type="password"
                        required
                        className="w-full pl-11 pr-4 py-3.5 bg-[#050505] border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.02] text-white placeholder-gray-600 transition-all text-sm"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 mt-2 border border-transparent rounded-xl shadow-lg shadow-blue-900/20 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? <Loader2 size={18} className="animate-spin"/> : <ArrowRight size={18} />}
              {loading ? 'Validando Credenciais...' : 'Acessar Painel'}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-gray-600">
              Esqueceu a senha? <span className="text-gray-400 hover:text-white cursor-pointer transition-colors">Contate o suporte técnico.</span>
            </p>
          </div>
        </div>
        
        <p className="text-center text-[10px] text-gray-600 mt-6 font-mono opacity-50">
            SECURE CONNECTION • ENCRYPTED END-TO-END
        </p>
      </div>
    </div>
  )
}