export interface AccountMapping {
  id: string;
  cnpj: string;
  cnpj_formatado: string;
  conta_cliente: string;
  conta_padrao: string;
  nome_conta_cliente?: string;
  nome_conta_padrao?: string;
  criado_em: string;
}

export interface AccountMappingListParams {
  cnpj?: string;
}
