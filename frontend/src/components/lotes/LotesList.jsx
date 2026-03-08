import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  FileText, 
  Download, 
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, StatusBadge, Spinner, EmptyState } from '../ui';
import { lotesApi } from '../../services/api';
import { formatDate, formatCurrency } from '../../lib/utils';

export const LotesList = () => {
  const navigate = useNavigate();
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({
    protocolo: '',
    cnpj: '',
    status: '',
  });
  
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const fetchLotes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        skip: page * pageSize,
        limit: pageSize,
      };
      
      if (filters.protocolo) params.protocolo = filters.protocolo;
      if (filters.cnpj) params.cnpj = filters.cnpj;
      if (filters.status) params.status = filters.status;
      
      const data = await lotesApi.listar(params);
      setLotes(data);
    } catch (err) {
      setError('Erro ao carregar lotes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLotes();
  }, [page, filters.status]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchLotes();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir este lote?')) return;
    
    try {
      await lotesApi.deletar(id);
      fetchLotes();
    } catch (err) {
      setError('Erro ao excluir lote');
    }
  };

  const handleDownload = async (lote) => {
    try {
      const blob = await lotesApi.downloadArquivo(lote.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${lote.protocolo}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erro ao baixar arquivo');
    }
  };

  return (
    <div className="space-y-8" data-testid="lotes-list">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Lotes
          </h1>
          <p className="mt-1 text-slate-500">
            Gerencie os lotes contábeis processados
          </p>
        </div>
        <Link to="/upload">
          <Button data-testid="new-upload-btn">
            <FileText className="w-4 h-4" />
            Novo Lote
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="animate-fadeIn">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar por protocolo..."
                value={filters.protocolo}
                onChange={(e) => setFilters(prev => ({ ...prev, protocolo: e.target.value }))}
                data-testid="search-protocolo"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar por CNPJ..."
                value={filters.cnpj}
                onChange={(e) => setFilters(prev => ({ ...prev, cnpj: e.target.value }))}
                data-testid="search-cnpj"
              />
            </div>
            <div className="w-40">
              <Select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                data-testid="filter-status"
              >
                <option value="">Todos Status</option>
                <option value="aguardando">Aguardando</option>
                <option value="processando">Processando</option>
                <option value="pendente">Pendente</option>
                <option value="concluido">Concluído</option>
                <option value="erro">Erro</option>
              </Select>
            </div>
            <Button type="submit" variant="outline" data-testid="search-btn">
              <Search className="w-4 h-4" />
              Buscar
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={fetchLotes}
              data-testid="refresh-btn"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <Card className="animate-fadeIn stagger-1">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : lotes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum lote encontrado"
              description="Tente ajustar os filtros ou faça upload de um novo lote"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-4">Protocolo</th>
                    <th className="text-left p-4">CNPJ</th>
                    <th className="text-left p-4">Período</th>
                    <th className="text-left p-4">Lançamentos</th>
                    <th className="text-left p-4">Valor Total</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Criado em</th>
                    <th className="text-right p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lotes.map((lote) => (
                    <tr 
                      key={lote.id} 
                      className="border-b border-slate-100 cursor-pointer hover:bg-slate-50"
                      onClick={() => navigate(`/lotes/${lote.id}`)}
                    >
                      <td className="p-4 font-mono text-sm">{lote.protocolo}</td>
                      <td className="p-4 font-mono text-sm">{lote.cnpj_formatado}</td>
                      <td className="p-4 font-mono text-sm">{lote.periodo}</td>
                      <td className="p-4 font-mono text-sm">{lote.total_lancamentos}</td>
                      <td className="p-4 font-mono text-sm">{formatCurrency(lote.valor_total)}</td>
                      <td className="p-4">
                        <StatusBadge status={lote.status} />
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {formatDate(lote.criado_em)}
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {lote.tem_arquivo_saida && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(lote)}
                              title="Download"
                              data-testid={`download-${lote.id}`}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(lote.id)}
                            title="Excluir"
                            data-testid={`delete-${lote.id}`}
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

      {/* Pagination */}
      {lotes.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Mostrando {lotes.length} lotes
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              data-testid="prev-page"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={lotes.length < pageSize}
              data-testid="next-page"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotesList;
