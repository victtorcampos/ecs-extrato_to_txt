import React, { useRef } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { Button, Input } from '../ui';
import { cn } from '../../lib/utils';

export const StepUpload = ({ formData, setFormData, file, setFile, setFileBase64, perfisSaida = [], onNext }) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    const ext = selected.name.split('.').pop().toLowerCase();
    if (!['xls', 'xlsx'].includes(ext)) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = () => setFileBase64(reader.result.split(',')[1]);
    reader.readAsDataURL(selected);
  };

  const canProceed = file && formData.cnpj.replace(/\D/g, '').length >= 11 && formData.periodo_mes && formData.periodo_ano;

  return (
    <div className="max-w-xl mx-auto space-y-6" data-testid="step-upload">
      {/* File dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
          file ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 hover:border-slate-400 bg-slate-50/50'
        )}
        data-testid="file-dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="file-input"
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
            <div className="text-left">
              <p className="font-semibold text-slate-900">{file.name}</p>
              <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setFileBase64(null); }}
              className="ml-4 p-1 rounded hover:bg-slate-200"
              data-testid="remove-file-btn"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Clique para selecionar arquivo Excel (.xls, .xlsx)</p>
          </>
        )}
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">CNPJ *</label>
          <Input
            placeholder="00.000.000/0000-00"
            value={formData.cnpj}
            onChange={(e) => setFormData(p => ({ ...p, cnpj: e.target.value }))}
            data-testid="cnpj-input"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mês *</label>
            <select
              className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={formData.periodo_mes}
              onChange={(e) => setFormData(p => ({ ...p, periodo_mes: parseInt(e.target.value) }))}
              data-testid="month-select"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{String(i + 1).padStart(2, '0')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ano *</label>
            <Input
              type="number"
              min="2000"
              max="2100"
              value={formData.periodo_ano}
              onChange={(e) => setFormData(p => ({ ...p, periodo_ano: parseInt(e.target.value) }))}
              data-testid="year-input"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email notificação</label>
          <Input
            type="email"
            placeholder="email@empresa.com"
            value={formData.email_notificacao}
            onChange={(e) => setFormData(p => ({ ...p, email_notificacao: e.target.value }))}
            data-testid="email-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Perfil de Saída</label>
          <select
            className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={formData.perfil_saida_id}
            onChange={(e) => setFormData(p => ({ ...p, perfil_saida_id: e.target.value }))}
            data-testid="perfil-saida-select"
          >
            <option value="">Padrão (TXT)</option>
            {perfisSaida.map(p => (
              <option key={p.id} value={p.id}>{p.nome}{p.padrao ? ' (Padrão)' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canProceed} data-testid="next-step-btn">
          Detectar Layout
        </Button>
      </div>
    </div>
  );
};

export default StepUpload;
