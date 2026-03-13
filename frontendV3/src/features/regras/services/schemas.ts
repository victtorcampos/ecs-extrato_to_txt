import { z } from 'zod'

export const TipoRegraSchema = z.enum(['filtro', 'transformacao', 'validacao', 'enriquecimento'])
export type TipoRegra = z.infer<typeof TipoRegraSchema>

export const OperadorCondicaoSchema = z.enum([
  'igual', 'diferente',
  'maior', 'menor', 'maior_igual', 'menor_igual', 'entre',
  'contem', 'nao_contem', 'comeca_com', 'termina_com',
  'vazio', 'nao_vazio', 'regex',
])
export type OperadorCondicao = z.infer<typeof OperadorCondicaoSchema>

export const TipoAcaoSchema = z.enum([
  'excluir', 'definir_valor', 'concatenar', 'substituir',
  'maiuscula', 'minuscula', 'absoluto',
])
export type TipoAcao = z.infer<typeof TipoAcaoSchema>

export const CondicaoRegraSchema = z.object({
  campo: z.string(),
  operador: OperadorCondicaoSchema,
  valor: z.string().optional(),
  valor_fim: z.string().optional(),
})
export type CondicaoRegra = z.infer<typeof CondicaoRegraSchema>

export const AcaoRegraSchema = z.object({
  tipo_acao: TipoAcaoSchema,
  campo_destino: z.string().optional(),
  valor: z.string().optional(),
})
export type AcaoRegra = z.infer<typeof AcaoRegraSchema>

export const RegraSchema = z.object({
  id: z.string(),
  layout_id: z.string(),
  nome: z.string(),
  descricao: z.string().optional(),
  ordem: z.number(),
  ativo: z.boolean(),
  tipo: TipoRegraSchema,
  condicoes: z.array(CondicaoRegraSchema),
  condicoes_ou: z.array(CondicaoRegraSchema).optional(),
  acao: AcaoRegraSchema,
  acoes_extras: z.array(AcaoRegraSchema).optional(),
  criado_em: z.string(),
  atualizado_em: z.string().optional(),
})
export type Regra = z.infer<typeof RegraSchema>

export const RegraFormSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
  tipo: TipoRegraSchema,
  condicoes: z.array(CondicaoRegraSchema),
  acao: AcaoRegraSchema,
})
export type RegraForm = z.infer<typeof RegraFormSchema>

export const OPERADOR_LABELS: Record<OperadorCondicao, string> = {
  igual: 'igual a', diferente: 'diferente de',
  maior: 'maior que', menor: 'menor que',
  maior_igual: 'maior ou igual a', menor_igual: 'menor ou igual a',
  entre: 'entre', contem: 'contém', nao_contem: 'não contém',
  comeca_com: 'começa com', termina_com: 'termina com',
  vazio: 'está vazio', nao_vazio: 'não está vazio', regex: 'regex',
}

export const TIPO_ACAO_LABELS: Record<TipoAcao, string> = {
  excluir: 'Excluir lançamento', definir_valor: 'Definir valor',
  concatenar: 'Concatenar', substituir: 'Substituir texto',
  maiuscula: 'Maiúscula', minuscula: 'Minúscula', absoluto: 'Valor absoluto',
}

export const TIPO_REGRA_LABELS: Record<TipoRegra, string> = {
  filtro: 'Filtro', transformacao: 'Transformação',
  validacao: 'Validação', enriquecimento: 'Enriquecimento',
}

export const OPERADORES_SEM_VALOR: OperadorCondicao[] = ['vazio', 'nao_vazio']
