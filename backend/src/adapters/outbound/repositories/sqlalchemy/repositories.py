"""Implementação dos Repositórios com SQLAlchemy"""
from typing import Optional, List
from datetime import datetime
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.ports.repositories import LoteRepositoryPort, MapeamentoContaRepositoryPort
from src.domain.entities import Lote, Lancamento, StatusLote, PendenciaMapeamento, MapeamentoConta
from src.config.models import LoteModel, MapeamentoContaModel


class LoteMapper:
    """Mapper entre entidade de domínio e modelo ORM"""
    
    @staticmethod
    def to_model(lote: Lote) -> LoteModel:
        model = LoteModel(
            id=lote.id,
            protocolo=lote.protocolo,
            cnpj=lote.cnpj,
            periodo_mes=lote.periodo_mes,
            periodo_ano=lote.periodo_ano,
            email_notificacao=lote.email_notificacao,
            nome_layout=lote.nome_layout,
            layout_id=lote.layout_id,
            perfil_saida_id=lote.perfil_saida_id,
            codigo_matriz_filial=lote.codigo_matriz_filial,
            status=lote.status.value if isinstance(lote.status, StatusLote) else lote.status,
            mensagem_erro=lote.mensagem_erro,
            nome_arquivo=lote.nome_arquivo,
            caminho_arquivo_original=lote.caminho_arquivo_original,
            caminho_arquivo_saida=lote.caminho_arquivo_saida,
            lancamentos_json=[LoteMapper._lancamento_to_dict(l) for l in lote.lancamentos],
            pendencias_json=[LoteMapper._pendencia_to_dict(p) for p in lote.pendencias],
            criado_em=lote.criado_em,
            atualizado_em=lote.atualizado_em,
            processado_em=lote.processado_em
        )
        return model

    @staticmethod
    def to_entity(model: LoteModel) -> Lote:
        lancamentos = [LoteMapper._dict_to_lancamento(d) for d in (model.lancamentos_json or [])]
        pendencias = [LoteMapper._dict_to_pendencia(d) for d in (model.pendencias_json or [])]

        return Lote(
            id=model.id,
            protocolo=model.protocolo,
            cnpj=model.cnpj,
            periodo_mes=model.periodo_mes,
            periodo_ano=model.periodo_ano,
            email_notificacao=model.email_notificacao,
            nome_layout=model.nome_layout,
            layout_id=getattr(model, 'layout_id', None),
            perfil_saida_id=getattr(model, 'perfil_saida_id', None),
            codigo_matriz_filial=model.codigo_matriz_filial,
            status=StatusLote(model.status),
            mensagem_erro=model.mensagem_erro,
            nome_arquivo=model.nome_arquivo,
            caminho_arquivo_original=getattr(model, 'caminho_arquivo_original', None),
            caminho_arquivo_saida=getattr(model, 'caminho_arquivo_saida', None),
            lancamentos=lancamentos,
            pendencias=pendencias,
            criado_em=model.criado_em,
            atualizado_em=model.atualizado_em,
            processado_em=model.processado_em
        )
    
    @staticmethod
    def _lancamento_to_dict(l: Lancamento) -> dict:
        return l.to_dict()

    @staticmethod
    def _dict_to_lancamento(d: dict) -> Lancamento:
        return Lancamento.from_dict(d)
    
    @staticmethod
    def _pendencia_to_dict(p: PendenciaMapeamento) -> dict:
        return {
            "id": p.id,
            "conta_cliente": p.conta_cliente,
            "tipo": p.tipo,
            "resolvida": p.resolvida,
            "conta_mapeada": p.conta_mapeada,
            "nome_conta": p.nome_conta
        }
    
    @staticmethod
    def _dict_to_pendencia(d: dict) -> PendenciaMapeamento:
        return PendenciaMapeamento(
            id=d.get("id", ""),
            conta_cliente=d.get("conta_cliente", ""),
            tipo=d.get("tipo", "debito"),
            resolvida=d.get("resolvida", False),
            conta_mapeada=d.get("conta_mapeada"),
            nome_conta=d.get("nome_conta")
        )


class SQLAlchemyLoteRepository(LoteRepositoryPort):
    """Implementação do repositório de lotes com SQLAlchemy"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def salvar(self, lote: Lote) -> Lote:
        model = LoteMapper.to_model(lote)
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        return LoteMapper.to_entity(model)
    
    async def buscar_por_id(self, id: str) -> Optional[Lote]:
        result = await self.session.execute(
            select(LoteModel).where(LoteModel.id == id)
        )
        model = result.scalar_one_or_none()
        return LoteMapper.to_entity(model) if model else None
    
    async def buscar_por_protocolo(self, protocolo: str) -> Optional[Lote]:
        result = await self.session.execute(
            select(LoteModel).where(LoteModel.protocolo == protocolo)
        )
        model = result.scalar_one_or_none()
        return LoteMapper.to_entity(model) if model else None
    
    async def buscar_por_cnpj(self, cnpj: str, limit: int = 100) -> List[Lote]:
        result = await self.session.execute(
            select(LoteModel)
            .where(LoteModel.cnpj == cnpj)
            .order_by(LoteModel.criado_em.desc())
            .limit(limit)
        )
        models = result.scalars().all()
        return [LoteMapper.to_entity(m) for m in models]
    
    async def listar(self, skip: int = 0, limit: int = 100) -> List[Lote]:
        result = await self.session.execute(
            select(LoteModel)
            .order_by(LoteModel.criado_em.desc())
            .offset(skip)
            .limit(limit)
        )
        models = result.scalars().all()
        return [LoteMapper.to_entity(m) for m in models]
    
    async def atualizar(self, lote: Lote) -> Lote:
        result = await self.session.execute(
            select(LoteModel).where(LoteModel.id == lote.id)
        )
        model = result.scalar_one_or_none()
        if model:
            model.protocolo = lote.protocolo
            model.cnpj = lote.cnpj
            model.periodo_mes = lote.periodo_mes
            model.periodo_ano = lote.periodo_ano
            model.email_notificacao = lote.email_notificacao
            model.nome_layout = lote.nome_layout
            model.codigo_matriz_filial = lote.codigo_matriz_filial
            model.status = lote.status.value if isinstance(lote.status, StatusLote) else lote.status
            model.mensagem_erro = lote.mensagem_erro
            model.nome_arquivo = lote.nome_arquivo
            model.caminho_arquivo_original = lote.caminho_arquivo_original
            model.caminho_arquivo_saida = lote.caminho_arquivo_saida
            model.lancamentos_json = [LoteMapper._lancamento_to_dict(l) for l in lote.lancamentos]
            model.pendencias_json = [LoteMapper._pendencia_to_dict(p) for p in lote.pendencias]
            model.atualizado_em = lote.atualizado_em
            model.processado_em = lote.processado_em

            await self.session.commit()
            await self.session.refresh(model)
            return LoteMapper.to_entity(model)
        return lote
    
    async def deletar(self, id: str) -> bool:
        result = await self.session.execute(
            delete(LoteModel).where(LoteModel.id == id)
        )
        await self.session.commit()
        return result.rowcount > 0
    
    async def contar(self) -> int:
        result = await self.session.execute(
            select(func.count(LoteModel.id))
        )
        return result.scalar() or 0
    
    async def contar_por_status(self) -> dict:
        result = await self.session.execute(
            select(LoteModel.status, func.count(LoteModel.id))
            .group_by(LoteModel.status)
        )
        return {row[0]: row[1] for row in result.all()}


class SQLAlchemyMapeamentoRepository(MapeamentoContaRepositoryPort):
    """Implementação do repositório de mapeamentos"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    def _model_to_entity(self, model: MapeamentoContaModel) -> MapeamentoConta:
        """Converte modelo para entidade"""
        return MapeamentoConta(
            id=model.id,
            cnpj=model.cnpj,
            conta_cliente=model.conta_cliente,
            conta_padrao=model.conta_padrao,
            nome_conta_cliente=model.nome_conta_cliente,
            nome_conta_padrao=model.nome_conta_padrao,
            criado_em=model.criado_em
        )
    
    async def salvar(self, mapeamento: MapeamentoConta) -> MapeamentoConta:
        model = MapeamentoContaModel(
            id=mapeamento.id,
            cnpj=mapeamento.cnpj,
            conta_cliente=mapeamento.conta_cliente,
            conta_padrao=mapeamento.conta_padrao,
            nome_conta_cliente=mapeamento.nome_conta_cliente,
            nome_conta_padrao=mapeamento.nome_conta_padrao,
            criado_em=mapeamento.criado_em
        )
        self.session.add(model)
        await self.session.commit()
        return mapeamento
    
    async def buscar_por_id(self, id: str) -> Optional[MapeamentoConta]:
        result = await self.session.execute(
            select(MapeamentoContaModel).where(MapeamentoContaModel.id == id)
        )
        model = result.scalar_one_or_none()
        return self._model_to_entity(model) if model else None
    
    async def buscar_por_conta_cliente(self, cnpj: str, conta_cliente: str) -> Optional[MapeamentoConta]:
        result = await self.session.execute(
            select(MapeamentoContaModel)
            .where(MapeamentoContaModel.cnpj == cnpj)
            .where(MapeamentoContaModel.conta_cliente == conta_cliente)
        )
        model = result.scalar_one_or_none()
        return self._model_to_entity(model) if model else None
    
    async def listar(self, skip: int = 0, limit: int = 100) -> List[MapeamentoConta]:
        result = await self.session.execute(
            select(MapeamentoContaModel)
            .order_by(MapeamentoContaModel.cnpj, MapeamentoContaModel.conta_cliente)
            .offset(skip)
            .limit(limit)
        )
        models = result.scalars().all()
        return [self._model_to_entity(m) for m in models]
    
    async def listar_por_cnpj(self, cnpj: str) -> List[MapeamentoConta]:
        result = await self.session.execute(
            select(MapeamentoContaModel)
            .where(MapeamentoContaModel.cnpj == cnpj)
            .order_by(MapeamentoContaModel.conta_cliente)
        )
        models = result.scalars().all()
        return [self._model_to_entity(m) for m in models]
    
    async def listar_cnpjs_distintos(self) -> List[str]:
        result = await self.session.execute(
            select(MapeamentoContaModel.cnpj).distinct().order_by(MapeamentoContaModel.cnpj)
        )
        return [row[0] for row in result.all()]
    
    async def atualizar(self, mapeamento: MapeamentoConta) -> MapeamentoConta:
        result = await self.session.execute(
            select(MapeamentoContaModel).where(MapeamentoContaModel.id == mapeamento.id)
        )
        model = result.scalar_one_or_none()
        if model:
            model.conta_padrao = mapeamento.conta_padrao
            model.nome_conta_cliente = mapeamento.nome_conta_cliente
            model.nome_conta_padrao = mapeamento.nome_conta_padrao
            await self.session.commit()
            await self.session.refresh(model)
        return mapeamento
    
    async def atualizar_em_lote(self, ids: List[str], conta_padrao: str) -> int:
        from sqlalchemy import update
        result = await self.session.execute(
            update(MapeamentoContaModel)
            .where(MapeamentoContaModel.id.in_(ids))
            .values(conta_padrao=conta_padrao)
        )
        await self.session.commit()
        return result.rowcount
    
    async def deletar(self, id: str) -> bool:
        result = await self.session.execute(
            delete(MapeamentoContaModel).where(MapeamentoContaModel.id == id)
        )
        await self.session.commit()
        return result.rowcount > 0
    
    async def deletar_em_lote(self, ids: List[str]) -> int:
        result = await self.session.execute(
            delete(MapeamentoContaModel).where(MapeamentoContaModel.id.in_(ids))
        )
        await self.session.commit()
        return result.rowcount
    
    async def contar(self, cnpj: Optional[str] = None) -> int:
        query = select(func.count(MapeamentoContaModel.id))
        if cnpj:
            query = query.where(MapeamentoContaModel.cnpj == cnpj)
        result = await self.session.execute(query)
        return result.scalar() or 0
