"""Repositório SQLAlchemy para Perfis de Saída"""
from typing import List, Optional
from datetime import datetime
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.ports.repositories import PerfilSaidaRepositoryPort
from src.domain.entities import PerfilSaida, ConfigPerfilSaida, FormatoSaida, SistemaDestino
from src.config.models import PerfilSaidaModel


class SQLAlchemyPerfilSaidaRepository(PerfilSaidaRepositoryPort):

    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_model(self, perfil: PerfilSaida) -> PerfilSaidaModel:
        return PerfilSaidaModel(
            id=perfil.id,
            nome=perfil.nome,
            sistema_destino=perfil.sistema_destino.value,
            formato=perfil.formato.value,
            descricao=perfil.descricao,
            padrao=perfil.padrao,
            ativo=perfil.ativo,
            config_json=perfil.config.to_dict(),
            criado_em=perfil.criado_em,
            atualizado_em=perfil.atualizado_em,
        )

    def _to_entity(self, model: PerfilSaidaModel) -> PerfilSaida:
        return PerfilSaida(
            id=model.id,
            nome=model.nome,
            sistema_destino=SistemaDestino(model.sistema_destino),
            formato=FormatoSaida(model.formato),
            descricao=model.descricao,
            padrao=model.padrao,
            ativo=model.ativo,
            config=ConfigPerfilSaida.from_dict(model.config_json or {}),
            criado_em=model.criado_em,
            atualizado_em=model.atualizado_em,
        )

    async def salvar(self, perfil: PerfilSaida) -> PerfilSaida:
        model = self._to_model(perfil)
        self.session.add(model)
        await self.session.commit()
        return perfil

    async def buscar_por_id(self, perfil_id: str) -> Optional[PerfilSaida]:
        result = await self.session.execute(
            select(PerfilSaidaModel).where(PerfilSaidaModel.id == perfil_id)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def listar(self, apenas_ativos: bool = False, sistema: str = None) -> List[PerfilSaida]:
        query = select(PerfilSaidaModel)
        if apenas_ativos:
            query = query.where(PerfilSaidaModel.ativo == True)
        if sistema:
            query = query.where(PerfilSaidaModel.sistema_destino == sistema)
        query = query.order_by(PerfilSaidaModel.padrao.desc(), PerfilSaidaModel.nome)
        result = await self.session.execute(query)
        return [self._to_entity(m) for m in result.scalars().all()]

    async def atualizar(self, perfil: PerfilSaida) -> PerfilSaida:
        result = await self.session.execute(
            select(PerfilSaidaModel).where(PerfilSaidaModel.id == perfil.id)
        )
        model = result.scalar_one_or_none()
        if not model:
            raise Exception("Perfil não encontrado")
        model.nome = perfil.nome
        model.descricao = perfil.descricao
        model.padrao = perfil.padrao
        model.ativo = perfil.ativo
        model.config_json = perfil.config.to_dict()
        model.atualizado_em = perfil.atualizado_em
        await self.session.commit()
        return perfil

    async def deletar(self, perfil_id: str) -> bool:
        await self.session.execute(
            delete(PerfilSaidaModel).where(PerfilSaidaModel.id == perfil_id)
        )
        await self.session.commit()
        return True

    async def buscar_padrao(self) -> Optional[PerfilSaida]:
        result = await self.session.execute(
            select(PerfilSaidaModel).where(PerfilSaidaModel.padrao == True)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def contar(self, sistema: str = None) -> int:
        query = select(func.count()).select_from(PerfilSaidaModel)
        if sistema:
            query = query.where(PerfilSaidaModel.sistema_destino == sistema)
        result = await self.session.execute(query)
        return result.scalar() or 0
