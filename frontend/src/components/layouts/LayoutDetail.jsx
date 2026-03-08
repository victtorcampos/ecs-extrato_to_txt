import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Settings2,
  Copy,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import { layoutsApi, regrasApi } from '../../services/api';
import { cn, formatCNPJ } from '../../lib/utils';

const TIPO_REGRA_LABELS = {
  filtro: { label: 'Filtro', color: 'bg-amber-50 text-amber-700' },
  transformacao: { label: 'Transformação', color: 'bg-blue-50 text-blue-700' },
  validacao: { label: 'Validação', color: 'bg-purple-50 text-purple-700' },
  enriquecimento: { label: 'Enriquecimento', color: 'bg-emerald-50 text-emerald-700' },
};

const OPERADOR_LABELS = {
  igual: '=', diferente: '!=', maior: '>', menor: '<', maior_igual: '>=',
  menor_igual: '<=', entre: 'ENTRE', contem: 'CONTÉM', nao_contem: 'NÃO CONTÉM',
  comeca_com: 'COMEÇA COM', termina_com: 'TERMINA COM', vazio: 'VAZIO',
  nao_vazio: 'NÃO VAZIO', regex: 'REGEX',
};

const ACAO_LABELS = {
  excluir: 'Excluir linha', definir_valor: 'Definir valor', concatenar: 'Concatenar',
  substituir: 'Substituir', maiuscula: 'Maiúscula', minuscula: 'Minúscula',
  absoluto: 'Valor absoluto', multiplicar: 'Multiplicar', template: 'Template',
  copiar_campo: 'Copiar campo', erro: 'Marcar erro',
};

const TIPO_REGRA_OPTIONS = [
  { value: 'filtro', label: 'Filtro (excluir linhas)' },
  { value: 'transformacao', label: 'Transformação (alterar valores)' },
  { value: 'validacao', label: 'Validação (verificar dados)' },
  { value: 'enriquecimento', label: 'Enriquecimento (completar dados)' },
];

const OPERADOR_OPTIONS = [
  { value: 'igual', label: 'Igual a' }, { value: 'diferente', label: 'Diferente de' },
  { value: 'maior', label: 'Maior que' }, { value: 'menor', label: 'Menor que' },
  { value: 'contem', label: 'Contém' }, { value: 'nao_contem', label: 'Não contém' },
  { value: 'comeca_com', label: 'Começa com' }, { value: 'termina_com', label: 'Termina com' },
  { value: 'vazio', label: 'Está vazio' }, { value: 'nao_vazio', label: 'Não está vazio' },
  { value: 'entre', label: 'Entre' }, { value: 'regex', label: 'Regex' },
];

const ACAO_OPTIONS = [
  { value: 'excluir', label: 'Excluir linha' }, { value: 'definir_valor', label: 'Definir valor' },
  { value: 'copiar_campo', label: 'Copiar campo' }, { value: 'template', label: 'Aplicar template' },
  { value: 'maiuscula', label: 'Converter para maiúscula' }, { value: 'minuscula', label: 'Converter para minúscula' },
  { value: 'absoluto', label: 'Valor absoluto' }, { value: 'multiplicar', label: 'Multiplicar' },
  { value: 'substituir', label: 'Substituir texto' }, { value: 'concatenar', label: 'Concatenar campos' },
  { value: 'erro', label: 'Marcar erro de validação' },
];

const emptyCondicao = () => ({ campo: '', operador: 'igual', valor: '', valor_fim: '' });
const emptyAcao = () => ({ tipo_acao: 'definir_valor', campo_destino: '', valor: '', parametros: {} });

export const LayoutDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [layout, setLayout] = useState(null);
  const [regras, setRegras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRegra, setEditingRegra] = useState(null);
  const [regraForm, setRegraForm] = useState({
    nome: '', descricao: '', tipo: 'filtro', ativo: true,
    condicoes: [emptyCondicao()], acao: emptyAcao(),
  });
  const [saving, setSaving] = useState(false);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [layoutData, regrasData] = await Promise.all([
        layoutsApi.obter(id),
        regrasApi.listar(id),
      ]);
      setLayout(layoutData);
      setRegras(regrasData.items);
    } catch (err) {
      toast.error('Erro ao carregar dados');
      navigate('/layouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, [id]);

  const abrirFormNovo = () => {
    setEditingRegra(null);
    setRegraForm({ nome: '', descricao: '', tipo: 'filtro', ativo: true, condicoes: [emptyCondicao()], acao: emptyAcao() });
    setShowForm(true);
  };

  const abrirFormEditar = (regra) => {
    setEditingRegra(regra);
    setRegraForm({
      nome: regra.nome,
      descricao: regra.descricao || '',
      tipo: regra.tipo,
      ativo: regra.ativo,
      condicoes: regra.condicoes.length > 0 ? regra.condicoes : [emptyCondicao()],
      acao: regra.acao || emptyAcao(),
    });
    setShowForm(true);
  };

  const handleSaveRegra = async () => {
    if (!regraForm.nome) { toast.error('Nome da regra é obrigatório'); return; }
    setSaving(true);
    try {
      const payload = {
        nome: regraForm.nome,
        descricao: regraForm.descricao || null,
        tipo: regraForm.tipo,
        ativo: regraForm.ativo,
        condicoes: regraForm.condicoes.filter((c) => c.campo),
        acao: regraForm.acao,
      };
      if (editingRegra) {
        await regrasApi.atualizar(id, editingRegra.id, payload);
        toast.success('Regra atualizada');
      } else {
        await regrasApi.criar(id, payload);
        toast.success('Regra criada');
      }
      setShowForm(false);
      carregarDados();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar regra');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRegra = async (regraId, nome) => {
    if (!window.confirm(`Excluir regra "${nome}"?`)) return;
    try {
      await regrasApi.deletar(id, regraId);
      toast.success('Regra removida');
      carregarDados();
    } catch (err) {
      toast.error('Erro ao remover regra');
    }
  };

  const addCondicao = () => setRegraForm((p) => ({ ...p, condicoes: [...p.condicoes, emptyCondicao()] }));
  const removeCondicao = (idx) => setRegraForm((p) => ({ ...p, condicoes: p.condicoes.filter((_, i) => i !== idx) }));
  const updateCondicao = (idx, field, value) =>
    setRegraForm((p) => ({
      ...p,
      condicoes: p.condicoes.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    }));

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!layout) return null;

  return (
    <div className="space-y-6" data-testid="layout-detail-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/layouts')} data-testid="back-to-layouts" className="p-2 hover:bg-slate-100 rounded-md text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">{layout.nome}</h1>
              <span className={cn('text-xs px-2 py-0.5 rounded font-mono', layout.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                {layout.ativo ? 'ATIVO' : 'INATIVO'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5 font-mono">CNPJ: {formatCNPJ(layout.cnpj)} | {layout.total_colunas} colunas</p>
          </div>
        </div>
        <Link
          to={`/layouts/${id}/editar`}
          data-testid="edit-layout-link"
          className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-md font-medium transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          Editar Layout
        </Link>
      </div>

      {/* Resumo de colunas */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="font-heading text-base font-semibold text-slate-900 mb-3">Colunas Mapeadas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="colunas-table">
            <thead className="bg-slate-50">
              <tr className="border-b">
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Campo</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Coluna Excel</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Tipo</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Obrigatório</th>
              </tr>
            </thead>
            <tbody>
              {layout.colunas.map((col, idx) => (
                <tr key={idx} className="border-b hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-mono text-slate-700">{col.campo_destino}</td>
                  <td className="px-3 py-2 font-mono text-slate-600">{col.coluna_excel}</td>
                  <td className="px-3 py-2 text-slate-600">{col.tipo_dado}</td>
                  <td className="px-3 py-2">{col.obrigatorio ? <span className="text-emerald-600 font-medium">Sim</span> : <span className="text-slate-400">Não</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Regras */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-semibold text-slate-900">Regras de Processamento</h2>
          <button
            onClick={abrirFormNovo}
            data-testid="new-rule-btn"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-900 text-white hover:bg-slate-800 rounded-md font-medium transition-colors shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nova Regra
          </button>
        </div>

        {regras.length === 0 && !showForm ? (
          <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-lg" data-testid="empty-rules">
            <Settings2 className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-medium text-slate-700">Nenhuma regra configurada</h3>
            <p className="text-sm text-slate-500 mt-1">Adicione regras para filtrar, transformar ou validar os dados importados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {regras.map((regra) => {
              const tipoInfo = TIPO_REGRA_LABELS[regra.tipo] || { label: regra.tipo, color: 'bg-slate-100 text-slate-600' };
              return (
                <div
                  key={regra.id}
                  data-testid={`rule-card-${regra.id}`}
                  className={cn('bg-white border border-slate-200 rounded-lg p-4 transition-colors hover:border-slate-300', !regra.ativo && 'opacity-50')}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400">#{regra.ordem}</span>
                        <span className="font-medium text-slate-900">{regra.nome}</span>
                        <span className={cn('text-xs px-2 py-0.5 rounded font-medium', tipoInfo.color)}>{tipoInfo.label}</span>
                      </div>
                      {regra.descricao && <p className="text-sm text-slate-500 mt-1">{regra.descricao}</p>}
                      <div className="mt-2 text-xs text-slate-500 font-mono space-y-0.5">
                        {regra.condicoes.map((c, i) => (
                          <div key={i}>SE {c.campo} {OPERADOR_LABELS[c.operador] || c.operador} {c.valor || ''}</div>
                        ))}
                        <div className="text-slate-700">ENTÃO {ACAO_LABELS[regra.acao.tipo_acao] || regra.acao.tipo_acao} {regra.acao.campo_destino ? `→ ${regra.acao.campo_destino}` : ''} {regra.acao.valor ? `= "${regra.acao.valor}"` : ''}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <button onClick={() => abrirFormEditar(regra)} data-testid={`edit-rule-${regra.id}`} className="p-2 hover:bg-slate-100 rounded-md text-slate-500 transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteRegra(regra.id, regra.nome)} data-testid={`delete-rule-${regra.id}`} className="p-2 hover:bg-red-50 rounded-md text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Formulário de Regra (inline) */}
        {showForm && (
          <div className="bg-white border-2 border-slate-900 rounded-lg p-6 space-y-5" data-testid="rule-form">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-semibold text-slate-900">
                {editingRegra ? 'Editar Regra' : 'Nova Regra'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Nome e tipo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={regraForm.nome}
                  onChange={(e) => setRegraForm({ ...regraForm, nome: e.target.value })}
                  placeholder="Ex: Ignorar lançamentos zerados"
                  data-testid="rule-nome-input"
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-950"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                <select
                  value={regraForm.tipo}
                  onChange={(e) => setRegraForm({ ...regraForm, tipo: e.target.value })}
                  data-testid="rule-tipo-select"
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-slate-950"
                >
                  {TIPO_REGRA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <input
                type="text"
                value={regraForm.descricao}
                onChange={(e) => setRegraForm({ ...regraForm, descricao: e.target.value })}
                placeholder="Descrição opcional"
                data-testid="rule-descricao-input"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-950"
              />
            </div>

            {/* Condições */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Condições (SE)</label>
                <button onClick={addCondicao} data-testid="add-condition-btn" className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Condição
                </button>
              </div>
              {regraForm.condicoes.map((cond, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center" data-testid={`condition-row-${idx}`}>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={cond.campo}
                      onChange={(e) => updateCondicao(idx, 'campo', e.target.value)}
                      placeholder="Campo (ex: valor)"
                      data-testid={`condition-campo-${idx}`}
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-mono focus:ring-2 focus:ring-slate-950"
                    />
                  </div>
                  <div className="col-span-3">
                    <select
                      value={cond.operador}
                      onChange={(e) => updateCondicao(idx, 'operador', e.target.value)}
                      data-testid={`condition-op-${idx}`}
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm focus:ring-2 focus:ring-slate-950"
                    >
                      {OPERADOR_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4">
                    {cond.operador !== 'vazio' && cond.operador !== 'nao_vazio' && (
                      <input
                        type="text"
                        value={cond.valor || ''}
                        onChange={(e) => updateCondicao(idx, 'valor', e.target.value)}
                        placeholder="Valor"
                        data-testid={`condition-valor-${idx}`}
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-mono focus:ring-2 focus:ring-slate-950"
                      />
                    )}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => removeCondicao(idx)}
                      disabled={regraForm.condicoes.length <= 1}
                      data-testid={`remove-condition-${idx}`}
                      className="p-1 hover:bg-red-50 rounded text-red-400 disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Ação */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Ação (ENTÃO)</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <select
                    value={regraForm.acao.tipo_acao}
                    onChange={(e) => setRegraForm({ ...regraForm, acao: { ...regraForm.acao, tipo_acao: e.target.value } })}
                    data-testid="action-tipo-select"
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm focus:ring-2 focus:ring-slate-950"
                  >
                    {ACAO_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                {regraForm.acao.tipo_acao !== 'excluir' && (
                  <>
                    <div>
                      <input
                        type="text"
                        value={regraForm.acao.campo_destino || ''}
                        onChange={(e) => setRegraForm({ ...regraForm, acao: { ...regraForm.acao, campo_destino: e.target.value } })}
                        placeholder="Campo destino"
                        data-testid="action-campo-input"
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-mono focus:ring-2 focus:ring-slate-950"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={regraForm.acao.valor || ''}
                        onChange={(e) => setRegraForm({ ...regraForm, acao: { ...regraForm.acao, valor: e.target.value } })}
                        placeholder="Valor"
                        data-testid="action-valor-input"
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-mono focus:ring-2 focus:ring-slate-950"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Botões do form */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                data-testid="cancel-rule-btn"
                className="px-4 py-2 text-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-md font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRegra}
                disabled={saving}
                data-testid="save-rule-btn"
                className="flex items-center gap-2 px-5 py-2 text-sm bg-slate-900 text-white hover:bg-slate-800 rounded-md font-medium shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : editingRegra ? 'Atualizar' : 'Criar Regra'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
