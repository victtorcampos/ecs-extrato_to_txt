import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api-client'
import type { ImportLayout } from '@/features/import-layout/services/schemas'
import { Badge } from '@/shared/components/badge/badge'
import { ConfirmDialog } from '@/shared/components/confirm-dialog/confirm-dialog'
import { Spinner } from '@/shared/components/spinner/spinner'
import { useSession } from '@/shared/hooks/use-session'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/extrato/import-layout/')({
  component: ImportLayoutListPage,
})

function ImportLayoutListPage() {
  const { session } = useSession()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['import-layouts', session?.cnpj],
    queryFn: () => api.get<{ items: ImportLayout[] }>('/import-layouts', session?.cnpj ? { cnpj: session.cnpj } : undefined),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/import-layouts/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['import-layouts'] }); toast.success('Layout removido.'); setDeleteId(null) },
    onError: () => toast.error('Erro ao remover.'),
  })

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Layouts de Importação</h2>
          <p className="text-sm text-slate-500 mt-0.5">Configure os layouts para leitura dos extratos.</p>
        </div>
        <button
          onClick={() => void navigate({ to: '/extrato/import-layout/new' })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          + Novo Layout
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-slate-400"><Spinner /> Carregando...</div>
      ) : (
        <div className="border border-slate-200 bg-white">
          <table className="w-full text-sm" aria-label="Layouts de importação">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">CNPJ</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.items.map(layout => (
                <tr key={layout.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900">{layout.nome}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{layout.cnpj}</td>
                  <td className="px-4 py-3">
                    <Badge variant={layout.ativo ? 'emerald' : 'slate'}>{layout.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right flex justify-end gap-3">
                    <button
                      onClick={() => void navigate({ to: '/extrato/import-layout/$id/edit', params: { id: layout.id } })}
                      className="text-xs text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteId(layout.id)}
                      className="text-xs text-red-600 hover:text-red-800 transition-colors"
                      aria-label={`Remover ${layout.nome}`}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
              {!data?.items.length && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">Nenhum layout cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Remover layout"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
