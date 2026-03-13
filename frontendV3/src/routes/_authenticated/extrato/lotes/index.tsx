import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { z } from 'zod'
import { api } from '@/lib/api-client'
import type { Lote, LoteStatus } from '@/features/lotes/services/schemas'
import { Badge } from '@/shared/components/badge/badge'
import { ConfirmDialog } from '@/shared/components/confirm-dialog/confirm-dialog'
import { Spinner } from '@/shared/components/spinner/spinner'
import { useSession } from '@/shared/hooks/use-session'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/extrato/lotes/')({
  component: LotesPage,
  validateSearch: z.object({
    status: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
  }),
})

const STATUS_OPTIONS: { value: LoteStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'processando', label: 'Processando' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'erro', label: 'Erro' },
]

const STATUS_BADGE: Record<LoteStatus, { variant: 'slate' | 'emerald' | 'amber' | 'red' | 'blue' | 'violet'; label: string }> = {
  aguardando: { variant: 'slate', label: 'Aguardando' },
  processando: { variant: 'blue', label: 'Processando' },
  pendente: { variant: 'amber', label: 'Pendente' },
  concluido: { variant: 'emerald', label: 'Concluído' },
  erro: { variant: 'red', label: 'Erro' },
}

function LotesPage() {
  const { session } = useSession()
  const navigate = useNavigate({ from: '/extrato/lotes/' })
  const qc = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const search = Route.useSearch()
  const currentPage = search.page ?? 1
  const statusFilter = search.status ?? ''

  const { data, isLoading } = useQuery({
    queryKey: ['lotes', session?.cnpj, statusFilter, currentPage],
    queryFn: () => {
      const params: Record<string, string | number> = { page: currentPage, page_size: 15 }
      if (session?.cnpj) params['cnpj'] = session.cnpj
      if (statusFilter) params['status'] = statusFilter
      return api.get<{ items: Lote[]; total: number; page: number; page_size: number }>('/lotes', params)
    },
    refetchInterval: (query) => {
      const hasProcessing = query.state.data?.items.some(l => l.status === 'processando')
      return hasProcessing ? 3000 : false
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/lotes/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lotes'] })
      toast.success('Lote removido.')
      setDeleteId(null)
    },
    onError: () => toast.error('Erro ao remover lote.'),
  })

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1

  function setPage(page: number) {
    void navigate({ search: (prev) => ({ ...prev, page }) })
  }

  function setStatus(status: string) {
    void navigate({ search: (prev) => ({ ...prev, status: status || undefined, page: 1 }) })
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Extrato</p>
          <h1 className="text-2xl font-bold text-slate-900">Lotes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Acompanhe os lotes de processamento de extratos.</p>
        </div>
        <Link
          to="/extrato/upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          + Novo Upload
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
              statusFilter === opt.value
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-slate-400"><Spinner /> Carregando...</div>
      ) : (
        <>
          <div className="border border-slate-200 bg-white">
            <table className="w-full text-sm" aria-label="Lista de lotes">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Protocolo</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">CNPJ</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Período</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Layout</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.items.map(lote => {
                  const statusInfo = STATUS_BADGE[lote.status]
                  return (
                    <tr key={lote.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 font-medium">{lote.protocolo}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{lote.cnpj_formatado}</td>
                      <td className="px-4 py-3 text-slate-700">{lote.periodo}</td>
                      <td className="px-4 py-3 text-slate-600 truncate max-w-[160px]">{lote.nome_layout}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusInfo.variant}>
                          {lote.status === 'processando' && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse" aria-hidden="true" />
                          )}
                          {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right flex justify-end gap-3">
                        <Link
                          to="/extrato/lotes/$id"
                          params={{ id: lote.id }}
                          className="text-xs text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          Ver
                        </Link>
                        {(lote.status === 'aguardando' || lote.status === 'erro') && (
                          <button
                            onClick={() => setDeleteId(lote.id)}
                            className="text-xs text-red-600 hover:text-red-800 transition-colors"
                            aria-label={`Remover lote ${lote.protocolo}`}
                          >
                            Remover
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {!data?.items.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                      Nenhum lote encontrado.
                      <Link to="/extrato/upload" className="ml-1 text-slate-600 hover:text-slate-900 underline">
                        Enviar um arquivo.
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <p className="text-slate-500 text-xs">
                Total: <strong>{data?.total ?? 0}</strong> lotes
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 border border-slate-300 text-xs hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  ← Anterior
                </button>
                <span className="px-3 py-1.5 text-xs text-slate-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 border border-slate-300 text-xs hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  Próximo →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Remover lote"
        description="Esta ação não pode ser desfeita. O lote e seus dados serão removidos permanentemente."
        confirmLabel="Remover"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
