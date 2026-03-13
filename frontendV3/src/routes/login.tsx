import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { LoginRequestSchema, type LoginRequest } from '@/features/auth/services/schemas'
import { Spinner } from '@/shared/components/spinner/spinner'
import { useState } from 'react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
  })

  if (isAuthenticated) {
    void navigate({ to: '/dashboard' })
    return null
  }

  async function onSubmit(data: LoginRequest) {
    setError(null)
    try {
      await login(data)
      void navigate({ to: '/dashboard' })
    } catch {
      setError('E-mail ou senha inválidos.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-slate-900">ECS</h1>
          <p className="text-sm text-slate-500 mt-1">Extrato to TXT — Acesse sua conta</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
              E-mail
            </label>
            <input
              id="email" type="email" autoComplete="email"
              {...register('email')}
              className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors"
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-xs text-red-600" role="alert">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="senha" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
              Senha
            </label>
            <input
              id="senha" type="password" autoComplete="current-password"
              {...register('senha')}
              className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors"
              aria-describedby={errors.senha ? 'senha-error' : undefined}
            />
            {errors.senha && (
              <p id="senha-error" className="mt-1 text-xs text-red-600" role="alert">{errors.senha.message}</p>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2" role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-9 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting && <Spinner size={14} />}
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-400 text-center">
          Demo: admin@ecs.com / admin123
        </p>
      </div>
    </div>
  )
}
