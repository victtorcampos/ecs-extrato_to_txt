import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Label, Spinner, Badge } from '../ui';
import { lotesApi } from '../../services/api';

export const PendenciasResolver = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [lote, setLote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [mapeamentos, setMapeamentos] = useState({});

  useEffect(() => {
    const fetchLote = async () => {
      try {
        setLoading(true);
        const data = await lotesApi.obter(id);
        setLote(data);
        
        // Inicializar mapeamentos com valores existentes
        const initialMapeamentos = {};
        data.pendencias?.forEach(p => {
          if (!p.resolvida) {
            initialMapeamentos[p.conta_cliente] = p.conta_mapeada || '';
          }
        });
        setMapeamentos(initialMapeamentos);
      } catch (err) {
        setError('Erro ao carregar lote');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLote();
  }, [id]);

  const handleMapeamentoChange = (conta, valor) => {
    setMapeamentos(prev => ({ ...prev, [conta]: valor }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Filtrar apenas mapeamentos preenchidos
    const mapeamentosValidos = Object.fromEntries(
      Object.entries(mapeamentos).filter(([_, valor]) => valor.trim() !== '')
    );
    
    if (Object.keys(mapeamentosValidos).length === 0) {
      setError('Preencha pelo menos um mapeamento');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      await lotesApi.resolverPendencias(id, mapeamentosValidos);
      
      setSuccess('Mapeamentos salvos com sucesso!');
      
      setTimeout(() => {
        navigate(`/lotes/${id}`);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar mapeamentos');
    } finally {
      setSaving(false);
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
      </div>
    );
  }

  const pendenciasNaoResolvidas = lote.pendencias?.filter(p => !p.resolvida) || [];

  return (
    <div className="max-w-3xl mx-auto space-y-8" data-testid="pendencias-resolver">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(`/lotes/${id}`)}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 tracking-tight">
            Resolver Pendências
          </h1>
          <p className="mt-1 text-slate-500">
            Protocolo: <span className="font-mono">{lote.protocolo}</span>
          </p>
        </div>
      </div>

      {/* Success */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-700 animate-fadeIn">
          <CheckCircle className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 animate-fadeIn">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {pendenciasNaoResolvidas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">
              Todas as pendências foram resolvidas!
            </h3>
            <p className="text-slate-500 mt-2">
              O lote será reprocessado automaticamente.
            </p>
            <Button 
              className="mt-4"
              onClick={() => navigate(`/lotes/${id}`)}
            >
              Voltar para detalhes
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="animate-fadeIn">
          <CardHeader>
            <CardTitle>Mapeamento de Contas</CardTitle>
            <CardDescription>
              Informe a conta padrão correspondente para cada conta do cliente.
              {pendenciasNaoResolvidas.length} pendência(s) restante(s).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {pendenciasNaoResolvidas.map((pendencia, index) => (
                <div 
                  key={pendencia.id}
                  className="p-4 bg-slate-50 rounded-lg space-y-3 animate-fadeIn"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium text-slate-900">
                        {pendencia.conta_cliente}
                      </span>
                      <Badge variant={pendencia.tipo === 'debito' ? 'info' : 'secondary'}>
                        {pendencia.tipo}
                      </Badge>
                    </div>
                    {pendencia.nome_conta && (
                      <span className="text-sm text-slate-500">
                        {pendencia.nome_conta}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">→</span>
                    <div className="flex-1">
                      <Input
                        placeholder="Conta padrão (ex: 8818)"
                        value={mapeamentos[pendencia.conta_cliente] || ''}
                        onChange={(e) => handleMapeamentoChange(pendencia.conta_cliente, e.target.value)}
                        data-testid={`mapeamento-${pendencia.conta_cliente}`}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/lotes/${id}`)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving}
                  data-testid="save-btn"
                >
                  {saving ? (
                    <>
                      <Spinner size="sm" className="text-white" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar Mapeamentos
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PendenciasResolver;
