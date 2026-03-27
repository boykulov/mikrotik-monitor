'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const nav = [
  { href: '/dashboard',     icon: '◈', label: 'Dashboard' },
  { href: '/organizations', icon: '⬡', label: 'Организации' },
  { href: '/devices',       icon: '⬢', label: 'Устройства' },
  { href: '/domains',       icon: '◎', label: 'Домены' },
  { href: '/categories',    icon: '⊞', label: 'Категории' },
  { href: '/users',         icon: '◉', label: 'Пользователи' },
  { href: '/settings',      icon: '◌', label: 'Настройки' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="w-56 flex flex-col border-r border-[#1e2535] bg-[#0d1018] flex-shrink-0">
      <div className="px-4 py-5 border-b border-[#1e2535]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#63b3ed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">NebulaNet</div>
            <div className="text-[10px] text-slate-500">Super Admin</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {nav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-3 border-t border-[#1e2535]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
            <span className="text-[10px] text-blue-400 font-medium">SA</span>
          </div>
          <div className="text-xs text-slate-400 truncate">Super Admin</div>
        </div>
        <button
          onClick={handleLogout}
          className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors cursor-pointer"
        >
          Выйти
        </button>
      </div>
    </aside>
  )
}
