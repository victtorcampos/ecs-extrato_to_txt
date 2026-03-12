export interface OutputProfile {
  id: string;
  nome: string;
  sistema_destino: string;
  sistema_destino_nome: string;
  formato: string;
  formato_nome: string;
  ativo: boolean;
  padrao: boolean;
  config: Record<string, unknown>;
  criado_em: string;
  atualizado_em: string;
  descricao?: string;
}

export interface OutputProfileListParams {
  apenas_ativos?: boolean;
  sistema?: string;
}

export interface OutputSistema {
  value: string;
  nome: string;
  descricao: string;
  formatos: Array<{ value: string; nome: string; extensao: string }>;
}
