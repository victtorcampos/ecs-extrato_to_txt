"""Entidades de Domínio para Layouts de Importação Excel"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import uuid4

from ..value_objects.layout_value_objects import TipoDado, TipoSinal, MAPEAMENTO_TIPO_DC_PADRAO


@dataclass
class CondicaoContaLayout:
    """Condição para uma regra de definição de contas"""
    campo: str = ""                   # "_sinal_valor", "_tipo_dc", campo_destino ou referência livre
    operador: str = "igual"           # positivo, negativo, igual, diferente, contem, nao_contem, dc_debito, dc_credito
    valor: str = ""                   # Valor para comparação
    coluna_excel: str = ""            # Referência direta a coluna do Excel (alternativa ao campo)
    operador_logico: str = "e"        # "e" (AND) ou "ou" (OR) — relação com a condição anterior

    def to_dict(self) -> dict:
        return {
            "campo": self.campo,
            "operador": self.operador,
            "valor": self.valor,
            "coluna_excel": self.coluna_excel,
            "operador_logico": self.operador_logico,
        }

    @staticmethod
    def from_dict(data: dict) -> 'CondicaoContaLayout':
        return CondicaoContaLayout(
            campo=data.get("campo", ""),
            operador=data.get("operador", "igual"),
            valor=data.get("valor", ""),
            coluna_excel=data.get("coluna_excel", ""),
            operador_logico=data.get("operador_logico", "e"),
        )


@dataclass
class AcaoContaLayout:
    """Ação a executar quando uma regra de conta é ativada"""
    campo_destino: str = ""           # "conta_debito", "conta_credito", "historico"
    valor: str = ""                   # Valor a definir

    def to_dict(self) -> dict:
        return {
            "campo_destino": self.campo_destino,
            "valor": self.valor,
        }

    @staticmethod
    def from_dict(data: dict) -> 'AcaoContaLayout':
        return AcaoContaLayout(
            campo_destino=data.get("campo_destino", ""),
            valor=data.get("valor", ""),
        )


@dataclass
class RegraContaLayout:
    """Regra de definição de contas débito/crédito dentro de um layout"""
    id: str = field(default_factory=lambda: str(uuid4()))
    nome: str = ""
    ordem: int = 0
    ativo: bool = True
    condicoes: List[CondicaoContaLayout] = field(default_factory=list)  # AND/OR conforme operador_logico
    conta_debito: str = ""            # Retrocompat: ação simples
    conta_credito: str = ""           # Retrocompat: ação simples
    acoes: List[AcaoContaLayout] = field(default_factory=list)  # Múltiplas ações

    def obter_acoes_efetivas(self) -> List[AcaoContaLayout]:
        """Retorna ações efetivas: usa `acoes` se preenchido, senão converte conta_debito/conta_credito"""
        if self.acoes:
            return self.acoes
        resultado = []
        if self.conta_debito:
            resultado.append(AcaoContaLayout(campo_destino="conta_debito", valor=self.conta_debito))
        if self.conta_credito:
            resultado.append(AcaoContaLayout(campo_destino="conta_credito", valor=self.conta_credito))
        return resultado

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "nome": self.nome,
            "ordem": self.ordem,
            "ativo": self.ativo,
            "condicoes": [c.to_dict() for c in self.condicoes],
            "conta_debito": self.conta_debito,
            "conta_credito": self.conta_credito,
            "acoes": [a.to_dict() for a in self.acoes],
        }

    @staticmethod
    def from_dict(data: dict) -> 'RegraContaLayout':
        return RegraContaLayout(
            id=data.get("id", str(uuid4())),
            nome=data.get("nome", ""),
            ordem=data.get("ordem", 0),
            ativo=data.get("ativo", True),
            condicoes=[CondicaoContaLayout.from_dict(c) for c in data.get("condicoes", [])],
            conta_debito=data.get("conta_debito", ""),
            conta_credito=data.get("conta_credito", ""),
            acoes=[AcaoContaLayout.from_dict(a) for a in data.get("acoes", [])],
        )


@dataclass
class ColunaLayout:
    """Configuração de uma coluna do Excel"""
    id: str = field(default_factory=lambda: str(uuid4()))
    campo_destino: str = ""           # Ex: "valor", "conta_debito", "historico"
    coluna_excel: str = ""            # Índice (0, 1, 2) ou letra (A, B, C)
    tipo_dado: TipoDado = TipoDado.STRING
    formato: Optional[str] = None     # Ex: "%d/%m/%Y" para datas
    obrigatorio: bool = False
    valor_padrao: Optional[str] = None
    transformacao: Dict[str, Any] = field(default_factory=dict)
    # transformacao pode conter:
    #   formato_numero: "automatico"|"br_virgula"|"br_moeda"|"us_ponto"
    #   valor_com_dc: "nenhum"|"sufixo"|"prefixo"
    #   campo_composto: "nenhum"|"cnpj_cpf_nome"
    #   separador_composto: " - " (string para separar campos compostos)
    #   sinal_valor: "positivo_debito"|"positivo_credito"
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "campo_destino": self.campo_destino,
            "coluna_excel": self.coluna_excel,
            "tipo_dado": self.tipo_dado.value if isinstance(self.tipo_dado, TipoDado) else self.tipo_dado,
            "formato": self.formato,
            "obrigatorio": self.obrigatorio,
            "valor_padrao": self.valor_padrao,
            "transformacao": self.transformacao
        }
    
    @staticmethod
    def from_dict(data: dict) -> 'ColunaLayout':
        # Map detect types to valid TipoDado enum values
        tipo_dado_map = {
            "data": "date",
            "decimal_br": "decimal",
            "decimal_dc": "decimal",
            "cnpj_cpf": "string",
            "campo_composto": "string",
            "tipo_dc": "string",
        }
        raw_tipo = data.get("tipo_dado", "string")
        normalized_tipo = tipo_dado_map.get(raw_tipo, raw_tipo)
        
        return ColunaLayout(
            id=data.get("id", str(uuid4())),
            campo_destino=data.get("campo_destino", ""),
            coluna_excel=data.get("coluna_excel", ""),
            tipo_dado=TipoDado(normalized_tipo),
            formato=data.get("formato"),
            obrigatorio=data.get("obrigatorio", False),
            valor_padrao=data.get("valor_padrao"),
            transformacao=data.get("transformacao", {})
        )


@dataclass
class ConfigPlanilha:
    """Configuração da planilha Excel"""
    nome_aba: Optional[str] = None    # Nome da aba ou None para primeira
    linha_cabecalho: int = 0          # Linha do cabeçalho (0-indexed)
    linha_inicio_dados: int = 1       # Primeira linha de dados
    
    def to_dict(self) -> dict:
        return {
            "nome_aba": self.nome_aba,
            "linha_cabecalho": self.linha_cabecalho,
            "linha_inicio_dados": self.linha_inicio_dados
        }
    
    @staticmethod
    def from_dict(data: dict) -> 'ConfigPlanilha':
        return ConfigPlanilha(
            nome_aba=data.get("nome_aba"),
            linha_cabecalho=data.get("linha_cabecalho", 0),
            linha_inicio_dados=data.get("linha_inicio_dados", 1)
        )


@dataclass
class ConfigValor:
    """Como determinar se é débito ou crédito"""
    tipo_sinal: TipoSinal = TipoSinal.SINAL_VALOR
    coluna_tipo: Optional[str] = None          # Coluna que indica D/C (para COLUNA_TIPO)
    coluna_debito: Optional[str] = None        # Coluna de débito (para COLUNAS_SEPARADAS)
    coluna_credito: Optional[str] = None       # Coluna de crédito (para COLUNAS_SEPARADAS)
    case_insensitive: bool = True              # Normalizar texto para comparação
    mapeamento_tipo: Dict[str, str] = field(default_factory=lambda: dict(MAPEAMENTO_TIPO_DC_PADRAO))

    def to_dict(self) -> dict:
        return {
            "tipo_sinal": self.tipo_sinal.value if isinstance(self.tipo_sinal, TipoSinal) else self.tipo_sinal,
            "coluna_tipo": self.coluna_tipo,
            "coluna_debito": self.coluna_debito,
            "coluna_credito": self.coluna_credito,
            "case_insensitive": self.case_insensitive,
            "mapeamento_tipo": self.mapeamento_tipo
        }

    @staticmethod
    def from_dict(data: dict) -> 'ConfigValor':
        return ConfigValor(
            tipo_sinal=TipoSinal(data.get("tipo_sinal", "sinal_valor")),
            coluna_tipo=data.get("coluna_tipo"),
            coluna_debito=data.get("coluna_debito"),
            coluna_credito=data.get("coluna_credito"),
            case_insensitive=data.get("case_insensitive", True),
            mapeamento_tipo=data.get("mapeamento_tipo", MAPEAMENTO_TIPO_DC_PADRAO)
        )


@dataclass
class ConfigHistoricoPadrao:
    """Template para gerar histórico quando vazio"""
    template: str = "{documento} - {conta_debito} -> {conta_credito}"
    campos_fallback: List[str] = field(default_factory=lambda: ["documento", "conta_debito", "conta_credito"])
    
    def to_dict(self) -> dict:
        return {
            "template": self.template,
            "campos_fallback": self.campos_fallback
        }
    
    @staticmethod
    def from_dict(data: dict) -> 'ConfigHistoricoPadrao':
        return ConfigHistoricoPadrao(
            template=data.get("template", "{documento} - {conta_debito} -> {conta_credito}"),
            campos_fallback=data.get("campos_fallback", ["documento", "conta_debito", "conta_credito"])
        )


@dataclass
class LayoutExcel:
    """Entidade de Layout de Importação Excel"""
    id: str = field(default_factory=lambda: str(uuid4()))
    cnpj: str = ""                    # CNPJ do cliente (pode ter múltiplos layouts)
    nome: str = ""                    # Ex: "Layout Banco Itaú", "Layout ERP SAP"
    descricao: Optional[str] = None
    ativo: bool = True
    
    config_planilha: ConfigPlanilha = field(default_factory=ConfigPlanilha)
    colunas: List[ColunaLayout] = field(default_factory=list)
    config_valor: ConfigValor = field(default_factory=ConfigValor)
    config_historico_padrao: ConfigHistoricoPadrao = field(default_factory=ConfigHistoricoPadrao)
    regras_conta: List[RegraContaLayout] = field(default_factory=list)
    
    # Colunas para ler tipo de lançamento e grupo de agrupamento
    coluna_tipo_lancamento: Optional[str] = None  # Coluna que contém o tipo (X/D/C/V)
    coluna_grupo_lancamento: Optional[str] = None  # Coluna que contém o grupo_id
    
    criado_em: datetime = field(default_factory=datetime.now)
    atualizado_em: datetime = field(default_factory=datetime.now)
    
    @property
    def total_colunas(self) -> int:
        return len(self.colunas)
    
    @property
    def colunas_obrigatorias(self) -> List[ColunaLayout]:
        return [c for c in self.colunas if c.obrigatorio]
    
    def adicionar_coluna(self, coluna: ColunaLayout):
        self.colunas.append(coluna)
        self.atualizado_em = datetime.now()
    
    def remover_coluna(self, coluna_id: str):
        self.colunas = [c for c in self.colunas if c.id != coluna_id]
        self.atualizado_em = datetime.now()
    
    def obter_coluna_por_campo(self, campo_destino: str) -> Optional[ColunaLayout]:
        for coluna in self.colunas:
            if coluna.campo_destino == campo_destino:
                return coluna
        return None
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "cnpj": self.cnpj,
            "nome": self.nome,
            "descricao": self.descricao,
            "ativo": self.ativo,
            "config_planilha": self.config_planilha.to_dict(),
            "colunas": [c.to_dict() for c in self.colunas],
            "config_valor": self.config_valor.to_dict(),
            "config_historico_padrao": self.config_historico_padrao.to_dict(),
            "regras_conta": [r.to_dict() for r in self.regras_conta],
            "coluna_tipo_lancamento": self.coluna_tipo_lancamento,
            "coluna_grupo_lancamento": self.coluna_grupo_lancamento,
            "criado_em": self.criado_em.isoformat() if self.criado_em else None,
            "atualizado_em": self.atualizado_em.isoformat() if self.atualizado_em else None
        }
    
    @staticmethod
    def from_dict(data: dict) -> 'LayoutExcel':
        return LayoutExcel(
            id=data.get("id", str(uuid4())),
            cnpj=data.get("cnpj", ""),
            nome=data.get("nome", ""),
            descricao=data.get("descricao"),
            ativo=data.get("ativo", True),
            config_planilha=ConfigPlanilha.from_dict(data.get("config_planilha", {})),
            colunas=[ColunaLayout.from_dict(c) for c in data.get("colunas", [])],
            config_valor=ConfigValor.from_dict(data.get("config_valor", {})),
            config_historico_padrao=ConfigHistoricoPadrao.from_dict(data.get("config_historico_padrao", {})),
            regras_conta=[RegraContaLayout.from_dict(r) for r in data.get("regras_conta", [])],
            coluna_tipo_lancamento=data.get("coluna_tipo_lancamento"),
            coluna_grupo_lancamento=data.get("coluna_grupo_lancamento"),
            criado_em=datetime.fromisoformat(data["criado_em"]) if data.get("criado_em") else datetime.now(),
            atualizado_em=datetime.fromisoformat(data["atualizado_em"]) if data.get("atualizado_em") else datetime.now()
        )
