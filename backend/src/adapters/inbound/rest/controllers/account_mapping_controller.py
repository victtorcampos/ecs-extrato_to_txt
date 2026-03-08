"""Controllers REST para API de Mapeamento de Contas (Account Mappings)"""
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.adapters.inbound.rest.dto import (
    CriarMapeamentoRequest,
    AtualizarMapeamentoRequest,
    AtualizarLoteMapeamentoRequest,
    DeletarLoteMapeamentoRequest,
    MapeamentoResponse,
    MapeamentoListResponse,
    MensagemResponse
)
from src.adapters.outbound.repositories.sqlalchemy import SQLAlchemyMapeamentoRepository
from src.application.usecases import (
    CriarMapeamentoUseCase,
    AtualizarMapeamentoUseCase,
    AtualizarLoteMapeamentoUseCase,
    ListarMapeamentosUseCase,
    DeletarMapeamentoUseCase,
    MapeamentoNaoEncontradoError
)
from src.domain.entities import MapeamentoConta
from src.domain.exceptions import DomainError
from src.config.database import get_session


router = APIRouter(prefix="/api/v1/account-mappings", tags=["Account Mappings"])


def _formatar_cnpj(cnpj: str) -> str:
    """Formata CNPJ para exibição"""
    cnpj = re.sub(r'[^\d]', '', cnpj)
    if len(cnpj) == 14:
        return f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:]}"
    return cnpj


def _mapeamento_to_response(mapeamento: MapeamentoConta) -> MapeamentoResponse:
    """Converte entidade para DTO de resposta"""
    return MapeamentoResponse(
        id=mapeamento.id,
        cnpj=mapeamento.cnpj,
        cnpj_formatado=_formatar_cnpj(mapeamento.cnpj),
        conta_cliente=mapeamento.conta_cliente,
        conta_padrao=mapeamento.conta_padrao,
        nome_conta_cliente=mapeamento.nome_conta_cliente,
        nome_conta_padrao=mapeamento.nome_conta_padrao,
        criado_em=mapeamento.criado_em.isoformat() if mapeamento.criado_em else ""
    )


@router.get("", response_model=MapeamentoListResponse)
async def listar_mapeamentos(
    cnpj: Optional[str] = Query(None, description="Filtrar por CNPJ"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    session: AsyncSession = Depends(get_session)
):
    """Lista mapeamentos de contas com filtro opcional por CNPJ"""
    try:
        repo = SQLAlchemyMapeamentoRepository(session)
        use_case = ListarMapeamentosUseCase(repo)
        
        mapeamentos = await use_case.listar(cnpj=cnpj, skip=skip, limit=limit)
        total = await use_case.contar(cnpj=cnpj)
        cnpjs = await use_case.listar_cnpjs()
        
        return MapeamentoListResponse(
            items=[_mapeamento_to_response(m) for m in mapeamentos],
            total=total,
            cnpjs_disponiveis=cnpjs
        )
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/cnpjs", response_model=list[str])
async def listar_cnpjs(session: AsyncSession = Depends(get_session)):
    """Lista CNPJs distintos que possuem mapeamentos"""
    repo = SQLAlchemyMapeamentoRepository(session)
    use_case = ListarMapeamentosUseCase(repo)
    return await use_case.listar_cnpjs()


@router.get("/{mapeamento_id}", response_model=MapeamentoResponse)
async def obter_mapeamento(
    mapeamento_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Obtém um mapeamento específico por ID"""
    repo = SQLAlchemyMapeamentoRepository(session)
    use_case = ListarMapeamentosUseCase(repo)
    
    mapeamento = await use_case.buscar_por_id(mapeamento_id)
    if not mapeamento:
        raise HTTPException(status_code=404, detail="Mapeamento não encontrado")
    
    return _mapeamento_to_response(mapeamento)


@router.post("", response_model=MapeamentoResponse, status_code=201)
async def criar_mapeamento(
    request: CriarMapeamentoRequest,
    session: AsyncSession = Depends(get_session)
):
    """Cria um novo mapeamento de conta"""
    try:
        repo = SQLAlchemyMapeamentoRepository(session)
        use_case = CriarMapeamentoUseCase(repo)
        
        mapeamento = await use_case.executar(
            cnpj=request.cnpj,
            conta_cliente=request.conta_cliente,
            conta_padrao=request.conta_padrao,
            nome_conta_cliente=request.nome_conta_cliente,
            nome_conta_padrao=request.nome_conta_padrao
        )
        
        return _mapeamento_to_response(mapeamento)
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{mapeamento_id}", response_model=MapeamentoResponse)
async def atualizar_mapeamento(
    mapeamento_id: str,
    request: AtualizarMapeamentoRequest,
    session: AsyncSession = Depends(get_session)
):
    """Atualiza um mapeamento existente"""
    try:
        repo = SQLAlchemyMapeamentoRepository(session)
        use_case = AtualizarMapeamentoUseCase(repo)
        
        mapeamento = await use_case.executar(
            id=mapeamento_id,
            conta_padrao=request.conta_padrao,
            nome_conta_cliente=request.nome_conta_cliente,
            nome_conta_padrao=request.nome_conta_padrao
        )
        
        return _mapeamento_to_response(mapeamento)
    except MapeamentoNaoEncontradoError:
        raise HTTPException(status_code=404, detail="Mapeamento não encontrado")
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/bulk/update", response_model=MensagemResponse)
async def atualizar_em_lote(
    request: AtualizarLoteMapeamentoRequest,
    session: AsyncSession = Depends(get_session)
):
    """Atualiza conta padrão de múltiplos mapeamentos"""
    try:
        repo = SQLAlchemyMapeamentoRepository(session)
        use_case = AtualizarLoteMapeamentoUseCase(repo)
        
        count = await use_case.executar(
            ids=request.ids,
            conta_padrao=request.conta_padrao
        )
        
        return MensagemResponse(
            mensagem=f"{count} mapeamento(s) atualizado(s) com sucesso",
            sucesso=True
        )
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{mapeamento_id}", response_model=MensagemResponse)
async def deletar_mapeamento(
    mapeamento_id: str,
    session: AsyncSession = Depends(get_session)
):
    """Remove um mapeamento"""
    try:
        repo = SQLAlchemyMapeamentoRepository(session)
        use_case = DeletarMapeamentoUseCase(repo)
        
        await use_case.executar(mapeamento_id)
        
        return MensagemResponse(mensagem="Mapeamento removido com sucesso")
    except MapeamentoNaoEncontradoError:
        raise HTTPException(status_code=404, detail="Mapeamento não encontrado")


@router.delete("/bulk/delete", response_model=MensagemResponse)
async def deletar_em_lote(
    request: DeletarLoteMapeamentoRequest,
    session: AsyncSession = Depends(get_session)
):
    """Remove múltiplos mapeamentos"""
    try:
        repo = SQLAlchemyMapeamentoRepository(session)
        use_case = DeletarMapeamentoUseCase(repo)
        
        count = await use_case.executar_em_lote(request.ids)
        
        return MensagemResponse(
            mensagem=f"{count} mapeamento(s) removido(s) com sucesso",
            sucesso=True
        )
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))
