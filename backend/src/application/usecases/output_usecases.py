"""Use Cases para gerenciamento de Perfis de Saída"""
from typing import List, Optional
from datetime import datetime

from src.domain.entities import PerfilSaida, ConfigPerfilSaida, FormatoSaida, SistemaDestino
from src.domain.exceptions import DomainError
from src.application.ports.repositories import PerfilSaidaRepositoryPort


class CriarPerfilSaidaUseCase:
    def __init__(self, repository: PerfilSaidaRepositoryPort):
        self.repository = repository

    async def executar(
        self,
        nome: str,
        sistema_destino: str,
        formato: str,
        config: dict = None,
        descricao: str = None,
        padrao: bool = False,
    ) -> PerfilSaida:
        sistema = SistemaDestino(sistema_destino)
        fmt = FormatoSaida(formato)

        perfil = PerfilSaida(
            nome=nome,
            sistema_destino=sistema,
            formato=fmt,
            config=ConfigPerfilSaida.from_dict(config or {}),
            descricao=descricao,
            padrao=padrao,
        )

        if padrao:
            existente = await self.repository.buscar_padrao()
            if existente:
                existente.padrao = False
                existente.atualizado_em = datetime.now()
                await self.repository.atualizar(existente)

        return await self.repository.salvar(perfil)


class AtualizarPerfilSaidaUseCase:
    def __init__(self, repository: PerfilSaidaRepositoryPort):
        self.repository = repository

    async def executar(
        self,
        perfil_id: str,
        nome: str = None,
        descricao: str = None,
        config: dict = None,
        ativo: bool = None,
        padrao: bool = None,
    ) -> PerfilSaida:
        perfil = await self.repository.buscar_por_id(perfil_id)
        if not perfil:
            raise DomainError("Perfil de saída não encontrado")

        if nome is not None:
            perfil.nome = nome
        if descricao is not None:
            perfil.descricao = descricao
        if config is not None:
            perfil.config = ConfigPerfilSaida.from_dict(config)
        if ativo is not None:
            perfil.ativo = ativo
        if padrao is not None:
            if padrao:
                existente = await self.repository.buscar_padrao()
                if existente and existente.id != perfil_id:
                    existente.padrao = False
                    existente.atualizado_em = datetime.now()
                    await self.repository.atualizar(existente)
            perfil.padrao = padrao

        perfil.atualizado_em = datetime.now()
        return await self.repository.atualizar(perfil)


class ListarPerfisSaidaUseCase:
    def __init__(self, repository: PerfilSaidaRepositoryPort):
        self.repository = repository

    async def listar(self, apenas_ativos: bool = False, sistema: str = None) -> List[PerfilSaida]:
        return await self.repository.listar(apenas_ativos=apenas_ativos, sistema=sistema)

    async def buscar_por_id(self, perfil_id: str) -> Optional[PerfilSaida]:
        return await self.repository.buscar_por_id(perfil_id)

    async def buscar_padrao(self) -> Optional[PerfilSaida]:
        return await self.repository.buscar_padrao()

    async def contar(self, sistema: str = None) -> int:
        return await self.repository.contar(sistema=sistema)


class DeletarPerfilSaidaUseCase:
    def __init__(self, repository: PerfilSaidaRepositoryPort):
        self.repository = repository

    async def executar(self, perfil_id: str):
        perfil = await self.repository.buscar_por_id(perfil_id)
        if not perfil:
            raise DomainError("Perfil de saída não encontrado")
        await self.repository.deletar(perfil_id)
