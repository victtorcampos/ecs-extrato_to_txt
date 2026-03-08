"""DTOs para a API REST"""
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, EmailStr, Field


class CriarLoteRequest(BaseModel):
    """DTO para criação de lote"""
    cnpj: str = Field(..., description="CNPJ da empresa (14 dígitos)")
    periodo_mes: int = Field(..., ge=1, le=12, description="Mês do período contábil")
    periodo_ano: int = Field(..., ge=2000, le=2100, description="Ano do período contábil")
    email_notificacao: EmailStr = Field(..., description="Email para notificação")
    arquivo_base64: str = Field(..., description="Arquivo Excel em base64")
    nome_arquivo: str = Field(..., description="Nome do arquivo original")
    codigo_matriz_filial: str = Field(default="", description="Código da matriz/filial")
    nome_layout: str = Field(default="padrao", description="Nome do layout a ser usado")


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

