import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileSpreadsheet,
  X,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Save,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { lotesApi, layoutsApi, perfisSaidaApi } from '../../services/api';
import { TransformationConfig } from '../layouts/TransformationConfig';
import { AccountRulesBuilder } from '../layouts/AccountRulesBuilder';

const TIPO_DADO_OPTIONS = [
  { value: 'string', label: 'Texto' },
  { value: 'integer', label: 'Inteiro' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'date', label: 'Data' },
];

export const UploadForm = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Form data
  const [formData, setFormData] = useState({
    cnpj: '',
    periodo_mes: new Date().getMonth() + 1,
    periodo_ano: new Date().getFullYear(),
    email_notificacao: '',
  });

  // File state
  const [file, setFile] = useState(null);
  const [fileBase64, setFileBase64] = useState(null);

  // Layout selection
  const [layoutMode, setLayoutMode] = useState('existing'); // 'existing' | 'new'
  const [existingLayouts, setExistingLayouts] = useState([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState('');
  const [camposDisponiveis, setCamposDisponiveis] = useState({});

  // Preview
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // New layout config
  const [newLayout, setNewLayout] = useState({
    nome: '',
    nome_aba: '',
    linha_cabecalho: 0,
    linha_inicio_dados: 1,
    colunas: [],
    regras_conta: [],
  });

  // General state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Output profiles
  const [perfisSaida, setPerfisSaida] = useState([]);
  const [selectedPerfilId, setSelectedPerfilId] = useState('');
  const [transModalIdx, setTransModalIdx] = useState(null);

  // Load campos disponiveis and output profiles once
  useEffect(() => {
    layoutsApi.camposDisponiveis().then(setCamposDisponiveis).catch(() => {});
    perfisSaidaApi.listar({ apenas_ativos: true }).then((data) => {
      setPerfisSaida(data.items);
      const padrao = data.items.find((p) => p.padrao);
      if (padrao) setSelectedPerfilId(padrao.id);
    }).catch(() => {});
  }, []);

  // Load existing layouts when CNPJ changes
  useEffect(() => {
    const cnpjClean = formData.cnpj.replace(/\D/g, '');
    if (cnpjClean.length === 14) {
      layoutsApi.listar({ cnpj: cnpjClean, apenas_ativos: true }).then((data) => {
        setExistingLayouts(data.items);
        if (data.items.length === 0) {
          setLayoutMode('new');
        }
      }).catch(() => setExistingLayouts([]));
    } else {
      setExistingLayouts([]);
    }
  }, [formData.cnpj]);

  const convertToBase64 = (f) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(f);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
    });

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith('.xls') && !selectedFile.name.endsWith('.xlsx')) {
      setError('Por favor, selecione um arquivo Excel (.xls ou .xlsx)');
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setError(null);
    const b64 = await convertToBase64(selectedFile);
    setFileBase64(b64);
    // Auto-load preview
    loadPreview(b64, newLayout.nome_aba, newLayout.linha_cabecalho, newLayout.linha_inicio_dados);
  };

  const loadPreview = async (b64, nomeAba, linhaCabecalho, linhaInicio) => {
    if (!b64) return;
    setLoadingPreview(true);
    try {
      const data = await layoutsApi.previewExcel({
        arquivo_base64: b64,
        nome_aba: nomeAba || null,
        linha_cabecalho: linhaCabecalho,
        linha_inicio_dados: linhaInicio,
        max_linhas: 5,
      });
      setPreview(data);
      // Auto-generate column mappings if empty
      if (newLayout.colunas.length === 0 && data.cabecalhos.length > 0) {
        setNewLayout((prev) => ({
          ...prev,
          colunas: data.cabecalhos.map((header, idx) => ({
            campo_destino: '',
            coluna_excel: String(idx),
            coluna_nome: header,
            tipo_dado: 'string',
            obrigatorio: false,
            transformacao: {},
          })),
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao carregar prévia');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfigChange = (field, value) => {
    const updated = { ...newLayout, [field]: value };
    setNewLayout(updated);
    // Reload preview with new config
    if (fileBase64) {
      loadPreview(fileBase64, updated.nome_aba, updated.linha_cabecalho, updated.linha_inicio_dados);
    }
  };

  const updateColuna = (idx, field, value) => {
    setNewLayout((prev) => ({
      ...prev,
      colunas: prev.colunas.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !fileBase64) {
      setError('Por favor, selecione um arquivo');
      return;
    }
    const cnpjClean = formData.cnpj.replace(/\D/g, '');
    if (!cnpjClean) {
      setError('Preencha o CNPJ');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let layoutId = null;

      // Create layout if new
      if (layoutMode === 'new') {
        if (!newLayout.nome) {
          setError('Informe o nome do layout');
          setLoading(false);
          return;
        }
        const colunasValidas = newLayout.colunas.filter((c) => c.campo_destino);
        if (colunasValidas.length === 0) {
          setError('Mapeie pelo menos uma coluna');
          setLoading(false);
          return;
        }
        const layoutPayload = {
          cnpj: cnpjClean,
          nome: newLayout.nome,
          config_planilha: {
            nome_aba: newLayout.nome_aba || null,
            linha_cabecalho: newLayout.linha_cabecalho,
            linha_inicio_dados: newLayout.linha_inicio_dados,
          },
          colunas: colunasValidas.map((c) => ({
            campo_destino: c.campo_destino,
            coluna_excel: c.coluna_excel,
            tipo_dado: c.tipo_dado,
            obrigatorio: c.obrigatorio,
            transformacao: c.transformacao || {},
          })),
          regras_conta: newLayout.regras_conta || [],
        };
        const createdLayout = await layoutsApi.criar(layoutPayload);
        layoutId = createdLayout.id;
        toast.success(`Layout "${newLayout.nome}" criado`);
      } else {
        layoutId = selectedLayoutId || null;
      }

      // Create lote
      const payload = {
        cnpj: cnpjClean,
        periodo_mes: parseInt(formData.periodo_mes),
        periodo_ano: parseInt(formData.periodo_ano),
        email_notificacao: formData.email_notificacao || null,
        arquivo_base64: fileBase64,
        nome_arquivo: file.name,
        nome_layout: 'padrao',
        layout_id: layoutId,
        perfil_saida_id: selectedPerfilId || null,
      };

      const response = await lotesApi.criar(payload);
      setSuccess(`Lote criado com sucesso! Protocolo: ${response.protocolo}`);
      setTimeout(() => navigate(`/lotes/${response.id}`), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar lote');
    } finally {
      setLoading(false);
    }
  };

  const meses = [
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' }, { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' },
  ];

  const campoOptions = Object.entries(camposDisponiveis).map(([key, val]) => ({
    value: key,
    label: `${val.label}${val.obrigatorio ? ' *' : ''}`,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="upload-form">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-heading font-bold text-slate-900 tracking-tight">Upload de Lote</h1>
        <p className="mt-1 text-sm text-slate-500">Envie um arquivo Excel e configure como ele será importado</p>
      </div>

      {/* Messages */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-700" data-testid="success-msg">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-md text-red-700" data-testid="error-msg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: File Upload */}
        <section className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="font-heading text-lg font-semibold text-slate-900 mb-4">1. Arquivo Excel</h2>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-slate-900 bg-slate-50' : file ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-300 hover:border-slate-400'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files?.[0]); }}
            data-testid="upload-area"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
              className="hidden"
              data-testid="file-input"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                <div className="text-left">
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); setFileBase64(null); setPreview(null); }} className="p-1 hover:bg-slate-200 rounded">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Arraste o arquivo ou clique para selecionar</p>
                <p className="text-sm text-slate-400 mt-1">Apenas arquivos .xls ou .xlsx</p>
              </div>
            )}
          </div>
        </section>

        {/* Step 2: Lote Info */}
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="font-heading text-lg font-semibold text-slate-900">2. Dados do Lote</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ *</label>
              <input
                name="cnpj"
                placeholder="00000000000000"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value.replace(/\D/g, '') })}
                maxLength={14}
                data-testid="cnpj-input"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Notificação</label>
              <input
                name="email_notificacao"
                type="email"
                placeholder="email@exemplo.com (opcional)"
                value={formData.email_notificacao}
                onChange={(e) => setFormData({ ...formData, email_notificacao: e.target.value })}
                data-testid="email-input"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mês *</label>
              <select
                value={formData.periodo_mes}
                onChange={(e) => setFormData({ ...formData, periodo_mes: e.target.value })}
                data-testid="mes-select"
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
              >
                {meses.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ano *</label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={formData.periodo_ano}
                onChange={(e) => setFormData({ ...formData, periodo_ano: e.target.value })}
                data-testid="ano-input"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              />
            </div>
          </div>
        </section>

        {/* Step 3: Layout Selection */}
        {file && (
          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5" data-testid="layout-section">
            <h2 className="font-heading text-lg font-semibold text-slate-900">3. Layout de Importação</h2>

            {/* Layout Mode Toggle */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer" data-testid="layout-mode-existing">
                <input
                  type="radio"
                  name="layoutMode"
                  value="existing"
                  checked={layoutMode === 'existing'}
                  onChange={() => setLayoutMode('existing')}
                  className="accent-slate-900"
                />
                <span className="text-sm font-medium text-slate-700">Layout existente</span>
                {existingLayouts.length > 0 && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">{existingLayouts.length}</span>
                )}
              </label>
              <label className="flex items-center gap-2 cursor-pointer" data-testid="layout-mode-new">
                <input
                  type="radio"
                  name="layoutMode"
                  value="new"
                  checked={layoutMode === 'new'}
                  onChange={() => setLayoutMode('new')}
                  className="accent-slate-900"
                />
                <span className="text-sm font-medium text-slate-700">Novo layout</span>
              </label>
            </div>

            {/* Existing Layout Selection */}
            {layoutMode === 'existing' && (
              <div>
                {existingLayouts.length === 0 ? (
                  <div className="text-sm text-slate-500 bg-slate-50 rounded-md p-4 border border-slate-200" data-testid="no-layouts-msg">
                    Nenhum layout encontrado para este CNPJ.{' '}
                    <button type="button" onClick={() => setLayoutMode('new')} className="text-slate-900 font-medium underline">
                      Criar novo layout
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedLayoutId}
                    onChange={(e) => setSelectedLayoutId(e.target.value)}
                    data-testid="existing-layout-select"
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                  >
                    <option value="">Selecionar layout...</option>
                    {existingLayouts.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome} ({l.total_colunas} colunas, {l.total_regras} regras)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* New Layout Configuration */}
            {layoutMode === 'new' && (
              <div className="space-y-5">
                {/* Layout name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Layout *</label>
                  <input
                    type="text"
                    value={newLayout.nome}
                    onChange={(e) => setNewLayout({ ...newLayout, nome: e.target.value })}
                    placeholder="Ex: Layout Banco Itaú - Janeiro"
                    data-testid="new-layout-nome"
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                  />
                </div>

                {/* Spreadsheet config */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Configuração da Planilha</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Aba</label>
                      <select
                        value={newLayout.nome_aba}
                        onChange={(e) => handleConfigChange('nome_aba', e.target.value)}
                        data-testid="config-aba-select"
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm focus:ring-2 focus:ring-slate-950"
                      >
                        <option value="">Primeira aba</option>
                        {preview?.abas?.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Linha Cabeçalho</label>
                      <input
                        type="number"
                        value={newLayout.linha_cabecalho}
                        onChange={(e) => handleConfigChange('linha_cabecalho', parseInt(e.target.value) || 0)}
                        min={0}
                        data-testid="config-linha-cabecalho"
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-mono focus:ring-2 focus:ring-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Linha Início Dados</label>
                      <input
                        type="number"
                        value={newLayout.linha_inicio_dados}
                        onChange={(e) => handleConfigChange('linha_inicio_dados', parseInt(e.target.value) || 1)}
                        min={0}
                        data-testid="config-linha-inicio"
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-mono focus:ring-2 focus:ring-slate-950"
                      />
                    </div>
                  </div>
                </div>

                {/* Excel Preview Table */}
                {loadingPreview ? (
                  <div className="flex items-center justify-center py-8 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-sm">Carregando prévia...</span>
                  </div>
                ) : preview ? (
                  <div data-testid="preview-section">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Prévia do Excel
                        <span className="font-normal text-slate-400">({preview.total_linhas} linhas, {preview.total_colunas} colunas)</span>
                      </h3>
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-md">
                      <table className="w-full text-xs" data-testid="preview-table">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-medium text-slate-400 border-b w-8">#</th>
                            {preview.cabecalhos.map((h, i) => (
                              <th key={i} className="px-2 py-1.5 text-left font-medium text-slate-600 border-b whitespace-nowrap max-w-[150px] truncate" title={h}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.linhas.map((row, ri) => (
                            <tr key={ri} className="hover:bg-slate-50/50 border-b border-slate-100">
                              <td className="px-2 py-1 text-slate-300 font-mono">{ri + 1}</td>
                              {row.map((cell, ci) => (
                                <td key={ci} className="px-2 py-1 text-slate-700 whitespace-nowrap max-w-[150px] truncate font-mono" title={String(cell ?? '')}>
                                  {cell !== null ? String(cell) : <span className="text-slate-300">vazio</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {/* Column Mapping */}
                {newLayout.colunas.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Mapeamento de Colunas</h3>
                    <p className="text-xs text-slate-500 mb-3">Para cada coluna do Excel, selecione o campo de destino correspondente. Deixe vazio para ignorar.</p>
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
                        <div className="col-span-1">Idx</div>
                        <div className="col-span-3">Cabeçalho Excel</div>
                        <div className="col-span-3">Campo Destino</div>
                        <div className="col-span-1">Tipo</div>
                        <div className="col-span-2">Amostra</div>
                        <div className="col-span-1">Trans.</div>
                        <div className="col-span-1">Obrig.</div>
                      </div>
                      {newLayout.colunas.map((col, idx) => {
                        const sampleValues = preview?.linhas?.map((row) => row[idx]).filter((v) => v !== null && v !== '') || [];
                        const sampleStr = sampleValues.slice(0, 2).join(', ');
                        return (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-md p-2" data-testid={`map-row-${idx}`}>
                            <div className="col-span-1 text-xs font-mono text-slate-400 text-center">{idx}</div>
                            <div className="col-span-3 text-xs font-mono text-slate-700 truncate" title={col.coluna_nome}>
                              {col.coluna_nome}
                            </div>
                            <div className="col-span-3">
                              <select
                                value={col.campo_destino}
                                onChange={(e) => updateColuna(idx, 'campo_destino', e.target.value)}
                                data-testid={`map-campo-${idx}`}
                                className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs focus:ring-2 focus:ring-slate-950"
                              >
                                <option value="">— Ignorar —</option>
                                {campoOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </div>
                            <div className="col-span-1">
                              <select
                                value={col.tipo_dado}
                                onChange={(e) => updateColuna(idx, 'tipo_dado', e.target.value)}
                                data-testid={`map-tipo-${idx}`}
                                className="h-8 w-full rounded border border-slate-300 bg-white px-1 text-xs focus:ring-2 focus:ring-slate-950"
                              >
                                {TIPO_DADO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </div>
                            <div className="col-span-2 text-xs font-mono text-slate-400 truncate" title={sampleStr}>
                              {sampleStr || '—'}
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <button
                                type="button"
                                onClick={() => setTransModalIdx(idx)}
                                data-testid={`map-trans-${idx}`}
                                className={`p-1 rounded transition-colors ${
                                  col.transformacao && Object.keys(col.transformacao).length > 0
                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'
                                }`}
                                title="Transformações avançadas"
                              >
                                <Settings2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <input
                                type="checkbox"
                                checked={col.obrigatorio}
                                onChange={(e) => updateColuna(idx, 'obrigatorio', e.target.checked)}
                                data-testid={`map-obrig-${idx}`}
                                className="w-3.5 h-3.5 accent-slate-900"
                              />
                            </div>
                          </div>
                        );
                      })}

                      {/* Transformation Modal */}
                      {transModalIdx !== null && (
                        <TransformationConfig
                          transformacao={newLayout.colunas[transModalIdx]?.transformacao || {}}
                          campoDestino={newLayout.colunas[transModalIdx]?.campo_destino || ''}
                          onSave={(trans) => {
                            updateColuna(transModalIdx, 'transformacao', trans);
                            setTransModalIdx(null);
                            toast.success('Transformação configurada');
                          }}
                          onClose={() => setTransModalIdx(null)}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Account Rules */}
                {newLayout.colunas.length > 0 && (
                  <div className="mt-4">
                    <AccountRulesBuilder
                      regras={newLayout.regras_conta}
                      camposDisponiveis={camposDisponiveis}
                      onChange={(regras) => setNewLayout((prev) => ({ ...prev, regras_conta: regras }))}
                    />
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Step 4: Output Profile */}
        {perfisSaida.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-3" data-testid="output-profile-section">
            <h2 className="font-heading text-lg font-semibold text-slate-900">4. Perfil de Saída</h2>
            <p className="text-xs text-slate-500">Formato de exportação do arquivo processado</p>
            <select
              value={selectedPerfilId}
              onChange={(e) => setSelectedPerfilId(e.target.value)}
              data-testid="output-profile-select"
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            >
              <option value="">Usar padrão do sistema</option>
              {perfisSaida.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.formato_nome}){p.padrao ? ' - PADRÃO' : ''}
                </option>
              ))}
            </select>
          </section>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/lotes')}
            disabled={loading}
            className="px-4 py-2 text-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-md font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !file}
            data-testid="submit-btn"
            className="flex items-center gap-2 px-6 py-2 text-sm bg-slate-900 text-white hover:bg-slate-800 rounded-md font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Enviar Lote
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UploadForm;
