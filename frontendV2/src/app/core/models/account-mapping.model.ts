export interface AccountMapping {
  id: string;
  cnpj: string;
  conta_origem: string;
  conta_destino: string;
  descricao?: string;
  criado_em: string;
}

export interface AccountMappingListParams {
  cnpj?: string;
}
