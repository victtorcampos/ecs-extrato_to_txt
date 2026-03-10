import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, StatusBadge, Spinner, EmptyState } from '../ui';
import { StatCard } from '../../shared/ui/StatCard';
import { lotesApi } from '../../services/api';
import { formatDate, formatCurrency } from '../../lib/utils';

export const Dashboard = () => {
  const [stats, setStats] = useState({ total: 0, por_status: {} });
  const [recentLotes, setRecentLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, lotesData] = await Promise.all([
        lotesApi.estatisticas(),
        lotesApi.listar({ limit: 5 })
      ]);
      setStats(statsData);
      setRecentLotes(lotesData);
    } catch (err) {
      setError('Erro ao carregar dados do dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const statusCounts = stats.por_status || {};

  return (
    <div className="space-y-8" data-testid="dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-slate-500">
            Visão geral do processamento de lotes contábeis
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={fetchData}
            data-testid="refresh-btn"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
          <Link to="/upload">
            <Button data-testid="upload-btn">
              <Upload className="w-4 h-4" />
              Novo Upload
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Lotes"
          value={stats.total || 0}
          icon={FileText}
          color="bg-slate-900"
        />
        <StatCard
          title="Concluídos"
          value={statusCounts.concluido || 0}
          icon={CheckCircle}
          color="bg-emerald-600"
        />
        <StatCard
          title="Pendentes"
          value={statusCounts.pendente || 0}
          icon={AlertCircle}
          color="bg-amber-500"
        />
        <StatCard
          title="Processando"
          value={(statusCounts.aguardando || 0) + (statusCounts.processando || 0)}
          icon={Clock}
          color="bg-blue-600"
        />
      </div>

      {/* Recent Lotes */}
      <Card className="animate-fadeIn stagger-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lotes Recentes</CardTitle>
          <Link to="/lotes">
            <Button variant="ghost" size="sm" data-testid="view-all-btn">
              Ver todos
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentLotes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum lote encontrado"
              description="Faça upload do primeiro arquivo Excel para começar"
              action={
                <Link to="/upload">
                  <Button data-testid="empty-upload-btn">
                    <Upload className="w-4 h-4" />
                    Fazer Upload
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-4">Protocolo</th>
                    <th className="text-left p-4">CNPJ</th>
                    <th className="text-left p-4">Período</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Criado em</th>
                    <th className="text-right p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLotes.map((lote) => (
                    <tr key={lote.id} className="border-b border-slate-100">
                      <td className="p-4 font-mono text-sm">{lote.protocolo}</td>
                      <td className="p-4 font-mono text-sm">{lote.cnpj_formatado}</td>
                      <td className="p-4 font-mono text-sm">{lote.periodo}</td>
                      <td className="p-4">
                        <StatusBadge status={lote.status} />
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {formatDate(lote.criado_em)}
                      </td>
                      <td className="p-4 text-right">
                        <Link to={`/lotes/${lote.id}`}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`view-lote-${lote.id}`}
                          >
                            Detalhes
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
