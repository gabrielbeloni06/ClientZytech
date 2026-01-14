'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Lock, Loader2, ShieldAlert, Clock } from 'lucide-react'

export default function ApprovalGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkStatus()
  }, [])

  async function checkStatus() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        setLoading(false)
        return
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()
    
    if (profile?.role === 'super_admin') {
        setStatus('approved')
        setLoading(false)
        return
    }

    if (profile?.organization_id) {
        const { data: org } = await supabase
            .from('organizations')
            .select('approval_status')
            .eq('id', profile.organization_id)
            .single()
        
        setStatus(org?.approval_status || 'analysis')
    } else {
        setStatus('reproved') 
    }
    setLoading(false)
  }

  if (loading) {
      return (
          <div className="h-screen w-full bg-[#050505] flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
      )
  }

  if (status === 'analysis') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700 font-sans">
        <div className="relative mb-8">
            <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full"></div>
            <div className="relative w-24 h-24 bg-[#111] border border-yellow-500/30 rounded-full flex items-center justify-center shadow-2xl">
                <Clock size={40} className="text-yellow-500 animate-pulse" />
            </div>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Análise em Andamento</h1>
        <p className="text-zinc-400 max-w-md text-sm md:text-base leading-relaxed">
          Recebemos o seu cadastro. Nossa equipe de segurança está validando os dados da sua empresa. 
          <br/><br/>
          Sua conta será liberada em breve se estiver tudo correto.
        </p>

        <div className="mt-10 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl flex items-center gap-3">
             <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
             <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Status: Pendente</span>
        </div>

        <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }} 
            className="mt-12 text-zinc-600 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest flex items-center gap-2"
        >
            <Lock size={12}/> Sair da conta
        </button>
      </div>
    )
  }

  if (status === 'reproved') {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300 font-sans">
            <ShieldAlert size={64} className="text-red-600 mb-6" />
            <h1 className="text-2xl font-bold text-white">Acesso Negado</h1>
            <p className="text-zinc-500 mt-2 max-w-sm">Infelizmente não foi possível aprovar o cadastro da sua empresa neste momento.</p>
            <button 
                onClick={async () => { await supabase.auth.signOut(); router.push('/') }} 
                className="mt-8 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold transition-all"
            >
                Voltar
            </button>
        </div>
      )
  }

  return <>{children}</>
}