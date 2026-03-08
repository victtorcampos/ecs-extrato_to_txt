"""Entidades de Domínio para Regras de Processamento"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import uuid4

from ..value_objects.layout_value_objects import TipoRegra, OperadorCondicao, TipoAcao


@dataclass
class CondicaoRegra:
    """Condição para aplicar uma regra"""
    id: str = field(default_factory=lambda: str(uuid4()))
    campo: str = ""                     # Campo do lançamento
    operador: OperadorCondicao = OperadorCondicao.IGUAL
    valor: Any = None                   # Valor para comparar
    valor_fim: Any = None               # Valor fim (para ENTRE)
    case_sensitive: bool = False
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "campo": self.campo,
            "operador": self.operador.value if isinstance(self.operador, OperadorCondicao) else self.operador,
            "valor": self.valor,
            "valor_fim": self.valor_fim,
            "case_sensitive": self.case_sensitive
        }
    
    @staticmethod
    def from_dict(data: dict) -> 'CondicaoRegra':
        return CondicaoRegra(
            id=data.get("id", str(uuid4())),
            campo=data.get("campo", ""),
            operador=OperadorCondicao(data.get("operador", "igual")),
            valor=data.get("valor"),
            valor_fim=data.get("valor_fim"),
            case_sensitive=data.get("case_sensitive", False)
        )
    
    def avaliar(self, valor_campo: Any) -> bool:
        """Avalia a condição contra um valor"""
        valor_comparar = self.valor
        
        # Normalizar para case insensitive
        if not self.case_sensitive and isinstance(valor_campo, str):
            valor_campo = valor_campo.lower()
            if isinstance(valor_comparar, str):
                valor_comparar = valor_comparar.lower()
        
        if self.operador == OperadorCondicao.IGUAL:
            return valor_campo == valor_comparar
        elif self.operador == OperadorCondicao.DIFERENTE:
            return valor_campo != valor_comparar
        elif self.operador == OperadorCondicao.MAIOR:
            return float(valor_campo or 0) > float(valor_comparar or 0)
        elif self.operador == OperadorCondicao.MENOR:
            return float(valor_campo or 0) < float(valor_comparar or 0)
        elif self.operador == OperadorCondicao.MAIOR_IGUAL:
            return float(valor_campo or 0) >= float(valor_comparar or 0)
        elif self.operador == OperadorCondicao.MENOR_IGUAL:
            return float(valor_campo or 0) <= float(valor_comparar or 0)
        elif self.operador == OperadorCondicao.ENTRE:
            v = float(valor_campo or 0)
            return float(valor_comparar or 0) <= v <= float(self.valor_fim or 0)
        elif self.operador == OperadorCondicao.CONTEM:
            return str(valor_comparar or "") in str(valor_campo or "")
        elif self.operador == OperadorCondicao.NAO_CONTEM:
            return str(valor_comparar or "") not in str(valor_campo or "")
        elif self.operador == OperadorCondicao.COMECA_COM:
            return str(valor_campo or "").startswith(str(valor_comparar or ""))
        elif self.operador == OperadorCondicao.TERMINA_COM:
            return str(valor_campo or "").endswith(str(valor_comparar or ""))
        elif self.operador == OperadorCondicao.VAZIO:
            return valor_campo is None or valor_campo == "" or valor_campo == 0
        elif self.operador == OperadorCondicao.NAO_VAZIO:
            return valor_campo is not None and valor_campo != "" and valor_campo != 0
        elif self.operador == OperadorCondicao.REGEX:
            import re
            try:
                return bool(re.match(str(valor_comparar or ""), str(valor_campo or "")))
            except:
                return False
        
        return False


@dataclass
class AcaoRegra:
    """Ação a executar quando condição for verdadeira"""
    tipo_acao: TipoAcao = TipoAcao.DEFINIR_VALOR
    campo_destino: Optional[str] = None
    valor: Any = None
    parametros: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        return {
            "tipo_acao": self.tipo_acao.value if isinstance(self.tipo_acao, TipoAcao) else self.tipo_acao,
            "campo_destino": self.campo_destino,
            "valor": self.valor,
            "parametros": self.parametros
        }
    
    @staticmethod
    def from_dict(data: dict) -> 'AcaoRegra':
        return AcaoRegra(
            tipo_acao=TipoAcao(data.get("tipo_acao", "definir_valor")),
            campo_destino=data.get("campo_destino"),
            valor=data.get("valor"),
            parametros=data.get("parametros", {})
        )


@dataclass
class RegraProcessamento:
    """Regra de processamento de lançamentos"""
    id: str = field(default_factory=lambda: str(uuid4()))
    layout_id: str = ""               # ID do layout pai
    nome: str = ""                    # Ex: "Ignorar lançamentos zerados"
    descricao: Optional[str] = None
    ordem: int = 0                    # Ordem de execução
    ativo: bool = True
    
    tipo: TipoRegra = TipoRegra.FILTRO
    
    condicoes: List[CondicaoRegra] = field(default_factory=list)      # AND entre condições
    condicoes_ou: List[CondicaoRegra] = field(default_factory=list)   # OR (alternativa)
    
    acao: AcaoRegra = field(default_factory=AcaoRegra)
    acoes_extras: List[AcaoRegra] = field(default_factory=list)       # Ações adicionais
    
    criado_em: datetime = field(default_factory=datetime.now)
    atualizado_em: datetime = field(default_factory=datetime.now)
    
    def avaliar_condicoes(self, lancamento: dict) -> bool:
        """Avalia se as condições são satisfeitas pelo lançamento"""
        # Avaliar condições AND
        if self.condicoes:
            for condicao in self.condicoes:
                valor_campo = lancamento.get(condicao.campo)
                if not condicao.avaliar(valor_campo):
                    # Se alguma condição AND falhar, verificar OR
                    if self.condicoes_ou:
                        for cond_ou in self.condicoes_ou:
                            valor = lancamento.get(cond_ou.campo)
                            if cond_ou.avaliar(valor):
                                return True
                    return False
            return True
        
        # Se não há condições AND, verificar OR
        if self.condicoes_ou:
            for condicao in self.condicoes_ou:
                valor_campo = lancamento.get(condicao.campo)
                if condicao.avaliar(valor_campo):
                    return True
            return False
        
        # Sem condições = sempre verdadeiro
        return True
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "layout_id": self.layout_id,
            "nome": self.nome,
            "descricao": self.descricao,
            "ordem": self.ordem,
            "ativo": self.ativo,
            "tipo": self.tipo.value if isinstance(self.tipo, TipoRegra) else self.tipo,
            "condicoes": [c.to_dict() for c in self.condicoes],
            "condicoes_ou": [c.to_dict() for c in self.condicoes_ou],
            "acao": self.acao.to_dict(),
            "acoes_extras": [a.to_dict() for a in self.acoes_extras],
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "atualizado_em": self.atualizado_em.isoformat() if self.atualizado_em else None
        }
    
    @staticmethod
    def from_dict(data: dict) -> 'RegraProcessamento':
        return RegraProcessamento(
            id=data.get("id", str(uuid4())),
            layout_id=data.get("layout_id", ""),
            nome=data.get("nome", ""),
            descricao=data.get("descricao"),
            ordem=data.get("ordem", 0),
            ativo=data.get("ativo", True),
            tipo=TipoRegra(data.get("tipo", "filtro")),
            condicoes=[CondicaoRegra.from_dict(c) for c in data.get("condicoes", [])],
            condicoes_ou=[CondicaoRegra.from_dict(c) for c in data.get("condicoes_ou", [])],
            acao=AcaoRegra.from_dict(data.get("acao", {})),
            acoes_extras=[AcaoRegra.from_dict(a) for a in data.get("acoes_extras", [])],
            criado_em=datetime.fromisoformat(data["criado_em"]) if data.get("criado_em") else datetime.now(),
            atualizado_em=datetime.fromisoformat(data["atualizado_em"]) if data.get("atualizado_em") else datetime.now()
        )
