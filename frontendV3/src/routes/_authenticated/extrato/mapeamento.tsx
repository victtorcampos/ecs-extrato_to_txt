import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { api } from '@/lib/api-client'
import {
  AccountMappingFormSchema,
  type AccountMappingForm,
  type AccountMapping,
} from '@/features/mapeamento/services/schemas'
import { ConfirmDialog } from '@/shared/components/confirm-dialog/confirm-dialog'
import { Spinner } from '@/shared/components/spinner/spinner'
import { useSession } from '@/shared/hooks/use-session'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/extrato/mapeamento')({
  component: MapeamentoPage,
})

type FormMode = { type: 'create' } | { type: 'edit'; mapping: AccountMapping }

function MapeamentoPage() {
  const { session } = useSession()
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>({ type: 'create' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['account-mappings', session?.cnpj],
    queryFn: () => api.get<{ items: AccountMapping[] }>('/account-mappings', session?.cnpj ? { cnpj: session.cnpj } : undefined),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountMappingForm>({
    resolver: zodResolver(AccountMappingFormSchema),
    defaultValues: {
      conta_cliente: '',
      conta_padrao: '',
      nome_conta_cliente: '',
      nome_conta_padrao: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: (body: AccountMappingForm) =>
      api.post<AccountMapping>('/account-mappings', { cnpj: session?.cnpj, ...body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['account-mappings'] })
      toast.success('Mapeamento criado.')
      setFormOpen(false)
      reset()
    },
    onError: () => toast.error('Erro ao criar mapeamento.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: AccountMappingForm }) =>
      api.put<AccountMapping>(`/account-mappings/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['account-mappings'] })
      toast.success('Mapeamento atualizado.')
      setFormOpen(false)
      reset()
    },
    onError: () => toast.error('Erro ao atualizar mapeamento.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/account-mappings/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['account-mappings'] })
      toast.success('Mapeamento removido.')
      setDeleteId(null)
      setDeleteName('')
    },
    onError: () => toast.error('Erro ao remover mapeamento.'),
  })

  const openCreate = () => {
    setFormMode({ type: 'create' })
    reset({ conta_cliente: '', conta_padrao: '', nome_conta_cliente: '', nome_conta_padrao: '' })
    setFormOpen(true)
  }

  const openEdit = (mapping: AccountMapping) => {
    setFormMode({ type: 'edit', mapping })
    reset({
      conta_cliente: mapping.conta_cliente,
      conta_padrao: mapping.conta_padrao,
      nome_conta_cliente: mapping.nome_conta_cliente ?? '',
      nome_conta_padrao: mapping.nome_conta_padrao ?? '',
    })
    setFormOpen(true)
  }

  const handleCancel = () => {
    setFormOpen(false)
    reset()
  }

  const onSubmit = (body: AccountMappingForm) => {
    if (formMode.type === 'edit') {
      updateMutation.mutate({ id: formMode.mapping.id, body })
    } else {
      createMutation.mutate(body)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Mapeamento de Contas</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Mapeie contas do extrato para contas contábeis padrão.
          </p>
        </div>
        {!formOpen && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            + Novo Mapeamento
          </button>
        )}
      </div>

      {/* Inline Form */}
      {formOpen && (
        <div className="border border-slate-200 bg-white p-6 mb-6">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">
            {formMode.type === 'edit' ? 'Editar Mapeamento' : 'Novo Mapeamento'}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="m-conta-cliente" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                  Conta do Extrato <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <input
                  id="m-conta-cliente"
                  {...register('conta_cliente')}
                  className="w-full h-9 px-3 border border-slate-300 bg-white text-sm font-mono focus:outline-none focus:border-slate-900 transition-colors"
                  placeholder="Ex: 1.1.01.001"
                />
                {errors.conta_cliente && (
                  <p className="mt-1 text-xs text-red-600">{errors.conta_cliente.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="m-conta-padrao" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                  Conta Contábil Padrão <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <input
                  id="m-conta-padrao"
                  {...register('conta_padrao')}
                  className="w-full h-9 px-3 border border-slate-300 bg-white text-sm font-mono focus:outline-none focus:border-slate-900 transition-colors"
                  placeholder="Ex: 1.1.01.001"
                />
                {errors.conta_padrao && (
                  <p className="mt-1 text-xs text-red-600">{errors.conta_padrao.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="m-nome-cliente" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                  Nome da Conta (Extrato)
                </label>
                <input
                  id="m-nome-cliente"
                  {...register('nome_conta_cliente')}
                  className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label htmlFor="m-nome-padrao" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                  Nome da Conta (Contábil)
                </label>
                <input
                  id="m-nome-padrao"
                  {...register('nome_conta_padrao')}
                  className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors"
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting || isPending}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {(isSubmitting || isPending) && <Spinner size={14} />}
                {isSubmitting || isPending ? 'Salvando...' : formMode.type === 'edit' ? 'Salvar Alterações' : 'Criar Mapeamento'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-slate-400"><Spinner /> Carregando...</div>
      ) : (
        <div className="border border-slate-200 bg-white">
          <table className="w-full text-sm" aria-label="Mapeamentos de contas">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Conta Extrato</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome (Extrato)</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Conta Contábil</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome (Contábil)</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.items.map(mapping => (
                <tr key={mapping.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono text-xs text-slate-900">{mapping.conta_cliente}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{mapping.nome_conta_cliente ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-900">{mapping.conta_padrao}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{mapping.nome_conta_padrao ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-right flex justify-end gap-3">
                    <button
                      onClick={() => openEdit(mapping)}
                      className="text-xs text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => { setDeleteId(mapping.id); setDeleteName(mapping.conta_cliente) }}
                      className="text-xs text-red-600 hover:text-red-800 transition-colors"
                      aria-label={`Remover mapeamento ${mapping.conta_cliente}`}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
              {!data?.items.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                    Nenhum mapeamento cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Remover mapeamento"
        description={`Remover o mapeamento da conta "${deleteName}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => { setDeleteId(null); setDeleteName('') }}
      />
    </div>
  )
}
