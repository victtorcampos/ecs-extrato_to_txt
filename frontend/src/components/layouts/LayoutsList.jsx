import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Edit3,
  Copy,
  RefreshCw,
  Settings2,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { layoutsApi } from '../../services/api';
import { cn, formatCNPJ } from '../../lib/utils';

export const LayoutsList = () => {
  const navigate = useNavigate();
  const [layouts, setLayouts] = useState([]);
  const [cnpjs, setCnpjs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCnpj, setFiltroCnpj] = useState('');

  const carregarLayouts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtroCnpj) params.cnpj = filtroCnpj;
      const data = await layoutsApi.listar(params);
      setLayouts(data.items);
      setCnpjs(data.cnpjs_disponiveis);
    } catch (err) {
      toast.error('Erro ao carregar layouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarLayouts();
  }, [filtroCnpj]);

  const handleDeletar = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja excluir o layout "${nome}" e todas as suas regras?`)) return;
    try {
      await layoutsApi.deletar(id);
      toast.success('Layout removido com sucesso');
      carregarLayouts();
    } catch (err) {
      toast.error('Erro ao remover layout');
    }
  };

  const handleClonar = async (id) => {
    try {
      const novoLayout = await layoutsApi.clonar(id);
      toast.success(`Layout clonado: ${novoLayout.nome}`);
      carregarLayouts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao clonar layout');
    }
  };

  const handleToggleAtivo = async (layout) => {
    try {
      await layoutsApi.atualizar(layout.id, { ativo: !layout.ativo });
      toast.success(layout.ativo ? 'Layout desativado' : 'Layout ativado');
      carregarLayouts();
    } catch (err) {
      toast.error('Erro ao atualizar layout');
    }
  };

  return (
    <div className="space-y-6" data-testid="layouts-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-slate-900">
            Layouts de Importação
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure como diferentes formatos de Excel são lidos pelo sistema
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={carregarLayouts}
            data-testid="refresh-layouts-btn"
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-md font-medium transition-colors active:scale-95"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Atualizar
          </button>
          <button
            onClick={() => navigate('/layouts/novo')}
            data-testid="new-layout-btn"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-900 text-white hover:bg-slate-800 rounded-md font-medium transition-colors shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Novo Layout
          </button>
        </div>
      </div>

      {/* Filtros */}
      {cnpjs.length > 0 && (
        <div className="flex gap-3 items-center">
          <label className="text-sm font-medium text-slate-600">CNPJ:</label>
          <select
            value={filtroCnpj}
            onChange={(e) => setFiltroCnpj(e.target.value)}
            data-testid="filter-cnpj-select"
            className="h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
          >
            <option value="">Todos</option>
            {cnpjs.map((c) => (
              <option key={c} value={c}>{formatCNPJ(c)}</option>
            ))}
          </select>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : layouts.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-lg" data-testid="empty-layouts">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-700">Nenhum layout encontrado</h3>
          <p className="text-sm text-slate-500 mt-1">Crie um novo layout para configurar a importação de Excel</p>
          <button
            onClick={() => navigate('/layouts/novo')}
            className="mt-4 px-4 py-2 text-sm bg-slate-900 text-white hover:bg-slate-800 rounded-md font-medium transition-colors"
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Criar Layout
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {layouts.map((layout) => (
            <div
              key={layout.id}
              data-testid={`layout-card-${layout.id}`}
              className={cn(
                'bg-white border rounded-lg p-5 transition-colors hover:border-slate-400',
                !layout.ativo && 'opacity-60 bg-slate-50'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/layouts/${layout.id}`}
                      className="font-heading text-lg font-semibold text-slate-900 hover:underline truncate"
                      data-testid={`layout-link-${layout.id}`}
                    >
                      {layout.nome}
                    </Link>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded font-mono',
                      layout.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    )}>
                      {layout.ativo ? 'ATIVO' : 'INATIVO'}
                    </span>
                  </div>
                  {layout.descricao && (
                    <p className="text-sm text-slate-500 mt-1 truncate">{layout.descricao}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 font-mono">
                    <span>CNPJ: {formatCNPJ(layout.cnpj)}</span>
                    <span>{layout.total_colunas} colunas</span>
                    <span>{layout.total_regras} regras</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => handleToggleAtivo(layout)}
                    title={layout.ativo ? 'Desativar' : 'Ativar'}
                    data-testid={`toggle-layout-${layout.id}`}
                    className="p-2 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"
                  >
                    {layout.ativo ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => navigate(`/layouts/${layout.id}/editar`)}
                    title="Editar"
                    data-testid={`edit-layout-${layout.id}`}
                    className="p-2 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleClonar(layout.id)}
                    title="Clonar"
                    data-testid={`clone-layout-${layout.id}`}
                    className="p-2 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <Link
                    to={`/layouts/${layout.id}`}
                    title="Regras"
                    data-testid={`rules-layout-${layout.id}`}
                    className="p-2 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"
                  >
                    <Settings2 className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDeletar(layout.id, layout.nome)}
                    title="Excluir"
                    data-testid={`delete-layout-${layout.id}`}
                    className="p-2 hover:bg-red-50 rounded-md text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LayoutsList;
