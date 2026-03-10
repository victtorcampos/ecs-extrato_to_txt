import React, { useState } from 'react';
import { Button } from '../ui';
import { Input } from '../ui';
import { Plus, Trash2, Zap } from 'lucide-react';

export const StepAccounts = ({ templates, regrasContas, setRegrasContas, onBack, onNext }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const addRule = (template = null) => {
    const newRule = template ? {
      nome: template.nome,
      ordem: regrasContas.length,
      ativo: true,
      condicoes: template.condicoes.map(c => ({ ...c })),
      conta_debito: template.conta_debito || '',
      conta_credito: template.conta_credito || '',
    } : {
      nome: `Regra ${regrasContas.length + 1}`,
      ordem: regrasContas.length,
      ativo: true,
      condicoes: [{ campo: 'historico', operador: 'contem', valor: '', coluna_excel: '' }],
      conta_debito: '',
      conta_credito: '',
    };
    setRegrasContas([...regrasContas, newRule]);
  };

  const updateRule = (idx, field, value) => {
    const updated = [...regrasContas];
    updated[idx] = { ...updated[idx], [field]: value };
    setRegrasContas(updated);
  };

  const updateCondition = (ruleIdx, condIdx, field, value) => {
    const updated = [...regrasContas];
    const conds = [...updated[ruleIdx].condicoes];
    conds[condIdx] = { ...conds[condIdx], [field]: value };
    updated[ruleIdx] = { ...updated[ruleIdx], condicoes: conds };
    setRegrasContas(updated);
  };

  const removeRule = (idx) => {
    setRegrasContas(regrasContas.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6" data-testid="step-accounts">
      <div className="text-center mb-4">
        <h3 className="text-base font-semibold text-slate-900">Regras de Contas</h3>
        <p className="text-sm text-slate-500 mt-1">Defina como atribuir contas de débito e crédito aos lançamentos</p>
      </div>

      {/* Contextual templates */}
      {templates && templates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
            <Zap className="w-4 h-4" /> Templates sugeridos
          </h4>
          <div className="space-y-2">
            {templates.map((tmpl, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white rounded-md p-3 border border-amber-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">{tmpl.nome}</p>
                  <p className="text-xs text-slate-500">{tmpl.descricao}</p>
                  {tmpl.valores_encontrados?.length > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Valores: {tmpl.valores_encontrados.slice(0, 5).join(', ')}{tmpl.valores_encontrados.length > 5 ? '...' : ''}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addRule(tmpl)}
                  data-testid={`use-template-${idx}`}
                >
                  Usar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules list */}
      <div className="space-y-4">
        {regrasContas.map((regra, rIdx) => (
          <div key={rIdx} className="border border-slate-200 rounded-lg p-4 bg-white" data-testid={`rule-${rIdx}`}>
            <div className="flex items-center justify-between mb-3">
              <Input
                value={regra.nome}
                onChange={(e) => updateRule(rIdx, 'nome', e.target.value)}
                className="h-8 text-sm font-medium w-48"
                data-testid={`rule-name-${rIdx}`}
              />
              <button onClick={() => removeRule(rIdx)} className="text-red-400 hover:text-red-600 p-1" data-testid={`remove-rule-${rIdx}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Conditions */}
            <div className="space-y-2 mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Se...</p>
              {regra.condicoes.map((cond, cIdx) => (
                <div key={cIdx} className="flex gap-2 items-center">
                  <select
                    value={cond.campo}
                    onChange={(e) => updateCondition(rIdx, cIdx, 'campo', e.target.value)}
                    className="h-8 rounded border border-slate-200 text-xs px-2 w-28"
                  >
                    <option value="historico">Histórico</option>
                    <option value="documento">Documento</option>
                    <option value="valor">Valor</option>
                    <option value="razao_social_terceiro">Empresa</option>
                  </select>
                  <select
                    value={cond.operador}
                    onChange={(e) => updateCondition(rIdx, cIdx, 'operador', e.target.value)}
                    className="h-8 rounded border border-slate-200 text-xs px-2 w-28"
                  >
                    <option value="contem">contém</option>
                    <option value="igual">é igual a</option>
                    <option value="comeca_com">começa com</option>
                    <option value="maior_que">maior que</option>
                    <option value="menor_que">menor que</option>
                  </select>
                  <Input
                    value={cond.valor}
                    onChange={(e) => updateCondition(rIdx, cIdx, 'valor', e.target.value)}
                    placeholder="valor..."
                    className="h-8 text-xs flex-1"
                  />
                </div>
              ))}
            </div>

            {/* Accounts */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Conta Débito</label>
                <Input
                  value={regra.conta_debito}
                  onChange={(e) => updateRule(rIdx, 'conta_debito', e.target.value)}
                  placeholder="Ex: 1130"
                  className="h-8 text-xs mt-1"
                  data-testid={`rule-debito-${rIdx}`}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Conta Crédito</label>
                <Input
                  value={regra.conta_credito}
                  onChange={(e) => updateRule(rIdx, 'conta_credito', e.target.value)}
                  placeholder="Ex: 2004"
                  className="h-8 text-xs mt-1"
                  data-testid={`rule-credito-${rIdx}`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={() => addRule()} className="w-full" data-testid="add-rule-btn">
        <Plus className="w-4 h-4 mr-1" /> Adicionar regra
      </Button>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} data-testid="back-btn">Voltar</Button>
        <Button onClick={onNext} data-testid="next-step-btn">Preview</Button>
      </div>
    </div>
  );
};

export default StepAccounts;
