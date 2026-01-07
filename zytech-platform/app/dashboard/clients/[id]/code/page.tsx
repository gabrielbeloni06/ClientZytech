'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCcw, Smartphone, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function QrCodePage() {
  const params = useParams()
  const router = useRouter()
  const clientId = Array.isArray(params?.id) ? params.id[0] : params?.id

  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [clientName, setClientName] = useState('')
  const [error, setError] = useState('')
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (clientId && !isConnected) {
      fetchClientInfo()
      fetchQrCode()
      
      interval = setInterval(fetchQrCode, 20000)
    }

    return () => clearInterval(interval)
  }, [clientId, isConnected])

  async function fetchClientInfo() {
    if (!clientId) return
    const { data } = await supabase.from('organizations').select('name').eq('id', clientId).single()
    if (data) setClientName(data.name)
  }

  async function fetchQrCode() {
    if (!qrBase64) setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/whatsapp/qr?orgId=${clientId}&t=${Date.now()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao buscar QR Code')
      }

      if (data.connected) {
        setIsConnected(true)
        setQrBase64(null)
        setLoading(false)
        return
      }

      if (data.qr) {
        setQrBase64(data.qr)
        setIsConnected(false)
      } else {
        throw new Error('QR Code veio vazio da API.')
      }

    } catch (err: any) {
      console.error(err)
      if (!qrBase64) setError(err.message)
    } finally {
      setLoading(false)
    }
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
            
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 border transition-colors ${isConnected ? 'bg-green-500/20 text-green-500 border-green-500/50' : 'bg-zinc-800/50 text-white border-white/10'}`}>
                {isConnected ? <CheckCircle2 size={32}/> : <Smartphone size={32}/>}
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
                {isConnected ? 'WhatsApp Conectado!' : 'Conectar WhatsApp'}
            </h1>
            
            {!isConnected && (
                <p className="text-zinc-400 text-sm mb-8">
                    Escaneie o código para conectar o bot da <strong>{clientName || 'Empresa'}</strong>.
                </p>
            )}

            <div className="bg-white p-4 rounded-xl shadow-inner mb-6 relative w-64 h-64 flex items-center justify-center overflow-hidden">
                
                {isConnected ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-50 z-20 text-green-600">
                        <CheckCircle2 size={64} className="mb-4 animate-bounce"/>
                        <span className="text-sm font-bold text-zinc-800">Tudo pronto!</span>
                        <span className="text-xs text-zinc-500">Pode voltar para o painel.</span>
                    </div>
                ) : loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/95 z-20">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="animate-spin text-green-600" size={32}/>
                            <span className="text-xs text-zinc-500 font-bold">Buscando QR na Z-API...</span>
                        </div>
                    </div>
                ) : error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-red-600 px-4 bg-white z-10">
                        <AlertTriangle size={32} className="mb-2"/>
                        <span className="text-xs font-bold text-center break-words w-full">{error}</span>
                        <button onClick={() => fetchQrCode()} className="mt-4 text-[10px] bg-red-100 px-3 py-1 rounded-full hover:bg-red-200 transition-colors">
                            Tentar Novamente
                        </button>
                    </div>
                ) : qrBase64 && (
                    <img 
                        src={qrBase64} 
                        alt="QR Code Z-API" 
                        className="w-full h-full object-contain"
                    />
                )}
            </div>

            {!isConnected && (
                <div className="space-y-4 w-full">
                    <div className="text-xs text-zinc-500 bg-zinc-900/50 p-4 rounded-lg text-left space-y-2 border border-white/5">
                        <p className="flex items-center gap-2"><span className="bg-zinc-800 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">1</span> Abra o WhatsApp &gt; Configurações.</p>
                        <p className="flex items-center gap-2"><span className="bg-zinc-800 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">2</span> Toque em Aparelhos conectados.</p>
                        <p className="flex items-center gap-2"><span className="bg-zinc-800 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">3</span> Aponte a câmera para esta tela.</p>
                    </div>

                    <button 
                        onClick={() => fetchQrCode()}
                        className="w-full py-3 bg-white hover:bg-zinc-200 text-black rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <RefreshCcw size={16}/> Atualizar Código
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}