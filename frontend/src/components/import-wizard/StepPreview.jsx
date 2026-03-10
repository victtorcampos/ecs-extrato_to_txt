import React from 'react';
import { Button } from '../ui';
import { CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const StatusIcon = ({ status }) => {
  if (status === 'ok') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (status === 'fora_periodo') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  return <XCircle className="w-4 h-4 text-red-500" />;
};

export const StepPreview = ({ preview, loading, onBack, onProcess }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16" data-testid="step-preview-loading">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-3" />
        <p className="text-sm text-slate-500">Simulando parsing...</p>
      </div>
    );
  }

  if (!preview) return null;

  const { lancamentos, resumo } = preview;

  return (
    <div className="space-y-6" data-testid="step-preview">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard label="Total" value={resumo.total} color="slate" />
        <SummaryCard label="OK" value={resumo.ok} color="emerald" />
        <SummaryCard label="Fora período" value={resumo.fora_periodo} color="amber" />
        <SummaryCard label="Sem conta" value={resumo.sem_conta} color="red" />
        <SummaryCard label="Erros" value={resumo.erros} color="red" />
      </div>

      {/* Success rate bar */}
      {resumo.total > 0 && (
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div className="flex justify-between text-xs text-slate-600 mb-1">
            <span>Taxa de sucesso</span>
            <span className="font-bold">{Math.round((resumo.ok / resumo.total) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', resumo.ok === resumo.total ? 'bg-emerald-500' : 'bg-amber-500')}
              style={{ width: `${(resumo.ok / resumo.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Lancamentos table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2 text-left font-medium text-slate-600 w-8">#</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 w-8">St</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Data</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600">Valor</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Débito</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Crédito</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Histórico</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((l) => (
                <tr
                  key={l.linha}
                  className={cn(
                    'border-b border-slate-50 transition-colors',
                    l.status === 'ok' ? 'hover:bg-slate-50' : l.status === 'fora_periodo' ? 'bg-amber-50/40' : 'bg-red-50/40'
                  )}
                  data-testid={`preview-row-${l.linha}`}
                  title={l.mensagem || ''}
                >
                  <td className="px-3 py-1.5 text-xs text-slate-400 font-mono">{l.linha}</td>
                  <td className="px-3 py-1.5"><StatusIcon status={l.status} /></td>
                  <td className="px-3 py-1.5 text-slate-700 whitespace-nowrap">{l.data || '-'}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-800">
                    {l.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-xs text-slate-600">{l.conta_debito || '-'}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-slate-600">{l.conta_credito || '-'}</td>
                  <td className="px-3 py-1.5 text-xs text-slate-500 truncate max-w-[200px]">{l.historico || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} data-testid="back-btn">Voltar e Ajustar</Button>
        <Button
          onClick={onProcess}
          disabled={resumo.total === 0}
          className="bg-emerald-600 hover:bg-emerald-700"
          data-testid="process-btn"
        >
          Processar Lote
        </Button>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, color }) => {
  const colors = {
    slate: 'bg-slate-50 text-slate-800 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    red: 'bg-red-50 text-red-800 border-red-200',
  };
  return (
    <div className={cn('rounded-lg p-3 border text-center', colors[color])} data-testid={`summary-${label.toLowerCase().replace(' ', '-')}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-70">{label}</p>
    </div>
  );
};

export default StepPreview;
