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
