"""Controllers REST para API de Perfis de Saída"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.inbound.rest.dto import (
    CriarPerfilSaidaRequest,
    AtualizarPerfilSaidaRequest,
    PerfilSaidaResponse,
    PerfilSaidaListResponse,
    MensagemResponse,
)
from src.adapters.outbound.repositories.sqlalchemy import SQLAlchemyPerfilSaidaRepository
from src.adapters.outbound.output_generators import OutputGeneratorFactory
from src.application.usecases import (
    CriarPerfilSaidaUseCase,
    AtualizarPerfilSaidaUseCase,
    ListarPerfisSaidaUseCase,
    DeletarPerfilSaidaUseCase,
)
from src.domain.entities import PerfilSaida, SISTEMAS_DISPONIVEIS, FORMATOS_DISPONIVEIS
from src.domain.exceptions import DomainError
from src.config.database import get_session


router = APIRouter(prefix="/api/v1/output-profiles", tags=["Output Profiles"])


def _perfil_to_response(perfil: PerfilSaida) -> PerfilSaidaResponse:
    sistema_info = SISTEMAS_DISPONIVEIS.get(perfil.sistema_destino, {})
    formato_info = FORMATOS_DISPONIVEIS.get(perfil.formato, {})
    return PerfilSaidaResponse(
        id=perfil.id,
        nome=perfil.nome,
        sistema_destino=perfil.sistema_destino.value,
        sistema_destino_nome=sistema_info.get("nome", perfil.sistema_destino.value),
        formato=perfil.formato.value,
        formato_nome=formato_info.get("nome", perfil.formato.value),
        descricao=perfil.descricao,
        padrao=perfil.padrao,
        ativo=perfil.ativo,
        config=perfil.config.to_dict(),
        criado_em=perfil.criado_em.isoformat() if perfil.criado_em else "",
        atualizado_em=perfil.atualizado_em.isoformat() if perfil.atualizado_em else "",
    )


@router.get("", response_model=PerfilSaidaListResponse)
async def listar_perfis(
    apenas_ativos: bool = Query(False),
    sistema: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session),
):
    """Lista perfis de saída"""
    repo = SQLAlchemyPerfilSaidaRepository(session)
    use_case = ListarPerfisSaidaUseCase(repo)
    perfis = await use_case.listar(apenas_ativos=apenas_ativos, sistema=sistema)
    total = await use_case.contar(sistema=sistema)
    return PerfilSaidaListResponse(
        items=[_perfil_to_response(p) for p in perfis],
        total=total,
    )


@router.get("/sistemas-disponiveis")
async def sistemas_disponiveis():
    """Retorna sistemas e formatos disponíveis para configuração"""
    return {
        "sistemas": [
            {
                "value": k.value,
                "nome": v["nome"],
                "descricao": v["descricao"],
                "formatos": [{"value": f.value, "nome": FORMATOS_DISPONIVEIS[f]["nome"], "extensao": FORMATOS_DISPONIVEIS[f]["extensao"]} for f in v["formatos"]],
            }
            for k, v in SISTEMAS_DISPONIVEIS.items()
        ],
        "geradores_implementados": OutputGeneratorFactory.listar_disponiveis(),
    }


@router.get("/{perfil_id}", response_model=PerfilSaidaResponse)
async def obter_perfil(perfil_id: str, session: AsyncSession = Depends(get_session)):
    """Obtém um perfil de saída específico"""
    repo = SQLAlchemyPerfilSaidaRepository(session)
    use_case = ListarPerfisSaidaUseCase(repo)
    perfil = await use_case.buscar_por_id(perfil_id)
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil de saída não encontrado")
    return _perfil_to_response(perfil)


@router.post("", response_model=PerfilSaidaResponse, status_code=201)
async def criar_perfil(request: CriarPerfilSaidaRequest, session: AsyncSession = Depends(get_session)):
    """Cria um novo perfil de saída"""
    try:
        repo = SQLAlchemyPerfilSaidaRepository(session)
        use_case = CriarPerfilSaidaUseCase(repo)
        perfil = await use_case.executar(
            nome=request.nome,
            sistema_destino=request.sistema_destino,
            formato=request.formato,
            config=request.config.model_dump() if request.config else None,
            descricao=request.descricao,
            padrao=request.padrao,
        )
        return _perfil_to_response(perfil)
    except (DomainError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{perfil_id}", response_model=PerfilSaidaResponse)
async def atualizar_perfil(
    perfil_id: str,
    request: AtualizarPerfilSaidaRequest,
    session: AsyncSession = Depends(get_session),
):
    """Atualiza um perfil de saída existente"""
    try:
        repo = SQLAlchemyPerfilSaidaRepository(session)
        use_case = AtualizarPerfilSaidaUseCase(repo)
        perfil = await use_case.executar(
            perfil_id=perfil_id,
            nome=request.nome,
            descricao=request.descricao,
            config=request.config.model_dump() if request.config else None,
            ativo=request.ativo,
            padrao=request.padrao,
        )
        return _perfil_to_response(perfil)
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{perfil_id}", response_model=MensagemResponse)
async def deletar_perfil(perfil_id: str, session: AsyncSession = Depends(get_session)):
    """Remove um perfil de saída"""
    try:
        repo = SQLAlchemyPerfilSaidaRepository(session)
        use_case = DeletarPerfilSaidaUseCase(repo)
        await use_case.executar(perfil_id)
        return MensagemResponse(mensagem="Perfil de saída removido com sucesso")
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))
