import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useSession, CNPJS_DISPONIVEIS } from '@/shared/hooks/use-session'
import { formatCnpj } from '@/lib/utils'

export function Topbar() {
  const { user, logout } = useAuth()
  const { session, setActive } = useSession()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    void navigate({ to: '/login' })
  }

  return (
    <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-5 flex-shrink-0">
      {/* CNPJ selector */}
      <div className="flex items-center gap-3">
        <label htmlFor="cnpj-select" className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          CNPJ Ativo
        </label>
        <select
          id="cnpj-select"
          value={session?.cnpj ?? ''}
          onChange={e => {
            const c = CNPJS_DISPONIVEIS.find(x => x.cnpj === e.target.value)
            if (c) setActive(c.cnpj, c.label)
          }}
          className="h-7 px-2 border border-slate-300 bg-white text-xs text-slate-700 focus:outline-none focus:border-slate-900 transition-colors"
        >
          <option value="">— selecione —</option>
          {CNPJS_DISPONIVEIS.map(c => (
            <option key={c.cnpj} value={c.cnpj}>
              {formatCnpj(c.cnpj)} — {c.label}
            </option>
          ))}
        </select>
        {session && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-label="Sessão ativa" />
        )}
      </div>

      {/* User menu */}
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-xs text-slate-500">
            {user.nome}
            <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium">
              {user.papel}
            </span>
          </span>
        )}
        <button
          onClick={handleLogout}
          className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
          aria-label="Sair"
        >
          Sair
        </button>
      </div>
    </header>
  )
}
