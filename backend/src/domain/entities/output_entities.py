"""Entidades de domínio para Perfis de Saída"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict
from enum import Enum
from uuid import uuid4


class FormatoSaida(str, Enum):
    """Formatos de arquivo de saída suportados"""
    TXT_DELIMITADO = "txt_delimitado"
    XML_XSD = "xml_xsd"
    JSON_SCHEMA = "json_schema"


class SistemaDestino(str, Enum):
    """Sistemas contábeis de destino suportados"""
    DOMINIO_SISTEMAS = "dominio_sistemas"


# Configurações padrão por sistema
SISTEMAS_DISPONIVEIS = {
    SistemaDestino.DOMINIO_SISTEMAS: {
        "nome": "Domínio Sistemas",
        "formatos": [FormatoSaida.TXT_DELIMITADO, FormatoSaida.XML_XSD, FormatoSaida.JSON_SCHEMA],
        "descricao": "Leiaute Domínio Sistemas - Lançamentos Contábeis",
    },
}

FORMATOS_DISPONIVEIS = {
    FormatoSaida.TXT_DELIMITADO: {"nome": "Texto com Delimitador", "extensao": ".txt"},
    FormatoSaida.XML_XSD: {"nome": "XML (XSD)", "extensao": ".xml"},
    FormatoSaida.JSON_SCHEMA: {"nome": "JSON Schema", "extensao": ".json"},
}


@dataclass
class ConfigPerfilSaida:
    """Configuração específica de um perfil de saída"""
    delimitador: str = "|"
    codificacao: str = "ANSI"
    tipo_lancamento_padrao: str = "X"
    codigo_usuario: str = ""
    nome_usuario: str = ""
    codigo_filial: str = ""
    codigo_historico_padrao: str = "0"
    incluir_delimitador_inicio_fim: bool = True

    def to_dict(self) -> dict:
        return {
            "delimitador": self.delimitador,
            "codificacao": self.codificacao,
            "tipo_lancamento_padrao": self.tipo_lancamento_padrao,
            "codigo_usuario": self.codigo_usuario,
            "nome_usuario": self.nome_usuario,
            "codigo_filial": self.codigo_filial,
            "codigo_historico_padrao": self.codigo_historico_padrao,
            "incluir_delimitador_inicio_fim": self.incluir_delimitador_inicio_fim,
        }

    @staticmethod
    def from_dict(data: dict) -> 'ConfigPerfilSaida':
        return ConfigPerfilSaida(
            delimitador=data.get("delimitador", "|"),
            codificacao=data.get("codificacao", "ANSI"),
            tipo_lancamento_padrao=data.get("tipo_lancamento_padrao", "X"),
            codigo_usuario=data.get("codigo_usuario", ""),
            nome_usuario=data.get("nome_usuario", ""),
            codigo_filial=data.get("codigo_filial", ""),
            codigo_historico_padrao=data.get("codigo_historico_padrao", "0"),
            incluir_delimitador_inicio_fim=data.get("incluir_delimitador_inicio_fim", True),
        )


@dataclass
class PerfilSaida:
    """Perfil de exportação configurado"""
    nome: str
    sistema_destino: SistemaDestino
    formato: FormatoSaida
    config: ConfigPerfilSaida = field(default_factory=ConfigPerfilSaida)
    descricao: Optional[str] = None
    padrao: bool = False
    ativo: bool = True
    id: str = field(default_factory=lambda: str(uuid4()))
    criado_em: datetime = field(default_factory=datetime.now)
    atualizado_em: datetime = field(default_factory=datetime.now)

    @staticmethod
    def from_dict(data: dict) -> 'PerfilSaida':
        return PerfilSaida(
            id=data.get("id", str(uuid4())),
            nome=data["nome"],
            sistema_destino=SistemaDestino(data["sistema_destino"]),
            formato=FormatoSaida(data["formato"]),
            config=ConfigPerfilSaida.from_dict(data.get("config", {})),
            descricao=data.get("descricao"),
            padrao=data.get("padrao", False),
            ativo=data.get("ativo", True),
            criado_em=data.get("criado_em") if isinstance(data.get("criado_em"), datetime) else datetime.now(),
            atualizado_em=data.get("atualizado_em") if isinstance(data.get("atualizado_em"), datetime) else datetime.now(),
        )
