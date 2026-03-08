import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw,
  CheckSquare,
  Square,
  X,
  Save,
  AlertCircle
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  Button, 
  Input, 
  Label,
  Select, 
  Spinner, 
  EmptyState 
} from '../ui';
import { mapeamentosApi } from '../../services/api';
import { formatCNPJ } from '../../lib/utils';

export const MapeamentosList = () => {
  // State
  const [mapeamentos, setMapeamentos] = useState([]);
  const [cnpjs, setCnpjs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Filtros
  const [filtro, setFiltro] = useState({ cnpj: '', busca: '' });
  
  // Seleção em lote
  const [selecionados, setSelecionados] = useState(new Set());
  const [contaPadraoLote, setContaPadraoLote] = useState('');
  const [atualizandoLote, setAtualizandoLote] = useState(false);
  
  // Modal de edição/criação
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    cnpj: '',
    conta_cliente: '',
    conta_padrao: '',
    nome_conta_cliente: '',
    nome_conta_padrao: ''
  });
  const [salvando, setSalvando] = useState(false);

  // Fetch data
  const fetchMapeamentos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (filtro.cnpj) params.cnpj = filtro.cnpj;
      
      const data = await mapeamentosApi.listar(params);
      setMapeamentos(data.items || []);
      setCnpjs(data.cnpjs_disponiveis || []);
      setSelecionados(new Set());
    } catch (err) {
      setError('Erro ao carregar mapeamentos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapeamentos();
  }, [filtro.cnpj]);

  // Filtro local por busca
  const mapeamentosFiltrados = useMemo(() => {
    if (!filtro.busca) return mapeamentos;
    const termo = filtro.busca.toLowerCase();
    return mapeamentos.filter(m => 
      m.conta_cliente.toLowerCase().includes(termo) ||
      m.conta_padrao.toLowerCase().includes(termo) ||
      (m.nome_conta_cliente || '').toLowerCase().includes(termo)
    );
  }, [mapeamentos, filtro.busca]);

  // Handlers de seleção
  const toggleSelecao = (id) => {
    const novo = new Set(selecionados);
    if (novo.has(id)) {
      novo.delete(id);
    } else {
      novo.add(id);
    }
    setSelecionados(novo);
  };

  const toggleTodos = () => {
    if (selecionados.size === mapeamentosFiltrados.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(mapeamentosFiltrados.map(m => m.id)));
    }
  };

  // Atualização em lote
  const handleAtualizarLote = async () => {
    if (selecionados.size === 0 || !contaPadraoLote.trim()) {
      setError('Selecione mapeamentos e informe a conta padrão');
      return;
    }

    try {
      setAtualizandoLote(true);
      setError(null);
      
      await mapeamentosApi.atualizarEmLote(
        Array.from(selecionados),
        contaPadraoLote.trim()
      );
      
      setSuccess(`${selecionados.size} mapeamento(s) atualizado(s)`);
      setContaPadraoLote('');
      setSelecionados(new Set());
      fetchMapeamentos();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao atualizar em lote');
    } finally {
      setAtualizandoLote(false);
    }
  };

  // Exclusão em lote
  const handleDeletarLote = async () => {
    if (selecionados.size === 0) return;
    
    if (!window.confirm(`Excluir ${selecionados.size} mapeamento(s)?`)) return;

    try {
      setError(null);
      await mapeamentosApi.deletarEmLote(Array.from(selecionados));
      setSuccess(`${selecionados.size} mapeamento(s) excluído(s)`);
      setSelecionados(new Set());
      fetchMapeamentos();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao excluir em lote');
    }
  };

  // Modal handlers
  const abrirModalNovo = () => {
    setEditando(null);
    setFormData({
      cnpj: filtro.cnpj || '',
      conta_cliente: '',
      conta_padrao: '',
      nome_conta_cliente: '',
      nome_conta_padrao: ''
    });
    setModalAberto(true);
  };

  const abrirModalEditar = (mapeamento) => {
    setEditando(mapeamento);
    setFormData({
      cnpj: mapeamento.cnpj,
      conta_cliente: mapeamento.conta_cliente,
      conta_padrao: mapeamento.conta_padrao,
      nome_conta_cliente: mapeamento.nome_conta_cliente || '',
      nome_conta_padrao: mapeamento.nome_conta_padrao || ''
    });
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditando(null);
    setFormData({
      cnpj: '',
      conta_cliente: '',
      conta_padrao: '',
      nome_conta_cliente: '',
      nome_conta_padrao: ''
    });
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    
    if (!formData.cnpj || !formData.conta_cliente || !formData.conta_padrao) {
      setError('Preencha os campos obrigatórios');
      return;
    }

    try {
      setSalvando(true);
      setError(null);

      if (editando) {
        await mapeamentosApi.atualizar(editando.id, {
          conta_padrao: formData.conta_padrao,
          nome_conta_cliente: formData.nome_conta_cliente || null,
          nome_conta_padrao: formData.nome_conta_padrao || null
        });
        setSuccess('Mapeamento atualizado');
      } else {
        await mapeamentosApi.criar(formData);
        setSuccess('Mapeamento criado');
      }

      fecharModal();
      fetchMapeamentos();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletar = async (id) => {
    if (!window.confirm('Excluir este mapeamento?')) return;

    try {
      await mapeamentosApi.deletar(id);
      setSuccess('Mapeamento excluído');
      fetchMapeamentos();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao excluir');
    }
  };

  return (
    <div className="space-y-6" data-testid="mapeamentos-list">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Mapeamentos
          </h1>
          <p className="mt-1 text-slate-500">
            Gerenciamento de mapeamento de contas contábeis
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchMapeamentos} data-testid="refresh-btn">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={abrirModalNovo} data-testid="novo-btn">
            <Plus className="w-4 h-4" />
            Novo Mapeamento
          </Button>
        </div>
      </div>

      {/* Mensagens */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-700 animate-fadeIn">
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 animate-fadeIn">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="w-64">
              <Label className="text-xs mb-1 block">Filtrar por CNPJ</Label>
              <Select
                value={filtro.cnpj}
                onChange={(e) => setFiltro(prev => ({ ...prev, cnpj: e.target.value }))}
                data-testid="filtro-cnpj"
              >
                <option value="">Todos os CNPJs</option>
                {cnpjs.map(cnpj => (
                  <option key={cnpj} value={cnpj}>{formatCNPJ(cnpj)}</option>
                ))}
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs mb-1 block">Buscar conta</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por conta cliente ou padrão..."
                  value={filtro.busca}
                  onChange={(e) => setFiltro(prev => ({ ...prev, busca: e.target.value }))}
                  data-testid="busca-input"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações em Lote */}
      {selecionados.size > 0 && (
        <Card className="border-blue-200 bg-blue-50 animate-fadeIn">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-blue-800">
                {selecionados.size} selecionado(s)
              </span>
              
              <div className="flex items-center gap-2 flex-1">
                <Input
                  className="w-40 bg-white"
                  placeholder="Nova conta padrão"
                  value={contaPadraoLote}
                  onChange={(e) => setContaPadraoLote(e.target.value)}
                  data-testid="conta-lote-input"
                />
                <Button
                  size="sm"
                  onClick={handleAtualizarLote}
                  disabled={!contaPadraoLote.trim() || atualizandoLote}
                  data-testid="atualizar-lote-btn"
                >
                  {atualizandoLote ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
                  Aplicar
                </Button>
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeletarLote}
                data-testid="deletar-lote-btn"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Selecionados
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelecionados(new Set())}
              >
                <X className="w-4 h-4" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : mapeamentosFiltrados.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Nenhum mapeamento encontrado"
              description="Crie um novo mapeamento ou ajuste os filtros"
              action={
                <Button onClick={abrirModalNovo}>
                  <Plus className="w-4 h-4" />
                  Criar Mapeamento
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="p-4 w-12">
                      <button
                        onClick={toggleTodos}
                        className="p-1 hover:bg-slate-200 rounded"
                        data-testid="toggle-todos"
                      >
                        {selecionados.size === mapeamentosFiltrados.length && mapeamentosFiltrados.length > 0 ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="text-left p-4">CNPJ</th>
                    <th className="text-left p-4">Conta Cliente</th>
                    <th className="text-left p-4">Conta Padrão</th>
                    <th className="text-left p-4">Nome Conta Cliente</th>
                    <th className="text-right p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {mapeamentosFiltrados.map((m) => (
                    <tr 
                      key={m.id} 
                      className={`border-b border-slate-100 ${
                        selecionados.has(m.id) ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-4">
                        <button
                          onClick={() => toggleSelecao(m.id)}
                          className="p-1 hover:bg-slate-200 rounded"
                          data-testid={`checkbox-${m.id}`}
                        >
                          {selecionados.has(m.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 font-mono text-sm">{m.cnpj_formatado}</td>
                      <td className="p-4 font-mono text-sm font-medium">{m.conta_cliente}</td>
                      <td className="p-4 font-mono text-sm text-blue-600 font-medium">{m.conta_padrao}</td>
                      <td className="p-4 text-sm text-slate-600">
                        {m.nome_conta_cliente || '-'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirModalEditar(m)}
                            title="Editar"
                            data-testid={`edit-${m.id}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletar(m.id)}
                            title="Excluir"
                            data-testid={`delete-${m.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Edição/Criação */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={fecharModal}
          />
          <Card className="relative z-10 w-full max-w-lg mx-4 animate-fadeIn">
            <CardHeader>
              <CardTitle>
                {editando ? 'Editar Mapeamento' : 'Novo Mapeamento'}
              </CardTitle>
              <CardDescription>
                {editando 
                  ? 'Atualize os dados do mapeamento' 
                  : 'Crie um novo mapeamento de conta'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSalvar} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                    disabled={!!editando}
                    data-testid="modal-cnpj"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="conta_cliente">Conta Cliente *</Label>
                    <Input
                      id="conta_cliente"
                      placeholder="Ex: 1019"
                      value={formData.conta_cliente}
                      onChange={(e) => setFormData(prev => ({ ...prev, conta_cliente: e.target.value }))}
                      disabled={!!editando}
                      data-testid="modal-conta-cliente"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conta_padrao">Conta Padrão *</Label>
                    <Input
                      id="conta_padrao"
                      placeholder="Ex: 8818"
                      value={formData.conta_padrao}
                      onChange={(e) => setFormData(prev => ({ ...prev, conta_padrao: e.target.value }))}
                      data-testid="modal-conta-padrao"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome_conta_cliente">Nome Conta Cliente</Label>
                  <Input
                    id="nome_conta_cliente"
                    placeholder="Descrição da conta"
                    value={formData.nome_conta_cliente}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome_conta_cliente: e.target.value }))}
                    data-testid="modal-nome-cliente"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome_conta_padrao">Nome Conta Padrão</Label>
                  <Input
                    id="nome_conta_padrao"
                    placeholder="Descrição da conta padrão"
                    value={formData.nome_conta_padrao}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome_conta_padrao: e.target.value }))}
                    data-testid="modal-nome-padrao"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={fecharModal}
                    disabled={salvando}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={salvando} data-testid="modal-salvar">
                    {salvando ? (
                      <>
                        <Spinner size="sm" className="text-white" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Salvar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MapeamentosList;
