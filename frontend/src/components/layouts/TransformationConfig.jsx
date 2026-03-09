import React, { useState } from 'react';
import { Settings2, X, Plus, Trash2 } from 'lucide-react';

const FORMATO_NUMERO_OPTIONS = [
  { value: 'automatico', label: 'Automático' },
  { value: 'br_virgula', label: 'BR (1.234,56)' },
  { value: 'br_moeda', label: 'R$ (1.234,56)' },
  { value: 'us_ponto', label: 'US (1,234.56)' },
];

const VALOR_DC_OPTIONS = [
  { value: 'nenhum', label: 'Nenhum' },
  { value: 'sufixo', label: 'Sufixo (356,12 D)' },
  { value: 'prefixo', label: 'Prefixo (D 356,12)' },
];

const CAMPO_COMPOSTO_OPTIONS = [
  { value: 'nenhum', label: 'Nenhum' },
  { value: 'cnpj_cpf_nome', label: 'CNPJ/CPF + Nome' },
];

/**
 * Modal de configuração de transformações para uma coluna
 */
export const TransformationConfig = ({ transformacao = {}, campoDestino, onSave, onClose }) => {
  const [config, setConfig] = useState({ ...transformacao });

  const update = (key, value) => setConfig((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    // Limpar campos vazios/default
    const cleaned = {};
    if (config.formato_numero && config.formato_numero !== 'automatico') cleaned.formato_numero = config.formato_numero;
    if (config.valor_com_dc && config.valor_com_dc !== 'nenhum') cleaned.valor_com_dc = config.valor_com_dc;
    if (config.campo_composto && config.campo_composto !== 'nenhum') {
      cleaned.campo_composto = config.campo_composto;
      if (config.separador_composto) cleaned.separador_composto = config.separador_composto;
    }
    if (config.regex_pattern) cleaned.regex_pattern = config.regex_pattern;
    if (config.concat_colunas && config.concat_colunas.length > 0) {
      cleaned.concat_colunas = config.concat_colunas;
      if (config.concat_separador) cleaned.concat_separador = config.concat_separador;
    }
    onSave(cleaned);
  };

  const isNumericField = ['valor', 'saldo', 'saldo_inicial'].includes(campoDestino);
  const isDocField = ['cnpj_cpf_e_nome', 'cnpj_cpf_terceiro'].includes(campoDestino);

  // Concat columns management
  const concatCols = config.concat_colunas || [];
  const addConcatCol = () => update('concat_colunas', [...concatCols, '']);
  const removeConcatCol = (idx) => update('concat_colunas', concatCols.filter((_, i) => i !== idx));
  const updateConcatCol = (idx, val) => update('concat_colunas', concatCols.map((c, i) => (i === idx ? val : c)));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" data-testid="transformation-modal">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="font-heading text-base font-semibold text-slate-900 flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Transformações Avançadas
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded" data-testid="close-transformation-modal">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Formato de Número */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Formato de Número</label>
            <p className="text-xs text-slate-400 mb-2">Como interpretar valores numéricos desta coluna</p>
            <select
              value={config.formato_numero || 'automatico'}
              onChange={(e) => update('formato_numero', e.target.value)}
              data-testid="trans-formato-numero"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm focus:ring-2 focus:ring-slate-950"
            >
              {FORMATO_NUMERO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Valor com D/C embutido */}
          {isNumericField && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor com D/C Embutido</label>
              <p className="text-xs text-slate-400 mb-2">Se o valor contém indicador D/C (ex: "356,12 D")</p>
              <select
                value={config.valor_com_dc || 'nenhum'}
                onChange={(e) => update('valor_com_dc', e.target.value)}
                data-testid="trans-valor-dc"
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm focus:ring-2 focus:ring-slate-950"
              >
                {VALOR_DC_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Campo composto */}
          {isDocField && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Campo Composto</label>
                <p className="text-xs text-slate-400 mb-2">Se a coluna contém dados compostos que precisam ser separados</p>
                <select
                  value={config.campo_composto || 'nenhum'}
                  onChange={(e) => update('campo_composto', e.target.value)}
                  data-testid="trans-campo-composto"
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm focus:ring-2 focus:ring-slate-950"
                >
                  {CAMPO_COMPOSTO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {config.campo_composto === 'cnpj_cpf_nome' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Separador</label>
                  <input
                    type="text"
                    value={config.separador_composto || ' - '}
                    onChange={(e) => update('separador_composto', e.target.value)}
                    placeholder=" - "
                    data-testid="trans-separador-composto"
                    className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-sm font-mono focus:ring-2 focus:ring-slate-950"
                  />
                </div>
              )}
            </div>
          )}

          {/* Regex Extract */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Extrair com Regex</label>
            <p className="text-xs text-slate-400 mb-2">Expressão regular para extrair parte do valor (grupo 1 será usado)</p>
            <input
              type="text"
              value={config.regex_pattern || ''}
              onChange={(e) => update('regex_pattern', e.target.value)}
              placeholder="Ex: (\d{2}/\d{2}/\d{4})"
              data-testid="trans-regex-pattern"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-mono focus:ring-2 focus:ring-slate-950"
            />
          </div>

          {/* Concatenar Colunas */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-slate-700">Concatenar Colunas</label>
              <button
                onClick={addConcatCol}
                data-testid="add-concat-col"
                className="flex items-center gap-1 px-2 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition-colors"
              >
                <Plus className="w-3 h-3" />
                Coluna
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-2">Combinar valores de várias colunas do Excel neste campo</p>
            {concatCols.length > 0 && (
              <div className="space-y-2">
                {concatCols.map((col, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={col}
                      onChange={(e) => updateConcatCol(idx, e.target.value)}
                      placeholder="Índice ou Letra (0, A...)"
                      data-testid={`concat-col-${idx}`}
                      className="h-8 flex-1 rounded border border-slate-300 bg-white px-2 text-sm font-mono focus:ring-2 focus:ring-slate-950"
                    />
                    <button
                      onClick={() => removeConcatCol(idx)}
                      data-testid={`remove-concat-col-${idx}`}
                      className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Separador</label>
                  <input
                    type="text"
                    value={config.concat_separador || ' '}
                    onChange={(e) => update('concat_separador', e.target.value)}
                    placeholder=" "
                    data-testid="concat-separador"
                    className="h-8 w-32 rounded border border-slate-300 bg-white px-2 text-sm font-mono focus:ring-2 focus:ring-slate-950"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-md font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            data-testid="save-transformation-btn"
            className="px-4 py-2 text-sm bg-slate-900 text-white hover:bg-slate-800 rounded-md font-medium transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};
