"""Controllers REST para API de Regras de Processamento"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.inbound.rest.dto import (
    CriarRegraRequest,
    AtualizarRegraRequest,
    ReordenarRegrasRequest,
    RegraResponse,
    RegraListResponse,
    MensagemResponse,
)
from src.adapters.outbound.repositories.sqlalchemy import (
    SQLAlchemyLayoutRepository,
    SQLAlchemyRegraRepository,
)
from src.application.usecases import (
    CriarRegraUseCase,
    AtualizarRegraUseCase,
    ListarRegrasUseCase,
    ReordenarRegrasUseCase,
    DeletarRegraUseCase,
    TestarRegraUseCase,
    AplicarRegrasUseCase,
)
from src.domain.entities import RegraProcessamento
from src.domain.exceptions import DomainError, RegraNaoEncontradaError, LayoutNaoEncontradoError
from src.config.database import get_session


router = APIRouter(prefix="/api/v1/import-layouts/{layout_id}/rules", tags=["Processing Rules"])


def _regra_to_response(regra: RegraProcessamento) -> RegraResponse:
    return RegraResponse(
        id=regra.id,
        layout_id=regra.layout_id,
        nome=regra.nome,
        descricao=regra.descricao,
        ordem=regra.ordem,
        ativo=regra.ativo,
        tipo=regra.tipo.value if hasattr(regra.tipo, "value") else regra.tipo,
        condicoes=[c.to_dict() for c in regra.condicoes],
        condicoes_ou=[c.to_dict() for c in regra.condicoes_ou],
        acao=regra.acao.to_dict(),
        acoes_extras=[a.to_dict() for a in regra.acoes_extras],
        criado_em=regra.criado_em.isoformat() if regra.criado_em else "",
        atualizado_em=regra.atualizado_em.isoformat() if regra.atualizado_em else "",
    )


@router.get("", response_model=RegraListResponse)
async def listar_regras(
    layout_id: str,
    apenas_ativas: bool = Query(False),
    session: AsyncSession = Depends(get_session),
):
    """Lista regras de um layout"""
    try:
        regra_repo = SQLAlchemyRegraRepository(session)
        use_case = ListarRegrasUseCase(regra_repo)

        regras = await use_case.listar_por_layout(layout_id, apenas_ativas)
        total = await use_case.contar_por_layout(layout_id)

        return RegraListResponse(
            items=[_regra_to_response(r) for r in regras],
            total=total,
        )
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{regra_id}", response_model=RegraResponse)
async def obter_regra(layout_id: str, regra_id: str, session: AsyncSession = Depends(get_session)):
    """Obtém uma regra específica"""
    regra_repo = SQLAlchemyRegraRepository(session)
    use_case = ListarRegrasUseCase(regra_repo)

    regra = await use_case.buscar_por_id(regra_id)
    if not regra or regra.layout_id != layout_id:
        raise HTTPException(status_code=404, detail="Regra não encontrada")

    return _regra_to_response(regra)


@router.post("", response_model=RegraResponse, status_code=201)
async def criar_regra(
    layout_id: str,
    request: CriarRegraRequest,
    session: AsyncSession = Depends(get_session),
):
    """Cria uma nova regra de processamento"""
    try:
        layout_repo = SQLAlchemyLayoutRepository(session)
        regra_repo = SQLAlchemyRegraRepository(session)
        use_case = CriarRegraUseCase(regra_repo, layout_repo)

        regra = await use_case.executar(
            layout_id=layout_id,
            nome=request.nome,
            tipo=request.tipo,
            condicoes=[c.model_dump() for c in request.condicoes],
            acao=request.acao.model_dump(),
            descricao=request.descricao,
            condicoes_ou=[c.model_dump() for c in request.condicoes_ou] if request.condicoes_ou else None,
            acoes_extras=[a.model_dump() for a in request.acoes_extras] if request.acoes_extras else None,
            ativo=request.ativo,
        )

        return _regra_to_response(regra)
    except LayoutNaoEncontradoError:
        raise HTTPException(status_code=404, detail="Layout não encontrado")
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{regra_id}", response_model=RegraResponse)
async def atualizar_regra(
    layout_id: str,
    regra_id: str,
    request: AtualizarRegraRequest,
    session: AsyncSession = Depends(get_session),
):
    """Atualiza uma regra existente"""
    try:
        regra_repo = SQLAlchemyRegraRepository(session)
        use_case = AtualizarRegraUseCase(regra_repo)

        regra = await use_case.executar(
            regra_id=regra_id,
            nome=request.nome,
            descricao=request.descricao,
            tipo=request.tipo,
            condicoes=[c.model_dump() for c in request.condicoes] if request.condicoes else None,
            condicoes_ou=[c.model_dump() for c in request.condicoes_ou] if request.condicoes_ou else None,
            acao=request.acao.model_dump() if request.acao else None,
            acoes_extras=[a.model_dump() for a in request.acoes_extras] if request.acoes_extras else None,
            ativo=request.ativo,
        )

        return _regra_to_response(regra)
    except RegraNaoEncontradaError:
        raise HTTPException(status_code=404, detail="Regra não encontrada")
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/reorder", response_model=MensagemResponse)
async def reordenar_regras(
    layout_id: str,
    request: ReordenarRegrasRequest,
    session: AsyncSession = Depends(get_session),
):
    """Reordena as regras de um layout"""
    try:
        regra_repo = SQLAlchemyRegraRepository(session)
        use_case = ReordenarRegrasUseCase(regra_repo)

        await use_case.executar(layout_id, request.ordem_ids)
        return MensagemResponse(mensagem="Regras reordenadas com sucesso")
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{regra_id}", response_model=MensagemResponse)
async def deletar_regra(layout_id: str, regra_id: str, session: AsyncSession = Depends(get_session)):
    """Remove uma regra"""
    try:
        regra_repo = SQLAlchemyRegraRepository(session)
        use_case = DeletarRegraUseCase(regra_repo)
        await use_case.executar(regra_id)
        return MensagemResponse(mensagem="Regra removida com sucesso")
    except RegraNaoEncontradaError:
        raise HTTPException(status_code=404, detail="Regra não encontrada")
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))
