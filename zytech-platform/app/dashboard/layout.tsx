'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  LayoutDashboard, ShoppingBag, Users, Settings, LogOut, 
  Menu, X, Calendar, LifeBuoy, BarChart, DollarSign, Cpu
} from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [businessType, setBusinessType] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('')
  const [orgId, setOrgId] = useState('')

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/') 
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id, organizations(name, business_type)')
      .eq('id', user.id)
      .single()

    if (profile) {
      setRole(profile.role)
      setOrgId(profile.organization_id)
      setOrgName(profile.organizations?.name || 'Zytech')
      setBusinessType(profile.organizations?.business_type || 'commerce')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    window.location.href = '/'
  }

  const getNavItems = () => {
    if (role === 'super_admin') {
      return [
        { name: 'Visão Geral', href: '/dashboard', icon: BarChart },
        { name: 'Gestão de Clientes', href: '/dashboard/clients', icon: Users },
        { name: 'Financeiro', href: '/dashboard/finance', icon: DollarSign },
        { name: 'Sistema', href: '/dashboard/system', icon: Cpu },
        { name: 'Suporte / Chamados', href: '/dashboard/support', icon: LifeBuoy },
        { name: 'Configurações', href: '/dashboard/settings', icon: Settings },
      ]
    }

    const items = [
      { name: 'Início', href: '/dashboard', icon: LayoutDashboard },
    ]

    if (businessType === 'delivery') {
      items.push({ name: 'Pedidos Tempo Real', href: '/dashboard/orders', icon: ShoppingBag })
    } else if (businessType === 'commerce' || businessType === 'service') {
      items.push({ name: 'Agendamentos', href: '/dashboard/appointments', icon: Calendar })
    }

    if (orgId) {
        items.push({ 
            name: businessType === 'delivery' ? 'Meu Cardápio' : 'Meus Serviços', 
            href: `/dashboard/clients/${orgId}`, 
            icon: Settings 
        })
    }

    items.push({ name: 'Suporte / Ajuda', href: '/dashboard/support', icon: LifeBuoy })
    
    return items
  }

  const navItems = getNavItems()

  return (
    <div className="min-h-screen bg-black text-gray-100 flex">
      <aside className="hidden md:flex flex-col w-64 border-r border-[#333] bg-[#0a0a0a]">
        <div className="p-6 border-b border-[#333]">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600 cursor-default">
            ZYTECH
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{role === 'super_admin' ? 'Admin' : orgName}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-600/10 text-blue-500 border border-blue-600/20' 
                    : 'text-gray-400 hover:bg-[#111] hover:text-white'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[#333]">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-red-400 hover:bg-red-900/10 rounded-lg transition-colors">
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-black">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-[#333] bg-[#0a0a0a]">
          <span className="font-bold text-xl">ZYTECH</span>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>
        
        {isMobileMenuOpen && (
            <div className="md:hidden bg-[#111] border-b border-[#333] p-4 space-y-2">
                {navItems.map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-[#222]">
                        <item.icon size={20} /> {item.name}
                    </Link>
                ))}
                <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-red-400"><LogOut size={20} /> Sair</button>
            </div>
        )}

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}