'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Industry { id: string; name: string; icon: string | null }

export function NewOrgForm({ industries }: { industries: Industry[] }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [comment, setComment] = useState('')
  const [industryId, setIndustryId] = useState('')
  const [plan, setPlan] = useState('BASIC')
  const [userLimit, setUserLimit] = useState(5)
  const [aiEnabled, setAiEnabled] = useState(false)

  function handleNameChange(v: string) {
    setName(v)
    setSlug(v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, comment, industryId: industryId || null, plan, userLimit, aiEnabled }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Ошибка'); setSaving(false); return }
    router.push(`/organizations/${data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[#1e2535] rounded-xl overflow-hidden">
      <div className="p-4 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Название *</label>
          <input required value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Uzbfreight LLC"
            className="w-full px-3 py-2 bg-[#0d1018] border border-[#1e2535] rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Slug *</label>
          <input required value={slug} onChange={e => setSlug(e.target.value)} placeholder="uzbfreight-llc"
            className="w-full px-3 py-2 bg-[#0d1018] border border-[#1e2535] rounded-lg text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
          <p className="text-xs text-slate-600 mt-1">Только латиница, цифры и дефисы</p>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Отрасль</label>
          <select value={industryId} onChange={e => setIndustryId(e.target.value)}
            className="w-full px-3 py-2 bg-[#0d1018] border border-[#1e2535] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/50">
            <option value="">— Не выбрана —</option>
            {industries.map(i => <option key={i.id} value={i.id}>{i.icon} {i.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Тариф</label>
          <select value={plan} onChange={e => setPlan(e.target.value)}
            className="w-full px-3 py-2 bg-[#0d1018] border border-[#1e2535] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/50">
            <option value="BASIC">BASIC</option>
            <option value="PRO">PRO</option>
            <option value="ENTERPRISE">ENTERPRISE</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Лимит пользователей</label>
          <input type="number" min={1} max={500} value={userLimit} onChange={e => setUserLimit(Number(e.target.value))}
            className="w-full px-3 py-2 bg-[#0d1018] border border-[#1e2535] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/50" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">AI анализ</label>
          <div className="flex items-center h-[38px]">
            <div onClick={() => setAiEnabled(!aiEnabled)} className="cursor-pointer">
              <div className={`relative w-10 h-5 rounded-full transition-colors ${aiEnabled ? 'bg-green-500' : 'bg-[#1e2535]'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${aiEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </div>
            <span className="ml-3 text-sm text-slate-400">{aiEnabled ? 'Включён' : 'Выключен'}</span>
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Комментарий</label>
          <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Логистическая компания..."
            className="w-full px-3 py-2 bg-[#0d1018] border border-[#1e2535] rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
        </div>
      </div>
      {error && (
        <div className="mx-4 mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
      <div className="px-4 py-3 border-t border-[#1e2535] flex justify-between items-center">
        <a href="/organizations" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Отмена</a>
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all">
          {saving ? 'Создаём...' : 'Создать организацию'}
        </button>
      </div>
    </form>
  )
}
