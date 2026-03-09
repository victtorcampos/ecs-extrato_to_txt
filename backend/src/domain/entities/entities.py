"""Entidades de Domínio"""
from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Optional, List
from uuid import uuid4


class StatusLote(str, Enum):
    """Status possíveis de um lote"""
    AGUARDANDO = "aguardando"
    PROCESSANDO = "processando"
    PENDENTE = "pendente"
    CONCLUIDO = "concluido"
    ERRO = "erro"


@dataclass
class Lancamento:
    """Entidade de Lançamento Contábil"""
    id: str = field(default_factory=lambda: str(uuid4()))
    data: date = None
    conta_debito: str = ""
    conta_credito: str = ""
    valor: float = 0.0
    historico: str = ""
    documento: str = ""
    codigo_historico: int = 0
    nome_empresa: str = ""
    
    # Campos de mapeamento (após processamento)
    conta_debito_mapeada: Optional[str] = None
    conta_credito_mapeada: Optional[str] = None
    
    # Campos adicionais do Excel
    unidade_negocio: str = ""
    fantasia: str = ""
    fato_contabil: str = ""
    empresa: str = ""
    
    def esta_no_periodo(self, mes: int, ano: int) -> bool:
        """Verifica se o lançamento pertence ao período"""
        return self.data.month == mes and self.data.year == ano


@dataclass
class PendenciaMapeamento:
    """Representa uma conta pendente de mapeamento"""
    id: str = field(default_factory=lambda: str(uuid4()))
    conta_cliente: str = ""
    tipo: str = "debito"  # debito ou credito
    resolvida: bool = False
    conta_mapeada: Optional[str] = None
    nome_conta: Optional[str] = None


@dataclass 
class Lote:
    """Entidade Agregadora de um Lote Contábil"""
    id: str = field(default_factory=lambda: str(uuid4()))
    protocolo: str = ""
    cnpj: str = ""
    periodo_mes: int = 1
    periodo_ano: int = 2026
    email_notificacao: str = ""
    nome_layout: str = "padrao"
    layout_id: Optional[str] = None
    perfil_saida_id: Optional[str] = None
    codigo_matriz_filial: str = ""
    
    status: StatusLote = StatusLote.AGUARDANDO
    mensagem_erro: Optional[str] = None
    
    # Arquivo original (base64)
    arquivo_original: Optional[str] = None
    nome_arquivo: Optional[str] = None
    
    # Arquivo processado (base64)
    arquivo_saida: Optional[str] = None
    
    # Lançamentos
    lancamentos: List[Lancamento] = field(default_factory=list)
    
    # Pendências
    pendencias: List[PendenciaMapeamento] = field(default_factory=list)
    
    # Timestamps
    criado_em: datetime = field(default_factory=datetime.now)
    atualizado_em: datetime = field(default_factory=datetime.now)
    processado_em: Optional[datetime] = None
    
    @property
    def total_lancamentos(self) -> int:
        return len(self.lancamentos)
    
    @property
    def valor_total(self) -> float:
        return sum(l.valor for l in self.lancamentos)
    
    @property
    def tem_pendencias(self) -> bool:
        return any(not p.resolvida for p in self.pendencias)
    
    @property
    def pendencias_nao_resolvidas(self) -> List[PendenciaMapeamento]:
        return [p for p in self.pendencias if not p.resolvida]
    
    def adicionar_lancamento(self, lancamento: Lancamento):
        self.lancamentos.append(lancamento)
    
    def adicionar_pendencia(self, pendencia: PendenciaMapeamento):
        self.pendencias.append(pendencia)
    
    def resolver_pendencia(self, conta_cliente: str, conta_mapeada: str):
        for p in self.pendencias:
            if p.conta_cliente == conta_cliente and not p.resolvida:
                p.resolvida = True
                p.conta_mapeada = conta_mapeada
        self.atualizado_em = datetime.now()


@dataclass
class MapeamentoConta:
    """Entidade para mapeamento de contas"""
    id: str = field(default_factory=lambda: str(uuid4()))
    cnpj: str = ""
    conta_cliente: str = ""
    conta_padrao: str = ""
    nome_conta_cliente: Optional[str] = None
    nome_conta_padrao: Optional[str] = None
    criado_em: datetime = field(default_factory=datetime.now)
