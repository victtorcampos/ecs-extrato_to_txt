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

