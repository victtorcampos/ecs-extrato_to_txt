"""Controllers REST para a API de Lotes"""
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession

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
from src.adapters.outbound.repositories.sqlalchemy import SQLAlchemyLoteRepository, SQLAlchemyMapeamentoRepository, SQLAlchemyLayoutRepository
from src.adapters.outbound.excel_parser import CalamineExcelParser, DynamicExcelParser
from src.adapters.outbound.txt_generator import TxtGenerator
from src.adapters.outbound.email import ResendEmailSender
from src.application.usecases import (
    CriarProtocoloUseCase,
    ProcessarLoteUseCase,
    ResolverPendenciaUseCase,
    ConsultarLoteUseCase,
    DeletarLoteUseCase
)
from src.domain.entities import Lote, StatusLote
from src.domain.exceptions import DomainError
from src.config.database import get_session


router = APIRouter(prefix="/api/v1/lotes", tags=["Lotes"])


def _formatar_cnpj(cnpj: str) -> str:
    """Formata CNPJ para exibição"""
    cnpj = re.sub(r'[^\d]', '', cnpj)
    if len(cnpj) == 14:
        return f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:]}"
    return cnpj


def _lote_to_response(lote: Lote) -> LoteResponse:
    """Converte entidade Lote para DTO de resposta"""
    pendencias_resolvidas = sum(1 for p in lote.pendencias if p.resolvida)
    
    return LoteResponse(
        id=lote.id,
        protocolo=lote.protocolo,
        cnpj=lote.cnpj,
        cnpj_formatado=_formatar_cnpj(lote.cnpj),
        periodo=f"{lote.periodo_mes:02d}/{lote.periodo_ano}",
        email_notificacao=lote.email_notificacao,
        nome_layout=lote.nome_layout,
        layout_id=lote.layout_id,
        perfil_saida_id=lote.perfil_saida_id,
        codigo_matriz_filial=lote.codigo_matriz_filial,
        status=lote.status.value if isinstance(lote.status, StatusLote) else lote.status,
        mensagem_erro=lote.mensagem_erro,
        nome_arquivo=lote.nome_arquivo,
        tem_arquivo_saida=lote.arquivo_saida is not None,
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


@router.post("", response_model=LoteResponse, status_code=201)
async def criar_lote(
    request: CriarLoteRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session)
):
    """Cria um novo lote e inicia processamento em background"""
    try:
        # Criar repositório e use case
        lote_repo = SQLAlchemyLoteRepository(session)
        use_case = CriarProtocoloUseCase(lote_repo)
        
        # Criar lote
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
        
        # Agendar processamento em background
        background_tasks.add_task(
            _processar_lote_background,
            lote.id
        )
        
        return _lote_to_response(lote)
        
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


async def _processar_lote_background(lote_id: str):
    """Processa lote em background"""
    from src.config.database import async_session_factory
    
    async with async_session_factory() as session:
        try:
            lote_repo = SQLAlchemyLoteRepository(session)
            mapeamento_repo = SQLAlchemyMapeamentoRepository(session)
            layout_repo = SQLAlchemyLayoutRepository(session)
            excel_parser = CalamineExcelParser()
            dynamic_parser = DynamicExcelParser()
            txt_generator = TxtGenerator()
            email_sender = ResendEmailSender()
            
            use_case = ProcessarLoteUseCase(
                lote_repo,
                mapeamento_repo,
                excel_parser,
                txt_generator,
                email_sender,
                layout_repository=layout_repo,
                dynamic_parser=dynamic_parser,
            )
            
            await use_case.executar(lote_id)
        except Exception as e:
            print(f"Erro no processamento background: {e}")


@router.get("", response_model=list[LoteResponse])
async def listar_lotes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    cnpj: Optional[str] = None,
    protocolo: Optional[str] = None,
    status: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    """Lista lotes com filtros opcionais"""
    lote_repo = SQLAlchemyLoteRepository(session)
    use_case = ConsultarLoteUseCase(lote_repo)
    
    if protocolo:
        lote = await use_case.buscar_por_protocolo(protocolo)
        return [_lote_to_response(lote)] if lote else []
    
    if cnpj:
        lotes = await use_case.buscar_por_cnpj(cnpj)
    else:
        lotes = await use_case.listar(skip, limit)
    
    # Filtrar por status se especificado
    if status:
        lotes = [l for l in lotes if l.status.value == status or l.status == status]
    
    return [_lote_to_response(l) for l in lotes]


@router.get("/estatisticas", response_model=EstatisticasResponse)
async def obter_estatisticas(session: AsyncSession = Depends(get_session)):
    """Obtém estatísticas dos lotes"""
    lote_repo = SQLAlchemyLoteRepository(session)
    use_case = ConsultarLoteUseCase(lote_repo)
    
    stats = await use_case.estatisticas()
    return EstatisticasResponse(**stats)


@router.get("/{lote_id}", response_model=LoteDetalhadoResponse)
async def obter_lote(lote_id: str, session: AsyncSession = Depends(get_session)):
    """Obtém detalhes de um lote específico"""
    lote_repo = SQLAlchemyLoteRepository(session)
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
    session: AsyncSession = Depends(get_session)
):
    """Resolve pendências de mapeamento de um lote"""
    try:
        lote_repo = SQLAlchemyLoteRepository(session)
        mapeamento_repo = SQLAlchemyMapeamentoRepository(session)
        
        use_case = ResolverPendenciaUseCase(lote_repo, mapeamento_repo)
        lote = await use_case.executar(lote_id, request.mapeamentos)
        
        # Se todas pendências resolvidas, reprocessar
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
    session: AsyncSession = Depends(get_session)
):
    """Reprocessa um lote"""
    lote_repo = SQLAlchemyLoteRepository(session)
    use_case = ConsultarLoteUseCase(lote_repo)
    
    lote = await use_case.buscar_por_id(lote_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote não encontrado")
    
    # Atualizar status para aguardando
    lote.status = StatusLote.AGUARDANDO
    await lote_repo.atualizar(lote)
    
    # Agendar reprocessamento
    background_tasks.add_task(
        _processar_lote_background,
        lote.id
    )
    
    return _lote_to_response(lote)


@router.get("/{lote_id}/download")
async def download_arquivo(lote_id: str, session: AsyncSession = Depends(get_session)):
    """Faz download do arquivo TXT gerado"""
    from fastapi.responses import Response
    import base64
    
    lote_repo = SQLAlchemyLoteRepository(session)
    use_case = ConsultarLoteUseCase(lote_repo)
    
    lote = await use_case.buscar_por_id(lote_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote não encontrado")
    
    if not lote.arquivo_saida:
        raise HTTPException(status_code=400, detail="Arquivo ainda não foi gerado")
    
    # Decodificar base64
    arquivo_bytes = base64.b64decode(lote.arquivo_saida)
    
    return Response(
        content=arquivo_bytes,
        media_type="text/plain",
        headers={
            "Content-Disposition": f"attachment; filename={lote.protocolo}.txt"
        }
    )


@router.delete("/{lote_id}", response_model=MensagemResponse)
async def deletar_lote(lote_id: str, session: AsyncSession = Depends(get_session)):
    """Remove um lote"""
    try:
        lote_repo = SQLAlchemyLoteRepository(session)
        use_case = DeletarLoteUseCase(lote_repo)
        
        await use_case.executar(lote_id)
        return MensagemResponse(mensagem="Lote removido com sucesso")
        
    except DomainError as e:
        raise HTTPException(status_code=404, detail=str(e))
