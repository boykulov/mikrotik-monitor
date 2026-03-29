import { prisma } from '@/lib/prisma'
import { SyncButton } from '@/components/shared/sync-button'
import { HeartbeatStatus } from '@/components/shared/heartbeat-status'

async function getStats() {
  const [orgs, devices, users, domains, audits] = await Promise.all([
    prisma.organization.count(),
    prisma.mikrotikDevice.count(),
    prisma.user.count(),
    prisma.domain.count(),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ])
  const aiEnabled = await prisma.organization.count({ where: { aiEnabled: true } })
  const offline   = await prisma.mikrotikDevice.count({ where: { status: 'OFFLINE' } })
  return { orgs, devices, users, domains, aiEnabled, offline, audits }
}

export default async function DashboardPage() {
  const stats = await getStats()
  const cards = [
    { label: 'Организаций',   value: stats.orgs,      color: 'blue',   icon: '⬡' },
    { label: 'Устройств',     value: stats.devices,   color: 'green',  icon: '⬢' },
    { label: 'Пользователей', value: stats.users,     color: 'purple', icon: '◉' },
    { label: 'Доменов',       value: stats.domains,   color: 'teal',   icon: '◎' },
    { label: 'AI включён',    value: stats.aiEnabled, color: 'amber',  icon: '◈' },
    { label: 'Offline',       value: stats.offline,   color: 'red',    icon: '⬢' },
  ]
  const colorMap: Record<string, string> = {
    blue:   'border-blue-500/20 bg-blue-500/5 text-blue-400',
    green:  'border-green-500/20 bg-green-500/5 text-green-400',
    purple: 'border-purple-500/20 bg-purple-500/5 text-purple-400',
    teal:   'border-teal-500/20 bg-teal-500/5 text-teal-400',
    amber:  'border-amber-500/20 bg-amber-500/5 text-amber-400',
    red:    'border-red-500/20 bg-red-500/5 text-red-400',
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Общая статистика платформы</p>
        </div>
        <SyncButton />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {cards.map(card => (
          <div key={card.label} className={`border rounded-xl p-4 ${colorMap[card.color]}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 uppercase tracking-wider">{card.label}</span>
              <span className="text-lg">{card.icon}</span>
            </div>
            <div className="text-3xl font-semibold text-white">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Heartbeat статус серверов */}
      <HeartbeatStatus />

      {/* Audit log */}
      <div className="border border-[#1e2535] rounded-xl overflow-hidden mt-4">
        <div className="px-4 py-3 border-b border-[#1e2535]">
          <h2 className="text-sm font-medium text-slate-200">Последние действия</h2>
        </div>
        {stats.audits.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-600">Действий пока нет</div>
        ) : (
          <div className="divide-y divide-[#1e2535]">
            {stats.audits.map(log => (
              <div key={log.id} className="px-4 py-3 flex items-center gap-3">
                <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{log.action}</span>
                <span className="text-xs text-slate-400">{log.entity} · {log.entityId.slice(0,8)}...</span>
                <span className="text-xs text-slate-600 ml-auto">{new Date(log.createdAt).toLocaleString('ru')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
