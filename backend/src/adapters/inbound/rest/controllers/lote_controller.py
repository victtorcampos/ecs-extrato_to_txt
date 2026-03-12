"""Controllers REST para a API de Lotes"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query

from src.adapters.inbound.rest.dto import (
    CriarLoteRequest,
    ResolverPendenciasRequest,
    LoteResponse,
    LoteDetalhadoResponse,
    LancamentoResponse,
    PendenciaResponse,
    EstatisticasResponse,
    MensagemResponse
)
from src.application.usecases import (
    CriarProtocoloUseCase,
    ResolverPendenciaUseCase,
    ConsultarLoteUseCase,
    DeletarLoteUseCase
)
from src.domain.entities import Lote, StatusLote
from src.domain.exceptions import DomainError
from src.domain.value_objects import CNPJ
from src.config.dependencies import get_lote_repository, get_mapeamento_repository, get_file_storage
from src.config.logging_config import get_logger

logger = get_logger("lote_controller")

router = APIRouter(prefix="/api/v1/lotes", tags=["Lotes"])


def _lote_to_response(lote: Lote) -> LoteResponse:
    """Converte entidade Lote para DTO de resposta"""
    pendencias_resolvidas = sum(1 for p in lote.pendencias if p.resolvida)
    tem_arquivo = lote.caminho_arquivo_saida is not None

    return LoteResponse(
        id=lote.id,
        protocolo=lote.protocolo,
        cnpj=lote.cnpj,
        cnpj_formatado=CNPJ.formatar(lote.cnpj),
        periodo=f"{lote.periodo_mes:02d}/{lote.periodo_ano}",
        email_notificacao=lote.email_notificacao,
        nome_layout=lote.nome_layout,
        layout_id=lote.layout_id,
        perfil_saida_id=lote.perfil_saida_id,
        codigo_matriz_filial=lote.codigo_matriz_filial,
        status=lote.status.value if isinstance(lote.status, StatusLote) else lote.status,
        mensagem_erro=lote.mensagem_erro,
        nome_arquivo=lote.nome_arquivo,
        tem_arquivo_saida=tem_arquivo,
        total_lancamentos=len(lote.lancamentos),
        valor_total=sum(l.valor for l in lote.lancamentos),
        total_pendencias=len(lote.pendencias),
        pendencias_resolvidas=pendencias_resolvidas,
        criado_em=lote.criado_em.isoformat() if lote.criado_em else "",
        atualizado_em=lote.atualizado_em.isoformat() if lote.atualizado_em else "",
        processado_em=lote.processado_em.isoformat() if lote.processado_em else None
    )


def _lote_to_detalhado_response(lote: Lote) -> LoteDetalhadoResponse:
    """Converte entidade Lote para DTO detalhado"""
    base = _lote_to_response(lote)

    lancamentos = [
        LancamentoResponse(
            id=l.id,
            data=l.data.isoformat() if l.data else None,
            conta_debito=l.conta_debito,
            conta_credito=l.conta_credito,
            valor=l.valor,
            historico=l.historico,
            documento=l.documento,
            nome_empresa=l.nome_empresa
        )
        for l in lote.lancamentos
    ]

    pendencias = [
        PendenciaResponse(
            id=p.id,
            conta_cliente=p.conta_cliente,
            tipo=p.tipo,
            resolvida=p.resolvida,
            conta_mapeada=p.conta_mapeada,
            nome_conta=p.nome_conta
        )
        for p in lote.pendencias
    ]

    return LoteDetalhadoResponse(
        **base.model_dump(),
        lancamentos=lancamentos,
        pendencias=pendencias
    )


async def _processar_lote_background(lote_id: str):
    """Processa lote em background usando factory de DI com transacao atomica (B-11)"""
    from src.config.dependencies import create_processar_lote_dependencies

    session = None
    try:
        session, use_case = await create_processar_lote_dependencies()
        await use_case.executar(lote_id)
    except DomainError as e:
        logger.warning(f"Erro de dominio no lote {lote_id}: {e}")
        if session:
            await session.rollback()
    except Exception as e:
        logger.error(f"Erro no processamento background do lote {lote_id}: {e}", exc_info=True)
        if session:
            await session.rollback()
    finally:
        if session:
            await session.close()


@router.post("", response_model=LoteResponse, status_code=201)
async def criar_lote(
    request: CriarLoteRequest,
    background_tasks: BackgroundTasks,
    lote_repo=Depends(get_lote_repository),
    file_storage=Depends(get_file_storage),
):
    """Cria um novo lote e inicia processamento em background"""
    try:
        use_case = CriarProtocoloUseCase(lote_repo, file_storage=file_storage)

        lote = await use_case.executar(
            cnpj=request.cnpj,
            periodo_mes=request.periodo_mes,
            periodo_ano=request.periodo_ano,
            email_notificacao=request.email_notificacao,
            arquivo_base64=request.arquivo_base64,
            nome_arquivo=request.nome_arquivo,
            codigo_matriz_filial=request.codigo_matriz_filial,
            nome_layout=request.nome_layout,
            layout_id=request.layout_id,
            perfil_saida_id=request.perfil_saida_id
        )

        logger.info(f"Lote criado: {lote.protocolo} (CNPJ: {lote.cnpj})")

        background_tasks.add_task(
            _processar_lote_background,
            lote.id
        )

        return _lote_to_response(lote)

    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao criar lote: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@router.get("", response_model=list[LoteResponse])
async def listar_lotes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    cnpj: Optional[str] = None,
    protocolo: Optional[str] = None,
    status: Optional[str] = None,
    lote_repo=Depends(get_lote_repository),
):
    """Lista lotes com filtros opcionais"""
    use_case = ConsultarLoteUseCase(lote_repo)

    if protocolo:
        lote = await use_case.buscar_por_protocolo(protocolo)
        return [_lote_to_response(lote)] if lote else []

    if cnpj:
        lotes = await use_case.buscar_por_cnpj(cnpj)
    else:
        lotes = await use_case.listar(skip, limit)

    if status:
        lotes = [l for l in lotes if l.status.value == status or l.status == status]

    return [_lote_to_response(l) for l in lotes]


@router.get("/estatisticas", response_model=EstatisticasResponse)
async def obter_estatisticas(lote_repo=Depends(get_lote_repository)):
    """Obtém estatísticas dos lotes"""
    use_case = ConsultarLoteUseCase(lote_repo)
    stats = await use_case.estatisticas()
    return EstatisticasResponse(**stats)


@router.get("/{lote_id}", response_model=LoteDetalhadoResponse)
async def obter_lote(lote_id: str, lote_repo=Depends(get_lote_repository)):
    """Obtém detalhes de um lote específico"""
    use_case = ConsultarLoteUseCase(lote_repo)
    lote = await use_case.buscar_por_id(lote_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote não encontrado")
    return _lote_to_detalhado_response(lote)


@router.post("/{lote_id}/resolver-pendencias", response_model=LoteResponse)
async def resolver_pendencias(
    lote_id: str,
    request: ResolverPendenciasRequest,
    background_tasks: BackgroundTasks,
    lote_repo=Depends(get_lote_repository),
    mapeamento_repo=Depends(get_mapeamento_repository),
):
    """Resolve pendências de mapeamento de um lote"""
    try:
        use_case = ResolverPendenciaUseCase(lote_repo, mapeamento_repo)
        lote = await use_case.executar(lote_id, request.mapeamentos)

        if not lote.tem_pendencias and lote.status == StatusLote.AGUARDANDO:
            background_tasks.add_task(
                _processar_lote_background,
                lote.id
            )

        return _lote_to_response(lote)

    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{lote_id}/reprocessar", response_model=LoteResponse)
async def reprocessar_lote(
    lote_id: str,
    background_tasks: BackgroundTasks,
    lote_repo=Depends(get_lote_repository),
):
    """Reprocessa um lote"""
    use_case = ConsultarLoteUseCase(lote_repo)

    lote = await use_case.buscar_por_id(lote_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote não encontrado")

    lote.status = StatusLote.AGUARDANDO
    await lote_repo.atualizar(lote)

    background_tasks.add_task(
        _processar_lote_background,
        lote.id
    )

    return _lote_to_response(lote)


@router.get("/{lote_id}/download")
async def download_arquivo(
    lote_id: str,
    lote_repo=Depends(get_lote_repository),
    file_storage=Depends(get_file_storage),
):
    """Faz download do arquivo TXT gerado"""
    from fastapi.responses import Response

    use_case = ConsultarLoteUseCase(lote_repo)

    lote = await use_case.buscar_por_id(lote_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote não encontrado")

    if not lote.caminho_arquivo_saida:
        raise HTTPException(status_code=400, detail="Arquivo ainda não foi gerado")

    try:
        arquivo_bytes = await file_storage.ler(lote.caminho_arquivo_saida)
    except Exception as e:
        logger.error(f"Erro ao ler arquivo do disco ({lote.caminho_arquivo_saida}): {e}")
        raise HTTPException(status_code=500, detail="Erro ao ler arquivo do disco")

    return Response(
        content=arquivo_bytes,
        media_type="text/plain",
        headers={
            "Content-Disposition": f"attachment; filename={lote.protocolo}.txt"
        }
    )


@router.delete("/{lote_id}", response_model=MensagemResponse)
async def deletar_lote(lote_id: str, lote_repo=Depends(get_lote_repository)):
    """Remove um lote"""
    try:
        use_case = DeletarLoteUseCase(lote_repo)
        await use_case.executar(lote_id)
        return MensagemResponse(mensagem="Lote removido com sucesso")
    except DomainError as e:
        raise HTTPException(status_code=404, detail=str(e))
