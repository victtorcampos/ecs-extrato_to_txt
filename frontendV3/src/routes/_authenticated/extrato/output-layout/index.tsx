import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api-client'
import type { OutputProfile } from '@/features/output-layout/services/schemas'
import { Badge } from '@/shared/components/badge/badge'
import { ConfirmDialog } from '@/shared/components/confirm-dialog/confirm-dialog'
import { Spinner } from '@/shared/components/spinner/spinner'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/extrato/output-layout/')({
  component: OutputLayoutListPage,
})

function OutputLayoutListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['output-profiles'],
    queryFn: () => api.get<{ items: OutputProfile[] }>('/output-profiles'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/output-profiles/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['output-profiles'] })
      toast.success('Perfil removido.')
      setDeleteId(null)
      setDeleteName('')
    },
    onError: () => toast.error('Erro ao remover.'),
  })

  const handleDeleteClick = (profile: OutputProfile) => {
    setDeleteId(profile.id)
    setDeleteName(profile.nome)
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Perfis de Saída</h2>
          <p className="text-sm text-slate-500 mt-0.5">Configure os formatos de exportação dos lançamentos.</p>
        </div>
        <button
          onClick={() => void navigate({ to: '/extrato/output-layout/new' })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          + Novo Perfil
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-slate-400"><Spinner /> Carregando...</div>
      ) : (
        <div className="border border-slate-200 bg-white">
          <table className="w-full text-sm" aria-label="Perfis de saída">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sistema</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Formato</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Padrão</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.items.map(profile => (
                <tr key={profile.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900">{profile.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{profile.sistema_destino_nome}</td>
                  <td className="px-4 py-3 text-slate-600">{profile.formato_nome}</td>
                  <td className="px-4 py-3">
                    <Badge variant={profile.ativo ? 'emerald' : 'slate'}>{profile.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {profile.padrao && <Badge variant="blue">Padrão</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right flex justify-end gap-3">
                    <button
                      onClick={() => void navigate({ to: '/extrato/output-layout/$id/edit', params: { id: profile.id } })}
                      className="text-xs text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteClick(profile)}
                      className="text-xs text-red-600 hover:text-red-800 transition-colors"
                      aria-label={`Remover ${profile.nome}`}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
              {!data?.items.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                    Nenhum perfil de saída cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Remover perfil"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => { setDeleteId(null); setDeleteName('') }}
      />
    </div>
  )
}
