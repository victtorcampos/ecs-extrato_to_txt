import type { User } from '@/features/auth/services/schemas'
import type { ImportLayoutCompleto } from '@/features/import-layout/services/schemas'
import type { OutputProfile } from '@/features/output-layout/services/schemas'
import type { Lote } from '@/features/lotes/services/schemas'
import type { AccountMapping } from '@/features/mapeamento/services/schemas'
import type { Regra } from '@/features/regras/services/schemas'

export const SEED_USERS: User[] = [
  { id: 'u1', nome: 'Admin ECS', email: 'admin@ecs.com', papel: 'admin', ativo: true, criado_em: '2025-01-01T00:00:00Z' },
  { id: 'u2', nome: 'Operador 01', email: 'operador@ecs.com', papel: 'operador', ativo: true, criado_em: '2025-02-01T00:00:00Z' },
  { id: 'u3', nome: 'Visualizador', email: 'view@ecs.com', papel: 'visualizador', ativo: true, criado_em: '2025-03-01T00:00:00Z' },
  { id: 'u4', nome: 'Operador 02', email: 'op2@ecs.com', papel: 'operador', ativo: false, criado_em: '2025-04-01T00:00:00Z' },
  { id: 'u5', nome: 'Admin 02', email: 'admin2@ecs.com', papel: 'admin', ativo: true, criado_em: '2025-05-01T00:00:00Z' },
]

export const SEED_CREDENTIALS: Record<string, string> = {
  'admin@ecs.com':    'admin123',
  'operador@ecs.com': 'op123',
  'view@ecs.com':     'view123',
  'op2@ecs.com':      'op123',
  'admin2@ecs.com':   'admin123',
}

export const SEED_CNPJS = [
  { cnpj: '12345678000190', label: 'Empresa Alpha Ltda' },
  { cnpj: '98765432000154', label: 'Beta Comércio SA' },
  { cnpj: '11222333000181', label: 'Gama Serviços ME' },
]

export const SEED_IMPORT_LAYOUTS: ImportLayoutCompleto[] = [
  {
    id: 'il1', nome: 'Bradesco PJ - Padrão', cnpj: '12345678000190',
    ativo: true, criado_em: '2025-06-01T00:00:00Z',
    descricao: 'Layout padrão para extrato Bradesco',
    config_planilha: { linha_cabecalho: 0, linha_inicio_dados: 1, nome_aba: 'Extrato' },
    colunas: [
      { coluna_excel: 'A', campo_destino: 'data', tipo_dado: 'date', formato: 'DD/MM/YYYY', obrigatorio: true },
      { coluna_excel: 'B', campo_destino: 'historico', tipo_dado: 'string', obrigatorio: false },
      { coluna_excel: 'C', campo_destino: 'valor', tipo_dado: 'decimal', obrigatorio: true },
    ],
  },
  {
    id: 'il2', nome: 'Itaú - Conta Corrente', cnpj: '12345678000190',
    ativo: true, criado_em: '2025-07-01T00:00:00Z',
    config_planilha: { linha_cabecalho: 2, linha_inicio_dados: 3 },
    colunas: [
      { coluna_excel: 'A', campo_destino: 'data', tipo_dado: 'date', formato: 'DD/MM/YYYY', obrigatorio: true },
      { coluna_excel: 'D', campo_destino: 'valor', tipo_dado: 'decimal', obrigatorio: true },
    ],
  },
  {
    id: 'il3', nome: 'Santander Empresas', cnpj: '98765432000154',
    ativo: true, criado_em: '2025-08-01T00:00:00Z',
    config_planilha: { linha_cabecalho: 0, linha_inicio_dados: 1 },
    colunas: [],
  },
  {
    id: 'il4', nome: 'Caixa (descontinuado)', cnpj: '12345678000190',
    ativo: false, criado_em: '2024-01-01T00:00:00Z',
    config_planilha: { linha_cabecalho: 0, linha_inicio_dados: 1 },
    colunas: [],
  },
]

export const SEED_REGRAS: Regra[] = [
  {
    id: 'r1', layout_id: 'il1', nome: 'Excluir saldo anterior', ordem: 1, ativo: true,
    tipo: 'filtro', criado_em: '2025-06-10T00:00:00Z',
    condicoes: [{ campo: 'historico', operador: 'contem', valor: 'SALDO ANTERIOR' }],
    acao: { tipo_acao: 'excluir' },
  },
  {
    id: 'r2', layout_id: 'il1', nome: 'Maiúscula no histórico', ordem: 2, ativo: true,
    tipo: 'transformacao', criado_em: '2025-06-11T00:00:00Z',
    condicoes: [],
    acao: { tipo_acao: 'maiuscula', campo_destino: 'historico' },
  },
  {
    id: 'r3', layout_id: 'il1', nome: 'Valor absoluto', ordem: 3, ativo: false,
    tipo: 'transformacao', criado_em: '2025-06-12T00:00:00Z',
    condicoes: [],
    acao: { tipo_acao: 'absoluto', campo_destino: 'valor' },
  },
  {
    id: 'r4', layout_id: 'il2', nome: 'Filtrar TED recebida', ordem: 1, ativo: true,
    tipo: 'filtro', criado_em: '2025-07-10T00:00:00Z',
    condicoes: [{ campo: 'historico', operador: 'comeca_com', valor: 'TED' }],
    acao: { tipo_acao: 'excluir' },
  },
  {
    id: 'r5', layout_id: 'il2', nome: 'Definir conta padrão', ordem: 2, ativo: true,
    tipo: 'enriquecimento', criado_em: '2025-07-11T00:00:00Z',
    condicoes: [{ campo: 'conta_debito', operador: 'vazio' }],
    acao: { tipo_acao: 'definir_valor', campo_destino: 'conta_debito', valor: '1.1.1.01' },
  },
  {
    id: 'r6', layout_id: 'il3', nome: 'Validar valor positivo', ordem: 1, ativo: true,
    tipo: 'validacao', criado_em: '2025-08-10T00:00:00Z',
    condicoes: [{ campo: 'valor', operador: 'menor', valor: '0' }],
    acao: { tipo_acao: 'excluir' },
  },
]

export const SEED_OUTPUT_PROFILES: OutputProfile[] = [
  {
    id: 'op1', nome: 'Domínio Padrão', sistema_destino: 'dominio', sistema_destino_nome: 'Domínio Sistemas',
    formato: 'txt_dominio', formato_nome: 'TXT Domínio', ativo: true, padrao: true,
    config: {}, criado_em: '2025-01-01T00:00:00Z', atualizado_em: '2025-01-01T00:00:00Z',
    descricao: 'Perfil padrão para exportação Domínio',
  },
  {
    id: 'op2', nome: 'SPED ECD', sistema_destino: 'sped', sistema_destino_nome: 'SPED Contábil',
    formato: 'sped_ecd', formato_nome: 'SPED ECD', ativo: true, padrao: false,
    config: {}, criado_em: '2025-02-01T00:00:00Z', atualizado_em: '2025-02-01T00:00:00Z',
  },
  {
    id: 'op3', nome: 'CSV Backup', sistema_destino: 'csv_generico', sistema_destino_nome: 'CSV Genérico',
    formato: 'csv_padrao', formato_nome: 'CSV Padrão', ativo: false, padrao: false,
    config: {}, criado_em: '2025-03-01T00:00:00Z', atualizado_em: '2025-03-01T00:00:00Z',
  },
]

export const SEED_LOTES: Lote[] = [
  {
    id: 'l1', protocolo: 'ECS-2025-001', cnpj: '12345678000190', cnpj_formatado: '12.345.678/0001-90',
    periodo: '2025-01', nome_layout: 'Bradesco PJ - Padrão', layout_id: 'il1', perfil_saida_id: 'op1',
    status: 'concluido', nome_arquivo: 'extrato_jan_2025.xlsx', tem_arquivo_saida: true,
    total_lancamentos: 152, valor_total: 48320.5, total_pendencias: 0, pendencias_resolvidas: 0,
    criado_em: '2025-01-15T08:00:00Z', atualizado_em: '2025-01-15T08:30:00Z', processado_em: '2025-01-15T08:30:00Z',
  },
  {
    id: 'l2', protocolo: 'ECS-2025-002', cnpj: '12345678000190', cnpj_formatado: '12.345.678/0001-90',
    periodo: '2025-02', nome_layout: 'Bradesco PJ - Padrão', layout_id: 'il1',
    status: 'pendente', nome_arquivo: 'extrato_fev_2025.xlsx', tem_arquivo_saida: false,
    total_lancamentos: 98, valor_total: 32100.0, total_pendencias: 5, pendencias_resolvidas: 2,
    criado_em: '2025-02-10T09:00:00Z', atualizado_em: '2025-02-10T09:05:00Z',
  },
  {
    id: 'l3', protocolo: 'ECS-2025-003', cnpj: '98765432000154', cnpj_formatado: '98.765.432/0001-54',
    periodo: '2025-01', nome_layout: 'Santander Empresas', layout_id: 'il3',
    status: 'erro', nome_arquivo: 'santander_jan.xlsx', tem_arquivo_saida: false,
    total_lancamentos: 0, valor_total: 0, total_pendencias: 0, pendencias_resolvidas: 0,
    mensagem_erro: 'Coluna "data" não encontrada na planilha.',
    criado_em: '2025-01-20T10:00:00Z', atualizado_em: '2025-01-20T10:02:00Z',
  },
  {
    id: 'l4', protocolo: 'ECS-2025-004', cnpj: '12345678000190', cnpj_formatado: '12.345.678/0001-90',
    periodo: '2025-03', nome_layout: 'Bradesco PJ - Padrão', layout_id: 'il1', perfil_saida_id: 'op1',
    status: 'processando', nome_arquivo: 'extrato_mar_2025.xlsx', tem_arquivo_saida: false,
    total_lancamentos: 0, valor_total: 0, total_pendencias: 0, pendencias_resolvidas: 0,
    criado_em: '2025-03-05T14:00:00Z', atualizado_em: '2025-03-05T14:01:00Z',
  },
  {
    id: 'l5', protocolo: 'ECS-2025-005', cnpj: '12345678000190', cnpj_formatado: '12.345.678/0001-90',
    periodo: '2025-04', nome_layout: 'Itaú - Conta Corrente', layout_id: 'il2',
    status: 'aguardando', nome_arquivo: 'itau_abr_2025.xlsx', tem_arquivo_saida: false,
    total_lancamentos: 0, valor_total: 0, total_pendencias: 0, pendencias_resolvidas: 0,
    criado_em: '2025-04-01T07:00:00Z', atualizado_em: '2025-04-01T07:00:00Z',
  },
]

export const SEED_ACCOUNT_MAPPINGS: AccountMapping[] = [
  { id: 'am1', cnpj: '12345678000190', cnpj_formatado: '12.345.678/0001-90', conta_cliente: 'RECEITA VENDAS', conta_padrao: '3.1.1.01', criado_em: '2025-01-01T00:00:00Z' },
  { id: 'am2', cnpj: '12345678000190', cnpj_formatado: '12.345.678/0001-90', conta_cliente: 'PAGTO FORNECEDOR', conta_padrao: '2.1.1.01', criado_em: '2025-01-01T00:00:00Z' },
  { id: 'am3', cnpj: '12345678000190', cnpj_formatado: '12.345.678/0001-90', conta_cliente: 'TARIFA BANCARIA', conta_padrao: '4.1.2.05', criado_em: '2025-01-02T00:00:00Z' },
  { id: 'am4', cnpj: '12345678000190', cnpj_formatado: '12.345.678/0001-90', conta_cliente: 'FOLHA PAGAMENTO', conta_padrao: '4.1.1.01', criado_em: '2025-01-03T00:00:00Z' },
  { id: 'am5', cnpj: '98765432000154', cnpj_formatado: '98.765.432/0001-54', conta_cliente: 'VENDAS À VISTA', conta_padrao: '3.1.1.01', criado_em: '2025-02-01T00:00:00Z' },
]
