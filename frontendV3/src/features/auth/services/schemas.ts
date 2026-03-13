import { z } from 'zod'

export const UserPapelSchema = z.enum(['admin', 'operador', 'visualizador'])
export type UserPapel = z.infer<typeof UserPapelSchema>

export const UserSchema = z.object({
  id: z.string(),
  nome: z.string(),
  email: z.string().email(),
  papel: UserPapelSchema,
  ativo: z.boolean(),
  criado_em: z.string(),
})
export type User = z.infer<typeof UserSchema>

export const LoginRequestSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(3, 'Senha obrigatória'),
})
export type LoginRequest = z.infer<typeof LoginRequestSchema>

export const LoginResponseSchema = z.object({
  access_token: z.string(),
  user: UserSchema,
})
export type LoginResponse = z.infer<typeof LoginResponseSchema>

export const TokenPayloadSchema = z.object({
  sub: z.string(),
  email: z.string(),
  papel: UserPapelSchema,
  exp: z.number(),
})
export type TokenPayload = z.infer<typeof TokenPayloadSchema>

export const UserCreateSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Mínimo 6 caracteres'),
  papel: UserPapelSchema,
})
export type UserCreate = z.infer<typeof UserCreateSchema>
