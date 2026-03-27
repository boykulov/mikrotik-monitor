'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Industry { id: string; name: string; icon: string | null; slug: string }
interface OrgData {
  id: string; aiEnabled: boolean; isActive: boolean; userLimit: number
  plan: string; industryId: string | null; name: string; slug: string; comment: string | null
}

export function OrgActions({ org, industries }: { org: OrgData; industries: Industry[] }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(org.name)
  const [comment, setComment] = useState(org.comment || '')
  const [industryId, setIndustryId] = useState(org.industryId || '')
  const [plan, setPlan] = useState(org.plan)
  const [userLimit, setUserLimit] = useState(org.userLimit)
  const [aiEnabled, setAiEnabled] = useState(org.aiEnabled)
  const [isActive, setIsActive] = useState(org.isActive)

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/organizations/${org.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, comment, industryId: industryId || null, plan, userLimit, aiEnabled, isActive }),
    })
    setSaving(false)
    if (res.ok) router.refresh()
  }

  return (
    <div className="border border-[#1e2535] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1e2535] bg-[#0d1018]">
        <h2 className="text-sm font-medium text-slate-200">Настройки организации</h2>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Название</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 bg-[#0d1018] border border-[#1e2535] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/50" />
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
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Комментарий</label>
          <input value={comment} onChange={e => setComment(e.target.value)}
            className="w-full px-3 py-2 bg-[#0d1018] border border-[#1e2535] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/50" />
        </div>
        <div className="col-span-2 flex items-center gap-6 py-1">
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setAiEnabled(!aiEnabled)}
              className={`relative w-10 h-5 rounded-full transition-colors ${aiEnabled ? 'bg-green-500' : 'bg-[#1e2535]'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${aiEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-slate-300">AI анализ</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setIsActive(!isActive)}
              className={`relative w-10 h-5 rounded-full transition-colors ${isActive ? 'bg-blue-500' : 'bg-[#1e2535]'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-slate-300">Организация активна</span>
          </label>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-[#1e2535] flex justify-end">
        <button onClick={save} disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all">
          {saving ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}
