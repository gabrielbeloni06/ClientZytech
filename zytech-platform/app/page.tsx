'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const clearSession = async () => {
      await supabase.auth.signOut()
    }
    clearSession()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        alert('Erro ao entrar: ' + error.message)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      alert('Erro inesperado. Tente recarregar a página.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="w-full max-w-md space-y-8 bg-[#111] p-8 border border-[#333] rounded-2xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 mb-2">
            ZYTECH
          </h1>
          <p className="text-sm text-gray-400">Sistema de Gestão Integrada</p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Corporativo</label>
              <input
                id="email"
                type="email"
                required
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder-gray-600 transition-all"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha</label>
              <input
                id="password"
                type="password"
                required
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder-gray-600 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
          >
            {loading ? 'Validando...' : 'Acessar Painel'}
          </button>
        </form>
        
        <p className="text-center text-xs text-gray-600 mt-4">
          Esqueceu a senha? Contate o suporte técnico.
        </p>
      </div>
    </div>
  )
}