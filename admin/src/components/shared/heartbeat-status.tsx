import { prisma } from '@/lib/prisma'

export async function HeartbeatStatus() {
  const orgs = await prisma.organization.findMany({
    select: {
      id: true, name: true, slug: true,
      isActive: true, lastHeartbeat: true,
      heartbeatData: true,
    },
    orderBy: { name: 'asc' },
  })

  const now = new Date()

  return (
    <div className="border border-[#1e2535] rounded-xl overflow-hidden mt-4">
      <div className="px-4 py-3 border-b border-[#1e2535] bg-[#0d1018] flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-200">Статус серверов v1.0</h2>
        <span className="text-xs text-slate-500">Обновляется каждые 5 мин</span>
      </div>
      <div className="divide-y divide-[#1e2535]">
        {orgs.map(org => {
          const hb = org.heartbeatData as Record<string, unknown> | null
          const lastSeen = org.lastHeartbeat
          const diffMin = lastSeen
            ? Math.floor((now.getTime() - lastSeen.getTime()) / 60000)
            : null
          const isOnline = diffMin !== null && diffMin < 10

          return (
            <div key={org.id} className="px-4 py-3 flex items-center gap-4">
              {/* Статус */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`w-2 h-2 rounded-full ${
                  !org.isActive ? 'bg-slate-600' :
                  isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`} />
                <span className={`text-xs font-medium ${
                  !org.isActive ? 'text-slate-600' :
                  isOnline ? 'text-green-400' : 'text-red-400'
                }`}>
                  {!org.isActive ? 'Выключен' : isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Название */}
              <div className="flex-1">
                <div className="text-sm text-white">{org.name}</div>
                <div className="text-xs text-slate-500">{org.slug}</div>
              </div>

              {/* Данные heartbeat */}
              {hb && isOnline && (
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>📡 {String(hb.devices || 0)} устройств</span>
                  <span>v{String(hb.version || '1.0')}</span>
                </div>
              )}

              {/* Время последнего heartbeat */}
              <div className="text-xs text-slate-500 flex-shrink-0">
                {lastSeen ? (
                  diffMin === 0 ? 'только что' :
                  diffMin! < 60 ? `${diffMin} мин назад` :
                  `${Math.floor(diffMin! / 60)}ч назад`
                ) : (
                  <span className="text-slate-700">нет данных</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
