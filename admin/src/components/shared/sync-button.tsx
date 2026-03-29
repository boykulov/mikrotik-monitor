'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SyncButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{added: number; skipped: number; total: number} | null>(null)
  const [error, setError] = useState('')

  async function sync() {
    setLoading(true)
    setResult(null)
    setError('')
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setResult(data.stats)
        router.refresh()
      } else {
        setError(data.error || 'Ошибка синхронизации')
      }
    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg">
          ✓ +{result.added} новых · {result.total} всего
        </span>
      )}
      {error && (
        <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg">
          ✗ {error}
        </span>
      )}
      <button
        onClick={sync}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-[#1a1f2e] hover:bg-[#1e2535] border border-[#1e2535] hover:border-blue-500/30 text-slate-300 hover:text-white text-sm rounded-lg transition-all disabled:opacity-50"
      >
        <span className={loading ? 'animate-spin inline-block' : ''}>⟳</span>
        {loading ? 'Синхронизация...' : 'Синхронизировать с v1.0'}
      </button>
    </div>
  )
}
