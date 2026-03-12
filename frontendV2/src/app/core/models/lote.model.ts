export type LoteStatus = 'aguardando' | 'processando' | 'pendente' | 'concluido' | 'erro';

export interface Lote {
  id: string;
  protocolo: string;
  cnpj: string;
  cnpj_formatado: string;
  periodo: string;
  nome_layout: string;
  layout_id?: string;
  perfil_saida_id?: string;
  status: LoteStatus;
  mensagem_erro?: string;
  nome_arquivo?: string;
  tem_arquivo_saida: boolean;
  total_lancamentos: number;
  valor_total: number;
  total_pendencias: number;
  pendencias_resolvidas: number;
  criado_em: string;
  atualizado_em: string;
  processado_em?: string;
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
  periodo_mes: number;
  periodo_ano: number;
  arquivo_base64: string;
  nome_arquivo: string;
  layout_id?: string;
  perfil_saida_id?: string;
}
