import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { layoutsApi } from '../../services/api';

const TIPO_DADO_OPTIONS = [
  { value: 'string', label: 'Texto' },
  { value: 'integer', label: 'Inteiro' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'date', label: 'Data' },
  { value: 'datetime', label: 'Data/Hora' },
  { value: 'boolean', label: 'Booleano' },
];

const TIPO_SINAL_OPTIONS = [
  { value: 'sinal_valor', label: 'Sinal do valor (+/-)' },
  { value: 'coluna_tipo', label: 'Coluna D/C' },
  { value: 'fixo_debito', label: 'Sempre Débito' },
  { value: 'fixo_credito', label: 'Sempre Crédito' },
];

const emptyColuna = () => ({
  campo_destino: '',
  coluna_excel: '',
  tipo_dado: 'string',
  formato: '',
  obrigatorio: false,
  valor_padrao: '',
});

export const LayoutForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [camposDisponiveis, setCamposDisponiveis] = useState({});

  const [form, setForm] = useState({
    cnpj: '',
    nome: '',
    descricao: '',
    config_planilha: { nome_aba: '', linha_cabecalho: 0, linha_inicio_dados: 1 },
    colunas: [emptyColuna()],
    config_valor: { tipo_sinal: 'sinal_valor', coluna_tipo: '', mapeamento_tipo: { D: 'debito', C: 'credito' } },
    config_historico_padrao: { template: '{documento} - {conta_debito} -> {conta_credito}', campos_fallback: ['documento', 'conta_debito', 'conta_credito'] },
  });

  useEffect(() => {
    layoutsApi.camposDisponiveis().then(setCamposDisponiveis).catch(() => {});
    if (isEditing) {
      setLoading(true);
      layoutsApi.obter(id).then((data) => {
        setForm({
          cnpj: data.cnpj,
          nome: data.nome,
          descricao: data.descricao || '',
          config_planilha: data.config_planilha,
          colunas: data.colunas.length > 0 ? data.colunas : [emptyColuna()],
          config_valor: data.config_valor,
          config_historico_padrao: data.config_historico_padrao,
        });
      }).catch(() => {
        toast.error('Erro ao carregar layout');
        navigate('/layouts');
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const handleSave = async () => {
    if (!form.cnpj || !form.nome) {
      toast.error('CNPJ e Nome são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        config_planilha: {
          ...form.config_planilha,
          nome_aba: form.config_planilha.nome_aba || null,
        },
        colunas: form.colunas.filter((c) => c.campo_destino && c.coluna_excel),
      };
      if (isEditing) {
        const { cnpj, ...updateData } = payload;
        await layoutsApi.atualizar(id, updateData);
        toast.success('Layout atualizado com sucesso');
      } else {
        await layoutsApi.criar(payload);
        toast.success('Layout criado com sucesso');
      }
      navigate('/layouts');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar layout');
    } finally {
      setSaving(false);
    }
  };

  const addColuna = () => setForm((p) => ({ ...p, colunas: [...p.colunas, emptyColuna()] }));
  const removeColuna = (idx) => setForm((p) => ({ ...p, colunas: p.colunas.filter((_, i) => i !== idx) }));
  const updateColuna = (idx, field, value) =>
    setForm((p) => ({
      ...p,
      colunas: p.colunas.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    }));

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  const campoOptions = Object.entries(camposDisponiveis).map(([key, val]) => ({
    value: key,
    label: `${val.label}${val.obrigatorio ? ' *' : ''}`,
  }));

  return (
    <div className="space-y-6 max-w-4xl" data-testid="layout-form-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/layouts')}
          data-testid="back-btn"
          className="p-2 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">
            {isEditing ? 'Editar Layout' : 'Novo Layout'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isEditing ? 'Altere a configuração do layout de importação' : 'Configure como o arquivo Excel será lido'}
          </p>
        </div>
      </div>

      {/* Informações Básicas */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Informações Básicas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ *</label>
            <input
              type="text"
              value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value.replace(/\D/g, '') })}
              placeholder="00000000000000"
              maxLength={14}
              disabled={isEditing}
              data-testid="layout-cnpj-input"
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Layout Banco Itaú"
              data-testid="layout-nome-input"
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
          <textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Descrição opcional do layout"
            rows={2}
            data-testid="layout-descricao-input"
            className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 resize-none"
          />
        </div>
      </section>

      {/* Config Planilha */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Configuração da Planilha</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Aba</label>
            <input
              type="text"
              value={form.config_planilha.nome_aba || ''}
              onChange={(e) => setForm({ ...form, config_planilha: { ...form.config_planilha, nome_aba: e.target.value } })}
              placeholder="Deixe vazio para usar a primeira"
              data-testid="config-nome-aba-input"
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Linha do Cabeçalho</label>
            <input
              type="number"
              value={form.config_planilha.linha_cabecalho}
              onChange={(e) => setForm({ ...form, config_planilha: { ...form.config_planilha, linha_cabecalho: parseInt(e.target.value) || 0 } })}
              min={0}
              data-testid="config-linha-cabecalho-input"
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Linha Início Dados</label>
            <input
              type="number"
              value={form.config_planilha.linha_inicio_dados}
              onChange={(e) => setForm({ ...form, config_planilha: { ...form.config_planilha, linha_inicio_dados: parseInt(e.target.value) || 1 } })}
              min={0}
              data-testid="config-linha-inicio-input"
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
            />
          </div>
        </div>
      </section>

      {/* Mapeamento de Colunas */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-slate-900">Mapeamento de Colunas</h2>
          <button
            onClick={addColuna}
            data-testid="add-coluna-btn"
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-900 text-white hover:bg-slate-800 rounded-md font-medium transition-colors"
          >
            <Plus className="w-3 h-3" />
            Coluna
          </button>
        </div>
        <div className="space-y-3">
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
            <div className="col-span-1" />
            <div className="col-span-3">Campo Destino</div>
            <div className="col-span-2">Coluna Excel</div>
            <div className="col-span-2">Tipo</div>
            <div className="col-span-2">Formato</div>
            <div className="col-span-1">Obrig.</div>
            <div className="col-span-1" />
          </div>
          {form.colunas.map((col, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-md p-2" data-testid={`coluna-row-${idx}`}>
              <div className="col-span-1 flex justify-center text-slate-300">
                <GripVertical className="w-4 h-4" />
              </div>
              <div className="col-span-3">
                <select
                  value={col.campo_destino}
                  onChange={(e) => updateColuna(idx, 'campo_destino', e.target.value)}
                  data-testid={`coluna-campo-${idx}`}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm focus:ring-2 focus:ring-slate-950"
                >
                  <option value="">Selecionar...</option>
                  {campoOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  value={col.coluna_excel}
                  onChange={(e) => updateColuna(idx, 'coluna_excel', e.target.value)}
                  placeholder="A, B, 0..."
                  data-testid={`coluna-excel-${idx}`}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-mono focus:ring-2 focus:ring-slate-950"
                />
              </div>
              <div className="col-span-2">
                <select
                  value={col.tipo_dado}
                  onChange={(e) => updateColuna(idx, 'tipo_dado', e.target.value)}
                  data-testid={`coluna-tipo-${idx}`}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm focus:ring-2 focus:ring-slate-950"
                >
                  {TIPO_DADO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  value={col.formato || ''}
                  onChange={(e) => updateColuna(idx, 'formato', e.target.value)}
                  placeholder="%d/%m/%Y"
                  data-testid={`coluna-formato-${idx}`}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-mono focus:ring-2 focus:ring-slate-950"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <input
                  type="checkbox"
                  checked={col.obrigatorio}
                  onChange={(e) => updateColuna(idx, 'obrigatorio', e.target.checked)}
                  data-testid={`coluna-obrig-${idx}`}
                  className="w-4 h-4 accent-slate-900"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <button
                  onClick={() => removeColuna(idx)}
                  disabled={form.colunas.length <= 1}
                  data-testid={`remove-coluna-${idx}`}
                  className="p-1.5 hover:bg-red-50 rounded text-red-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Config Valor (D/C) */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold text-slate-900">Determinação Débito/Crédito</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Método</label>
            <select
              value={form.config_valor.tipo_sinal}
              onChange={(e) => setForm({ ...form, config_valor: { ...form.config_valor, tipo_sinal: e.target.value } })}
              data-testid="config-tipo-sinal"
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-950"
            >
              {TIPO_SINAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {form.config_valor.tipo_sinal === 'coluna_tipo' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Coluna D/C</label>
              <input
                type="text"
                value={form.config_valor.coluna_tipo || ''}
                onChange={(e) => setForm({ ...form, config_valor: { ...form.config_valor, coluna_tipo: e.target.value } })}
                placeholder="Ex: E"
                data-testid="config-coluna-tipo"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-slate-950"
              />
            </div>
          )}
        </div>
      </section>

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={() => navigate('/layouts')}
          data-testid="cancel-btn"
          className="px-4 py-2 text-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-md font-medium transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          data-testid="save-layout-btn"
          className="flex items-center gap-2 px-6 py-2 text-sm bg-slate-900 text-white hover:bg-slate-800 rounded-md font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Layout'}
        </button>
      </div>
    </div>
  );
};
