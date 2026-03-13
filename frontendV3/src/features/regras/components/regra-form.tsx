import { useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { api } from '@/lib/api-client'
import {
  RegraFormSchema,
  type RegraForm,
  type Regra,
  OPERADOR_LABELS,
  TIPO_ACAO_LABELS,
  TIPO_REGRA_LABELS,
  OPERADORES_SEM_VALOR,
  type OperadorCondicao,
  type TipoAcao,
  type TipoRegra,
} from '@/features/regras/services/schemas'
import type { CamposDisponiveisResponse } from '@/features/import-layout/services/schemas'
import { Spinner } from '@/shared/components/spinner/spinner'
import { toast } from 'sonner'

interface Props { layoutId: string; id?: string }

export function RegraFormPage({ layoutId, id }: Props) {
  const isEditing = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: campos } = useQuery({
    queryKey: ['campos-disponiveis'],
    queryFn: () => api.get<CamposDisponiveisResponse>('/import-layouts/campos-disponiveis'),
  })

  const { data: existing, isLoading } = useQuery({
    queryKey: ['regra', layoutId, id],
    queryFn: () => api.get<Regra>(`/import-layouts/${layoutId}/rules/${id!}`),
    enabled: isEditing,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegraForm>({
    resolver: zodResolver(RegraFormSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      tipo: 'filtro',
      condicoes: [],
      acao: { tipo_acao: 'definir_valor', campo_destino: '', valor: '' },
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'condicoes' })

  useEffect(() => {
    if (existing) {
      reset({
        nome: existing.nome,
        descricao: existing.descricao ?? '',
        tipo: existing.tipo,
        condicoes: existing.condicoes,
        acao: {
          tipo_acao: existing.acao.tipo_acao,
          campo_destino: existing.acao.campo_destino ?? '',
          valor: existing.acao.valor ?? '',
        },
      })
    }
  }, [existing, reset])

  const mutation = useMutation({
    mutationFn: (body: RegraForm) => isEditing
      ? api.put<Regra>(`/import-layouts/${layoutId}/rules/${id!}`, body)
      : api.post<Regra>(`/import-layouts/${layoutId}/rules`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['regras', layoutId] })
      toast.success(isEditing ? 'Regra atualizada.' : 'Regra criada.')
      void navigate({ to: '/extrato/import-layout/$id/edit', params: { id: layoutId } })
    },
    onError: () => toast.error('Erro ao salvar regra.'),
  })

  const acaoTipo = watch('acao.tipo_acao')
  const camposEntries = Object.entries(campos ?? {})

  if (isEditing && isLoading) {
    return <div className="flex items-center gap-2 py-20 text-slate-400"><Spinner /> Carregando...</div>
  }

  return (
    <div className="max-w-3xl">
      <Link
        to="/extrato/import-layout/$id/edit"
        params={{ id: layoutId }}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Voltar para o Layout
      </Link>

      <h2 className="text-xl font-bold text-slate-900 mb-8">
        {isEditing ? 'Editar Regra' : 'Nova Regra de Processamento'}
      </h2>

      <form onSubmit={handleSubmit(body => mutation.mutate(body))} className="space-y-6">
        {/* Identificação */}
        <section className="border border-slate-200 p-6">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">Identificação</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="r-nome" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                Nome <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="r-nome"
                {...register('nome')}
                className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors"
              />
              {errors.nome && <p className="mt-1 text-xs text-red-600">{errors.nome.message}</p>}
            </div>
            <div>
              <label htmlFor="r-tipo" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                Tipo <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <select
                id="r-tipo"
                {...register('tipo')}
                className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors"
              >
                {(Object.entries(TIPO_REGRA_LABELS) as [TipoRegra, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="r-desc" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                Descrição
              </label>
              <input
                id="r-desc"
                {...register('descricao')}
                className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Condições SE */}
        <section className="border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Condições{' '}
              <span className="text-slate-400 font-normal normal-case">(todas devem ser verdadeiras)</span>
            </h3>
            <button
              type="button"
              onClick={() => append({ campo: '', operador: 'igual', valor: '' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              + Condição
            </button>
          </div>
          {fields.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">Nenhuma condição. A regra será aplicada a todos os lançamentos.</p>
          ) : (
            <div className="space-y-3">
              {fields.map((field, i) => {
                const opVal = watch(`condicoes.${i}.operador`) as OperadorCondicao
                const semValor = OPERADORES_SEM_VALOR.includes(opVal)
                return (
                  <div key={field.id} className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200">
                    <span className="mt-2 text-xs font-semibold text-slate-500 w-6 shrink-0">
                      {i === 0 ? 'SE' : 'E'}
                    </span>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        {...register(`condicoes.${i}.campo`)}
                        aria-label="Campo"
                        className="h-8 px-2 border border-slate-300 bg-white text-xs focus:outline-none focus:border-slate-900"
                      >
                        <option value="">Campo...</option>
                        {camposEntries.map(([k, inf]) => (
                          <option key={k} value={k}>{inf.label}</option>
                        ))}
                      </select>
                      <select
                        {...register(`condicoes.${i}.operador`)}
                        aria-label="Operador"
                        className="h-8 px-2 border border-slate-300 bg-white text-xs focus:outline-none focus:border-slate-900"
                      >
                        {(Object.entries(OPERADOR_LABELS) as [OperadorCondicao, string][]).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      {!semValor && (
                        <input
                          {...register(`condicoes.${i}.valor`)}
                          placeholder="Valor"
                          aria-label="Valor"
                          className="h-8 px-2 border border-slate-300 bg-white text-xs focus:outline-none focus:border-slate-900"
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="mt-1 p-1 text-slate-400 hover:text-red-600 transition-colors"
                      aria-label={`Remover condição ${i + 1}`}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Ação ENTÃO */}
        <section className="border border-slate-200 p-6">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">Então</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="a-tipo" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                Ação <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <select
                id="a-tipo"
                {...register('acao.tipo_acao')}
                className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors"
              >
                {(Object.entries(TIPO_ACAO_LABELS) as [TipoAcao, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            {acaoTipo !== 'excluir' && (
              <>
                <div>
                  <label htmlFor="a-campo" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                    Campo Destino
                  </label>
                  <select
                    id="a-campo"
                    {...register('acao.campo_destino')}
                    className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors"
                  >
                    <option value="">Selecione...</option>
                    {camposEntries.map(([k, inf]) => (
                      <option key={k} value={k}>{inf.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="a-valor" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                    Valor
                  </label>
                  <input
                    id="a-valor"
                    {...register('acao.valor')}
                    placeholder="Novo valor"
                    className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors"
                  />
                </div>
              </>
            )}
          </div>
        </section>

        <div className="flex gap-3 pb-8">
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="px-6 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {(isSubmitting || mutation.isPending) && <Spinner size={14} />}
            {isSubmitting || mutation.isPending ? 'Salvando...' : 'Salvar Regra'}
          </button>
          <Link
            to="/extrato/import-layout/$id/edit"
            params={{ id: layoutId }}
            className="px-6 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
