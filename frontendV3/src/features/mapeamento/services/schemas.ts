import { z } from 'zod'

export const AccountMappingSchema = z.object({
  id: z.string(),
  cnpj: z.string(),
  cnpj_formatado: z.string(),
  conta_cliente: z.string(),
  conta_padrao: z.string(),
  nome_conta_cliente: z.string().optional(),
  nome_conta_padrao: z.string().optional(),
  criado_em: z.string(),
})
export type AccountMapping = z.infer<typeof AccountMappingSchema>

export const AccountMappingFormSchema = z.object({
  conta_cliente: z.string().min(1, 'Conta do extrato obrigatória'),
  conta_padrao: z.string().min(1, 'Conta contábil obrigatória'),
  nome_conta_cliente: z.string().optional(),
  nome_conta_padrao: z.string().optional(),
})
export type AccountMappingForm = z.infer<typeof AccountMappingFormSchema>
