'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCcw, Smartphone, CheckCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function QrCodePage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params?.id

  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [clientName, setClientName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (clientId) {
      fetchClientInfo()
      generateQrUrl()
    }
  }, [clientId])

  async function fetchClientInfo() {
    const { data } = await supabase.from('organizations').select('name').eq('id', clientId).single()
    if (data) setClientName(data.name)
  }

  function generateQrUrl() {
    setLoading(true)
    setError('')
    const url = `/api/whatsapp/qr?orgId=${clientId}&t=${Date.now()}`
    setQrUrl(url)
  }

  const handleImageLoad = () => {
    setLoading(false)
  }

  const handleImageError = () => {
    setLoading(false)
    setError('Não foi possível carregar o QR Code. Verifique se as credenciais Z-API estão salvas corretamente ou se a instância já está conectada.')
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">

      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-green-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="w-full max-w-md z-10 space-y-6">
        <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-bold"
        >
            <ArrowLeft size={16}/> Voltar para Configurações
        </button>

        <div className="bg-[#0F0F11] border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6 text-green-500 border border-green-500/20">
                <Smartphone size={32}/>
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Conectar WhatsApp</h1>
            <p className="text-zinc-400 text-sm mb-8">
                Escaneie o código abaixo para conectar o bot da <strong>{clientName || 'Empresa'}</strong>.
            </p>

            <div className="bg-white p-4 rounded-xl shadow-inner mb-6 relative w-64 h-64 flex items-center justify-center bg-white">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10">
                        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                
                {error ? (
                    <div className="text-red-500 text-xs px-4 flex flex-col items-center gap-2">
                        <AlertTriangle size={24}/>
                        <span>{error}</span>
                    </div>
                ) : (
                    <img 
                        src={qrUrl || ''} 
                        alt="QR Code Z-API" 
                        className="w-full h-full object-contain"
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                    />
                )}
            </div>

            <div className="space-y-4 w-full">
                <div className="text-xs text-zinc-500 bg-zinc-900/50 p-4 rounded-lg text-left space-y-2 border border-white/5">
                    <p className="flex items-center gap-2"><span className="bg-zinc-800 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">1</span> Abra o WhatsApp no seu celular.</p>
                    <p className="flex items-center gap-2"><span className="bg-zinc-800 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">2</span> Toque em Configurações {'>'} Aparelhos conectados.</p>
                    <p className="flex items-center gap-2"><span className="bg-zinc-800 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">3</span> Aponte a câmera para esta tela.</p>
                </div>

                <button 
                    onClick={generateQrUrl}
                    className="w-full py-3 bg-white hover:bg-zinc-200 text-black rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                >
                    <RefreshCcw size={16}/> Gerar Novo Código
                </button>
            </div>
        </div>
      </div>
    </div>
  )
}