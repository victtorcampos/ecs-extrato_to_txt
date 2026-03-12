export type TipoRegra = 'filtro' | 'transformacao' | 'validacao' | 'enriquecimento';

export type OperadorCondicao =
  | 'igual' | 'diferente'
  | 'maior' | 'menor' | 'maior_igual' | 'menor_igual' | 'entre'
  | 'contem' | 'nao_contem' | 'comeca_com' | 'termina_com'
  | 'vazio' | 'nao_vazio' | 'regex';

export type TipoAcao =
  | 'excluir' | 'definir_valor' | 'concatenar' | 'substituir'
  | 'maiuscula' | 'minuscula' | 'absoluto';

export type OperadorLogico = 'e' | 'ou';

export interface CondicaoRegra {
  campo: string;
  operador: OperadorCondicao;
  valor?: string;
  valor_fim?: string;             // para operador "entre"
  case_sensitive?: boolean;
  operador_logico?: OperadorLogico;
}

export interface AcaoRegra {
  tipo_acao: TipoAcao;
  campo_destino?: string;
  valor?: string;
  parametros?: Record<string, unknown>;
}

export interface Regra {
  id: string;
  layout_id: string;
  nome: string;
  descricao?: string;
  ordem: number;
  ativo: boolean;
  tipo: TipoRegra;
  condicoes: CondicaoRegra[];
  condicoes_ou?: CondicaoRegra[];
  acao: AcaoRegra;
  acoes_extras?: AcaoRegra[];
  criado_em: string;
  atualizado_em?: string;
}

export interface RegraCreateRequest {
  nome: string;
  descricao?: string;
  tipo: TipoRegra;
  condicoes: CondicaoRegra[];
  condicoes_ou?: CondicaoRegra[];
  acao: AcaoRegra;
  acoes_extras?: AcaoRegra[];
}

export interface RegraListResponse {
  items: Regra[];
  total: number;
}

export const OPERADOR_LABELS: Record<OperadorCondicao, string> = {
  igual:        'igual a',
  diferente:    'diferente de',
  maior:        'maior que',
  menor:        'menor que',
  maior_igual:  'maior ou igual a',
  menor_igual:  'menor ou igual a',
  entre:        'entre',
  contem:       'contém',
  nao_contem:   'não contém',
  comeca_com:   'começa com',
  termina_com:  'termina com',
  vazio:        'está vazio',
  nao_vazio:    'não está vazio',
  regex:        'regex',
};

export const TIPO_ACAO_LABELS: Record<TipoAcao, string> = {
  excluir:        'Excluir lançamento',
  definir_valor:  'Definir valor',
  concatenar:     'Concatenar',
  substituir:     'Substituir texto',
  maiuscula:      'Converter para maiúscula',
  minuscula:      'Converter para minúscula',
  absoluto:       'Valor absoluto',
};

export const TIPO_REGRA_LABELS: Record<TipoRegra, string> = {
  filtro:         'Filtro',
  transformacao:  'Transformação',
  validacao:      'Validação',
  enriquecimento: 'Enriquecimento',
};
