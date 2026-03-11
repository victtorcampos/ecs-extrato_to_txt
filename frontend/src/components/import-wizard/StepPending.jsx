import React from 'react';
import { Button, Input } from '../ui';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

export const StepPending = ({ contasPendentes, mapeamentosManuais, setMapeamentosManuais, loading, onBack, onNext }) => {
  const handleMapear = (conta, valor) => {
    setMapeamentosManuais(prev => ({ ...prev, [conta]: valor }));
  };

  const pendentesNaoResolvidas = contasPendentes.filter(
    p => !mapeamentosManuais[p.conta] && !p.mapeamento_existente
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16" data-testid="step-pending-loading">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900 mb-3" />
        <p className="text-sm text-slate-500">Verificando mapeamentos...</p>
      </div>
    );
  }

  if (contasPendentes.length === 0) {
    return (
      <div className="space-y-6" data-testid="step-pending">
        <div className="text-center py-12">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">Todas as contas mapeadas</h3>
          <p className="text-sm text-slate-500 mt-1">Nenhuma pendência de mapeamento encontrada</p>
        </div>
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack} data-testid="back-btn">Voltar</Button>
          <Button onClick={onNext} data-testid="next-step-btn">Preview</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="step-pending">
      <div className="text-center mb-4">
        <h3 className="text-base font-semibold text-slate-900">Mapeamento de Contas</h3>
        <p className="text-sm text-slate-500 mt-1">
          {contasPendentes.length} conta{contasPendentes.length !== 1 ? 's' : ''} encontrada{contasPendentes.length !== 1 ? 's' : ''} sem mapeamento
        </p>
      </div>

      {pendentesNaoResolvidas.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{pendentesNaoResolvidas.length} conta{pendentesNaoResolvidas.length !== 1 ? 's' : ''} sem mapeamento. Preencha ou pule para resolver depois.</span>
        </div>
      )}

      {/* Grid de mapeamentos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {contasPendentes.map((p, idx) => {
          const valorAtual = mapeamentosManuais[p.conta] || p.mapeamento_existente || '';
          const resolvida = !!valorAtual;
          return (
            <div
              key={`${p.conta}-${p.tipo}-${idx}`}
              className={cn(
                'border rounded-lg p-3 transition-colors',
                resolvida ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white'
              )}
              data-testid={`pending-${idx}`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span className={cn(
                  'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                  p.tipo === 'debito' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                )}>
                  {p.tipo === 'debito' ? 'D' : 'C'}
                </span>
                <span className="font-mono text-sm font-medium text-slate-800 truncate">{p.conta}</span>
              </div>
              <Input
                value={valorAtual}
                onChange={(e) => handleMapear(p.conta, e.target.value)}
                placeholder="Conta contábil..."
                className="h-8 text-xs"
                data-testid={`map-input-${idx}`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} data-testid="back-btn">Voltar</Button>
        <Button onClick={onNext} data-testid="next-step-btn">Preview</Button>
      </div>
    </div>
  );
};

export default StepPending;
