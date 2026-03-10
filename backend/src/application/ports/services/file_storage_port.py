"""Port para armazenamento de arquivos"""
from abc import ABC, abstractmethod
from typing import Optional


class FileStoragePort(ABC):
    """Interface para armazenamento de arquivos em disco ou cloud."""

    @abstractmethod
    async def salvar(self, conteudo: bytes, nome_arquivo: str, subdiretorio: str = "") -> str:
        """Salva arquivo e retorna o caminho relativo."""
        pass

    @abstractmethod
    async def ler(self, caminho: str) -> bytes:
        """Le arquivo pelo caminho relativo e retorna bytes."""
        pass

    @abstractmethod
    async def deletar(self, caminho: str) -> bool:
        """Deleta arquivo pelo caminho relativo."""
        pass

    @abstractmethod
    async def existe(self, caminho: str) -> bool:
        """Verifica se arquivo existe."""
        pass
