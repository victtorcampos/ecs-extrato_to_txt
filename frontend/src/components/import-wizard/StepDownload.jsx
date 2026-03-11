import React, { useState, useEffect } from 'react';
import { Button, Input } from '../ui';
import { FileOutput, Plus, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { perfisSaidaApi } from '../../services/api/perfis-saida.api';
import { cn } from '../../lib/utils';

export const StepDownload = ({ layoutSaidaId, setLayoutSaidaId, hasPendencias, onBack, onProcess, loading }) => {
  const [layouts, setLayouts] = useState([]);
  const [loadingLayouts, setLoadingLayouts] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sistemas, setSistemas] = useState({ sistemas: [], geradores_implementados: [] });
  const [newForm, setNewForm] = useState({ nome: '', sistema_destino: '', formato: '', descricao: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const carregarDados = async () => {
      setLoadingLayouts(true);
      try {
        const [layoutsData, sistemasData] = await Promise.all([
          perfisSaidaApi.listar({ apenas_ativos: true }),
          perfisSaidaApi.sistemasDisponiveis(),
        ]);
        setLayouts(layoutsData.items || []);
        setSistemas(sistemasData);
        // Auto-selecionar padrão
        const padrao = (layoutsData.items || []).find(p => p.padrao);
        if (padrao && !layoutSaidaId) {
          setLayoutSaidaId(padrao.id);
        }
      } catch {
        toast.error('Erro ao carregar layouts de saída');
      } finally {
        setLoadingLayouts(false);
      }
    };
    carregarDados();
  }, []);

  const handleCreate = async () => {
    if (!newForm.nome || !newForm.sistema_destino || !newForm.formato) {
      toast.error('Preencha nome, sistema e formato');
      return;
    }
    setCreating(true);
    try {
      const created = await perfisSaidaApi.criar(newForm);
      setLayouts(prev => [...prev, created]);
      setLayoutSaidaId(created.id);
      setShowCreateForm(false);
      toast.success('Layout de saída criado');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar');
    } finally {
      setCreating(false);
    }
  };

  const formatosDoSistema = sistemas.sistemas?.find(s => s.value === newForm.sistema_destino)?.formatos || [];

  return (
    <div className="space-y-6" data-testid="step-download">
      <div className="text-center mb-4">
        <h3 className="text-base font-semibold text-slate-900">Layout de Saída</h3>
        <p className="text-sm text-slate-500 mt-1">Selecione o formato de exportação para o arquivo processado</p>
      </div>

      {hasPendencias && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          Existem contas pendentes de mapeamento. Volte ao passo anterior para resolver antes de processar.
        </div>
      )}

      {loadingLayouts ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
        </div>
      ) : (
        <>
          {/* Layout selection */}
          <div className="space-y-2">
            {layouts.map(layout => (
              <div
                key={layout.id}
                onClick={() => setLayoutSaidaId(layout.id)}
                className={cn(
                  'border rounded-lg p-4 cursor-pointer transition-all',
                  layoutSaidaId === layout.id
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-400'
                )}
                data-testid={`layout-option-${layout.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileOutput className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{layout.nome}</p>
                      <p className="text-xs text-slate-400 font-mono">
                        {layout.sistema_destino_nome} - {layout.formato_nome}
                      </p>
                    </div>
                  </div>
                  {layoutSaidaId === layout.id && (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
              </div>
            ))}

            {layouts.length === 0 && !showCreateForm && (
              <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                <FileOutput className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Nenhum layout de saída configurado</p>
              </div>
            )}
          </div>

          {/* Create new button */}
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
              data-testid="create-layout-btn"
            >
              <Plus className="w-4 h-4" /> Criar novo layout de saída
            </button>
          )}

          {/* Inline create form */}
          {showCreateForm && (
            <div className="border-2 border-slate-300 rounded-lg p-4 space-y-3" data-testid="create-layout-form">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Novo Layout de Saída</p>
                <button onClick={() => setShowCreateForm(false)} className="p-1 hover:bg-slate-100 rounded">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Nome *</label>
                  <Input
                    value={newForm.nome}
                    onChange={e => setNewForm(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Ex: Domínio TXT"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Descrição</label>
                  <Input
                    value={newForm.descricao}
                    onChange={e => setNewForm(p => ({ ...p, descricao: e.target.value }))}
                    placeholder="Opcional"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Sistema *</label>
                  <select
                    value={newForm.sistema_destino}
                    onChange={e => {
                      const fmts = sistemas.sistemas?.find(s => s.value === e.target.value)?.formatos || [];
                      setNewForm(p => ({ ...p, sistema_destino: e.target.value, formato: fmts[0]?.value || '' }));
                    }}
                    className="h-8 w-full rounded border border-slate-200 text-xs px-2"
                  >
                    <option value="">Selecionar...</option>
                    {sistemas.sistemas?.map(s => <option key={s.value} value={s.value}>{s.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Formato *</label>
                  <select
                    value={newForm.formato}
                    onChange={e => setNewForm(p => ({ ...p, formato: e.target.value }))}
                    className="h-8 w-full rounded border border-slate-200 text-xs px-2"
                  >
                    <option value="">Selecionar...</option>
                    {formatosDoSistema.map(f => <option key={f.value} value={f.value}>{f.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={handleCreate} disabled={creating}>
                  {creating ? 'Criando...' : 'Criar'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} data-testid="back-btn">Voltar</Button>
        <Button
          onClick={onProcess}
          disabled={loading || !layoutSaidaId || hasPendencias}
          className="bg-emerald-600 hover:bg-emerald-700"
          data-testid="process-btn"
        >
          {loading ? 'Processando...' : 'Processar Lote'}
        </Button>
      </div>
    </div>
  );
};

export default StepDownload;
