'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Ошибка входа'); setLoading(false); return }
      router.push('/dashboard')
    } catch {
      setError('Ошибка соединения')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#63b3ed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white">NebulaNet</h1>
          <p className="text-sm text-slate-500 mt-1">Super Admin Portal v2.0</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="admin@nebulanet.local"
              className="w-full px-3 py-2.5 bg-[#1a1f2e] border border-[#1e2535] rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-[#1a1f2e] border border-[#1e2535] rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all mt-2"
          >
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-6">NebulaNet Network Monitor v2.0</p>
      </div>
    </div>
  )
}
