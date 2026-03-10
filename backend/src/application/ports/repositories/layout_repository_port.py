"""Portas de Repositório para Layouts e Regras"""
from abc import ABC, abstractmethod
from typing import Optional, List
from src.domain.entities import LayoutExcel, RegraProcessamento


class LayoutRepositoryPort(ABC):
    """Interface para repositório de layouts"""
    
    @abstractmethod
    async def salvar(self, layout: LayoutExcel) -> LayoutExcel:
        """Persiste um layout"""
        pass
    
    @abstractmethod
    async def buscar_por_id(self, id: str) -> Optional[LayoutExcel]:
        """Busca layout por ID"""
        pass
    
    @abstractmethod
    async def buscar_por_nome(self, cnpj: str, nome: str) -> Optional[LayoutExcel]:
        """Busca layout por CNPJ e nome"""
        pass
    
    @abstractmethod
    async def listar(self, skip: int = 0, limit: int = 100) -> List[LayoutExcel]:
        """Lista todos os layouts"""
        pass
    
    @abstractmethod
    async def listar_por_cnpj(self, cnpj: str, apenas_ativos: bool = True) -> List[LayoutExcel]:
        """Lista layouts de um CNPJ"""
        pass
    
    @abstractmethod
    async def listar_cnpjs_distintos(self) -> List[str]:
        """Lista CNPJs distintos que possuem layouts"""
        pass
    
    @abstractmethod
    async def atualizar(self, layout: LayoutExcel) -> LayoutExcel:
        """Atualiza um layout existente"""
        pass
    
    @abstractmethod
    async def deletar(self, id: str) -> bool:
        """Remove um layout"""
        pass
    
    @abstractmethod
    async def contar(self, cnpj: Optional[str] = None) -> int:
        """Conta layouts"""
        pass


class RegraRepositoryPort(ABC):
    """Interface para repositório de regras"""
    
    @abstractmethod
    async def salvar(self, regra: RegraProcessamento) -> RegraProcessamento:
        """Persiste uma regra"""
        pass
    
    @abstractmethod
    async def buscar_por_id(self, id: str) -> Optional[RegraProcessamento]:
        """Busca regra por ID"""
        pass
    
    @abstractmethod
    async def listar_por_layout(self, layout_id: str, apenas_ativas: bool = True) -> List[RegraProcessamento]:
        """Lista regras de um layout ordenadas por ordem"""
        pass
    
    @abstractmethod
    async def atualizar(self, regra: RegraProcessamento) -> RegraProcessamento:
        """Atualiza uma regra existente"""
        pass
    
    @abstractmethod
    async def reordenar(self, layout_id: str, ordem_ids: List[str]) -> bool:
        """Reordena regras de um layout"""
        pass
    
    @abstractmethod
    async def deletar(self, id: str) -> bool:
        """Remove uma regra"""
        pass
    
    @abstractmethod
    async def deletar_por_layout(self, layout_id: str) -> int:
        """Remove todas as regras de um layout"""
        pass
    
    @abstractmethod
    async def contar_por_layout(self, layout_id: str) -> int:
        """Conta regras de um layout"""
        pass

    @abstractmethod
    async def contar_por_layouts(self, layout_ids: list[str]) -> dict[str, int]:
        """Conta regras para múltiplos layouts em batch (resolve N+1)"""
        pass
    
    @abstractmethod
    async def obter_proxima_ordem(self, layout_id: str) -> int:
        """Obtém próximo número de ordem"""
        pass
