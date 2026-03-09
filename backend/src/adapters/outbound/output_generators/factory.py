"""Factory para geradores de saída"""
from typing import Dict
from src.application.ports.services.service_ports import OutputGeneratorPort
from src.domain.entities import FormatoSaida, SistemaDestino
from .dominio_sistemas_txt import DominioSistemasTxtGenerator


class OutputGeneratorFactory:
    """Factory que retorna o gerador correto baseado no sistema e formato"""

    _generators: Dict[str, OutputGeneratorPort] = {}

    @classmethod
    def obter_gerador(cls, sistema: str, formato: str) -> OutputGeneratorPort:
        key = f"{sistema}:{formato}"
        if key not in cls._generators:
            cls._generators[key] = cls._criar_gerador(sistema, formato)
        return cls._generators[key]

    @classmethod
    def _criar_gerador(cls, sistema: str, formato: str) -> OutputGeneratorPort:
        if sistema == SistemaDestino.DOMINIO_SISTEMAS.value:
            if formato == FormatoSaida.TXT_DELIMITADO.value:
                return DominioSistemasTxtGenerator()
        raise ValueError(f"Gerador não encontrado para sistema={sistema}, formato={formato}")

    @classmethod
    def listar_disponiveis(cls) -> list:
        """Lista combinações sistema+formato disponíveis"""
        return [
            {
                "sistema": SistemaDestino.DOMINIO_SISTEMAS.value,
                "formato": FormatoSaida.TXT_DELIMITADO.value,
                "nome": "Domínio Sistemas - Texto com Delimitador",
            },
        ]
