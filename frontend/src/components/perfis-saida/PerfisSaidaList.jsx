import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  FileOutput,
  Star,
  ToggleLeft,
  ToggleRight,
  X,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { perfisSaidaApi } from '../../services/api';
import { cn } from '../../lib/utils';

const CONFIG_FIELDS = [
  { key: 'delimitador', label: 'Delimitador', placeholder: '|', tipo: 'text' },
  { key: 'codificacao', label: 'Codificação', placeholder: 'ANSI', tipo: 'text' },
  { key: 'tipo_lancamento_padrao', label: 'Tipo Lançamento Padrão', placeholder: 'X', tipo: 'select', options: [
    { value: 'X', label: 'X - 1 débito p/ 1 crédito' },
    { value: 'D', label: 'D - 1 débito p/ vários créditos' },
    { value: 'C', label: 'C - Vários débitos p/ 1 crédito' },
    { value: 'V', label: 'V - Vários débitos p/ vários créditos' },
  ]},
  { key: 'codigo_usuario', label: 'Cód. Usuário', placeholder: '', tipo: 'text' },
  { key: 'nome_usuario', label: 'Nome Usuário', placeholder: '', tipo: 'text' },
  { key: 'codigo_filial', label: 'Cód. Filial', placeholder: '', tipo: 'text' },
  { key: 'codigo_historico_padrao', label: 'Cód. Histórico Padrão', placeholder: '0', tipo: 'text' },
  { key: 'incluir_delimitador_inicio_fim', label: 'Delimitador no início/fim da linha', tipo: 'checkbox' },
];

export const PerfisSaidaList = () => {
  const [perfis, setPerfis] = useState([]);
  const [sistemas, setSistemas] = useState({ sistemas: [], geradores_implementados: [] });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPerfil, setEditingPerfil] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nome: '', sistema_destino: '', formato: '', descricao: '', padrao: false,
    config: {
      delimitador: '|', codificacao: 'ANSI', tipo_lancamento_padrao: 'X',
      codigo_usuario: '', nome_usuario: '', codigo_filial: '',
      codigo_historico_padrao: '0', incluir_delimitador_inicio_fim: true,
    },
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [perfisData, sistemasData] = await Promise.all([
        perfisSaidaApi.listar(),
        perfisSaidaApi.sistemasDisponiveis(),
      ]);
      setPerfis(perfisData.items);
      setSistemas(sistemasData);
    } catch (err) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const abrirFormNovo = () => {
    setEditingPerfil(null);
    const defaultSistema = sistemas.sistemas?.[0]?.value || '';
    const defaultFormato = sistemas.sistemas?.[0]?.formatos?.[0]?.value || '';
    setForm({
      nome: '', sistema_destino: defaultSistema, formato: defaultFormato, descricao: '', padrao: false,
      config: {
        delimitador: '|', codificacao: 'ANSI', tipo_lancamento_padrao: 'X',
        codigo_usuario: '', nome_usuario: '', codigo_filial: '',
        codigo_historico_padrao: '0', incluir_delimitador_inicio_fim: true,
      },
    });
    setShowForm(true);
  };

  const abrirFormEditar = (perfil) => {
    setEditingPerfil(perfil);
    setForm({
      nome: perfil.nome, sistema_destino: perfil.sistema_destino,
      formato: perfil.formato, descricao: perfil.descricao || '',
      padrao: perfil.padrao, config: { ...perfil.config },
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome || !form.sistema_destino || !form.formato) {
      toast.error('Preencha nome, sistema e formato');
      return;
    }
    setSaving(true);
    try {
      if (editingPerfil) {
        await perfisSaidaApi.atualizar(editingPerfil.id, form);
        toast.success('Perfil atualizado');
      } else {
        await perfisSaidaApi.criar(form);
        toast.success('Perfil criado');
      }
      setShowForm(false);
      carregarDados();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, nome) => {
    if (!window.confirm(`Excluir perfil "${nome}"?`)) return;
    try {
      await perfisSaidaApi.deletar(id);
      toast.success('Perfil removido');
      carregarDados();
    } catch (err) {
      toast.error('Erro ao remover');
    }
  };

  const handleToggle = async (perfil) => {
    try {
      await perfisSaidaApi.atualizar(perfil.id, { ativo: !perfil.ativo });
      toast.success(perfil.ativo ? 'Perfil desativado' : 'Perfil ativado');
      carregarDados();
    } catch (err) {
      toast.error('Erro ao atualizar');
    }
  };

  const formatosDoSistema = sistemas.sistemas?.find((s) => s.value === form.sistema_destino)?.formatos || [];

  return (
    <div className="space-y-6" data-testid="output-profiles-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-slate-900">
            Perfis de Saída
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure os formatos de exportação para diferentes sistemas contábeis
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={carregarDados} data-testid="refresh-profiles-btn"
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-md font-medium transition-colors">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Atualizar
          </button>
          <button onClick={abrirFormNovo} data-testid="new-profile-btn"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-900 text-white hover:bg-slate-800 rounded-md font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Novo Perfil
          </button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : perfis.length === 0 && !showForm ? (
        <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-lg" data-testid="empty-profiles">
          <FileOutput className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700">Nenhum perfil configurado</h3>
          <p className="text-sm text-slate-500 mt-1">Crie um perfil para definir o formato de exportação</p>
          <button onClick={abrirFormNovo} className="mt-4 px-4 py-2 text-sm bg-slate-900 text-white hover:bg-slate-800 rounded-md font-medium">
            Criar Perfil
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {perfis.map((perfil) => (
            <div key={perfil.id} data-testid={`profile-card-${perfil.id}`}
              className={cn('bg-white border rounded-lg p-5 transition-colors hover:border-slate-400', !perfil.ativo && 'opacity-50 bg-slate-50')}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-lg font-semibold text-slate-900">{perfil.nome}</span>
                    {perfil.padrao && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                        <Star className="w-3 h-3" /> PADRÃO
                      </span>
                    )}
                    <span className={cn('text-xs px-2 py-0.5 rounded font-mono', perfil.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                      {perfil.ativo ? 'ATIVO' : 'INATIVO'}
                    </span>
                  </div>
                  {perfil.descricao && <p className="text-sm text-slate-500 mt-1">{perfil.descricao}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 font-mono">
                    <span>{perfil.sistema_destino_nome}</span>
                    <span>{perfil.formato_nome}</span>
                    <span>Delimitador: "{perfil.config?.delimitador || '|'}"</span>
                    <span>Tipo: {perfil.config?.tipo_lancamento_padrao || 'X'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button onClick={() => handleToggle(perfil)} title={perfil.ativo ? 'Desativar' : 'Ativar'} data-testid={`toggle-profile-${perfil.id}`}
                    className="p-2 hover:bg-slate-100 rounded-md text-slate-500 transition-colors">
                    {perfil.ativo ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => abrirFormEditar(perfil)} title="Editar" data-testid={`edit-profile-${perfil.id}`}
                    className="p-2 hover:bg-slate-100 rounded-md text-slate-500 transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(perfil.id, perfil.nome)} title="Excluir" data-testid={`delete-profile-${perfil.id}`}
                    className="p-2 hover:bg-red-50 rounded-md text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulário inline */}
      {showForm && (
        <div className="bg-white border-2 border-slate-900 rounded-lg p-6 space-y-5" data-testid="profile-form">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold text-slate-900">
              {editingPerfil ? 'Editar Perfil' : 'Novo Perfil de Saída'}
            </h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5 text-slate-500" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
              <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Domínio Sistemas - TXT" data-testid="profile-nome-input"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-950" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <input type="text" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descrição opcional" data-testid="profile-descricao-input"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-950" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sistema Destino *</label>
              <select value={form.sistema_destino}
                onChange={(e) => {
                  const novoSistema = e.target.value;
                  const formatos = sistemas.sistemas?.find((s) => s.value === novoSistema)?.formatos || [];
                  setForm({ ...form, sistema_destino: novoSistema, formato: formatos[0]?.value || '' });
                }}
                data-testid="profile-sistema-select"
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-slate-950">
                <option value="">Selecionar...</option>
                {sistemas.sistemas?.map((s) => <option key={s.value} value={s.value}>{s.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Formato *</label>
              <select value={form.formato} onChange={(e) => setForm({ ...form, formato: e.target.value })}
                data-testid="profile-formato-select"
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-slate-950">
                <option value="">Selecionar...</option>
                {formatosDoSistema.map((f) => <option key={f.value} value={f.value}>{f.nome} ({f.extensao})</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.padrao} onChange={(e) => setForm({ ...form, padrao: e.target.checked })}
              data-testid="profile-padrao-checkbox" className="w-4 h-4 accent-slate-900" />
            <label className="text-sm text-slate-700">Definir como perfil padrão</label>
          </div>

          {/* Config fields */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Configurações do Formato</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {CONFIG_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs text-slate-500 mb-1">{field.label}</label>
                  {field.tipo === 'checkbox' ? (
                    <div className="flex items-center gap-2 h-9">
                      <input type="checkbox" checked={form.config[field.key] ?? true}
                        onChange={(e) => setForm({ ...form, config: { ...form.config, [field.key]: e.target.checked } })}
                        data-testid={`config-${field.key}`} className="w-4 h-4 accent-slate-900" />
                      <span className="text-xs text-slate-600">Sim</span>
                    </div>
                  ) : field.tipo === 'select' ? (
                    <select value={form.config[field.key] || ''} data-testid={`config-${field.key}`}
                      onChange={(e) => setForm({ ...form, config: { ...form.config, [field.key]: e.target.value } })}
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm focus:ring-2 focus:ring-slate-950">
                      {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={form.config[field.key] || ''} placeholder={field.placeholder}
                      onChange={(e) => setForm({ ...form, config: { ...form.config, [field.key]: e.target.value } })}
                      data-testid={`config-${field.key}`}
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-mono focus:ring-2 focus:ring-slate-950" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowForm(false)} data-testid="cancel-profile-btn"
              className="px-4 py-2 text-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-md font-medium">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} data-testid="save-profile-btn"
              className="flex items-center gap-2 px-5 py-2 text-sm bg-slate-900 text-white hover:bg-slate-800 rounded-md font-medium shadow-sm disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : editingPerfil ? 'Atualizar' : 'Criar Perfil'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerfisSaidaList;
