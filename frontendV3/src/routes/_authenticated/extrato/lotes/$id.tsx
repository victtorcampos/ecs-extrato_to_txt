import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { Lote } from '@/features/lotes/services/schemas'
import { Badge } from '@/shared/components/badge/badge'
import { ConfirmDialog } from '@/shared/components/confirm-dialog/confirm-dialog'
import { Spinner } from '@/shared/components/spinner/spinner'
import { useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/extrato/lotes/$id')({
  component: LoteDetailPage,
})

const STATUS_BADGE: Record<string, { variant: 'slate' | 'emerald' | 'amber' | 'red' | 'blue' | 'violet'; label: string }> = {
  aguardando: { variant: 'slate', label: 'Aguardando' },
  processando: { variant: 'blue', label: 'Processando' },
  pendente: { variant: 'amber', label: 'Pendente' },
  concluido: { variant: 'emerald', label: 'Concluído' },
  erro: { variant: 'red', label: 'Erro' },
}

function LoteDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [confirmProcess, setConfirmProcess] = useState(false)

  const { data: lote, isLoading, error } = useQuery({
    queryKey: ['lotes', id],
    queryFn: () => api.get<Lote>(`/lotes/${id}`),
    refetchInterval: (query) =>
      query.state.data?.status === 'processando' ? 2000 : false,
  })

  const processarMutation = useMutation({
    mutationFn: () => api.post<Lote>(`/lotes/${id}/processar`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lotes'] })
      toast.success('Lote enviado para processamento.')
      setConfirmProcess(false)
    },
    onError: () => toast.error('Erro ao iniciar processamento.'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-slate-400">
        <Spinner /> Carregando...
      </div>
    )
  }

  if (error || !lote) {
    return (
      <div className="max-w-xl">
        <div className="px-4 py-4 bg-red-50 border border-red-200 text-sm text-red-700">
          Lote não encontrado.
        </div>
        <Link to="/extrato/lotes" className="mt-4 inline-block text-sm text-slate-600 hover:text-slate-900">
          ← Voltar para lotes
        </Link>
      </div>
    )
  }

  const statusInfo = STATUS_BADGE[lote.status] ?? { variant: 'slate' as const, label: lote.status }
  const isProcessando = lote.status === 'processando'
  const canProcess = lote.status === 'aguardando' || lote.status === 'pendente'
  const isConcluido = lote.status === 'concluido'

  return (
    <div className="max-w-2xl">
      {/* Back */}
      <div className="mb-6">
        <Link to="/extrato/lotes" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
          ← Lotes
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Lote</p>
          <h1 className="text-2xl font-bold text-slate-900 font-mono">{lote.protocolo}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant={statusInfo.variant}>
              {isProcessando && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse" aria-hidden="true" />
              )}
              {statusInfo.label}
            </Badge>
            {lote.tem_arquivo_saida && (
              <span className="text-xs text-emerald-600 font-medium">Arquivo de saída disponível</span>
            )}
          </div>
        </div>
        {canProcess && (
          <button
            onClick={() => setConfirmProcess(true)}
            disabled={processarMutation.isPending}
            className="px-5 py-2.5 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
          >
            {processarMutation.isPending && <Spinner />}
            Processar
          </button>
        )}
      </div>

      {/* Status processando */}
      {isProcessando && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200">
          <Spinner />
          <div>
            <p className="text-sm font-medium text-blue-800">Processando...</p>
            <p className="text-xs text-blue-600 mt-0.5">Esta tela atualiza automaticamente a cada 2 segundos.</p>
          </div>
        </div>
      )}

      {/* Erro */}
      {lote.status === 'erro' && lote.mensagem_erro && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200">
          <p className="text-sm font-medium text-red-800 mb-1">Erro no processamento</p>
          <p className="text-xs text-red-600 font-mono">{lote.mensagem_erro}</p>
        </div>
      )}

      {/* Details */}
      <div className="border border-slate-200 bg-white divide-y divide-slate-100 mb-6">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <div className="px-4 py-3">
            <p className="text-xs text-slate-500 mb-0.5">CNPJ</p>
            <p className="text-sm font-medium font-mono">{lote.cnpj_formatado}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-slate-500 mb-0.5">Período</p>
            <p className="text-sm font-medium">{lote.periodo}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <div className="px-4 py-3">
            <p className="text-xs text-slate-500 mb-0.5">Layout</p>
            <p className="text-sm font-medium">{lote.nome_layout}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-slate-500 mb-0.5">Arquivo</p>
            <p className="text-sm font-medium">{lote.nome_arquivo ?? '—'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <div className="px-4 py-3">
            <p className="text-xs text-slate-500 mb-0.5">Criado em</p>
            <p className="text-sm font-medium">{new Date(lote.criado_em).toLocaleString('pt-BR')}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-slate-500 mb-0.5">Processado em</p>
            <p className="text-sm font-medium">{lote.processado_em ? new Date(lote.processado_em).toLocaleString('pt-BR') : '—'}</p>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {isConcluido && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Resultados do Processamento</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Lançamentos', value: lote.total_lancamentos, color: 'border-slate-200 bg-white' },
              {
                label: 'Valor Total',
                value: lote.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                color: 'border-slate-200 bg-white',
              },
              { label: 'Pendências', value: lote.total_pendencias, color: 'border-amber-200 bg-amber-50 text-amber-800' },
              { label: 'Resolvidas', value: lote.pendencias_resolvidas, color: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
            ].map(s => (
              <div key={s.label} className={`p-4 border text-center ${s.color}`}>
                <p className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1">{s.label}</p>
                <p className="text-xl font-bold font-mono">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {isConcluido && lote.tem_arquivo_saida && (
          <button
            onClick={() => toast.info('Download simulado — sem backend real.')}
            className="px-5 py-2.5 bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors"
          >
            Baixar Arquivo de Saída
          </button>
        )}
        <button
          onClick={() => void navigate({ to: '/extrato/lotes' })}
          className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          ← Voltar
        </button>
      </div>

      <ConfirmDialog
        open={confirmProcess}
        title="Processar lote"
        description={`Confirma o processamento do lote ${lote.protocolo}? O arquivo será convertido conforme o layout e perfil de saída configurados.`}
        confirmLabel="Processar"
        onConfirm={() => processarMutation.mutate()}
        onCancel={() => setConfirmProcess(false)}
      />
    </div>
  )
}
