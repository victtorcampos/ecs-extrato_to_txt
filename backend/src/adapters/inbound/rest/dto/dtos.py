"""DTOs para a API REST"""
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, EmailStr, Field


class CriarLoteRequest(BaseModel):
    """DTO para criação de lote"""
    cnpj: str = Field(..., description="CNPJ da empresa (14 dígitos)")
    periodo_mes: int = Field(..., ge=1, le=12, description="Mês do período contábil")
    periodo_ano: int = Field(..., ge=2000, le=2100, description="Ano do período contábil")
    email_notificacao: Optional[str] = Field(default=None, description="Email para notificação (opcional)")
    arquivo_base64: str = Field(..., description="Arquivo Excel em base64")
    nome_arquivo: str = Field(..., description="Nome do arquivo original")
    codigo_matriz_filial: str = Field(default="", description="Código da matriz/filial")
    nome_layout: str = Field(default="padrao", description="Nome do layout a ser usado")
    layout_id: Optional[str] = Field(default=None, description="ID do layout de importação a usar")
    perfil_saida_id: Optional[str] = Field(default=None, description="ID do perfil de saída a usar")


class ResolverPendenciasRequest(BaseModel):
    """DTO para resolução de pendências"""
    mapeamentos: Dict[str, str] = Field(
        ..., 
        description="Mapeamentos conta_cliente -> conta_padrao"
    )


class LancamentoResponse(BaseModel):
    """DTO de resposta para lançamento"""
    id: str
    data: Optional[str]
    conta_debito: str
    conta_credito: str
    valor: float
    historico: str
    documento: str
    nome_empresa: str


class PendenciaResponse(BaseModel):
    """DTO de resposta para pendência"""
    id: str
    conta_cliente: str
    tipo: str
    resolvida: bool
    conta_mapeada: Optional[str]
    nome_conta: Optional[str]


class LoteResponse(BaseModel):
    """DTO de resposta para lote"""
    id: str
    protocolo: str
    cnpj: str
    cnpj_formatado: str
    periodo: str
    email_notificacao: str
    nome_layout: str
    layout_id: Optional[str] = None
    perfil_saida_id: Optional[str] = None
    codigo_matriz_filial: str
    status: str
    mensagem_erro: Optional[str]
    nome_arquivo: Optional[str]
    tem_arquivo_saida: bool
    total_lancamentos: int
    valor_total: float
    total_pendencias: int
    pendencias_resolvidas: int
    criado_em: str
    atualizado_em: str
    processado_em: Optional[str]


class LoteDetalhadoResponse(LoteResponse):
    """DTO de resposta para lote com detalhes"""
    lancamentos: List[LancamentoResponse]
    pendencias: List[PendenciaResponse]


class EstatisticasResponse(BaseModel):
    """DTO de resposta para estatísticas"""
    total: int
    por_status: Dict[str, int]


class MensagemResponse(BaseModel):
    """DTO de resposta genérica"""
    mensagem: str
    sucesso: bool = True


# ============================================
# DTOs para Mapeamento de Contas (Account Mappings)
# ============================================

class CriarMapeamentoRequest(BaseModel):
    """DTO para criação de mapeamento"""
    cnpj: str = Field(..., description="CNPJ da empresa (14 dígitos)")
    conta_cliente: str = Field(..., description="Código da conta do cliente")
    conta_padrao: str = Field(..., description="Código da conta padrão")
    nome_conta_cliente: Optional[str] = Field(None, description="Nome da conta do cliente")
    nome_conta_padrao: Optional[str] = Field(None, description="Nome da conta padrão")


class AtualizarMapeamentoRequest(BaseModel):
    """DTO para atualização de mapeamento"""
    conta_padrao: Optional[str] = Field(None, description="Código da conta padrão")
    nome_conta_cliente: Optional[str] = Field(None, description="Nome da conta do cliente")
    nome_conta_padrao: Optional[str] = Field(None, description="Nome da conta padrão")


class AtualizarLoteMapeamentoRequest(BaseModel):
    """DTO para atualização em lote"""
    ids: List[str] = Field(..., description="Lista de IDs dos mapeamentos")
    conta_padrao: str = Field(..., description="Nova conta padrão para todos")


class DeletarLoteMapeamentoRequest(BaseModel):
    """DTO para exclusão em lote"""
    ids: List[str] = Field(..., description="Lista de IDs dos mapeamentos")


class MapeamentoResponse(BaseModel):
    """DTO de resposta para mapeamento"""
    id: str
    cnpj: str
    cnpj_formatado: str
    conta_cliente: str
    conta_padrao: str
    nome_conta_cliente: Optional[str]
    nome_conta_padrao: Optional[str]
    criado_em: str


class MapeamentoListResponse(BaseModel):
    """DTO de resposta para lista de mapeamentos"""
    items: List[MapeamentoResponse]
    total: int
    cnpjs_disponiveis: List[str]


# ============================================
# DTOs para Layouts de Importação Excel
# ============================================

class ColunaLayoutDTO(BaseModel):
    """DTO para coluna de layout"""
    id: Optional[str] = None
    campo_destino: str = Field(..., description="Campo de destino do lançamento")
    coluna_excel: str = Field(..., description="Coluna ou índice no Excel")
    tipo_dado: str = Field(default="string")
    formato: Optional[str] = None
    obrigatorio: bool = False
    valor_padrao: Optional[str] = None
    transformacao: Dict = Field(default_factory=dict, description="Configuração de transformação: formato_numero, valor_com_dc, campo_composto, separador_composto, sinal_valor")


class ConfigPlanilhaDTO(BaseModel):
    """DTO para configuração de planilha"""
    nome_aba: Optional[str] = None
    linha_cabecalho: int = 0
    linha_inicio_dados: int = 1


class ConfigValorDTO(BaseModel):
    """DTO para configuração de valor (D/C)"""
    tipo_sinal: str = "sinal_valor"
    coluna_tipo: Optional[str] = None
    coluna_debito: Optional[str] = None
    coluna_credito: Optional[str] = None
    case_insensitive: bool = True
    mapeamento_tipo: Dict[str, str] = Field(default_factory=lambda: {
        "D": "debito", "C": "credito",
        "d": "debito", "c": "credito",
        "débito": "debito", "crédito": "credito",
        "debito": "debito", "credito": "credito",
        "DÉBITO": "debito", "CRÉDITO": "credito",
        "DEBITO": "debito", "CREDITO": "credito",
    })


class ConfigHistoricoPadraoDTO(BaseModel):
    """DTO para configuração de histórico padrão"""
    template: str = "{documento} - {conta_debito} -> {conta_credito}"
    campos_fallback: List[str] = Field(default_factory=lambda: ["documento", "conta_debito", "conta_credito"])


class CriarLayoutRequest(BaseModel):
    """DTO para criação de layout"""
    cnpj: str = Field(..., description="CNPJ da empresa")
    nome: str = Field(..., description="Nome do layout")
    descricao: Optional[str] = None
    config_planilha: Optional[ConfigPlanilhaDTO] = None
    colunas: Optional[List[ColunaLayoutDTO]] = None
    config_valor: Optional[ConfigValorDTO] = None
    config_historico_padrao: Optional[ConfigHistoricoPadraoDTO] = None


class AtualizarLayoutRequest(BaseModel):
    """DTO para atualização de layout"""
    nome: Optional[str] = None
    descricao: Optional[str] = None
    ativo: Optional[bool] = None
    config_planilha: Optional[ConfigPlanilhaDTO] = None
    colunas: Optional[List[ColunaLayoutDTO]] = None
    config_valor: Optional[ConfigValorDTO] = None
    config_historico_padrao: Optional[ConfigHistoricoPadraoDTO] = None


class ClonarLayoutRequest(BaseModel):
    """DTO para clonagem de layout"""
    novo_cnpj: Optional[str] = None
    novo_nome: Optional[str] = None


class LayoutResponse(BaseModel):
    """DTO de resposta para layout"""
    id: str
    cnpj: str
    nome: str
    descricao: Optional[str]
    ativo: bool
    config_planilha: dict
    colunas: List[dict]
    config_valor: dict
    config_historico_padrao: dict
    total_colunas: int
    total_regras: int = 0
    criado_em: str
    atualizado_em: str


class LayoutListResponse(BaseModel):
    """DTO de resposta para lista de layouts"""
    items: List[LayoutResponse]
    total: int
    cnpjs_disponiveis: List[str]


# ============================================
# DTOs para Regras de Processamento
# ============================================

class CondicaoRegraDTO(BaseModel):
    """DTO para condição de regra"""
    id: Optional[str] = None
    campo: str
    operador: str = "igual"
    valor: Optional[str] = None
    valor_fim: Optional[str] = None
    case_sensitive: bool = False


class AcaoRegraDTO(BaseModel):
    """DTO para ação de regra"""
    tipo_acao: str = "definir_valor"
    campo_destino: Optional[str] = None
    valor: Optional[str] = None
    parametros: Dict = Field(default_factory=dict)


class CriarRegraRequest(BaseModel):
    """DTO para criação de regra"""
    nome: str = Field(..., description="Nome da regra")
    descricao: Optional[str] = None
    tipo: str = Field(default="filtro", description="Tipo da regra: filtro, transformacao, validacao, enriquecimento")
    condicoes: List[CondicaoRegraDTO] = Field(default_factory=list)
    condicoes_ou: Optional[List[CondicaoRegraDTO]] = None
    acao: AcaoRegraDTO
    acoes_extras: Optional[List[AcaoRegraDTO]] = None
    ativo: bool = True


class AtualizarRegraRequest(BaseModel):
    """DTO para atualização de regra"""
    nome: Optional[str] = None
    descricao: Optional[str] = None
    tipo: Optional[str] = None
    condicoes: Optional[List[CondicaoRegraDTO]] = None
    condicoes_ou: Optional[List[CondicaoRegraDTO]] = None
    acao: Optional[AcaoRegraDTO] = None
    acoes_extras: Optional[List[AcaoRegraDTO]] = None
    ativo: Optional[bool] = None


class ReordenarRegrasRequest(BaseModel):
    """DTO para reordenar regras"""
    ordem_ids: List[str] = Field(..., description="IDs na nova ordem")


class RegraResponse(BaseModel):
    """DTO de resposta para regra"""
    id: str
    layout_id: str
    nome: str
    descricao: Optional[str]
    ordem: int
    ativo: bool
    tipo: str
    condicoes: List[dict]
    condicoes_ou: List[dict]
    acao: dict
    acoes_extras: List[dict]
    criado_em: str
    atualizado_em: str


class RegraListResponse(BaseModel):
    """DTO de resposta para lista de regras"""
    items: List[RegraResponse]
    total: int



# ============================================
# DTOs para Preview de Excel
# ============================================

class PreviewExcelRequest(BaseModel):
    """DTO para preview de arquivo Excel"""
    arquivo_base64: str = Field(..., description="Arquivo Excel em base64")
    nome_aba: Optional[str] = Field(default=None, description="Nome da aba a ler")
    linha_cabecalho: int = Field(default=0, ge=0, description="Índice da linha do cabeçalho")
    linha_inicio_dados: int = Field(default=1, ge=0, description="Índice da linha de início dos dados")
    max_linhas: int = Field(default=5, ge=1, le=20, description="Máximo de linhas de prévia")


class PreviewExcelResponse(BaseModel):
    """DTO de resposta para preview de Excel"""
    abas: List[str] = Field(description="Nomes das abas disponíveis")
    aba_selecionada: str = Field(description="Nome da aba selecionada")
    cabecalhos: List[str] = Field(description="Cabeçalhos das colunas")
    linhas: List[List] = Field(description="Linhas de dados (preview)")
    total_linhas: int = Field(description="Total de linhas no arquivo")
    total_colunas: int = Field(description="Total de colunas detectadas")



# ============================================
# DTOs para Perfis de Saída
# ============================================

class ConfigPerfilSaidaDTO(BaseModel):
    """DTO para configuração de perfil de saída"""
    delimitador: str = "|"
    codificacao: str = "ANSI"
    tipo_lancamento_padrao: str = "X"
    codigo_usuario: str = ""
    nome_usuario: str = ""
    codigo_filial: str = ""
    codigo_historico_padrao: str = "0"
    incluir_delimitador_inicio_fim: bool = True


class CriarPerfilSaidaRequest(BaseModel):
    """DTO para criação de perfil de saída"""
    nome: str = Field(..., description="Nome do perfil")
    sistema_destino: str = Field(..., description="Sistema de destino")
    formato: str = Field(..., description="Formato de saída")
    config: Optional[ConfigPerfilSaidaDTO] = None
    descricao: Optional[str] = None
    padrao: bool = False


class AtualizarPerfilSaidaRequest(BaseModel):
    """DTO para atualização de perfil de saída"""
    nome: Optional[str] = None
    descricao: Optional[str] = None
    config: Optional[ConfigPerfilSaidaDTO] = None
    ativo: Optional[bool] = None
    padrao: Optional[bool] = None


class PerfilSaidaResponse(BaseModel):
    """DTO de resposta para perfil de saída"""
    id: str
    nome: str
    sistema_destino: str
    sistema_destino_nome: str
    formato: str
    formato_nome: str
    descricao: Optional[str]
    padrao: bool
    ativo: bool
    config: dict
    criado_em: str
    atualizado_em: str


class PerfilSaidaListResponse(BaseModel):
    """DTO de resposta para lista de perfis de saída"""
    items: List[PerfilSaidaResponse]
    total: int
