import { z } from 'zod'

export const LoteStatusSchema = z.enum(['aguardando', 'processando', 'pendente', 'concluido', 'erro'])
export type LoteStatus = z.infer<typeof LoteStatusSchema>

export const LoteSchema = z.object({
  id: z.string(),
  protocolo: z.string(),
  cnpj: z.string(),
  cnpj_formatado: z.string(),
  periodo: z.string(),
  nome_layout: z.string(),
  layout_id: z.string().optional(),
  perfil_saida_id: z.string().optional(),
  status: LoteStatusSchema,
  mensagem_erro: z.string().optional(),
  nome_arquivo: z.string().optional(),
  tem_arquivo_saida: z.boolean(),
  total_lancamentos: z.number(),
  valor_total: z.number(),
  total_pendencias: z.number(),
  pendencias_resolvidas: z.number(),
  criado_em: z.string(),
  atualizado_em: z.string(),
  processado_em: z.string().optional(),
})
export type Lote = z.infer<typeof LoteSchema>

export const LoteEstatisticasSchema = z.object({
  total: z.number(),
  concluidos: z.number(),
  pendentes: z.number(),
  processando: z.number(),
  com_erro: z.number(),
})
export type LoteEstatisticas = z.infer<typeof LoteEstatisticasSchema>
