import { z } from 'zod'

export const OutputProfileSchema = z.object({
  id: z.string(),
  nome: z.string(),
  sistema_destino: z.string(),
  sistema_destino_nome: z.string(),
  formato: z.string(),
  formato_nome: z.string(),
  ativo: z.boolean(),
  padrao: z.boolean(),
  config: z.record(z.unknown()),
  criado_em: z.string(),
  atualizado_em: z.string(),
  descricao: z.string().optional(),
})
export type OutputProfile = z.infer<typeof OutputProfileSchema>

export const OutputProfileFormSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  sistema_destino: z.string().min(1, 'Sistema obrigatório'),
  formato: z.string().min(1, 'Formato obrigatório'),
  ativo: z.boolean(),
  padrao: z.boolean(),
  descricao: z.string().optional(),
})
export type OutputProfileForm = z.infer<typeof OutputProfileFormSchema>

export const OUTPUT_SISTEMAS = [
  {
    value: 'dominio',
    nome: 'Domínio Sistemas',
    descricao: 'Sistema contábil Domínio',
    formatos: [
      { value: 'txt_dominio', nome: 'TXT Domínio', extensao: '.txt' },
      { value: 'csv_dominio', nome: 'CSV Domínio', extensao: '.csv' },
    ],
  },
  {
    value: 'sped',
    nome: 'SPED Contábil',
    descricao: 'Escrituração Contábil Digital',
    formatos: [
      { value: 'sped_ecf', nome: 'SPED ECF', extensao: '.txt' },
      { value: 'sped_ecd', nome: 'SPED ECD', extensao: '.txt' },
    ],
  },
  {
    value: 'csv_generico',
    nome: 'CSV Genérico',
    descricao: 'Exportação em CSV padrão',
    formatos: [
      { value: 'csv_padrao', nome: 'CSV Padrão', extensao: '.csv' },
    ],
  },
] as const
