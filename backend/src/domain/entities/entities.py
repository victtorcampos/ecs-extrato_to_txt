"""Entidades de Domínio"""
from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Optional, List
from uuid import uuid4


class TipoLancamento(str, Enum):
    """Tipos de lançamento no formato Domínio Sistemas"""
    X = "X"  # 1 débito / 1 crédito
    D = "D"  # 1 débito / N créditos
    C = "C"  # N débitos / 1 crédito
    V = "V"  # N débitos / N créditos balanceados


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
    
    # Campos de agrupamento (para tipos D/C/V)
    tipo_lancamento: str = TipoLancamento.X  # Tipo de lançamento (X, D, C ou V)
    grupo_id: Optional[str] = None  # UUID de grupo para lançamentos D/C/V
    
    def esta_no_periodo(self, mes: int, ano: int) -> bool:
        """Verifica se o lançamento pertence ao período"""
        return self.data.month == mes and self.data.year == ano

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "data": self.data.isoformat() if self.data else None,
            "conta_debito": self.conta_debito,
            "conta_credito": self.conta_credito,
            "valor": self.valor,
            "historico": self.historico,
            "documento": self.documento,
            "codigo_historico": self.codigo_historico,
            "nome_empresa": self.nome_empresa,
            "conta_debito_mapeada": self.conta_debito_mapeada,
            "conta_credito_mapeada": self.conta_credito_mapeada,
            "unidade_negocio": self.unidade_negocio,
            "fantasia": self.fantasia,
            "fato_contabil": self.fato_contabil,
            "empresa": self.empresa,
            "tipo_lancamento": self.tipo_lancamento if isinstance(self.tipo_lancamento, str) else (self.tipo_lancamento.value if self.tipo_lancamento else "X"),
            "grupo_id": self.grupo_id,
        }

    @staticmethod
    def from_dict(d: dict) -> 'Lancamento':
        data = None
        if d.get("data"):
            data = date.fromisoformat(d["data"])
        return Lancamento(
            id=d.get("id", ""),
            data=data,
            conta_debito=d.get("conta_debito", ""),
            conta_credito=d.get("conta_credito", ""),
            valor=d.get("valor", 0.0),
            historico=d.get("historico", ""),
            documento=d.get("documento", ""),
            codigo_historico=d.get("codigo_historico", 0),
            nome_empresa=d.get("nome_empresa", ""),
            conta_debito_mapeada=d.get("conta_debito_mapeada"),
            conta_credito_mapeada=d.get("conta_credito_mapeada"),
            unidade_negocio=d.get("unidade_negocio", ""),
            fantasia=d.get("fantasia", ""),
            fato_contabil=d.get("fato_contabil", ""),
            empresa=d.get("empresa", ""),
            tipo_lancamento=d.get("tipo_lancamento", "X"),
            grupo_id=d.get("grupo_id"),
        )


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

    nome_arquivo: Optional[str] = None

    # Caminhos para armazenamento em disco
    caminho_arquivo_original: Optional[str] = None
    caminho_arquivo_saida: Optional[str] = None
    
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
    layout_id: Optional[str] = None
    criado_em: datetime = field(default_factory=datetime.now)
