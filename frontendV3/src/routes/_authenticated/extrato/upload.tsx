import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api-client'
import type { ImportLayout } from '@/features/import-layout/services/schemas'
import type { OutputProfile } from '@/features/output-layout/services/schemas'
import { LayoutWizard } from '@/features/upload/components/layout-wizard'
import { Spinner } from '@/shared/components/spinner/spinner'
import { useSession } from '@/shared/hooks/use-session'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/extrato/upload')({
  component: UploadPage,
})

const MONTHS = [
  { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' }, { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' }, { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' }, { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' },
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i)

const UploadFormSchema = z.object({
  layout_id: z.string().min(1, 'Selecione um layout'),
  perfil_saida_id: z.string().min(1, 'Selecione um perfil de saída'),
  periodo_mes: z.coerce.number().int().min(1).max(12),
  periodo_ano: z.coerce.number().int().min(2000).max(2099),
})
type UploadForm = z.infer<typeof UploadFormSchema>

function UploadPage() {
  const { session } = useSession()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<UploadForm>({
    resolver: zodResolver(UploadFormSchema),
    defaultValues: {
      layout_id: '',
      perfil_saida_id: '',
      periodo_mes: new Date().getMonth() + 1,
      periodo_ano: currentYear,
    },
  })

  const selectedLayoutId = watch('layout_id')

  const { data: layouts, isLoading: loadingLayouts } = useQuery({
    queryKey: ['import-layouts', session?.cnpj],
    queryFn: () => api.get<{ items: ImportLayout[] }>('/import-layouts', session?.cnpj ? { cnpj: session.cnpj } : undefined),
  })

  const { data: perfis, isLoading: loadingPerfis } = useQuery({
    queryKey: ['output-layouts'],
    queryFn: () => api.get<{ items: OutputProfile[] }>('/output-layouts'),
  })

  const selectedLayout = layouts?.items.find(l => l.id === selectedLayoutId)

  const uploadMutation = useMutation({
    mutationFn: (values: UploadForm) => {
      const body = {
        ...values,
        cnpj: session?.cnpj ?? '',
        nome_arquivo: arquivo?.name,
      }
      return api.post('/lotes', body)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lotes'] })
      toast.success('Lote criado com sucesso!')
      void navigate({ to: '/extrato/lotes' })
    },
    onError: () => toast.error('Erro ao criar lote.'),
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setArquivo(file)
  }

  function onSubmit(values: UploadForm) {
    if (!arquivo) {
      toast.error('Selecione um arquivo Excel para upload.')
      return
    }
    if (!session?.cnpj) {
      toast.error('Selecione um CNPJ ativo no menu superior.')
      return
    }
    uploadMutation.mutate(values)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Extrato</p>
        <h1 className="text-2xl font-bold text-slate-900">Upload de Extrato</h1>
        <p className="mt-1 text-sm text-slate-500">Envie um arquivo Excel para processamento contábil.</p>
      </div>

      {!session && (
        <div className="mb-6 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-sm text-amber-700">Selecione um CNPJ no menu superior antes de enviar.</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Arquivo */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Arquivo Excel</label>
          <div
            className="border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Selecionar arquivo Excel"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              onChange={handleFileChange}
              aria-hidden="true"
            />
            {arquivo ? (
              <div className="flex items-center gap-3 px-4 py-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600 shrink-0" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                </svg>
                <div>
                  <p className="text-sm font-medium text-slate-900">{arquivo.name}</p>
                  <p className="text-xs text-slate-500">{(arquivo.size / 1024).toFixed(1)} KB · Clique para substituir</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17,8 12,3 7,8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p className="text-sm">Clique para selecionar ou arraste o arquivo aqui</p>
                <p className="text-xs">.xlsx, .xls, .csv aceitos</p>
              </div>
            )}
          </div>
        </div>

        {/* Layout + Wizard button */}
        <div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Layout de Importação</label>
              {loadingLayouts ? (
                <div className="flex items-center gap-2 py-2 text-slate-400 text-sm"><Spinner /> Carregando...</div>
              ) : (
                <select
                  {...register('layout_id')}
                  className="w-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                >
                  <option value="">Selecione um layout...</option>
                  {layouts?.items.filter(l => l.ativo).map(l => (
                    <option key={l.id} value={l.id}>{l.nome}</option>
                  ))}
                </select>
              )}
              {errors.layout_id && <p className="text-xs text-red-600 mt-1">{errors.layout_id.message}</p>}
            </div>
            {selectedLayoutId && arquivo && (
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                className="px-4 py-2 border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                Configurar Layout
              </button>
            )}
          </div>
        </div>

        {/* Perfil de saída */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Perfil de Saída</label>
          {loadingPerfis ? (
            <div className="flex items-center gap-2 py-2 text-slate-400 text-sm"><Spinner /> Carregando...</div>
          ) : (
            <select
              {...register('perfil_saida_id')}
              className="w-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
            >
              <option value="">Selecione um perfil...</option>
              {perfis?.items.map(p => (
                <option key={p.id} value={p.id}>{p.nome}{p.padrao ? ' (padrão)' : ''}</option>
              ))}
            </select>
          )}
          {errors.perfil_saida_id && <p className="text-xs text-red-600 mt-1">{errors.perfil_saida_id.message}</p>}
        </div>

        {/* Período */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Período de Competência</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <select
                {...register('periodo_mes')}
                className="w-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
              >
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              {errors.periodo_mes && <p className="text-xs text-red-600 mt-1">{errors.periodo_mes.message}</p>}
            </div>
            <div>
              <select
                {...register('periodo_ano')}
                className="w-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
              >
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {errors.periodo_ano && <p className="text-xs text-red-600 mt-1">{errors.periodo_ano.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={uploadMutation.isPending || !session}
            className="px-6 py-2.5 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
          >
            {uploadMutation.isPending && <Spinner />}
            Criar Lote
          </button>
          <button
            type="button"
            onClick={() => void navigate({ to: '/extrato/lotes' })}
            className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>

      {wizardOpen && selectedLayout && (
        <LayoutWizard
          layoutId={selectedLayout.id}
          layoutNome={selectedLayout.nome}
          arquivo={arquivo}
          onClose={() => setWizardOpen(false)}
          onConfirm={() => {
            setWizardOpen(false)
            toast.success('Configuração do layout salva.')
          }}
        />
      )}
    </div>
  )
}
