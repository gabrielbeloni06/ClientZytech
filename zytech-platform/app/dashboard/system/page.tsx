'use client'
import { Cpu, Server, Shield, Database, Activity, CheckCircle } from 'lucide-react'

export default function SystemPage() {
  const systemPlans = [
    { name: 'ZyStart', type: 'Delivery/Comércio', color: 'text-orange-400 border-orange-400/50', bg: 'bg-orange-400/10' },
    { name: 'ZyControl', type: 'Delivery/Comércio', color: 'text-gray-300 border-gray-400/50', bg: 'bg-gray-400/10' },
    { name: 'ZyBotAI', type: 'Delivery/Comércio', color: 'text-yellow-400 border-yellow-400/50', bg: 'bg-yellow-400/10' },
    { name: 'ZyCore', type: 'Delivery/Comércio', color: 'text-[#9b111e] border-[#9b111e]/50', bg: 'bg-[#9b111e]/10' },
    { name: 'ZyAuto', type: 'Automação', color: 'text-yellow-400 border-yellow-400/50', bg: 'bg-yellow-400/10' },
    { name: 'Website Start', type: 'Website', color: 'text-orange-400 border-orange-400/50', bg: 'bg-orange-400/10' },
    { name: 'Website Control', type: 'Website', color: 'text-gray-300 border-gray-400/50', bg: 'bg-gray-400/10' },
    { name: 'Website Core', type: 'Website', color: 'text-[#9b111e] border-[#9b111e]/50', bg: 'bg-[#9b111e]/10' },
  ]

  return (
    <div className="space-y-8 text-white">
      <div className="border-b border-[#333] pb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
            <Cpu className="text-blue-500" size={32}/> Sistema Zytech
        </h1>
        <p className="text-gray-400 mt-1">Configurações globais e gestão de planos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-[#111] border border-[#333] rounded-xl">
            <h3 className="font-bold flex items-center gap-2 mb-4"><Activity className="text-green-500"/> Status Operacional</h3>
            <div className="flex items-center gap-2 text-green-400 bg-green-900/20 p-3 rounded border border-green-900/50">
                <CheckCircle size={16}/> <span>Sistema 100% Online</span>
            </div>
        </div>
        
        <div className="p-6 bg-[#111] border border-[#333] rounded-xl">
            <h3 className="font-bold flex items-center gap-2 mb-4"><Database className="text-purple-500"/> Banco de Dados</h3>
            <div className="flex items-center gap-2 text-purple-400 bg-purple-900/20 p-3 rounded border border-purple-900/50">
                <Server size={16}/> <span>Conectado (Supabase)</span>
            </div>
        </div>

        <div className="p-6 bg-[#111] border border-[#333] rounded-xl">
            <h3 className="font-bold flex items-center gap-2 mb-4"><Shield className="text-blue-500"/> Versão</h3>
            <div className="flex items-center gap-2 text-blue-400 bg-blue-900/20 p-3 rounded border border-blue-900/50">
                <span>v1.2.0 (Stable)</span>
            </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Planos Disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {systemPlans.map((plan) => (
                <div key={plan.name} className={`p-4 bg-[#111] border rounded-xl flex flex-col justify-between ${plan.color.split(' ')[1]}`}>
                    <div>
                        <span className="text-xs text-gray-500 uppercase font-bold">{plan.type}</span>
                        <h3 className={`font-bold text-lg mt-1 ${plan.color.split(' ')[0]}`}>{plan.name}</h3>
                    </div>
                    <div className="mt-4 pt-4 border-t border-[#222]">
                        <span className={`text-xs px-2 py-1 rounded font-bold ${plan.bg} ${plan.color.split(' ')[0]}`}>ATIVO</span>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  )
}