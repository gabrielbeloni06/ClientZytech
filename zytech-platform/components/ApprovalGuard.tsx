'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Lock, Loader2, ShieldAlert, Clock, LogOut } from 'lucide-react'

export default function ApprovalGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const checkStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
            if (isMounted) router.replace('/')
            return
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', session.user.id)
            .single()

        if (profileError) throw profileError

        if (profile?.role === 'super_admin') {
            if (isMounted) {
                setStatus('approved')
                setLoading(false)
            }
            return
        }

        if (profile?.organization_id) {
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .select('approval_status')
                .eq('id', profile.organization_id)
                .single()
            
            if (orgError) throw orgError

            if (isMounted) setStatus(org?.approval_status || 'analysis')
        } else {
            if (isMounted) setStatus('reproved') 
        }

      } catch (e) {
          console.error("Erro no Guard:", e)
          if (isMounted) setStatus('analysis') 
      } finally {
          if (isMounted) setLoading(false)
      }
    }

    checkStatus()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') router.replace('/')
    })

    return () => {
        isMounted = false
        subscription.unsubscribe()
    }
  }, [router])

  if (loading) {
      return (
          <div className="h-screen w-full bg-[#050505] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-blue-600" size={40} />
                <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Verificando Credenciais...</p>
              </div>
          </div>
      )
  }

  if (status === 'analysis') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700 font-sans z-50 absolute top-0 left-0 w-full">
        <div className="relative mb-8">
            <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full"></div>
            <div className="relative w-24 h-24 bg-[#111] border border-yellow-500/30 rounded-full flex items-center justify-center shadow-2xl">
                <Clock size={40} className="text-yellow-500 animate-pulse" />
            </div>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Análise em Andamento</h1>
        <p className="text-zinc-400 max-w-md text-sm md:text-base leading-relaxed">
          Obrigado pelo cadastro. Nossa equipe está validando os dados da sua empresa para liberar o acesso total ao sistema Zytech.
        </p>

        <div className="mt-10 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl flex items-center gap-3">
             <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
             <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Status: Pendente</span>
        </div>

        <button 
            onClick={async () => { await supabase.auth.signOut(); }} 
            className="mt-12 text-zinc-600 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest flex items-center gap-2"
        >
            <LogOut size={12}/> Sair da conta
        </button>
      </div>
    )
  }

  if (status === 'reproved') {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300 font-sans z-50 absolute top-0 left-0 w-full">
            <ShieldAlert size={64} className="text-red-600 mb-6" />
            <h1 className="text-2xl font-bold text-white">Acesso Negado</h1>
            <p className="text-zinc-500 mt-2 max-w-sm">Infelizmente não foi possível aprovar o cadastro da sua empresa neste momento.</p>
            <button 
                onClick={async () => { await supabase.auth.signOut(); }} 
                className="mt-8 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold transition-all"
            >
                Voltar
            </button>
        </div>
      )
  }

  if (status === 'approved') {
      return <>{children}</>
  }

  return null
}