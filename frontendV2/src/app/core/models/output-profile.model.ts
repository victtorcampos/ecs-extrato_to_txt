export interface OutputProfile {
  id: string;
  nome: string;
  sistema: string;
  ativo: boolean;
  criado_em: string;
  descricao?: string;
}

export interface OutputProfileListParams {
  ativo?: boolean;
  sistema?: string;
}
