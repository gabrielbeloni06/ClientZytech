export default function DashboardHome() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white">Dashboard</h2>
        <p className="text-gray-400">Bem-vindo ao painel de controle.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-[#111] border border-[#333] hover:border-blue-500/50 transition-colors">
          <h3 className="text-gray-400 text-sm font-medium">Faturamento Hoje</h3>
          <p className="text-3xl font-bold text-white mt-2">R$ 0,00</p>
          <span className="text-xs text-green-500 mt-1 block">+0% vs ontem</span>
        </div>
        <div className="p-6 rounded-xl bg-[#111] border border-[#333] hover:border-purple-500/50 transition-colors">
          <h3 className="text-gray-400 text-sm font-medium">Pedidos Ativos</h3>
          <p className="text-3xl font-bold text-white mt-2">0</p>
          <span className="text-xs text-blue-500 mt-1 block">Aguardando início</span>
        </div>
        <div className="p-6 rounded-xl bg-[#111] border border-[#333] hover:border-pink-500/50 transition-colors">
          <h3 className="text-gray-400 text-sm font-medium">Clientes Ativos</h3>
          <p className="text-3xl font-bold text-white mt-2">1</p>
          <span className="text-xs text-gray-500 mt-1 block">Plano Admin</span>
        </div>
      </div>
    </div>
  )
}