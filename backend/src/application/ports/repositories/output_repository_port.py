"""Porta do repositório de Perfis de Saída"""
from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.entities import PerfilSaida


class PerfilSaidaRepositoryPort(ABC):
    """Interface para repositório de perfis de saída"""

    @abstractmethod
    async def salvar(self, perfil: PerfilSaida) -> PerfilSaida:
        pass

    @abstractmethod
    async def buscar_por_id(self, perfil_id: str) -> Optional[PerfilSaida]:
        pass

    @abstractmethod
    async def listar(self, apenas_ativos: bool = False, sistema: str = None) -> List[PerfilSaida]:
        pass

    @abstractmethod
    async def atualizar(self, perfil: PerfilSaida) -> PerfilSaida:
        pass

    @abstractmethod
    async def deletar(self, perfil_id: str) -> bool:
        pass

    @abstractmethod
    async def buscar_padrao(self) -> Optional[PerfilSaida]:
        pass

    @abstractmethod
    async def contar(self, sistema: str = None) -> int:
        pass
