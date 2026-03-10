"""Implementação dos Repositórios de Layout e Regra com SQLAlchemy"""
from typing import Optional, List
from datetime import datetime
from sqlalchemy import select, func, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.ports.repositories import LayoutRepositoryPort, RegraRepositoryPort
from src.domain.entities import (
    LayoutExcel, ColunaLayout, ConfigPlanilha, ConfigValor, ConfigHistoricoPadrao,
    RegraContaLayout,
    RegraProcessamento, CondicaoRegra, AcaoRegra
)
from src.domain.value_objects import TipoRegra
from src.config.models import LayoutExcelModel, RegraProcessamentoModel


class SQLAlchemyLayoutRepository(LayoutRepositoryPort):
    """Implementação do repositório de layouts"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    def _model_to_entity(self, model: LayoutExcelModel) -> LayoutExcel:
        """Converte modelo para entidade"""
        return LayoutExcel(
            id=model.id,
            cnpj=model.cnpj,
            nome=model.nome,
            descricao=model.descricao,
            ativo=model.ativo,
            config_planilha=ConfigPlanilha.from_dict(model.config_planilha_json or {}),
            colunas=[ColunaLayout.from_dict(c) for c in (model.colunas_json or [])],
            config_valor=ConfigValor.from_dict(model.config_valor_json or {}),
            config_historico_padrao=ConfigHistoricoPadrao.from_dict(model.config_historico_padrao_json or {}),
            regras_conta=[RegraContaLayout.from_dict(r) for r in (model.regras_conta_json or [])],
            criado_em=model.criado_em,
            atualizado_em=model.atualizado_em
        )
    
    def _entity_to_model(self, entity: LayoutExcel) -> LayoutExcelModel:
        """Converte entidade para modelo"""
        return LayoutExcelModel(
            id=entity.id,
            cnpj=entity.cnpj,
            nome=entity.nome,
            descricao=entity.descricao,
            ativo=entity.ativo,
            config_planilha_json=entity.config_planilha.to_dict(),
            colunas_json=[c.to_dict() for c in entity.colunas],
            config_valor_json=entity.config_valor.to_dict(),
            config_historico_padrao_json=entity.config_historico_padrao.to_dict(),
            regras_conta_json=[r.to_dict() for r in entity.regras_conta],
            criado_em=entity.criado_em,
            atualizado_em=entity.atualizado_em
        )
    
    async def salvar(self, layout: LayoutExcel) -> LayoutExcel:
        model = self._entity_to_model(layout)
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        return self._model_to_entity(model)
    
    async def buscar_por_id(self, id: str) -> Optional[LayoutExcel]:
        result = await self.session.execute(
            select(LayoutExcelModel).where(LayoutExcelModel.id == id)
        )
        model = result.scalar_one_or_none()
        return self._model_to_entity(model) if model else None
    
    async def buscar_por_nome(self, cnpj: str, nome: str) -> Optional[LayoutExcel]:
        result = await self.session.execute(
            select(LayoutExcelModel)
            .where(LayoutExcelModel.cnpj == cnpj)
            .where(LayoutExcelModel.nome == nome)
        )
        model = result.scalar_one_or_none()
        return self._model_to_entity(model) if model else None
    
    async def listar(self, skip: int = 0, limit: int = 100) -> List[LayoutExcel]:
        result = await self.session.execute(
            select(LayoutExcelModel)
            .order_by(LayoutExcelModel.cnpj, LayoutExcelModel.nome)
            .offset(skip)
            .limit(limit)
        )
        models = result.scalars().all()
        return [self._model_to_entity(m) for m in models]
    
    async def listar_por_cnpj(self, cnpj: str, apenas_ativos: bool = True) -> List[LayoutExcel]:
        query = select(LayoutExcelModel).where(LayoutExcelModel.cnpj == cnpj)
        if apenas_ativos:
            query = query.where(LayoutExcelModel.ativo == True)
        query = query.order_by(LayoutExcelModel.nome)
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        return [self._model_to_entity(m) for m in models]
    
    async def listar_cnpjs_distintos(self) -> List[str]:
        result = await self.session.execute(
            select(LayoutExcelModel.cnpj).distinct().order_by(LayoutExcelModel.cnpj)
        )
        return [row[0] for row in result.all()]
    
    async def atualizar(self, layout: LayoutExcel) -> LayoutExcel:
        result = await self.session.execute(
            select(LayoutExcelModel).where(LayoutExcelModel.id == layout.id)
        )
        model = result.scalar_one_or_none()
        if model:
            model.nome = layout.nome
            model.descricao = layout.descricao
            model.ativo = layout.ativo
            model.config_planilha_json = layout.config_planilha.to_dict()
            model.colunas_json = [c.to_dict() for c in layout.colunas]
            model.config_valor_json = layout.config_valor.to_dict()
            model.config_historico_padrao_json = layout.config_historico_padrao.to_dict()
            model.regras_conta_json = [r.to_dict() for r in layout.regras_conta]
            model.atualizado_em = layout.atualizado_em
            await self.session.commit()
            await self.session.refresh(model)
        return layout
    
    async def deletar(self, id: str) -> bool:
        result = await self.session.execute(
            delete(LayoutExcelModel).where(LayoutExcelModel.id == id)
        )
        await self.session.commit()
        return result.rowcount > 0
    
    async def contar(self, cnpj: Optional[str] = None) -> int:
        query = select(func.count(LayoutExcelModel.id))
        if cnpj:
            query = query.where(LayoutExcelModel.cnpj == cnpj)
        result = await self.session.execute(query)
        return result.scalar() or 0


class SQLAlchemyRegraRepository(RegraRepositoryPort):
    """Implementação do repositório de regras"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    def _model_to_entity(self, model: RegraProcessamentoModel) -> RegraProcessamento:
        """Converte modelo para entidade"""
        return RegraProcessamento(
            id=model.id,
            layout_id=model.layout_id,
            nome=model.nome,
            descricao=model.descricao,
            ordem=model.ordem,
            ativo=model.ativo,
            tipo=TipoRegra(model.tipo),
            condicoes=[CondicaoRegra.from_dict(c) for c in (model.condicoes_json or [])],
            condicoes_ou=[CondicaoRegra.from_dict(c) for c in (model.condicoes_ou_json or [])],
            acao=AcaoRegra.from_dict(model.acao_json or {}),
            acoes_extras=[AcaoRegra.from_dict(a) for a in (model.acoes_extras_json or [])],
            criado_em=model.criado_em,
            atualizado_em=model.atualizado_em
        )
    
    def _entity_to_model(self, entity: RegraProcessamento) -> RegraProcessamentoModel:
        """Converte entidade para modelo"""
        return RegraProcessamentoModel(
            id=entity.id,
            layout_id=entity.layout_id,
            nome=entity.nome,
            descricao=entity.descricao,
            ordem=entity.ordem,
            ativo=entity.ativo,
            tipo=entity.tipo.value if isinstance(entity.tipo, TipoRegra) else entity.tipo,
            condicoes_json=[c.to_dict() for c in entity.condicoes],
            condicoes_ou_json=[c.to_dict() for c in entity.condicoes_ou],
            acao_json=entity.acao.to_dict(),
            acoes_extras_json=[a.to_dict() for a in entity.acoes_extras],
            criado_em=entity.criado_em,
            atualizado_em=entity.atualizado_em
        )
    
    async def salvar(self, regra: RegraProcessamento) -> RegraProcessamento:
        model = self._entity_to_model(regra)
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        return self._model_to_entity(model)
    
    async def buscar_por_id(self, id: str) -> Optional[RegraProcessamento]:
        result = await self.session.execute(
            select(RegraProcessamentoModel).where(RegraProcessamentoModel.id == id)
        )
        model = result.scalar_one_or_none()
        return self._model_to_entity(model) if model else None
    
    async def listar_por_layout(self, layout_id: str, apenas_ativas: bool = True) -> List[RegraProcessamento]:
        query = select(RegraProcessamentoModel).where(RegraProcessamentoModel.layout_id == layout_id)
        if apenas_ativas:
            query = query.where(RegraProcessamentoModel.ativo == True)
        query = query.order_by(RegraProcessamentoModel.ordem)
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        return [self._model_to_entity(m) for m in models]
    
    async def atualizar(self, regra: RegraProcessamento) -> RegraProcessamento:
        result = await self.session.execute(
            select(RegraProcessamentoModel).where(RegraProcessamentoModel.id == regra.id)
        )
        model = result.scalar_one_or_none()
        if model:
            model.nome = regra.nome
            model.descricao = regra.descricao
            model.ordem = regra.ordem
            model.ativo = regra.ativo
            model.tipo = regra.tipo.value if isinstance(regra.tipo, TipoRegra) else regra.tipo
            model.condicoes_json = [c.to_dict() for c in regra.condicoes]
            model.condicoes_ou_json = [c.to_dict() for c in regra.condicoes_ou]
            model.acao_json = regra.acao.to_dict()
            model.acoes_extras_json = [a.to_dict() for a in regra.acoes_extras]
            model.atualizado_em = regra.atualizado_em
            await self.session.commit()
            await self.session.refresh(model)
        return regra
    
    async def reordenar(self, layout_id: str, ordem_ids: List[str]) -> bool:
        for idx, regra_id in enumerate(ordem_ids):
            await self.session.execute(
                update(RegraProcessamentoModel)
                .where(RegraProcessamentoModel.id == regra_id)
                .where(RegraProcessamentoModel.layout_id == layout_id)
                .values(ordem=idx)
            )
        await self.session.commit()
        return True
    
    async def deletar(self, id: str) -> bool:
        result = await self.session.execute(
            delete(RegraProcessamentoModel).where(RegraProcessamentoModel.id == id)
        )
        await self.session.commit()
        return result.rowcount > 0
    
    async def deletar_por_layout(self, layout_id: str) -> int:
        result = await self.session.execute(
            delete(RegraProcessamentoModel).where(RegraProcessamentoModel.layout_id == layout_id)
        )
        await self.session.commit()
        return result.rowcount
    
    async def contar_por_layout(self, layout_id: str) -> int:
        result = await self.session.execute(
            select(func.count(RegraProcessamentoModel.id))
            .where(RegraProcessamentoModel.layout_id == layout_id)
        )
        return result.scalar() or 0
    
    async def obter_proxima_ordem(self, layout_id: str) -> int:
        result = await self.session.execute(
            select(func.max(RegraProcessamentoModel.ordem))
            .where(RegraProcessamentoModel.layout_id == layout_id)
        )
        max_ordem = result.scalar()
        return (max_ordem or 0) + 1
