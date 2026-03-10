import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Copy } from 'lucide-react';

const OPERADOR_OPTIONS = [
  { value: 'positivo', label: 'Positivo (>= 0)' },
  { value: 'negativo', label: 'Negativo (< 0)' },
  { value: 'igual', label: 'Igual a' },
  { value: 'diferente', label: 'Diferente de' },
  { value: 'contem', label: 'Contém' },
  { value: 'nao_contem', label: 'Não contém' },
  { value: 'comeca_com', label: 'Começa com' },
  { value: 'termina_com', label: 'Termina com' },
  { value: 'dc_debito', label: 'É Débito (D)' },
  { value: 'dc_credito', label: 'É Crédito (C)' },
];

const CAMPO_ESPECIAL_OPTIONS = [
  { value: '_sinal_valor', label: 'Sinal do Valor (+/-)' },
  { value: '_tipo_dc', label: 'Tipo D/C (determinado)' },
];

const TEMPLATES = [
  {
    label: 'Por sinal do valor',
    rules: [
      { nome: 'Valor negativo', condicoes: [{ campo: '_sinal_valor', operador: 'negativo', valor: '', coluna_excel: '' }], conta_debito: '', conta_credito: '' },
      { nome: 'Valor positivo', condicoes: [{ campo: '_sinal_valor', operador: 'positivo', valor: '', coluna_excel: '' }], conta_debito: '', conta_credito: '' },
    ],
  },
  {
    label: 'Por coluna D/C',
    rules: [
      { nome: 'Débito', condicoes: [{ campo: '_tipo_dc', operador: 'dc_debito', valor: '', coluna_excel: '' }], conta_debito: '', conta_credito: '' },
      { nome: 'Crédito', condicoes: [{ campo: '_tipo_dc', operador: 'dc_credito', valor: '', coluna_excel: '' }], conta_debito: '', conta_credito: '' },
    ],
  },
  {
    label: 'Por conteúdo de coluna',
    rules: [
      { nome: 'Regra 1', condicoes: [{ campo: '', operador: 'contem', valor: '', coluna_excel: '' }], conta_debito: '', conta_credito: '' },
    ],
  },
  {
    label: 'Por combinação de colunas',
    rules: [
      { nome: 'Regra 1', condicoes: [{ campo: '', operador: 'igual', valor: '', coluna_excel: '' }, { campo: '', operador: 'igual', valor: '', coluna_excel: '' }], conta_debito: '', conta_credito: '' },
    ],
  },
];

const emptyCondicao = () => ({ campo: '', operador: 'igual', valor: '', coluna_excel: '' });
const emptyRegra = () => ({
  id: crypto.randomUUID(),
  nome: '',
  ordem: 0,
  ativo: true,
  condicoes: [emptyCondicao()],
  conta_debito: '',
  conta_credito: '',
});

const needsValue = (op) => !['positivo', 'negativo', 'dc_debito', 'dc_credito'].includes(op);

/**
 * Construtor visual de Regras de Definição de Contas
 */
export const AccountRulesBuilder = ({ regras = [], camposDisponiveis = {}, onChange }) => {
  const [expanded, setExpanded] = useState({});

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const addRegra = () => {
    const nova = emptyRegra();
    nova.ordem = regras.length;
    onChange([...regras, nova]);
    setExpanded((p) => ({ ...p, [nova.id]: true }));
  };

  const removeRegra = (idx) => {
    const updated = regras.filter((_, i) => i !== idx).map((r, i) => ({ ...r, ordem: i }));
    onChange(updated);
  };

  const duplicateRegra = (idx) => {
    const orig = regras[idx];
    const copia = {
      ...JSON.parse(JSON.stringify(orig)),
      id: crypto.randomUUID(),
      nome: `${orig.nome} (cópia)`,
      ordem: regras.length,
    };
    const updated = [...regras, copia];
    onChange(updated);
    setExpanded((p) => ({ ...p, [copia.id]: true }));
  };

  const updateRegra = (idx, key, value) => {
    const updated = [...regras];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange(updated);
  };

  const addCondicao = (regraIdx) => {
    const updated = [...regras];
    updated[regraIdx] = {
      ...updated[regraIdx],
      condicoes: [...updated[regraIdx].condicoes, emptyCondicao()],
    };
    onChange(updated);
  };

  const removeCondicao = (regraIdx, condIdx) => {
    const updated = [...regras];
    updated[regraIdx] = {
      ...updated[regraIdx],
      condicoes: updated[regraIdx].condicoes.filter((_, i) => i !== condIdx),
    };
    onChange(updated);
  };

  const updateCondicao = (regraIdx, condIdx, key, value) => {
    const updated = [...regras];
    const conds = [...updated[regraIdx].condicoes];
    conds[condIdx] = { ...conds[condIdx], [key]: value };
    updated[regraIdx] = { ...updated[regraIdx], condicoes: conds };
    onChange(updated);
  };

  const moveRegra = (idx, direction) => {
    if ((direction === -1 && idx === 0) || (direction === 1 && idx === regras.length - 1)) return;
    const updated = [...regras];
    const target = idx + direction;
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    onChange(updated.map((r, i) => ({ ...r, ordem: i })));
  };

  const applyTemplate = (template) => {
    const novasRegras = template.rules.map((r, i) => ({
      ...emptyRegra(),
      ...r,
      id: crypto.randomUUID(),
      ordem: regras.length + i,
    }));
    onChange([...regras, ...novasRegras]);
    novasRegras.forEach((r) => setExpanded((p) => ({ ...p, [r.id]: true })));
  };

  const campoOptions = Object.entries(camposDisponiveis).map(([k, v]) => ({
    value: k,
    label: v.label || k,
  }));

  return (
    <div className="space-y-4" data-testid="account-rules-builder">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Regras de Definição de Contas</h3>
          <p className="text-xs text-slate-400 mt-0.5">Defina quais contas usar com base nos dados. Primeira regra que bater, vence.</p>
        </div>
        <button
          type="button"
          onClick={addRegra}
          data-testid="add-account-rule-btn"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Regra
        </button>
      </div>

      {/* Templates */}
      {regras.length === 0 && (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-4" data-testid="rule-templates">
          <p className="text-xs font-medium text-slate-600 mb-2">Começar com um template:</p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyTemplate(t)}
                data-testid={`template-${i}`}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-full bg-white hover:bg-slate-100 text-slate-700 transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rules list */}
      <div className="space-y-3">
        {regras.map((regra, idx) => {
          const isOpen = expanded[regra.id];
          return (
            <div
              key={regra.id}
              className={`border rounded-lg transition-all ${isOpen ? 'border-slate-400 bg-white shadow-sm' : 'border-slate-200 bg-slate-50'}`}
              data-testid={`account-rule-${idx}`}
            >
              {/* Rule header */}
              <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => toggle(regra.id)}>
                <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <span className="text-xs font-mono text-slate-400 w-6">#{idx + 1}</span>
                <span className="text-sm font-medium text-slate-800 flex-1 truncate">
                  {regra.nome || 'Regra sem nome'}
                </span>
                {regra.conta_debito && regra.conta_credito && (
                  <span className="text-xs font-mono px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                    D:{regra.conta_debito} / C:{regra.conta_credito}
                  </span>
                )}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button type="button" onClick={(e) => { e.stopPropagation(); moveRegra(idx, -1); }} disabled={idx === 0} className="p-1 hover:bg-slate-200 rounded disabled:opacity-20" title="Mover para cima">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); moveRegra(idx, 1); }} disabled={idx === regras.length - 1} className="p-1 hover:bg-slate-200 rounded disabled:opacity-20" title="Mover para baixo">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); duplicateRegra(idx); }} className="p-1 hover:bg-blue-50 rounded text-slate-400 hover:text-blue-600" title="Duplicar">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeRegra(idx); }} className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600" title="Remover" data-testid={`remove-rule-${idx}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {/* Rule body */}
              {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-slate-200 pt-3">
                  {/* Nome */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nome da regra</label>
                    <input
                      type="text"
                      value={regra.nome}
                      onChange={(e) => updateRegra(idx, 'nome', e.target.value)}
                      placeholder="Ex: Valor negativo → D:45 C:25"
                      data-testid={`rule-name-${idx}`}
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-sm focus:ring-2 focus:ring-slate-950"
                    />
                  </div>

                  {/* Condições */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-600">Condições (todas devem ser verdadeiras)</label>
                      <button
                        type="button"
                        onClick={() => addCondicao(idx)}
                        data-testid={`add-condition-${idx}`}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-medium transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        E (AND)
                      </button>
                    </div>
                    <div className="space-y-2">
                      {regra.condicoes.map((cond, cIdx) => (
                        <div key={cIdx} className="flex items-center gap-2 bg-slate-50 rounded p-2" data-testid={`condition-${idx}-${cIdx}`}>
                          {cIdx > 0 && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">E</span>}
                          {/* Campo ou Coluna */}
                          <div className="flex-1 min-w-0">
                            <select
                              value={cond.coluna_excel ? `col:${cond.coluna_excel}` : cond.campo}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v.startsWith('col:')) {
                                  updateCondicao(idx, cIdx, 'coluna_excel', v.slice(4));
                                  updateCondicao(idx, cIdx, 'campo', '');
                                } else {
                                  updateCondicao(idx, cIdx, 'campo', v);
                                  updateCondicao(idx, cIdx, 'coluna_excel', '');
                                }
                              }}
                              data-testid={`cond-campo-${idx}-${cIdx}`}
                              className="h-7 w-full rounded border border-slate-300 bg-white px-1.5 text-xs focus:ring-2 focus:ring-slate-950"
                            >
                              <option value="">Selecionar campo...</option>
                              <optgroup label="Especial">
                                {CAMPO_ESPECIAL_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </optgroup>
                              <optgroup label="Campos do Layout">
                                {campoOptions.map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </optgroup>
                            </select>
                          </div>
                          {/* Coluna direta (se não é campo especial/layout) */}
                          {!cond.campo && !cond.coluna_excel && (
                            <input
                              type="text"
                              placeholder="Col. (A, 0...)"
                              value={cond.coluna_excel || ''}
                              onChange={(e) => updateCondicao(idx, cIdx, 'coluna_excel', e.target.value)}
                              className="h-7 w-20 rounded border border-slate-300 bg-white px-1.5 text-xs font-mono focus:ring-2 focus:ring-slate-950"
                            />
                          )}
                          {/* Operador */}
                          <select
                            value={cond.operador}
                            onChange={(e) => updateCondicao(idx, cIdx, 'operador', e.target.value)}
                            data-testid={`cond-operador-${idx}-${cIdx}`}
                            className="h-7 w-36 rounded border border-slate-300 bg-white px-1.5 text-xs focus:ring-2 focus:ring-slate-950"
                          >
                            {OPERADOR_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          {/* Valor */}
                          {needsValue(cond.operador) && (
                            <input
                              type="text"
                              value={cond.valor}
                              onChange={(e) => updateCondicao(idx, cIdx, 'valor', e.target.value)}
                              placeholder="Valor"
                              data-testid={`cond-valor-${idx}-${cIdx}`}
                              className="h-7 w-32 rounded border border-slate-300 bg-white px-1.5 text-xs font-mono focus:ring-2 focus:ring-slate-950"
                            />
                          )}
                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() => removeCondicao(idx, cIdx)}
                            disabled={regra.condicoes.length <= 1}
                            className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 disabled:opacity-20"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Conta Débito</label>
                      <input
                        type="text"
                        value={regra.conta_debito}
                        onChange={(e) => updateRegra(idx, 'conta_debito', e.target.value)}
                        placeholder="Ex: 45"
                        data-testid={`rule-debito-${idx}`}
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-sm font-mono focus:ring-2 focus:ring-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Conta Crédito</label>
                      <input
                        type="text"
                        value={regra.conta_credito}
                        onChange={(e) => updateRegra(idx, 'conta_credito', e.target.value)}
                        placeholder="Ex: 25"
                        data-testid={`rule-credito-${idx}`}
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-sm font-mono focus:ring-2 focus:ring-slate-950"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
