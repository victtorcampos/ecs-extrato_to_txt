import { useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { api } from '@/lib/api-client'
import {
  OutputProfileFormSchema,
  type OutputProfileForm,
  type OutputProfile,
  OUTPUT_SISTEMAS,
} from '@/features/output-layout/services/schemas'
import { Spinner } from '@/shared/components/spinner/spinner'
import { toast } from 'sonner'

interface Props { id?: string }

export function OutputLayoutFormPage({ id }: Props) {
  const isEditing = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['output-profile', id],
    queryFn: () => api.get<OutputProfile>(`/output-profiles/${id!}`),
    enabled: isEditing,
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OutputProfileForm>({
    resolver: zodResolver(OutputProfileFormSchema),
    defaultValues: {
      nome: '',
      sistema_destino: '',
      formato: '',
      ativo: true,
      padrao: false,
      descricao: '',
    },
  })

  useEffect(() => {
    if (existing) {
      reset({
        nome: existing.nome,
        sistema_destino: existing.sistema_destino,
        formato: existing.formato,
        ativo: existing.ativo,
        padrao: existing.padrao,
        descricao: existing.descricao ?? '',
      })
    }
  }, [existing, reset])

  const mutation = useMutation({
    mutationFn: (body: OutputProfileForm) => isEditing
      ? api.put<OutputProfile>(`/output-profiles/${id!}`, body)
      : api.post<OutputProfile>('/output-profiles', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['output-profiles'] })
      toast.success(isEditing ? 'Perfil atualizado.' : 'Perfil criado.')
      void navigate({ to: '/extrato/output-layout' })
    },
    onError: () => toast.error('Erro ao salvar perfil.'),
  })

  if (isEditing && loadingExisting) {
    return <div className="flex items-center gap-2 py-20 text-slate-400"><Spinner /> Carregando...</div>
  }

  const selectedSistema = watch('sistema_destino')
  const sistemaConfig = OUTPUT_SISTEMAS.find(s => s.value === selectedSistema)

  return (
    <div className="max-w-3xl">
      <Link
        to="/extrato/output-layout"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Voltar
      </Link>

      <h2 className="text-xl font-bold text-slate-900 mb-8">
        {isEditing ? 'Editar Perfil de Saída' : 'Novo Perfil de Saída'}
      </h2>

      <form onSubmit={handleSubmit(body => mutation.mutate(body))} className="space-y-6">
        {/* Identificação */}
        <section className="border border-slate-200 p-6">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">Identificação</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="ol-nome" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                Nome <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="ol-nome"
                {...register('nome')}
                className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors"
              />
              {errors.nome && <p className="mt-1 text-xs text-red-600">{errors.nome.message}</p>}
            </div>

            <div>
              <label htmlFor="ol-sistema" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                Sistema Destino <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <select
                id="ol-sistema"
                {...register('sistema_destino')}
                className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors"
              >
                <option value="">Selecione...</option>
                {OUTPUT_SISTEMAS.map(s => (
                  <option key={s.value} value={s.value}>{s.nome}</option>
                ))}
              </select>
              {errors.sistema_destino && (
                <p className="mt-1 text-xs text-red-600">{errors.sistema_destino.message}</p>
              )}
              {sistemaConfig && (
                <p className="mt-1 text-xs text-slate-400">{sistemaConfig.descricao}</p>
              )}
            </div>

            <div>
              <label htmlFor="ol-formato" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                Formato <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <select
                id="ol-formato"
                {...register('formato')}
                disabled={!selectedSistema}
                className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">Selecione...</option>
                {sistemaConfig?.formatos.map(f => (
                  <option key={f.value} value={f.value}>{f.nome} ({f.extensao})</option>
                ))}
              </select>
              {errors.formato && <p className="mt-1 text-xs text-red-600">{errors.formato.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="ol-desc" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                Descrição
              </label>
              <input
                id="ol-desc"
                {...register('descricao')}
                className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="ol-ativo"
                type="checkbox"
                {...register('ativo')}
                className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-0"
              />
              <label htmlFor="ol-ativo" className="text-sm text-slate-700">Ativo</label>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="ol-padrao"
                type="checkbox"
                {...register('padrao')}
                className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-0"
              />
              <label htmlFor="ol-padrao" className="text-sm text-slate-700">Perfil padrão</label>
            </div>
          </div>
        </section>

        <div className="flex gap-3 pb-8">
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="px-6 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {(isSubmitting || mutation.isPending) && <Spinner size={14} />}
            {isSubmitting || mutation.isPending ? 'Salvando...' : 'Salvar Perfil'}
          </button>
          <Link
            to="/extrato/output-layout"
            className="px-6 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
