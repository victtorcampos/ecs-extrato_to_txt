import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { LoteEstatisticas } from '@/features/lotes/services/schemas'
import { useSession } from '@/shared/hooks/use-session'
import { Spinner } from '@/shared/components/spinner/spinner'
import { useAuth } from '@/features/auth/hooks/use-auth'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = useAuth()
  const { session } = useSession()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['lotes', 'estatisticas', session?.cnpj],
    queryFn: () => api.get<LoteEstatisticas>('/lotes/estatisticas', session?.cnpj ? { cnpj: session.cnpj } : undefined),
  })

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Painel</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Olá{user ? `, ${user.nome.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Sistema de conversão de extratos bancários para TXT contábil.</p>
      </div>

      {/* Session */}
      {session ? (
        <div className="mb-8 flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Sessão ativa</p>
            <p className="text-xs text-emerald-600 font-mono mt-0.5">{session.label}</p>
          </div>
        </div>
      ) : (
        <div className="mb-8 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-sm text-amber-700">Selecione um CNPJ no menu superior para filtrar os dados.</p>
        </div>
      )}

      {/* Estatísticas */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-slate-400"><Spinner /> Carregando...</div>
      ) : stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
          {[
            { label: 'Total', value: stats.total, color: 'border-slate-200 bg-white' },
            { label: 'Concluídos', value: stats.concluidos, color: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
            { label: 'Pendentes', value: stats.pendentes, color: 'border-amber-200 bg-amber-50 text-amber-800' },
            { label: 'Processando', value: stats.processando, color: 'border-blue-200 bg-blue-50 text-blue-800' },
            { label: 'Com Erro', value: stats.com_erro, color: 'border-red-200 bg-red-50 text-red-800' },
          ].map(s => (
            <div key={s.label} className={`p-4 border text-center ${s.color}`}>
              <p className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1">{s.label}</p>
              <p className="text-2xl font-bold font-mono">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick access */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { to: '/extrato/upload', label: 'Upload de Extrato', desc: 'Envie e processe novos arquivos' },
          { to: '/extrato/lotes', label: 'Lotes', desc: 'Acompanhe os lotes processados' },
          { to: '/extrato/import-layout', label: 'Import Layout', desc: 'Configure layouts de importação' },
          { to: '/extrato/output-layout', label: 'Output Layout', desc: 'Configure perfis de saída' },
        ].map(item => (
          <Link key={item.to} to={item.to} className="block p-5 bg-white border border-slate-200 hover:border-slate-400 hover:shadow-sm transition-all group">
            <p className="text-sm font-semibold text-slate-900 group-hover:text-slate-700 mb-1">{item.label}</p>
            <p className="text-xs text-slate-500">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
