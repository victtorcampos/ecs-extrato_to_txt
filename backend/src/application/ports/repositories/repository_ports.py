"""Portas de Repositório - Interfaces"""
from abc import ABC, abstractmethod
from typing import Optional, List
from src.domain.entities import Lote, MapeamentoConta


class LoteRepositoryPort(ABC):
    """Interface para repositório de lotes"""
    
    @abstractmethod
    async def salvar(self, lote: Lote) -> Lote:
        """Persiste um lote"""
        pass
    
    @abstractmethod
    async def buscar_por_id(self, id: str) -> Optional[Lote]:
        """Busca lote por ID"""
        pass
    
    @abstractmethod
    async def buscar_por_protocolo(self, protocolo: str) -> Optional[Lote]:
        """Busca lote por protocolo"""
        pass
    
    @abstractmethod
    async def buscar_por_cnpj(self, cnpj: str, limit: int = 100) -> List[Lote]:
        """Busca lotes por CNPJ"""
        pass
    
    @abstractmethod
    async def listar(self, skip: int = 0, limit: int = 100) -> List[Lote]:
        """Lista todos os lotes"""
        pass
    
    @abstractmethod
    async def atualizar(self, lote: Lote) -> Lote:
        """Atualiza um lote existente"""
        pass
    
    @abstractmethod
    async def deletar(self, id: str) -> bool:
        """Remove um lote"""
        pass
    
    @abstractmethod
    async def contar(self) -> int:
        """Conta total de lotes"""
        pass
    
    @abstractmethod
    async def contar_por_status(self) -> dict:
        """Conta lotes por status"""
        pass


class MapeamentoContaRepositoryPort(ABC):
    """Interface para repositório de mapeamento de contas"""
    
    @abstractmethod
    async def salvar(self, mapeamento: MapeamentoConta) -> MapeamentoConta:
        """Persiste um mapeamento"""
        pass
    
    @abstractmethod
    async def buscar_por_conta_cliente(self, cnpj: str, conta_cliente: str) -> Optional[MapeamentoConta]:
        """Busca mapeamento por conta do cliente"""
        pass
    
    @abstractmethod
    async def listar_por_cnpj(self, cnpj: str) -> List[MapeamentoConta]:
        """Lista mapeamentos de um CNPJ"""
        pass
    
    @abstractmethod
    async def deletar(self, id: str) -> bool:
        """Remove um mapeamento"""
        pass
