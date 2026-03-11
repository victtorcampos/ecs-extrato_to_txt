import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { WizardStepper } from './WizardStepper';
import { StepUpload } from './StepUpload';
import { StepReview } from './StepReview';
import { StepAccounts } from './StepAccounts';
import { StepPending } from './StepPending';
import { StepPreview } from './StepPreview';
import { StepDownload } from './StepDownload';
import apiClient from '../../services/api/client';
import { lotesApi } from '../../services/api/lotes.api';
import { layoutsApi } from '../../services/api/layouts.api';

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
  });
  const [file, setFile] = useState(null);
  const [fileBase64, setFileBase64] = useState(null);

  // Step 2: Detection result
  const [detection, setDetection] = useState(null);
  const [layoutsDisponiveis, setLayoutsDisponiveis] = useState([]);
  const [layoutAplicadoId, setLayoutAplicadoId] = useState(null);

  // Step 3: Account rules
  const [regrasContas, setRegrasContas] = useState([]);

  // Step 4: Pending accounts
  const [contasPendentes, setContasPendentes] = useState([]);
  const [mapeamentosManuais, setMapeamentosManuais] = useState({});

  // Step 5: Preview
  const [preview, setPreview] = useState(null);

  // Step 6: Download / Layout de Saída
  const [layoutSaidaId, setLayoutSaidaId] = useState('');

  // Computed
  const hasUnresolvedPendencias = contasPendentes.some(
    p => !mapeamentosManuais[p.conta] && !p.mapeamento_existente
  );

  // ─── Step Handlers ──────────────────────────

  const handleDetect = async () => {
    if (!fileBase64) return;
    setLoading(true);
    try {
      const [detectRes, layoutsRes] = await Promise.all([
        apiClient.post('/api/v1/import-layouts/detect', { arquivo_base64: fileBase64 }),
        layoutsApi.listar({ cnpj: formData.cnpj.replace(/\D/g, '') }),
      ]);
      setDetection(detectRes.data);
      setLayoutsDisponiveis(layoutsRes.items || []);
      setLayoutAplicadoId(null);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro na auto-detecção');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLayout = (layout) => {
    const mapaLayout = {};
    layout.colunas.forEach(c => { mapaLayout[String(c.coluna_excel)] = c.campo_destino; });
    const novasColunas = detection.colunas.map(col => ({
      ...col,
      campo_destino: mapaLayout[String(col.coluna_excel)] ?? col.campo_destino,
    }));
    setDetection({ ...detection, colunas: novasColunas });
    setRegrasContas(layout.regras_conta || []);
    setLayoutAplicadoId(layout.id);
  };

  const handleUpdateColumn = (idx, field, value) => {
    const updated = { ...detection };
    updated.colunas = [...updated.colunas];
    updated.colunas[idx] = { ...updated.colunas[idx], [field]: value };
    setDetection(updated);
  };

  const buildLayoutConfig = () => ({
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
  });

  // Step 3 → 4: Check pending accounts
  const handleCheckPendentes = async () => {
    if (!fileBase64 || !detection) return;
    setLoading(true);
    try {
      const layoutConfig = buildLayoutConfig();
      const response = await apiClient.post('/api/v1/import-layouts/test-parse', {
        arquivo_base64: fileBase64,
        layout_config: layoutConfig,
        periodo_mes: formData.periodo_mes,
        periodo_ano: formData.periodo_ano,
        regras_conta: regrasContas.length > 0 ? regrasContas : null,
        cnpj: formData.cnpj.replace(/\D/g, ''),
      });

      const pendentes = response.data.contas_pendentes || [];
      setContasPendentes(pendentes);

      // Pre-fill existing mappings
      const mapeamentos = {};
      pendentes.forEach(p => {
        if (p.mapeamento_existente) {
          mapeamentos[p.conta] = p.mapeamento_existente;
        }
      });
      setMapeamentosManuais(mapeamentos);

      // Skip step 4 if no pending accounts
      if (pendentes.length === 0) {
        setStep(5);
        // Auto-run preview
        await runTestParse(response.data);
      } else {
        setStep(4);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao verificar pendências');
    } finally {
      setLoading(false);
    }
  };

  // Step 4 → 5: Run test-parse with manual mappings
  const handleTestParse = async () => {
    setStep(5);
    setLoading(true);
    try {
      const layoutConfig = buildLayoutConfig();
      const response = await apiClient.post('/api/v1/import-layouts/test-parse', {
        arquivo_base64: fileBase64,
        layout_config: layoutConfig,
        periodo_mes: formData.periodo_mes,
        periodo_ano: formData.periodo_ano,
        regras_conta: regrasContas.length > 0 ? regrasContas : null,
        mapeamentos_manuais: Object.keys(mapeamentosManuais).length > 0 ? mapeamentosManuais : null,
        cnpj: formData.cnpj.replace(/\D/g, ''),
      });
      setPreview(response.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro no test-parse');
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  // Helper: set preview data directly (used when skipping step 4)
  const runTestParse = async (data) => {
    setPreview(data);
  };

  // Step 6: Process
  const handleProcess = async () => {
    if (!fileBase64) return;
    setLoading(true);
    try {
      const layoutConfig = buildLayoutConfig();
      const regrasParaSalvar = regrasContas.length > 0 ? regrasContas : [];

      // Atualizar layout existente ou criar novo
      let layoutFinal;
      if (layoutAplicadoId) {
        layoutFinal = await layoutsApi.atualizar(layoutAplicadoId, {
          ...layoutConfig,
          regras_conta: regrasParaSalvar,
        });
      } else {
        const res = await apiClient.post('/api/v1/import-layouts', {
          ...layoutConfig,
          nome: `Auto-${file?.name || 'import'}-${Date.now()}`,
          regras_conta: regrasParaSalvar,
        });
        layoutFinal = res.data;
      }

      // Create lote
      const loteRes = await lotesApi.criar({
        cnpj: formData.cnpj.replace(/\D/g, ''),
        periodo_mes: formData.periodo_mes,
        periodo_ano: formData.periodo_ano,
        email_notificacao: formData.email_notificacao || null,
        arquivo_base64: fileBase64,
        nome_arquivo: file?.name || 'import.xls',
        layout_id: layoutFinal.id,
        nome_layout: layoutFinal.nome,
        perfil_saida_id: layoutSaidaId || null,
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
            onNext={handleDetect}
          />
        )}
        {step === 2 && (
          <StepReview
            detection={detection}
            onUpdateColumn={handleUpdateColumn}
            layoutsDisponiveis={layoutsDisponiveis}
            onApplyLayout={handleApplyLayout}
            layoutAplicadoId={layoutAplicadoId}
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
            onNext={handleCheckPendentes}
          />
        )}
        {step === 4 && (
          <StepPending
            contasPendentes={contasPendentes}
            mapeamentosManuais={mapeamentosManuais}
            setMapeamentosManuais={setMapeamentosManuais}
            loading={false}
            onBack={() => setStep(3)}
            onNext={handleTestParse}
          />
        )}
        {step === 5 && (
          <StepPreview
            preview={preview}
            loading={loading}
            onBack={() => setStep(4)}
            onProcess={() => setStep(6)}
          />
        )}
        {step === 6 && (
          <StepDownload
            layoutSaidaId={layoutSaidaId}
            setLayoutSaidaId={setLayoutSaidaId}
            hasPendencias={hasUnresolvedPendencias}
            onBack={() => setStep(5)}
            onProcess={handleProcess}
            loading={loading}
          />
        )}
      </div>

      {loading && step !== 5 && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50" data-testid="loading-overlay">
          <div className="bg-white rounded-xl p-6 shadow-lg flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
            <span className="text-sm text-slate-700">
              {step === 1 ? 'Detectando layout...' : step === 3 ? 'Verificando pendências...' : 'Processando...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportWizard;
