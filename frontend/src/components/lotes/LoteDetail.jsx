import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  RefreshCw, 
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Mail,
  Building2,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, StatusBadge, Spinner, Badge } from '../ui';
import { lotesApi } from '../../services/api';
import { formatDate, formatCurrency } from '../../lib/utils';

export const LoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [lote, setLote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reprocessing, setReprocessing] = useState(false);

  const fetchLote = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await lotesApi.obter(id);
      setLote(data);
    } catch (err) {
      setError('Erro ao carregar lote');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLote();
    
    // Auto-refresh for processing status
    const interval = setInterval(() => {
      if (lote?.status === 'processando' || lote?.status === 'aguardando') {
        fetchLote();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [id]);

  const handleReprocess = async () => {
    try {
      setReprocessing(true);
      await lotesApi.reprocessar(id);
      fetchLote();
    } catch (err) {
      setError('Erro ao reprocessar lote');
    } finally {
      setReprocessing(false);
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await lotesApi.downloadArquivo(id);
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

  const handleDelete = async () => {
    if (!window.confirm('Deseja realmente excluir este lote?')) return;
    
    try {
      await lotesApi.deletar(id);
      navigate('/lotes');
    } catch (err) {
      setError('Erro ao excluir lote');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!lote) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Lote não encontrado</p>
        <Link to="/lotes">
          <Button variant="outline" className="mt-4">
            Voltar para lista
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="lote-detail">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/lotes')}
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-heading font-bold text-slate-900 tracking-tight font-mono">
                {lote.protocolo}
              </h1>
              <StatusBadge status={lote.status} />
            </div>
            <p className="mt-1 text-slate-500">
              Criado em {formatDate(lote.criado_em)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {lote.tem_arquivo_saida && (
            <Button 
              variant="outline" 
              onClick={handleDownload}
              data-testid="download-btn"
            >
              <Download className="w-4 h-4" />
              Download TXT
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleReprocess}
            disabled={reprocessing}
            data-testid="reprocess-btn"
          >
            <RefreshCw className={`w-4 h-4 ${reprocessing ? 'animate-spin' : ''}`} />
            Reprocessar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            data-testid="delete-btn"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {/* Error Message */}
      {lote.mensagem_erro && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Erro no Processamento</p>
                <p className="text-sm text-red-600 mt-1">{lote.mensagem_erro}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-fadeIn">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Building2 className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">CNPJ</p>
                <p className="font-mono text-sm font-medium">{lote.cnpj_formatado}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fadeIn stagger-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Calendar className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Período</p>
                <p className="font-mono text-sm font-medium">{lote.periodo}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fadeIn stagger-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Mail className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Email</p>
                <p className="text-sm font-medium truncate max-w-[150px]" title={lote.email_notificacao}>
                  {lote.email_notificacao}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fadeIn stagger-3">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <FileText className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Arquivo</p>
                <p className="text-sm font-medium truncate max-w-[150px]" title={lote.nome_arquivo}>
                  {lote.nome_arquivo || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="animate-fadeIn">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 uppercase tracking-wider">Total Lançamentos</p>
            <p className="mt-2 text-3xl font-heading font-bold text-slate-900">
              {lote.total_lancamentos}
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fadeIn stagger-1">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 uppercase tracking-wider">Valor Total</p>
            <p className="mt-2 text-3xl font-heading font-bold text-slate-900">
              {formatCurrency(lote.valor_total)}
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fadeIn stagger-2">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 uppercase tracking-wider">Pendências</p>
            <p className="mt-2 text-3xl font-heading font-bold text-slate-900">
              {lote.pendencias_resolvidas}/{lote.total_pendencias}
              <span className="text-lg text-slate-400 ml-2">resolvidas</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pendencias */}
      {lote.pendencias && lote.pendencias.length > 0 && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Pendências de Mapeamento
            </CardTitle>
            <CardDescription>
              Contas que precisam ser mapeadas para continuar o processamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={`/lotes/${id}/pendencias`}>
              <Button data-testid="resolve-pendencias-btn">
                Resolver Pendências ({lote.total_pendencias - lote.pendencias_resolvidas} restantes)
              </Button>
            </Link>
            
            <div className="mt-4 space-y-2">
              {lote.pendencias.slice(0, 5).map((p) => (
                <div 
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-md"
                >
                  <div className="flex items-center gap-3">
                    {p.resolvida ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="font-mono text-sm">{p.conta_cliente}</span>
                    <Badge variant={p.tipo === 'debito' ? 'info' : 'secondary'}>
                      {p.tipo}
                    </Badge>
                  </div>
                  {p.conta_mapeada && (
                    <span className="font-mono text-sm text-slate-500">
                      → {p.conta_mapeada}
                    </span>
                  )}
                </div>
              ))}
              {lote.pendencias.length > 5 && (
                <p className="text-sm text-slate-500 text-center pt-2">
                  E mais {lote.pendencias.length - 5} pendências...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lançamentos */}
      {lote.lancamentos && lote.lancamentos.length > 0 && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <CardTitle>Lançamentos</CardTitle>
            <CardDescription>
              Primeiros 10 lançamentos do lote
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-3">Data</th>
                    <th className="text-left p-3">Débito</th>
                    <th className="text-left p-3">Crédito</th>
                    <th className="text-right p-3">Valor</th>
                    <th className="text-left p-3">Histórico</th>
                  </tr>
                </thead>
                <tbody>
                  {lote.lancamentos.slice(0, 10).map((lanc) => (
                    <tr key={lanc.id} className="border-b border-slate-100">
                      <td className="p-3 font-mono text-sm">{lanc.data || '-'}</td>
                      <td className="p-3 font-mono text-sm">{lanc.conta_debito}</td>
                      <td className="p-3 font-mono text-sm">{lanc.conta_credito}</td>
                      <td className="p-3 font-mono text-sm text-right">
                        {formatCurrency(lanc.valor)}
                      </td>
                      <td className="p-3 text-sm text-slate-600 max-w-xs truncate" title={lanc.historico}>
                        {lanc.historico}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {lote.lancamentos.length > 10 && (
              <p className="text-sm text-slate-500 text-center pt-4">
                E mais {lote.lancamentos.length - 10} lançamentos...
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LoteDetail;
