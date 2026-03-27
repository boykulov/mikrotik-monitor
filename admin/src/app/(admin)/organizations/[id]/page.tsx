import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { OrgActions } from './org-actions'

async function getOrg(id: string) {
  return prisma.organization.findUnique({
    where: { id },
    include: {
      industry: true,
      devices: { orderBy: { createdAt: 'desc' } },
      users: { include: { user: true } },
      _count: { select: { domains: true, categories: true } },
    },
  })
}

async function getIndustries() {
  return prisma.industry.findMany({ orderBy: { name: 'asc' } })
}

const planColors: Record<string, string> = {
  BASIC:      'bg-slate-500/10 text-slate-400 border-slate-500/20',
  PRO:        'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ENTERPRISE: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const statusColors: Record<string, string> = {
  ONLINE:  'text-green-400',
  OFFLINE: 'text-red-400',
  ERROR:   'text-amber-400',
  UNKNOWN: 'text-slate-500',
}

export default async function OrgPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [org, industries] = await Promise.all([getOrg(id), getIndustries()])
  if (!org) notFound()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/organizations" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          ← Организации
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-sm text-slate-300">{org.name}</span>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1a1f2e] border border-[#1e2535] flex items-center justify-center">
            <span className="text-lg text-slate-400 font-medium">{org.name.slice(0,2).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{org.name}</h1>
            <p className="text-sm text-slate-500">{org.slug} {org.comment && `· ${org.comment}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded border text-xs font-medium ${planColors[org.plan]}`}>{org.plan}</span>
          <span className={`px-2 py-0.5 rounded border text-xs ${org.isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
            {org.isActive ? 'Активна' : 'Отключена'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Устройств',     value: org.devices.length },
          { label: 'Пользователей', value: `${org.users.length} / ${org.userLimit}` },
          { label: 'Доменов',       value: org._count.domains },
          { label: 'Категорий',     value: org._count.categories },
          { label: 'Отрасль',       value: org.industry ? `${org.industry.icon} ${org.industry.name}` : '—' },
          { label: 'Создана',       value: new Date(org.createdAt).toLocaleDateString('ru') },
        ].map(item => (
          <div key={item.label} className="bg-[#0d1018] border border-[#1e2535] rounded-xl p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{item.label}</div>
            <div className="text-lg font-medium text-white">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Actions panel */}
      <OrgActions org={{
        id: org.id,
        aiEnabled: org.aiEnabled,
        isActive: org.isActive,
        userLimit: org.userLimit,
        plan: org.plan,
        industryId: org.industryId,
        name: org.name,
        slug: org.slug,
        comment: org.comment,
      }} industries={industries} />

      {/* Devices */}
      <div className="border border-[#1e2535] rounded-xl overflow-hidden mt-6">
        <div className="px-4 py-3 border-b border-[#1e2535] flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-200">Устройства MikroTik</h2>
          <span className="text-xs text-slate-500">{org.devices.length} шт.</span>
        </div>
        {org.devices.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-600">Устройств нет</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e2535] bg-[#0d1018]">
                <th className="px-4 py-2 text-left text-xs text-slate-500">Название</th>
                <th className="px-4 py-2 text-left text-xs text-slate-500">IP</th>
                <th className="px-4 py-2 text-left text-xs text-slate-500">Модель</th>
                <th className="px-4 py-2 text-center text-xs text-slate-500">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2535]">
              {org.devices.map(d => (
                <tr key={d.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-sm text-slate-200">{d.name}</td>
                  <td className="px-4 py-2.5 text-sm font-mono text-slate-400">{d.ip}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-500">{d.model || '—'}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-xs font-medium ${statusColors[d.status]}`}>{d.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Users */}
      <div className="border border-[#1e2535] rounded-xl overflow-hidden mt-4">
        <div className="px-4 py-3 border-b border-[#1e2535] flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-200">Пользователи</h2>
          <span className="text-xs text-slate-500">{org.users.length} / {org.userLimit}</span>
        </div>
        {org.users.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-600">Пользователей нет</div>
        ) : (
          <div className="divide-y divide-[#1e2535]">
            {org.users.map(u => (
              <div key={u.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-blue-400 font-medium">
                    {u.user.firstName[0]}{u.user.lastName[0]}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-200">{u.user.firstName} {u.user.lastName}</div>
                  <div className="text-xs text-slate-500">{u.user.email}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-[#1a1f2e] text-slate-400">{u.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
