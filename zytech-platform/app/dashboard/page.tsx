'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Settings 
} from 'lucide-react'

export default function DashboardHome() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
        return
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*, organizations(*)')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Erro ao buscar perfil:', error)
      }
      
      setProfile(data || {
        full_name: 'Admin (Debug Mode)',
        role: 'super_admin',
        organizations: { name: 'Zytech Local', plan: 'Dev' }
      })
      
      setLoading(false)
    }

    loadData()
  }, [router])

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Carregando Dashboard...</div>
  }

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold">
            Olá, {profile?.full_name?.split(' ')[0]} 👋
          </h2>
          <div className="mt-1 flex items-center gap-2 text-gray-400">
            <span>Painel da</span>
            <span className="text-blue-400 font-medium">{profile?.organizations?.name}</span>
            <span className="px-2 py-0.5 text-xs rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 uppercase font-bold tracking-wider">
              {profile?.role}
            </span>
          </div>
        </div>

        <div className="md:text-right">
           <p className="text-sm text-gray-500 mb-1">Status do Sistema</p>
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
             <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
             Operacional
           </div>
        </div>
      </div>

      <div className="h-px bg-[#333] w-full" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-[#111] border border-[#333] hover:border-blue-500/50 transition-colors group">
          <h3 className="text-gray-400 text-sm font-medium group-hover:text-blue-400 transition-colors">
            Faturamento
          </h3>
          <p className="text-3xl font-bold mt-2">R$ 12.450,00</p>
          <span className="text-xs text-green-500 mt-1 block">▲ 12% vs mês passado</span>
        </div>

        <div className="p-6 rounded-xl bg-[#111] border border-[#333] hover:border-purple-500/50 transition-colors group">
          <h3 className="text-gray-400 text-sm font-medium group-hover:text-purple-400 transition-colors">
            Clientes
          </h3>
          <p className="text-3xl font-bold mt-2">4</p>
          <span className="text-xs text-gray-500 mt-1 block">2 Trial / 2 Pagantes</span>
        </div>

        <div className="p-6 rounded-xl bg-[#111] border border-[#333] hover:border-pink-500/50 transition-colors group">
          <h3 className="text-gray-400 text-sm font-medium group-hover:text-pink-400 transition-colors">
            Bot Status
          </h3>
          <p className="text-3xl font-bold mt-2">Online</p>
          <span className="text-xs text-green-500 mt-1 block">Respondendo agora</span>
        </div>
      </div>
    </div>
  )
}