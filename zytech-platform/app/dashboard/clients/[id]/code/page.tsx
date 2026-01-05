'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, RefreshCcw, QrCode as QrIcon, CheckCircle, AlertCircle } from 'lucide-react'

export default function ConnectBotPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialInstanceName = searchParams.get('instance') || ''

  const [instanceName, setInstanceName] = useState(initialInstanceName)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'qrcode' | 'connected' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const pollingTimer = useRef<NodeJS.Timeout | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true;
    return () => { 
        isMounted.current = false;
        if (pollingTimer.current) clearTimeout(pollingTimer.current);
    }
  }, [])

  async function requestQr(nameToConnect: string) {
    if (!nameToConnect.trim()) return

    // Só mostra loading na primeira vez ou se não tiver QR na tela
    if (status !== 'qrcode') {
        setStatus('loading')
        setMessage("Conectando ao servidor...")
    }

    try {
      const res = await fetch('/api/bot/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: nameToConnect })
      })

      const data = await res.json()

      if (!isMounted.current) return;

      if (!res.ok) throw new Error(data.error || 'Erro na API')

      // 1. Conectado
      if (data.status === 'connected') {
          setStatus('connected')
          return
      }

      // 2. Loading (VPS bootando) -> Tenta de novo em 3s
      if (data.status === 'loading') {
          setStatus('loading')
          setMessage(data.message || "Aguardando servidor...")
          
          if (pollingTimer.current) clearTimeout(pollingTimer.current)
          pollingTimer.current = setTimeout(() => {
              if (isMounted.current) requestQr(nameToConnect)
          }, 3000)
          return
      }

      // 3. QR Code Recebido
      if (data.status === 'qrcode' && data.qrcode) {
          setQrCode(data.qrcode)
          setStatus('qrcode')
          
          // Refresh preventivo a cada 30s
          if (pollingTimer.current) clearTimeout(pollingTimer.current)
          pollingTimer.current = setTimeout(() => {
              if (isMounted.current) requestQr(nameToConnect)
          }, 30000)
      }

    } catch (err: any) {
      if (!isMounted.current) return;
      setStatus('error')
      setMessage(err.message)
    }
  }

  // Auto-start
  useEffect(() => {
    if (initialInstanceName) {
        requestQr(initialInstanceName)
    }
  }, [initialInstanceName])

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
            onChange={e => setInstanceName(e.target.value)}
            disabled={status === 'loading'}
            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 outline-none text-white focus:border-green-500 transition-colors font-mono text-sm disabled:opacity-50"
            />
        </div>

        {/* STATUS: LOADING */}
        {status === 'loading' && (
          <div className="flex flex-col items-center py-8 space-y-4 bg-white/5 rounded-xl border border-white/5 animate-in fade-in">
              <div className="relative">
                  <div className="w-10 h-10 border-4 border-green-600/30 border-t-green-500 rounded-full animate-spin"></div>
              </div>
              <div className="text-center">
                  <p className="text-sm text-white font-medium animate-pulse">{message}</p>
                  <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] mx-auto">
                    Isso pode levar alguns segundos na primeira vez.
                  </p>
              </div>
          </div>
        )}

        {/* STATUS: IDLE */}
        {status === 'idle' && (
          <button
            onClick={() => requestQr(instanceName)}
            disabled={!instanceName}
            className="w-full bg-green-600 hover:bg-green-500 text-white transition-all rounded-xl py-3.5 font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
          >
            <QrIcon size={18} />
            Gerar QR Code
          </button>
        )}

        {/* STATUS: ERRO */}
        {status === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center space-y-3 animate-in shake">
            <AlertCircle size={28} className="text-red-500 mx-auto" />
            <p className="text-red-400 text-sm font-medium">{message}</p>
            <button
              onClick={() => requestQr(instanceName)}
              className="text-xs text-red-300 hover:text-white underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* STATUS: QR CODE */}
        {status === 'qrcode' && qrCode && (
          <div className="flex flex-col items-center gap-6 pt-2 animate-in zoom-in duration-300">
            <div className="bg-white p-4 rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.2)]">
              <img
                src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                alt="QR Code WhatsApp"
                className="w-64 h-64 object-contain"
              />
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
                <RefreshCcw size={10} className="animate-spin"/> Atualizando...
            </p>
          </div>
        )}

        {/* STATUS: CONECTADO */}
        {status === 'connected' && (
          <div className="flex flex-col items-center py-10 space-y-6 animate-in fade-in zoom-in">
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/40 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                  <CheckCircle size={48} className="text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Conectado!</h2>
              <button onClick={() => router.back()} className="w-full bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold transition-all">
                  Voltar
              </button>
          </div>
        )}

      </div>
    </div>
  )
}