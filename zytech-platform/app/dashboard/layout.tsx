'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ApprovalGuard from '@/components/ApprovalGuard' 
import { 
  LayoutDashboard, ShoppingBag, Users, Settings, LogOut, 
  Menu, X, Calendar, LifeBuoy, BarChart, DollarSign, Cpu,
  Sparkles, ChevronRight, Home, Truck, ShoppingCart, Briefcase, Tag
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
    async function loadMenuData() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
        .from('profiles')
        .select('role, organization_id, organizations(name, business_type)')
        .eq('id', user.id)
        .single()

        if (profile) {
            const p = profile as any
            const org = Array.isArray(p.organizations) ? p.organizations[0] : p.organizations
            
            setRole(p.role)
            setOrgId(p.organization_id)
            setOrgName(org?.name || 'Zytech')
            setBusinessType(org?.business_type || 'commerce')
        }
    }
    loadMenuData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const getNavItems = () => {
    if (role === 'super_admin') {
      return [
        { name: 'Visão Geral', href: '/dashboard', icon: BarChart },
        { name: 'Gestão de Clientes', href: '/dashboard/clients', icon: Users },
        { name: 'Planos & Preços', href: '/dashboard/plans', icon: Tag },
        { name: 'Financeiro', href: '/dashboard/finance', icon: DollarSign },
        { name: 'Sistema', href: '/dashboard/system', icon: Cpu },
        { name: 'Suporte', href: '/dashboard/support', icon: LifeBuoy },
        { name: 'Configurações', href: '/dashboard/settings', icon: Settings },
      ]
    }

    const items = [
      { name: 'Início', href: '/dashboard', icon: LayoutDashboard },
    ]

    if (businessType === 'commerce' || businessType === 'service') {
      items.push({ name: 'Agendamentos', href: '/dashboard/appointments', icon: Calendar })
    }

    if (orgId) {
        let label = 'Minha Loja'
        let Icon = ShoppingBag
        
        if (businessType === 'delivery') { label = 'Meu Delivery'; Icon = Truck }
        else if (businessType === 'real_estate') { label = 'Meus Imóveis'; Icon = Home }
        else if (businessType === 'service') { label = 'Meus Serviços'; Icon = Briefcase }

        items.push({ 
            name: label, 
            href: `/dashboard/clients/${orgId}`, 
            icon: Icon 
        })
    }

    items.push({ name: 'Ajuda', href: '/dashboard/support', icon: LifeBuoy })
    return items
  }

  const navItems = getNavItems()

  return (
    <ApprovalGuard>
        <div className="min-h-screen bg-[#050505] text-gray-100 flex font-sans selection:bg-blue-500/30">
        
        <aside className="hidden md:flex flex-col w-72 border-r border-white/5 bg-[#0a0a0a] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-64 bg-blue-600/5 blur-3xl pointer-events-none"></div>

            <div className="p-8 border-b border-white/5 flex items-center gap-4 relative z-10">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.15)] group">
                <Image 
                src="/icon.jpg" 
                alt="Logo" 
                fill 
                className="object-cover transition-transform duration-500 group-hover:scale-110" 
                priority
                />
            </div>
            <div className="flex flex-col">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 tracking-tight flex items-center gap-2">
                ZYTECH <Sparkles size={12} className="text-blue-400 animate-pulse"/>
                </h1>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest truncate max-w-[120px]">
                {role === 'super_admin' ? 'Administration' : 'Gestão'}
                </p>
            </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar relative z-10">
            <p className="px-4 py-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Navegação</p>
            {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                <Link key={item.href} href={item.href} className={`group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-blue-600/10 text-white border border-blue-500/20 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'}`}>
                    <div className="flex items-center gap-3">
                        <item.icon size={18} className={`transition-colors duration-300 ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                        <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    {isActive && <ChevronRight size={14} className="text-blue-500 opacity-100" />}
                </Link>
                )
            })}
            </nav>

            <div className="p-4 border-t border-white/5 relative z-10">
            <div className="bg-white/5 rounded-xl p-1 mb-3">
                <div className="flex items-center gap-3 p-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold shrink-0 shadow-lg text-white">
                    {orgName ? orgName.charAt(0).toUpperCase() : 'Z'}
                    </div>
                    <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate w-32">{orgName || 'Carregando...'}</p>
                    <p className="text-[10px] text-gray-400 truncate">{role === 'super_admin' ? 'Super Admin' : 'Admin'}</p>
                    </div>
                </div>
            </div>
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-4 py-2.5 w-full text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200 border border-transparent hover:border-red-500/20 group">
                <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
                <span>DESCONECTAR</span>
            </button>
            </div>
        </aside>

        <main className="flex-1 flex flex-col h-screen overflow-hidden bg-black relative">
            <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none"></div>

            <header className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md z-50 sticky top-0">
            <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-white/10">
                    <Image src="/icon.jpg" alt="Logo" fill className="object-cover" />
                </div>
                <span className="font-bold text-lg text-white tracking-tight">ZYTECH</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            </header>
            
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-[70px] left-0 w-full bg-[#0a0a0a] border-b border-white/10 p-4 space-y-2 z-40 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-2">
                    <p className="px-2 py-1 text-[10px] font-bold text-gray-600 uppercase">Menu</p>
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-blue-600/10 hover:text-blue-400 transition-colors">
                            <item.icon size={20} /> <span className="font-medium">{item.name}</span>
                        </Link>
                    ))}
                    <div className="h-px bg-white/10 my-2"></div>
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <LogOut size={20} /> <span className="font-medium">Sair</span>
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-auto p-4 md:p-8 lg:p-10 relative z-10 custom-scrollbar">
            <div className="max-w-7xl mx-auto w-full">
                {children}
            </div>
            </div>
        </main>
        </div>
    </ApprovalGuard>
  )
}