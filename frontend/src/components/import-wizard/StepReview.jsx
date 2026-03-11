import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui';
import { Check, AlertTriangle, HelpCircle, Library, ChevronUp, ChevronDown } from 'lucide-react';

const CAMPOS_LABEL = {
  data: 'Data',
  valor: 'Valor',
  historico: 'Histórico',
  conta_debito: 'Conta Débito',
  conta_credito: 'Conta Crédito',
  documento: 'Documento',
  cnpj_cpf_terceiro: 'CNPJ/CPF',
  razao_social_terceiro: 'Razão Social',
  tipo_dc: 'Tipo D/C',
  nome_empresa: 'Empresa',
  codigo_historico: 'Cód. Histórico',
  ignorar: '— Ignorar —',
};

const CAMPO_OPTIONS = Object.entries(CAMPOS_LABEL).map(([value, label]) => ({ value, label }));

const ConfidenceBadge = ({ value }) => {
  if (value >= 0.8) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><Check className="w-3 h-3" /> {Math.round(value * 100)}%</span>;
  if (value >= 0.5) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><AlertTriangle className="w-3 h-3" /> {Math.round(value * 100)}%</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><HelpCircle className="w-3 h-3" /> {Math.round(value * 100)}%</span>;
};

export const StepReview = ({ detection, onUpdateColumn, layoutsDisponiveis, onApplyLayout, layoutAplicadoId, onBack, onNext }) => {
  const [painelAberto, setPainelAberto] = useState(true);

  if (!detection) return null;

  const { config_planilha, colunas, config_valor, preview_dados } = detection;

  return (
    <div className="space-y-6" data-testid="step-review">

      {/* Layouts salvos para este CNPJ */}
      {layoutsDisponiveis?.length > 0 && (
        <div className="border border-amber-200 rounded-lg bg-amber-50" data-testid="layouts-disponiveis">
          <button
            onClick={() => setPainelAberto(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-amber-800"
          >
            <span className="flex items-center gap-2">
              <Library className="w-4 h-4" />
              Layouts salvos para este CNPJ ({layoutsDisponiveis.length})
            </span>
            {painelAberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {painelAberto && (
            <div className="px-4 pb-3 space-y-2">
              {layoutsDisponiveis.map(layout => (
                <div key={layout.id} className="flex items-center justify-between bg-white rounded-md p-3 border border-amber-100">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{layout.nome}</p>
                    <p className="text-xs text-slate-500">
                      {layout.total_colunas} colunas • {layout.regras_conta?.length || layout.total_regras || 0} regras de contas
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {layoutAplicadoId === layout.id && (
                      <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Aplicado
                      </span>
                    )}
                    <Button size="sm" variant="outline" onClick={() => onApplyLayout(layout)} data-testid={`apply-layout-${layout.id}`}>
                      {layoutAplicadoId === layout.id ? 'Reaplicar' : 'Aplicar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Structure info */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Estrutura Detectada</h3>
        <div className="flex gap-6 text-sm text-slate-600">
          <span>Aba: <strong>{config_planilha.nome_aba}</strong></span>
          <span>Cabeçalho: linha <strong>{config_planilha.linha_cabecalho + 1}</strong></span>
          <span>Dados: linha <strong>{config_planilha.linha_inicio_dados + 1}</strong></span>
        </div>
      </div>

      {/* Config Valor */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-700 mb-1">Débito/Crédito</h3>
        <p className="text-sm text-blue-600">
          {config_valor.tipo_sinal === 'sinal_valor' && 'Determinado pelo sinal do valor (positivo/negativo)'}
          {config_valor.tipo_sinal === 'coluna_tipo' && `Coluna D/C na posição ${config_valor.coluna_tipo}`}
          {config_valor.tipo_sinal === 'colunas_separadas' && `Colunas separadas: Débito (col ${parseInt(config_valor.coluna_debito) + 1}) / Crédito (col ${parseInt(config_valor.coluna_credito) + 1})`}
          {config_valor.tipo_sinal === 'valor_com_dc' && `Valor com ${config_valor.formato_dc} D/C`}
        </p>
      </div>

      {/* Columns table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2 font-medium text-slate-600">Col</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Cabeçalho</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Tipo</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600 min-w-[160px]">Mapeamento</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Confiança</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Amostra</th>
              </tr>
            </thead>
            <tbody>
              {colunas.map((col, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    'border-b border-slate-100 transition-colors',
                    col.campo_destino === 'ignorar' ? 'opacity-50' : 'hover:bg-slate-50'
                  )}
                  data-testid={`column-row-${idx}`}
                >
                  <td className="px-3 py-2 text-slate-400 font-mono text-xs">{parseInt(col.coluna_excel) + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-800 truncate max-w-[150px]">{col.nome_cabecalho}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                      {col.tipo_dado}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={col.campo_destino}
                      onChange={(e) => onUpdateColumn(idx, 'campo_destino', e.target.value)}
                      className={cn(
                        'w-full h-8 rounded border text-xs px-2',
                        col.campo_destino === 'ignorar' ? 'border-slate-200 text-slate-400' : 'border-slate-300 text-slate-800'
                      )}
                      data-testid={`column-mapping-${idx}`}
                    >
                      {CAMPO_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <ConfidenceBadge value={col.confianca} />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 truncate max-w-[200px]">
                    {col.valores_amostra?.slice(0, 2).map(v => String(v ?? '')).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview data */}
      {preview_dados?.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900">
            Preview dos dados ({preview_dados.length} linhas)
          </summary>
          <div className="mt-2 overflow-x-auto border rounded-lg">
            <table className="text-xs w-full">
              <tbody>
                {preview_dados.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-slate-100">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-2 py-1 text-slate-600 whitespace-nowrap">{String(cell ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} data-testid="back-btn">Voltar</Button>
        <Button onClick={onNext} data-testid="next-step-btn">Configurar Contas</Button>
      </div>
    </div>
  );
};

export default StepReview;
