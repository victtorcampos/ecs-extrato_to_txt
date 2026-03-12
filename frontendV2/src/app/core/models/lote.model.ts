export type LoteStatus = 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO';

export interface Lote {
  id: string;
  protocolo: string;
  cnpj: string;
  status: LoteStatus;
  criado_em: string;
  atualizado_em?: string;
  arquivo_nome?: string;
  import_layout_id?: string;
  output_profile_id?: string;
  total_registros?: number;
  registros_processados?: number;
  registros_erro?: number;
}

export interface LoteEstatisticas {
  total: number;
  concluidos: number;
  pendentes: number;
  processando: number;
}

export interface LoteListParams {
  cnpj?: string;
  status?: LoteStatus;
  page?: number;
  page_size?: number;
}

export interface LoteCreateRequest {
  cnpj: string;
  import_layout_id: string;
  output_profile_id: string;
  arquivo: File;
}
