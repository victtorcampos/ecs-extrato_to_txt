import { Outlet } from '@tanstack/react-router'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 overflow-auto" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
