import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { api } from '@/lib/api-client'
import type { User } from '@/features/auth/services/schemas'
import { UserCreateSchema, type UserCreate } from '@/features/auth/services/schemas'
import { Badge } from '@/shared/components/badge/badge'
import { ConfirmDialog } from '@/shared/components/confirm-dialog/confirm-dialog'
import { Spinner } from '@/shared/components/spinner/spinner'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/admin/usuarios')({
  component: UsuariosPage,
})

function UsuariosPage() {
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<{ items: User[] }>('/users'),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UserCreate>({
    resolver: zodResolver(UserCreateSchema),
    defaultValues: { papel: 'operador' },
  })

  const createMutation = useMutation({
    mutationFn: (body: UserCreate) => api.post<User>('/users', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuário criado.')
      setFormOpen(false)
      reset()
    },
    onError: () => toast.error('Erro ao criar usuário.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuário removido.')
      setDeleteId(null)
    },
    onError: () => toast.error('Erro ao remover usuário.'),
  })

  if (me?.papel !== 'admin') {
    return <p className="text-sm text-red-600">Acesso restrito a administradores.</p>
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Usuários</h2>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie os usuários do sistema.</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          + Novo Usuário
        </button>
      </div>

      {/* Form */}
      {formOpen && (
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="bg-slate-50 border border-slate-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Novo Usuário</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="u-nome" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">Nome</label>
              <input id="u-nome" {...register('nome')} className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900" />
              {errors.nome && <p className="mt-1 text-xs text-red-600">{errors.nome.message}</p>}
            </div>
            <div>
              <label htmlFor="u-email" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">E-mail</label>
              <input id="u-email" type="email" {...register('email')} className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900" />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label htmlFor="u-senha" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">Senha</label>
              <input id="u-senha" type="password" {...register('senha')} className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900" />
              {errors.senha && <p className="mt-1 text-xs text-red-600">{errors.senha.message}</p>}
            </div>
            <div>
              <label htmlFor="u-papel" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">Papel</label>
              <select id="u-papel" {...register('papel')} className="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900">
                <option value="admin">Admin</option>
                <option value="operador">Operador</option>
                <option value="visualizador">Visualizador</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" onClick={() => { setFormOpen(false); reset() }} className="px-4 py-2 border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-slate-400"><Spinner /> Carregando...</div>
      ) : (
        <div className="border border-slate-200 bg-white">
          <table className="w-full text-sm" aria-label="Lista de usuários">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">E-mail</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Papel</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.items.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.nome}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.papel === 'admin' ? 'violet' : u.papel === 'operador' ? 'blue' : 'slate'}>
                      {u.papel}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.ativo ? 'emerald' : 'red'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== me?.id && (
                      <button
                        onClick={() => setDeleteId(u.id)}
                        className="text-xs text-red-600 hover:text-red-800 transition-colors"
                        aria-label={`Remover ${u.nome}`}
                      >
                        Remover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Remover usuário"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
