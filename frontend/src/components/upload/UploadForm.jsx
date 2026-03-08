import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Label, Select, Spinner } from '../ui';
import { lotesApi } from '../../services/api';

export const UploadForm = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    cnpj: '',
    periodo_mes: new Date().getMonth() + 1,
    periodo_ano: new Date().getFullYear(),
    email_notificacao: '',
    codigo_matriz_filial: '',
    nome_layout: 'padrao',
  });
  
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.xlsx')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Por favor, selecione um arquivo Excel (.xls ou .xlsx)');
        setFile(null);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.xlsx')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Por favor, selecione um arquivo Excel (.xls ou .xlsx)');
      }
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Por favor, selecione um arquivo');
      return;
    }

    if (!formData.cnpj || !formData.email_notificacao) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const arquivo_base64 = await convertToBase64(file);
      
      const payload = {
        ...formData,
        periodo_mes: parseInt(formData.periodo_mes),
        periodo_ano: parseInt(formData.periodo_ano),
        arquivo_base64,
        nome_arquivo: file.name,
      };

      const response = await lotesApi.criar(payload);
      
      setSuccess(`Lote criado com sucesso! Protocolo: ${response.protocolo}`);
      
      setTimeout(() => {
        navigate(`/lotes/${response.id}`);
      }, 2000);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar lote');
    } finally {
      setLoading(false);
    }
  };

  const meses = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8" data-testid="upload-form">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
          Upload de Lote
        </h1>
        <p className="mt-1 text-slate-500">
          Envie um arquivo Excel com lançamentos contábeis para processamento
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-700 animate-fadeIn">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="animate-fadeIn">
        <CardHeader>
          <CardTitle>Dados do Lote</CardTitle>
          <CardDescription>
            Preencha as informações do lote contábil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div className="space-y-2">
              <Label>Arquivo Excel *</Label>
              <div
                className={`upload-area p-8 rounded-lg text-center cursor-pointer ${
                  dragOver ? 'drag-over' : ''
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                data-testid="upload-area"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="file-input"
                />
                
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                    <div className="text-left">
                      <p className="font-medium text-slate-900">{file.name}</p>
                      <p className="text-sm text-slate-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="p-1 hover:bg-slate-200 rounded"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">
                      Arraste o arquivo ou clique para selecionar
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      Apenas arquivos .xls ou .xlsx
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* CNPJ */}
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                name="cnpj"
                placeholder="00.000.000/0000-00"
                value={formData.cnpj}
                onChange={handleInputChange}
                data-testid="cnpj-input"
              />
            </div>

            {/* Período */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodo_mes">Mês *</Label>
                <Select
                  id="periodo_mes"
                  name="periodo_mes"
                  value={formData.periodo_mes}
                  onChange={handleInputChange}
                  data-testid="mes-select"
                >
                  {meses.map((mes) => (
                    <option key={mes.value} value={mes.value}>
                      {mes.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodo_ano">Ano *</Label>
                <Input
                  id="periodo_ano"
                  name="periodo_ano"
                  type="number"
                  min="2000"
                  max="2100"
                  value={formData.periodo_ano}
                  onChange={handleInputChange}
                  data-testid="ano-input"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email_notificacao">Email para Notificação *</Label>
              <Input
                id="email_notificacao"
                name="email_notificacao"
                type="email"
                placeholder="email@exemplo.com"
                value={formData.email_notificacao}
                onChange={handleInputChange}
                data-testid="email-input"
              />
            </div>

            {/* Código Matriz/Filial */}
            <div className="space-y-2">
              <Label htmlFor="codigo_matriz_filial">Código Matriz/Filial</Label>
              <Input
                id="codigo_matriz_filial"
                name="codigo_matriz_filial"
                placeholder="Opcional"
                value={formData.codigo_matriz_filial}
                onChange={handleInputChange}
                data-testid="matriz-input"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/lotes')}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !file}
                data-testid="submit-btn"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="text-white" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Enviar Lote
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadForm;
