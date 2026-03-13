import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api-client'
import type { PreviewExcelResponse, TestParseResponse, CamposDisponiveisResponse } from '@/features/import-layout/services/schemas'
import { Spinner } from '@/shared/components/spinner/spinner'
import { Badge } from '@/shared/components/badge/badge'

const STEPS = ['Planilha', 'Colunas', 'Teste', 'Confirmar'] as const
type Step = 0 | 1 | 2 | 3

const ConfigPlanilhaWizardSchema = z.object({
  nome_aba: z.string().optional(),
  linha_cabecalho: z.coerce.number().int().min(0),
  linha_inicio_dados: z.coerce.number().int().min(1),
})
type ConfigPlanilhaWizard = z.infer<typeof ConfigPlanilhaWizardSchema>

const MappingSchema = z.object({
  colunas: z.array(z.object({
    coluna_excel: z.string().min(1, 'Obrigatório'),
    campo_destino: z.string().min(1, 'Obrigatório'),
  })),
})
type MappingForm = z.infer<typeof MappingSchema>

interface LayoutWizardProps {
  layoutId: string
  layoutNome: string
  arquivo: File | null
  onClose: () => void
  onConfirm: (config: ConfigPlanilhaWizard, colunas: MappingForm['colunas']) => void
}

export function LayoutWizard({ layoutId, layoutNome, arquivo, onClose, onConfirm }: LayoutWizardProps) {
  const [step, setStep] = useState<Step>(0)
  const [configPlanilha, setConfigPlanilha] = useState<ConfigPlanilhaWizard>({
    nome_aba: '',
    linha_cabecalho: 0,
    linha_inicio_dados: 1,
  })
  const [testResult, setTestResult] = useState<TestParseResponse | null>(null)

  const configForm = useForm<ConfigPlanilhaWizard>({
    resolver: zodResolver(ConfigPlanilhaWizardSchema),
    defaultValues: configPlanilha,
  })

  const mappingForm = useForm<MappingForm>({
    resolver: zodResolver(MappingSchema),
    defaultValues: { colunas: [{ coluna_excel: '', campo_destino: '' }] },
  })
  const { fields, append, remove } = useFieldArray({ control: mappingForm.control, name: 'colunas' })

  // Campos disponíveis
  const { data: campos } = useQuery({
    queryKey: ['campos-disponiveis'],
    queryFn: () => api.get<CamposDisponiveisResponse>('/import-layouts/campos-disponiveis'),
  })

  // Preview excel (step 1 → 2)
  const previewMutation = useMutation({
    mutationFn: (config: ConfigPlanilhaWizard) => {
      const formData = new FormData()
      if (arquivo) formData.append('arquivo', arquivo)
      formData.append('nome_aba', config.nome_aba ?? '')
      formData.append('linha_cabecalho', String(config.linha_cabecalho))
      formData.append('linha_inicio_dados', String(config.linha_inicio_dados))
      return api.post<PreviewExcelResponse>(`/import-layouts/${layoutId}/preview-excel`, formData)
    },
    onSuccess: (data) => {
      // Pre-populate column mapping with detected headers
      const colunas = data.cabecalhos.slice(0, 5).map((h) => ({
        coluna_excel: h,
        campo_destino: '',
      }))
      mappingForm.setValue('colunas', colunas.length ? colunas : [{ coluna_excel: '', campo_destino: '' }])
      setStep(1)
    },
  })

  // Test parse (step 2 → 3)
  const testMutation = useMutation({
    mutationFn: (data: { config: ConfigPlanilhaWizard; colunas: MappingForm['colunas'] }) => {
      const body = {
        layout_id: layoutId,
        config_planilha: data.config,
        colunas: data.colunas,
      }
      return api.post<TestParseResponse>(`/import-layouts/${layoutId}/test-parse`, body)
    },
    onSuccess: (data) => {
      setTestResult(data)
      setStep(2)
    },
  })

  function handleStepConfig(values: ConfigPlanilhaWizard) {
    setConfigPlanilha(values)
    previewMutation.mutate(values)
  }

  function handleStepMapping(values: MappingForm) {
    testMutation.mutate({ config: configPlanilha, colunas: values.colunas })
  }

  function handleConfirm() {
    const colunas = mappingForm.getValues('colunas')
    onConfirm(configPlanilha, colunas)
  }

  const previewData = previewMutation.data

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Wizard de configuração de layout"
    >
      <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-0.5">Configurar Layout</p>
            <h2 className="text-base font-bold text-slate-900">{layoutNome}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors text-xl leading-none"
            aria-label="Fechar wizard"
          >
            ×
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex border-b border-slate-200">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`flex-1 px-4 py-3 text-xs font-medium text-center border-b-2 transition-colors ${
                i === step
                  ? 'border-slate-900 text-slate-900'
                  : i < step
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-400'
              }`}
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border mr-1.5 text-[10px] font-bold">
                {i < step ? '✓' : i + 1}
              </span>
              {label}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step 0: Config planilha */}
          {step === 0 && (
            <form onSubmit={configForm.handleSubmit(handleStepConfig)} id="form-config">
              <p className="text-sm text-slate-500 mb-5">
                Informe como a planilha está estruturada para que o sistema possa ler os dados corretamente.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nome da Aba (opcional)</label>
                  <input
                    {...configForm.register('nome_aba')}
                    placeholder="ex: Sheet1"
                    className="w-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <p className="text-xs text-slate-400 mt-1">Deixe em branco para usar a primeira aba.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Linha do Cabeçalho</label>
                    <input
                      {...configForm.register('linha_cabecalho')}
                      type="number"
                      min={0}
                      className="w-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <p className="text-xs text-slate-400 mt-1">Índice 0 = primeira linha.</p>
                    {configForm.formState.errors.linha_cabecalho && (
                      <p className="text-xs text-red-600 mt-1">{configForm.formState.errors.linha_cabecalho.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Linha de Início dos Dados</label>
                    <input
                      {...configForm.register('linha_inicio_dados')}
                      type="number"
                      min={1}
                      className="w-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    {configForm.formState.errors.linha_inicio_dados && (
                      <p className="text-xs text-red-600 mt-1">{configForm.formState.errors.linha_inicio_dados.message}</p>
                    )}
                  </div>
                </div>
              </div>
              {previewMutation.isError && (
                <p className="mt-4 text-xs text-red-600">Erro ao carregar preview. Verifique as configurações.</p>
              )}
            </form>
          )}

          {/* Step 1: Column mapping */}
          {step === 1 && (
            <form onSubmit={mappingForm.handleSubmit(handleStepMapping)} id="form-mapping">
              <p className="text-sm text-slate-500 mb-4">
                Mapeie cada coluna do Excel para o campo correspondente no sistema.
              </p>
              {previewData && (
                <div className="mb-4 px-3 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  Aba: <strong>{previewData.aba_selecionada}</strong> · {previewData.total_linhas} linhas · {previewData.total_colunas} colunas
                </div>
              )}
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
                  <span>Coluna Excel</span>
                  <span>Campo Destino</span>
                  <span />
                </div>
                {fields.map((field, i) => (
                  <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                    <div>
                      <input
                        {...mappingForm.register(`colunas.${i}.coluna_excel`)}
                        placeholder="ex: A ou Data"
                        list="excel-cols"
                        className="w-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                      {mappingForm.formState.errors.colunas?.[i]?.coluna_excel && (
                        <p className="text-xs text-red-600 mt-0.5">{mappingForm.formState.errors.colunas[i]?.coluna_excel?.message}</p>
                      )}
                    </div>
                    <div>
                      <select
                        {...mappingForm.register(`colunas.${i}.campo_destino`)}
                        className="w-full border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                      >
                        <option value="">Selecione...</option>
                        {campos && Object.entries(campos).map(([key, info]) => (
                          <option key={key} value={key}>{info.label}{info.obrigatorio ? ' *' : ''}</option>
                        ))}
                      </select>
                      {mappingForm.formState.errors.colunas?.[i]?.campo_destino && (
                        <p className="text-xs text-red-600 mt-0.5">{mappingForm.formState.errors.colunas[i]?.campo_destino?.message}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="px-2 py-2 text-slate-400 hover:text-red-600 text-lg leading-none"
                      aria-label="Remover linha"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <datalist id="excel-cols">
                {previewData?.cabecalhos.map(h => <option key={h} value={h} />)}
              </datalist>
              <button
                type="button"
                onClick={() => append({ coluna_excel: '', campo_destino: '' })}
                className="mt-3 text-xs text-slate-600 hover:text-slate-900 underline"
              >
                + Adicionar coluna
              </button>
              {testMutation.isError && (
                <p className="mt-4 text-xs text-red-600">Erro ao executar teste de parse.</p>
              )}
            </form>
          )}

          {/* Step 2: Test results */}
          {step === 2 && testResult && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                {[
                  { label: 'Total', value: testResult.resumo.total, v: 'slate' as const },
                  { label: 'OK', value: testResult.resumo.ok, v: 'emerald' as const },
                  { label: 'Fora Período', value: testResult.resumo.fora_periodo, v: 'amber' as const },
                  { label: 'Sem Conta', value: testResult.resumo.sem_conta, v: 'blue' as const },
                  { label: 'Erros', value: testResult.resumo.erros, v: 'red' as const },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 border border-slate-200 bg-white">
                    <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                    <p className="text-xl font-bold font-mono text-slate-900">{s.value}</p>
                  </div>
                ))}
              </div>

              {testResult.erros.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-slate-700 mb-2">Erros encontrados:</p>
                  <div className="border border-red-200 bg-red-50 divide-y divide-red-100 max-h-32 overflow-y-auto">
                    {testResult.erros.slice(0, 10).map((e, i) => (
                      <div key={i} className="px-3 py-1.5 text-xs text-red-700">
                        Linha {e.linha} · <span className="font-medium">{e.campo}</span>: {e.mensagem}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs font-medium text-slate-700 mb-2">Pré-visualização dos lançamentos:</p>
              <div className="border border-slate-200 overflow-auto max-h-48">
                <table className="w-full text-xs" aria-label="Preview de lançamentos">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Linha</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Data</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-500">Valor</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Débito</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Crédito</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {testResult.lancamentos.slice(0, 15).map((l, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 text-slate-500">{l.linha}</td>
                        <td className="px-3 py-1.5">{l.data ?? '—'}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{l.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-1.5 font-mono">{l.conta_debito}</td>
                        <td className="px-3 py-1.5 font-mono">{l.conta_credito}</td>
                        <td className="px-3 py-1.5">
                          <Badge variant={l.status === 'ok' ? 'emerald' : l.status === 'erro' ? 'red' : 'amber'}>
                            {l.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="px-4 py-4 bg-emerald-50 border border-emerald-200">
                <p className="text-sm font-medium text-emerald-800 mb-1">Configuração pronta para salvar</p>
                <p className="text-xs text-emerald-600">
                  A configuração do layout será salva e utilizada para processar o arquivo.
                </p>
              </div>
              <div className="border border-slate-200 bg-white divide-y divide-slate-100 text-sm">
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-slate-500">Aba</span>
                  <span className="font-medium">{configPlanilha.nome_aba || '(primeira aba)'}</span>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-slate-500">Linha cabeçalho</span>
                  <span className="font-medium font-mono">{configPlanilha.linha_cabecalho}</span>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-slate-500">Início dos dados</span>
                  <span className="font-medium font-mono">{configPlanilha.linha_inicio_dados}</span>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-slate-500">Colunas mapeadas</span>
                  <span className="font-medium">{mappingForm.getValues('colunas').length}</span>
                </div>
                {testResult && (
                  <div className="px-4 py-3 flex justify-between">
                    <span className="text-slate-500">Lançamentos OK no teste</span>
                    <span className="font-medium text-emerald-700">{testResult.resumo.ok} / {testResult.resumo.total}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => step > 0 ? setStep((step - 1) as Step) : onClose()}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            {step === 0 ? 'Cancelar' : '← Voltar'}
          </button>
          <div className="flex items-center gap-3">
            {(previewMutation.isPending || testMutation.isPending) && <Spinner />}
            {step === 0 && (
              <button
                type="submit"
                form="form-config"
                disabled={previewMutation.isPending}
                className="px-5 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                Próximo →
              </button>
            )}
            {step === 1 && (
              <button
                type="submit"
                form="form-mapping"
                disabled={testMutation.isPending}
                className="px-5 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                Testar Parse →
              </button>
            )}
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                Próximo →
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={handleConfirm}
                className="px-5 py-2 bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors"
              >
                Confirmar e Salvar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
