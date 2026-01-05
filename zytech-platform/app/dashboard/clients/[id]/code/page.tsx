'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, QrCode } from 'lucide-react'

type Status = 'idle' | 'loading' | 'qrcode' | 'connected' | 'error'

export default function ConnectBotPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialInstance = searchParams.get('instance') || ''
  const [instanceName, setInstanceName] = useState(initialInstance)
  const [status, setStatus] = useState<Status>('idle')
  const [qr, setQr] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)

  async function startConnection() {
    if (!instanceName) {
      setError('Informe o nome da instância')
      setStatus('error')
      return
    }

    setStatus('loading')
    setQr(null)
    setError(null)

    // 1️⃣ Cria a instância (API Route)
    const res = await fetch('/api/bot/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceName })
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Erro ao criar instância')
      setStatus('error')
      return
    }

    // 2️⃣ Conecta no WebSocket da Evolution
    const ws = new WebSocket(
      `ws://${process.env.NEXT_PUBLIC_EVOLUTION_WS_HOST}:8080/?apikey=${process.env.NEXT_PUBLIC_EVOLUTION_API_KEY}`
    )

    wsRef.current = ws

    ws.onopen = () => {
      console.log('WS conectado')
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      // QR Code
      if (
        data?.event === 'qrcode' &&
        data?.instance === instanceName &&
        data?.qrcode
      ) {
        setQr(data.qrcode)
        setStatus('qrcode')
      }

      // Conectado
      if (
        data?.event === 'connection.update' &&
        data?.instance === instanceName &&
        data?.state === 'open'
      ) {
        setStatus('connected')
        ws.close()
      }
    }

    ws.onerror = () => {
      setError('Erro no WebSocket')
      setStatus('error')
    }
  }

  useEffect(() => {
    if (initialInstance) {
      startConnection()
    }

    return () => {
      wsRef.current?.close()
    }
  }, [])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-xl p-6 space-y-6">

        <h1 className="text-xl font-bold text-center">Conectar WhatsApp</h1>

        <input
          value={instanceName}
          onChange={e => setInstanceName(e.target.value)}
          placeholder="nome_da_instancia"
          className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm"
        />

        {status === 'idle' && (
          <button
            onClick={startConnection}
            className="w-full bg-green-600 rounded-lg py-2 font-bold"
          >
            Gerar QR Code
          </button>
        )}

        {status === 'loading' && (
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
            <Loader2 className="animate-spin" />
            Iniciando conexão...
          </div>
        )}

        {status === 'qrcode' && qr && (
          <div className="flex flex-col items-center gap-4">
            <img
              src={`data:image/png;base64,${qr}`}
              className="w-64 h-64 bg-white p-3 rounded-lg"
            />
            <p className="text-xs text-zinc-400">
              WhatsApp {'>'} Aparelhos conectados
            </p>
          </div>
        )}

        {status === 'connected' && (
          <p className="text-center text-green-500 font-bold">
            ✅ WhatsApp conectado com sucesso
          </p>
        )}

        {status === 'error' && (
          <p className="text-center text-red-500 text-sm">{error}</p>
        )}
      </div>
    </div>
  )
}
