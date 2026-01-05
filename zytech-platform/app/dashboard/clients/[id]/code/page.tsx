'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, RefreshCcw, QrCode as QrIcon } from 'lucide-react'

type Status =
  | 'idle'
  | 'loading'
  | 'qrcode'
  | 'connected'
  | 'error'

export default function ConnectBotPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Pega o nome da instância vindo da URL (ex: ?instance=imobiliaria_01)
  const initialInstanceName = searchParams.get('instance') || ''

  const [instanceName, setInstanceName] = useState(initialInstanceName)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const retryTimer = useRef<NodeJS.Timeout | null>(null)

  // Dispara automaticamente se vier o nome na URL
  useEffect(() => {
    if (initialInstanceName) {
        requestQr(initialInstanceName)
    }
  }, [initialInstanceName])

  async function requestQr(nameToConnect: string) {
    if (!nameToConnect.trim()) {
      setError('Informe o nome da instância')
      setStatus('error')
      return
    }

    setStatus('loading')
    setQrCode(null)
    setError(null)

    try {
      const res = await fetch('/api/bot/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: nameToConnect })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar QR')
      }

      if (!data.qrcode) {
        throw new Error('QR não retornado pela API')
      }

      setQrCode(data.qrcode)
      setStatus('qrcode')

      // ⏱ auto refresh do QR (WhatsApp expira a cada 40s aprox)
      if (retryTimer.current) clearTimeout(retryTimer.current)
      retryTimer.current = setTimeout(() => {
        requestQr(nameToConnect)
      }, 40_000)

    } catch (err: any) {
      setError(err.message)
      setStatus('error')
    }
  }

  function resetAll() {
    if (retryTimer.current) clearTimeout(retryTimer.current)
    setQrCode(null)
    setStatus('idle')
    setError(null)
  }

  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#020202] text-white flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-6 shadow-2xl relative z-10">
        
        <button 
            onClick={() => router.back()} 
            className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
        >
            <ArrowLeft size={20} />
        </button>

        <div className="text-center pt-2">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                <QrIcon size={32} className="text-green-500" />
            </div>
            <h1 className="text-2xl font-bold">Conectar WhatsApp</h1>
            <p className="text-sm text-gray-500 mt-2">Sincronize o número do cliente com a VPS.</p>
        </div>

        <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nome da Instância (ID)</label>
            <input
            type="text"
            placeholder="Ex: imobiliaria_clientzy_01"
            value={instanceName}
            onChange={e => {
                setInstanceName(e.target.value)
                resetAll()
            }}
            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 outline-none text-white focus:border-green-500 transition-colors font-mono text-sm"
            />
        </div>

        {status !== 'qrcode' && (
          <button
            onClick={() => requestQr(instanceName)}
            disabled={status === 'loading'}
            className="w-full bg-green-600 hover:bg-green-500 text-white transition-all rounded-xl py-3.5 font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
          >
            {status === 'loading' ? <Loader2 className="animate-spin" /> : <QrIcon size={18} />}
            {status === 'loading' ? 'Conectando ao Servidor...' : 'Gerar QR Code'}
          </button>
        )}

        {status === 'loading' && (
          <p className="text-center text-xs text-gray-500 animate-pulse px-4">
            Isso pode levar até 20 segundos enquanto a VPS inicia o navegador...
          </p>
        )}

        {status === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center space-y-3">
            <p className="text-red-400 text-sm font-medium">{error}</p>
            <button
              onClick={() => requestQr(instanceName)}
              className="text-xs text-red-300 hover:text-white underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {status === 'qrcode' && qrCode && (
          <div className="flex flex-col items-center gap-6 pt-4 animate-in zoom-in duration-300">
            <div className="bg-white p-4 rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.2)]">
              <img
                src={`data:image/png;base64,${qrCode}`}
                alt="QR Code WhatsApp"
                className="w-64 h-64 object-contain"
              />
            </div>

            <div className="text-center space-y-2">
                <p className="text-sm text-white font-bold">Abra o WhatsApp {'>'} Aparelhos Conectados</p>
                <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                    <RefreshCcw size={12} className="animate-spin text-green-500"/> Atualiza automaticamente
                </p>
            </div>
            
            <button 
                onClick={() => router.back()}
                className="text-xs text-gray-500 hover:text-white mt-2 border border-white/10 px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
                Voltar quando conectar
            </button>
          </div>
        )}

      </div>
    </div>
  )
}