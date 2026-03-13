import { Link, useRouterState } from '@tanstack/react-router'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/extrato/upload', label: 'Upload', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
  { href: '/extrato/lotes', label: 'Lotes', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { href: '/extrato/import-layout', label: 'Import Layout', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { href: '/extrato/output-layout', label: 'Output Layout', icon: 'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4' },
  { href: '/extrato/mapeamento', label: 'Mapeamento', icon: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z' },
]

export function Sidebar() {
  const { location } = useRouterState()
  const path = location.pathname

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-200">
        <span className="text-sm font-bold tracking-tight text-slate-900">ECS</span>
        <span className="ml-1 text-xs text-slate-400">Extrato to TXT</span>
      </div>

      <nav className="flex-1 py-4" aria-label="Menu principal">
        <ul className="space-y-0.5 px-2" role="list">
          {NAV.map(item => {
            const active = path === item.href || path.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-4 py-3 border-t border-slate-200">
        <p className="text-xs text-slate-400">v3.0.0-mock</p>
      </div>
    </aside>
  )
}
