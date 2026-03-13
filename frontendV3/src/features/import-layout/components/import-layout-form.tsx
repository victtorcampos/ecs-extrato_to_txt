import { useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { api } from '@/lib/api-client'
import {
  ImportLayoutFormSchema,
  type ImportLayoutForm,
  type CamposDisponiveisResponse,
  type ImportLayoutCompleto,
} from '@/features/import-layout/services/schemas'
import type { Regra } from '@/features/regras/services/schemas'
import { Spinner } from '@/shared/components/spinner/spinner'
import { useSession } from '@/shared/hooks/use-session'
import { toast } from 'sonner'

interface Props { id?: string }

export function ImportLayoutFormPage({ id }: Props) {
  const isEditing = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { session } = useSession()

  const { data: campos } = useQuery({
    queryKey: ['campos-disponiveis'],
    queryFn: () => api.get<CamposDisponiveisResponse>('/import-layouts/campos-disponiveis'),
  })

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['import-layout', id],
    queryFn: () => api.get<ImportLayoutCompleto>(`/import-layouts/${id!}`),
    enabled: isEditing,
  })

  const { data: regras } = useQuery({
    queryKey: ['regras', id],
    queryFn: () => api.get<{ items: Regra[] }>(`/import-layouts/${id!}/rules`),
    enabled: isEditing,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ImportLayoutForm>({
    resolver: zodResolver(ImportLayoutFormSchema),
    defaultValues: {
      nome: '',
      cnpj: session?.cnpj ?? '',
      descricao: '',
      ativo: true,
      config_planilha: { linha_cabecalho: 0, linha_inicio_dados: 1, nome_aba: '' },
      colunas: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'colunas' })

  useEffect(() => {
    if (existing) {
      reset({
        nome: existing.nome,
        cnpj: existing.cnpj,
        descricao: existing.descricao ?? '',
        ativo: existing.ativo,
        config_planilha: existing.config_planilha ?? { linha_cabecalho: 0, linha_inicio_dados: 1, nome_aba: '' },
        colunas: existing.colunas ?? [],
      })
    }
  }, [existing, reset])

  const mutation = useMutation({
    mutationFn: (body: ImportLayoutForm) => isEditing
      ? api.put<ImportLayoutCompleto>(`/import-layouts/${id!}`, body)
      : api.post<ImportLayoutCompleto>('/import-layouts', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['import-layouts'] })
      toast.success(isEditing ? 'Layout atualizado.' : 'Layout criado.')
      void navigate({ to: '/extrato/import-layout' })
    },
    onError: () => toast.error('Erro ao salvar layout.'),
  })

  if (isEditing && loadingExisting) {
    return <div className="flex items-center gap-2 py-20 text-slate-400"><Spinner /> Carregando...</div>
  }

  const camposEntries = Object.entries(campos ?? {})
  const colunasTipoDados = watch('colunas')

  return (
    <div className="max-w-3xl">
      <Link
        to="/extrato/import-layout"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Voltar
      </Link>

      <h2 className="text-xl font-bold text-slate-900 mb-8">
        {isEditing ? 'Editar Layout' : 'Novo Layout de Importação'}
      </h2>

      <form onSubmit={handleSubmit(body => mutation.mutate(body))} className="space-y-6">
        {/* Identificação */}
        <section className="border border-slate-200 p-6">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">Identificação</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="il-nome" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                Nome <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="il-nome"
                {...register('nome')}
                className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors"
              />
              {errors.nome && <p className="mt-1 text-xs text-red-600">{errors.nome.message}</p>}
            </div>
            <div>
              <label htmlFor="il-cnpj" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                CNPJ <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="il-cnpj"
                {...register('cnpj')}
                className="w-full h-9 px-3 border border-slate-300 bg-white text-sm font-mono focus:outline-none focus:border-slate-900 transition-colors"
              />
              {errors.cnpj && <p className="mt-1 text-xs text-red-600">{errors.cnpj.message}</p>}
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input
                id="il-ativo"
                type="checkbox"
                {...register('ativo')}
                className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-0"
              />
              <label htmlFor="il-ativo" className="text-sm text-slate-700">Ativo</label>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="il-desc" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                Descrição
              </label>
              <input
                id="il-desc"
                {...register('descricao')}
                className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Configuração da Planilha */}
        <section className="border border-slate-200 p-6">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">Configuração da Planilha</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="il-cabecalho" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                Linha Cabeçalho <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="il-cabecalho"
                type="number"
                min="0"
                {...register('config_planilha.linha_cabecalho', { valueAsNumber: true })}
                className="w-full h-9 px-3 border border-slate-300 bg-white text-sm font-mono focus:outline-none focus:border-slate-900 transition-colors"
              />
              <p className="mt-1 text-xs text-slate-400">Índice 0 = 1ª linha</p>
            </div>
            <div>
              <label htmlFor="il-inicio" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                Linha Início Dados <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="il-inicio"
                type="number"
                min="0"
                {...register('config_planilha.linha_inicio_dados', { valueAsNumber: true })}
                className="w-full h-9 px-3 border border-slate-300 bg-white text-sm font-mono focus:outline-none focus:border-slate-900 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="il-aba" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                Nome da Aba
              </label>
              <input
                id="il-aba"
                {...register('config_planilha.nome_aba')}
                placeholder="Primeira aba"
                className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Mapeamento de Colunas */}
        <section className="border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Mapeamento de Colunas</h3>
            <button
              type="button"
              onClick={() => append({ coluna_excel: '', campo_destino: '', tipo_dado: 'string', formato: '', obrigatorio: false })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              + Adicionar Coluna
            </button>
          </div>
          {fields.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">Nenhuma coluna configurada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" aria-label="Mapeamento de colunas">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-medium text-slate-500 uppercase tracking-wider">Coluna Excel</th>
                    <th scope="col" className="px-3 py-2 text-left font-medium text-slate-500 uppercase tracking-wider">Campo Destino</th>
                    <th scope="col" className="px-3 py-2 text-left font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                    <th scope="col" className="px-3 py-2 text-left font-medium text-slate-500 uppercase tracking-wider">Formato</th>
                    <th scope="col" className="px-3 py-2 text-center font-medium text-slate-500 uppercase tracking-wider">Obrig.</th>
                    <th scope="col" className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.map((field, i) => (
                    <tr key={field.id}>
                      <td className="px-3 py-2">
                        <input
                          {...register(`colunas.${i}.coluna_excel`)}
                          className="w-20 h-7 px-2 border border-slate-300 bg-white focus:outline-none focus:border-slate-900"
                          placeholder="A"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          {...register(`colunas.${i}.campo_destino`)}
                          className="w-36 h-7 px-2 border border-slate-300 bg-white focus:outline-none focus:border-slate-900"
                        >
                          <option value="">Selecione...</option>
                          {camposEntries.map(([key, info]) => (
                            <option key={key} value={key}>{info.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          {...register(`colunas.${i}.tipo_dado`)}
                          className="w-24 h-7 px-2 border border-slate-300 bg-white focus:outline-none focus:border-slate-900"
                        >
                          <option value="string">Texto</option>
                          <option value="decimal">Decimal</option>
                          <option value="date">Data</option>
                          <option value="integer">Inteiro</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        {colunasTipoDados?.[i]?.tipo_dado === 'date' && (
                          <input
                            {...register(`colunas.${i}.formato`)}
                            placeholder="DD/MM/YYYY"
                            className="w-28 h-7 px-2 border border-slate-300 bg-white font-mono focus:outline-none focus:border-slate-900"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          {...register(`colunas.${i}.obrigatorio`)}
                          className="h-4 w-4 border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => remove(i)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          aria-label={`Remover coluna ${i + 1}`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Regras (edit only) */}
        {isEditing && (
          <section className="border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Regras de Processamento</h3>
              <Link
                to="/extrato/import-layout/$layoutId/rules/new"
                params={{ layoutId: id! }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                + Nova Regra
              </Link>
            </div>
            {!regras?.items.length ? (
              <p className="text-sm text-slate-400 py-4">Nenhuma regra configurada.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {regras.items.map(r => (
                  <li key={r.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <span className="text-sm font-medium text-slate-900">{r.nome}</span>
                      <span className="ml-2 text-xs text-slate-500">{r.tipo}</span>
                    </div>
                    <Link
                      to="/extrato/import-layout/$layoutId/rules/$id/edit"
                      params={{ layoutId: id!, id: r.id }}
                      className="text-xs text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Editar
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="flex gap-3 pb-8">
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="px-6 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {(isSubmitting || mutation.isPending) && <Spinner size={14} />}
            {isSubmitting || mutation.isPending ? 'Salvando...' : 'Salvar Layout'}
          </button>
          <Link
            to="/extrato/import-layout"
            className="px-6 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
