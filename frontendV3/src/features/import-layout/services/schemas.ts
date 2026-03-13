import { z } from 'zod'

export const TipoDadoSchema = z.enum(['string', 'decimal', 'date', 'integer'])
export type TipoDado = z.infer<typeof TipoDadoSchema>

export const ConfigPlanilhaSchema = z.object({
  nome_aba: z.string().optional(),
  linha_cabecalho: z.number().int().min(0),
  linha_inicio_dados: z.number().int().min(0),
})
export type ConfigPlanilha = z.infer<typeof ConfigPlanilhaSchema>

export const ColunaLayoutSchema = z.object({
  coluna_excel: z.string(),
  campo_destino: z.string(),
  tipo_dado: TipoDadoSchema,
  formato: z.string().optional(),
  obrigatorio: z.boolean().optional(),
  valor_padrao: z.string().optional(),
})
export type ColunaLayout = z.infer<typeof ColunaLayoutSchema>

export const ImportLayoutSchema = z.object({
  id: z.string(),
  nome: z.string(),
  cnpj: z.string(),
  ativo: z.boolean(),
  criado_em: z.string(),
  descricao: z.string().optional(),
})
export type ImportLayout = z.infer<typeof ImportLayoutSchema>

export const ImportLayoutCompletoSchema = ImportLayoutSchema.extend({
  config_planilha: ConfigPlanilhaSchema.optional(),
  colunas: z.array(ColunaLayoutSchema).optional(),
})
export type ImportLayoutCompleto = z.infer<typeof ImportLayoutCompletoSchema>

export const ImportLayoutFormSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  cnpj: z.string().min(14, 'CNPJ obrigatório'),
  descricao: z.string().optional(),
  ativo: z.boolean(),
  config_planilha: ConfigPlanilhaSchema,
  colunas: z.array(ColunaLayoutSchema),
})
export type ImportLayoutForm = z.infer<typeof ImportLayoutFormSchema>

export const CampoDisponivelInfoSchema = z.object({
  label: z.string(),
  tipo: z.string(),
  obrigatorio: z.boolean(),
})
export type CampoDisponivelInfo = z.infer<typeof CampoDisponivelInfoSchema>

export const CamposDisponiveisResponseSchema = z.record(CampoDisponivelInfoSchema)
export type CamposDisponiveisResponse = z.infer<typeof CamposDisponiveisResponseSchema>

export const PreviewExcelResponseSchema = z.object({
  abas: z.array(z.string()),
  aba_selecionada: z.string(),
  cabecalhos: z.array(z.string()),
  linhas: z.array(z.array(z.unknown())),
  total_linhas: z.number(),
  total_colunas: z.number(),
})
export type PreviewExcelResponse = z.infer<typeof PreviewExcelResponseSchema>

export const LancamentoPreviewSchema = z.object({
  linha: z.number(),
  data: z.string().optional(),
  valor: z.number(),
  conta_debito: z.string(),
  conta_credito: z.string(),
  historico: z.string(),
  documento: z.string(),
  status: z.string(),
  mensagem: z.string().optional(),
})
export type LancamentoPreview = z.infer<typeof LancamentoPreviewSchema>

export const TestParseResponseSchema = z.object({
  lancamentos: z.array(LancamentoPreviewSchema),
  resumo: z.object({
    total: z.number(),
    ok: z.number(),
    fora_periodo: z.number(),
    sem_conta: z.number(),
    erros: z.number(),
  }),
  erros: z.array(z.object({ linha: z.number(), campo: z.string(), mensagem: z.string() })),
  contas_pendentes: z.array(z.object({
    conta: z.string(),
    tipo: z.string(),
    mapeamento_existente: z.string().optional(),
  })),
})
export type TestParseResponse = z.infer<typeof TestParseResponseSchema>
