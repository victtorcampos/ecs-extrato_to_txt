export interface ImportLayout {
  id: string;
  nome: string;
  cnpj: string;
  ativo: boolean;
  criado_em: string;
  descricao?: string;
  mapeamento_colunas?: Record<string, string>;
}

export interface ImportLayoutListParams {
  cnpj?: string;
  ativo?: boolean;
}
