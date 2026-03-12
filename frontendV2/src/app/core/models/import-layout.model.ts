export interface ImportLayout {
  id: string;
  nome: string;
  cnpj: string;
  ativo: boolean;
  criado_em: string;
  descricao?: string;
}

export interface ImportLayoutListParams {
  cnpj?: string;
  apenas_ativos?: boolean;
}

// ---- Configuração detalhada de layout ----

export type TipoDado = 'string' | 'decimal' | 'date' | 'integer';

export interface ConfigPlanilha {
  nome_aba?: string;
  linha_cabecalho: number;   // 0-indexed
  linha_inicio_dados: number; // 0-indexed
}

export interface ColunaLayout {
  coluna_excel: string;       // ex: "A", "B"
  campo_destino: string;      // ex: "data", "valor"
  tipo_dado: TipoDado;
  formato?: string;           // ex: "DD/MM/YYYY"
  obrigatorio?: boolean;
  valor_padrao?: string;
  transformacao?: Record<string, unknown>;
}

export interface ImportLayoutCompleto extends ImportLayout {
  config_planilha?: ConfigPlanilha;
  colunas?: ColunaLayout[];
}

// ---- Preview Excel ----

export interface PreviewExcelRequest {
  arquivo_base64: string;
  nome_aba?: string;
  linha_cabecalho?: number;
  linha_inicio_dados?: number;
  max_linhas?: number;
}

export interface PreviewExcelResponse {
  abas: string[];
  aba_selecionada: string;
  cabecalhos: string[];
  linhas: unknown[][];   // List[List] — cada linha é array de valores
  total_linhas: number;
  total_colunas: number;
}

// ---- Detect Layout ----

export interface DetectarLayoutRequest {
  arquivo_base64: string;
  nome_aba?: string;
}

export interface ColunaSugerida {
  coluna_excel: string;
  nome_cabecalho: string;
  campo_destino: string;
  tipo_dado: string;
  formato?: string;
  confianca: number;
  valores_amostra: unknown[];
}

export interface DetectarLayoutResponse {
  config_planilha: ConfigPlanilha;
  colunas: ColunaSugerida[];
  config_valor: Record<string, unknown>;
  templates_regras: unknown[];
  preview_dados: unknown[][];
  abas: string[];
}

// ---- Test Parse ----

export interface TestParseRequest {
  arquivo_base64: string;
  layout_id?: string;
  layout_config?: Record<string, unknown>;
  periodo_mes: number;
  periodo_ano: number;
  regras_conta?: unknown[];
  mapeamentos_manuais?: Record<string, string>;
  cnpj?: string;
}

export interface LancamentoPreview {
  linha: number;
  data?: string;
  valor: number;
  conta_debito: string;
  conta_credito: string;
  historico: string;
  documento: string;
  status: string;
  mensagem?: string;
}

export interface ResumoTestParse {
  total: number;
  ok: number;
  fora_periodo: number;
  sem_conta: number;
  erros: number;
}

export interface ErroTestParse {
  linha: number;
  campo: string;
  mensagem: string;
}

export interface ContaPendente {
  conta: string;
  tipo: string;
  mapeamento_existente?: string;
}

export interface TestParseResponse {
  lancamentos: LancamentoPreview[];
  resumo: ResumoTestParse;
  erros: ErroTestParse[];
  contas_pendentes: ContaPendente[];
}

// ---- Campos disponíveis ----

export interface CampoDisponivelInfo {
  label: string;
  tipo: string;
  obrigatorio: boolean;
}

// Resposta: Record<string (campo_destino), CampoDisponivelInfo>
export type CamposDisponiveisResponse = Record<string, CampoDisponivelInfo>;
