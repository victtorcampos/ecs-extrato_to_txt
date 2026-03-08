"""Portas de Serviços - Interfaces"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from src.domain.entities import Lancamento


class ExcelParserPort(ABC):
    """Interface para parser de Excel"""
    
    @abstractmethod
    def parse(self, arquivo_base64: str, layout: str = "padrao") -> List[Lancamento]:
        """Extrai lançamentos de um arquivo Excel"""
        pass
    
    @abstractmethod
    def validar_estrutura(self, arquivo_base64: str, layout: str = "padrao") -> bool:
        """Valida se o arquivo tem a estrutura esperada"""
        pass


class TxtGeneratorPort(ABC):
    """Interface para gerador de arquivo TXT"""
    
    @abstractmethod
    def gerar(self, lancamentos: List[Lancamento], cnpj: str, mapeamentos: Dict[str, str]) -> str:
        """Gera arquivo TXT no formato esperado"""
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


class ContaMapperPort(ABC):
    """Interface para mapeamento de contas"""
    
    @abstractmethod
    def mapear(self, conta_cliente: str, mapeamentos: Dict[str, str]) -> Optional[str]:
        """Mapeia uma conta do cliente para conta padrão"""
        pass
    
    @abstractmethod
    def identificar_pendencias(
        self, 
        lancamentos: List[Lancamento], 
        mapeamentos: Dict[str, str]
    ) -> List[str]:
        """Identifica contas sem mapeamento"""
        pass
