import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { WizardStepper } from './WizardStepper';
import { StepUpload } from './StepUpload';
import { StepReview } from './StepReview';
import { StepAccounts } from './StepAccounts';
import { StepPreview } from './StepPreview';
import apiClient from '../../services/api/client';
import { lotesApi } from '../../services/api/lotes.api';
import { perfisSaidaApi } from '../../services/api/perfis-saida.api';

export const ImportWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Upload data
  const [formData, setFormData] = useState({
    cnpj: '',
    periodo_mes: new Date().getMonth() + 1,
    periodo_ano: new Date().getFullYear(),
    email_notificacao: '',
    perfil_saida_id: '',
  });
  const [file, setFile] = useState(null);
  const [fileBase64, setFileBase64] = useState(null);
  const [perfisSaida, setPerfisSaida] = useState([]);

  // Step 2: Detection result
  const [detection, setDetection] = useState(null);

  // Step 3: Account rules
  const [regrasContas, setRegrasContas] = useState([]);

  // Step 4: Preview
  const [preview, setPreview] = useState(null);

  // Load perfis de saída
  useEffect(() => {
    perfisSaidaApi.listar({ apenas_ativos: true }).then(res => {
      setPerfisSaida(res.items || []);
      const padrao = (res.items || []).find(p => p.padrao);
      if (padrao) setFormData(prev => ({ ...prev, perfil_saida_id: padrao.id }));
    }).catch(() => {});
  }, []);

  // ─── Step Handlers ──────────────────────────

  const handleDetect = async () => {
    if (!fileBase64) return;
    setLoading(true);
    try {
      const response = await apiClient.post('/api/v1/import-layouts/detect', {
        arquivo_base64: fileBase64,
      });
      setDetection(response.data);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro na auto-detecção');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateColumn = (idx, field, value) => {
    const updated = { ...detection };
    updated.colunas = [...updated.colunas];
    updated.colunas[idx] = { ...updated.colunas[idx], [field]: value };
    setDetection(updated);
  };

  const handleTestParse = async () => {
    if (!fileBase64 || !detection) return;
    setStep(4);
    setLoading(true);
    try {
      const layoutConfig = {
        cnpj: formData.cnpj.replace(/\D/g, ''),
        config_planilha: detection.config_planilha,
        colunas: detection.colunas
          .filter(c => c.campo_destino !== 'ignorar')
          .map(c => ({
            campo_destino: c.campo_destino,
            coluna_excel: c.coluna_excel,
            tipo_dado: c.tipo_dado,
            formato: c.formato,
            transformacao: c.transformacao || {},
          })),
        config_valor: detection.config_valor,
      };

      const response = await apiClient.post('/api/v1/import-layouts/test-parse', {
        arquivo_base64: fileBase64,
        layout_config: layoutConfig,
        periodo_mes: formData.periodo_mes,
        periodo_ano: formData.periodo_ano,
        regras_conta: regrasContas.length > 0 ? regrasContas : null,
      });
      setPreview(response.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro no test-parse');
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!fileBase64) return;
    setLoading(true);
    try {
      const layoutConfig = {
        cnpj: formData.cnpj.replace(/\D/g, ''),
        nome: `Auto-${file?.name || 'import'}-${Date.now()}`,
        config_planilha: detection.config_planilha,
        colunas: detection.colunas
          .filter(c => c.campo_destino !== 'ignorar')
          .map(c => ({
            campo_destino: c.campo_destino,
            coluna_excel: c.coluna_excel,
            tipo_dado: c.tipo_dado,
            formato: c.formato,
            transformacao: c.transformacao || {},
          })),
        config_valor: detection.config_valor,
      };

      // Save layout
      const layoutRes = await apiClient.post('/api/v1/import-layouts', {
        ...layoutConfig,
        regras_conta: regrasContas.length > 0 ? regrasContas : [],
      });

      // Create lote with perfil_saida_id
      const loteRes = await lotesApi.criar({
        cnpj: formData.cnpj.replace(/\D/g, ''),
        periodo_mes: formData.periodo_mes,
        periodo_ano: formData.periodo_ano,
        email_notificacao: formData.email_notificacao || null,
        arquivo_base64: fileBase64,
        nome_arquivo: file?.name || 'import.xls',
        layout_id: layoutRes.data.id,
        nome_layout: layoutRes.data.nome,
        perfil_saida_id: formData.perfil_saida_id || null,
      });

      toast.success(`Lote ${loteRes.protocolo} criado! Processamento iniciado.`);
      navigate(`/lotes/${loteRes.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao processar lote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto" data-testid="import-wizard">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 font-[Manrope]">Importar Lote</h1>
        <p className="text-sm text-slate-500 mt-1">Assistente inteligente de importação com detecção automática</p>
      </div>

      <WizardStepper currentStep={step} />

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        {step === 1 && (
          <StepUpload
            formData={formData}
            setFormData={setFormData}
            file={file}
            setFile={setFile}
            setFileBase64={setFileBase64}
            perfisSaida={perfisSaida}
            onNext={handleDetect}
          />
        )}
        {step === 2 && (
          <StepReview
            detection={detection}
            onUpdateColumn={handleUpdateColumn}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <StepAccounts
            templates={detection?.templates_regras || []}
            regrasContas={regrasContas}
            setRegrasContas={setRegrasContas}
            onBack={() => setStep(2)}
            onNext={handleTestParse}
          />
        )}
        {step === 4 && (
          <StepPreview
            preview={preview}
            loading={loading}
            onBack={() => setStep(3)}
            onProcess={handleProcess}
          />
        )}
      </div>

      {loading && step !== 4 && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" data-testid="loading-overlay">
          <div className="bg-white rounded-xl p-6 shadow-lg flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
            <span className="text-sm text-slate-700">
              {step === 1 ? 'Detectando layout...' : 'Processando...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportWizard;
