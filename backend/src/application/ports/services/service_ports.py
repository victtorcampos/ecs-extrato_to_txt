"""Portas de Serviços - Interfaces"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from src.domain.entities import Lancamento  # noqa: F401


class TxtGeneratorPort(ABC):
    """Interface para gerador de arquivo TXT"""
    
    @abstractmethod
    def gerar(self, lancamentos: List[Lancamento], cnpj: str, mapeamentos: Dict[str, str]) -> str:
        """Gera arquivo TXT no formato esperado"""
        pass


class OutputGeneratorPort(ABC):
    """Interface genérica para gerador de arquivo de saída (multi-formato)"""

    @abstractmethod
    def gerar(self, lancamentos: List[Lancamento], cnpj: str, mapeamentos: Dict[str, str], config: Dict[str, Any] = None) -> str:
        """Gera arquivo de saída no formato configurado"""
        pass

    @abstractmethod
    def validar(self, lancamentos: List[Lancamento], cnpj: str, mapeamentos: Dict[str, str], config: Dict[str, Any] = None) -> List[str]:
        """Valida dados antes de gerar (retorna lista de erros)"""
        pass

    @abstractmethod
    def extensao(self) -> str:
        """Retorna a extensão do arquivo gerado"""
        pass


class EmailSenderPort(ABC):
    """Interface para envio de emails"""
    
    @abstractmethod
    async def enviar(
        self, 
        destinatario: str, 
        assunto: str, 
        corpo_html: str,
        anexo_base64: Optional[str] = None,
        nome_anexo: Optional[str] = None
    ) -> bool:
        """Envia email com corpo HTML e anexo opcional"""
        pass


