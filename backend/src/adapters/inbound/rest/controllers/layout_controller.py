"""Controllers REST para API de Layouts de Importação Excel"""
import base64
import tempfile
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from src.adapters.inbound.rest.dto import (
    CriarLayoutRequest,
    AtualizarLayoutRequest,
    ClonarLayoutRequest,
    LayoutResponse,
    LayoutListResponse,
    MensagemResponse,
    PreviewExcelRequest,
    PreviewExcelResponse,
    DetectarLayoutRequest,
    DetectarLayoutResponse,
    ColunaSugeridaResponse,
    TemplateRegraResponse,
    TestParseRequest,
    TestParseResponse,
    LancamentoPreviewResponse,
    ResumoTestParseResponse,
    ErroTestParseResponse,
    ContaPendenteResponse,
)
from src.application.usecases import (
    CriarLayoutUseCase,
    AtualizarLayoutUseCase,
    ListarLayoutsUseCase,
    DeletarLayoutUseCase,
    ClonarLayoutUseCase,
)
from src.application.usecases.detect_usecases import DetectarLayoutUseCase, PreviewParseUseCase
from src.domain.entities import LayoutExcel
from src.domain.exceptions import DomainError, LayoutNaoEncontradoError
from src.domain.value_objects import get_campos_disponiveis
from src.config.dependencies import get_layout_repository, get_regra_repository, get_mapeamento_repository
from src.config.logging_config import get_logger

logger = get_logger("layout_controller")

router = APIRouter(prefix="/api/v1/import-layouts", tags=["Import Layouts"])


def _layout_to_response(layout: LayoutExcel, total_regras: int = 0) -> LayoutResponse:
    return LayoutResponse(
        id=layout.id,
        cnpj=layout.cnpj,
        nome=layout.nome,
        descricao=layout.descricao,
        ativo=layout.ativo,
        config_planilha=layout.config_planilha.to_dict(),
        colunas=[c.to_dict() for c in layout.colunas],
        config_valor=layout.config_valor.to_dict(),
        config_historico_padrao=layout.config_historico_padrao.to_dict(),
        regras_conta=[r.to_dict() for r in layout.regras_conta],
        total_colunas=layout.total_colunas,
        total_regras=total_regras,
        criado_em=layout.criado_em.isoformat() if layout.criado_em else "",
        atualizado_em=layout.atualizado_em.isoformat() if layout.atualizado_em else "",
    )


@router.get("", response_model=LayoutListResponse)
async def listar_layouts(
    cnpj: Optional[str] = Query(None, description="Filtrar por CNPJ"),
    apenas_ativos: bool = Query(False, description="Mostrar apenas ativos"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    layout_repo=Depends(get_layout_repository),
    regra_repo=Depends(get_regra_repository),
):
    """Lista layouts de importação"""
    try:
        use_case = ListarLayoutsUseCase(layout_repo)

        layouts = await use_case.listar(cnpj=cnpj, apenas_ativos=apenas_ativos, skip=skip, limit=limit)
        total = await use_case.contar(cnpj=cnpj)
        cnpjs = await use_case.listar_cnpjs()

        # Batch: resolve N+1 query contando regras para todos os layouts de uma vez
        layout_ids = [l.id for l in layouts]
        regras_count = await regra_repo.contar_por_layouts(layout_ids)
        items = [_layout_to_response(l, regras_count.get(l.id, 0)) for l in layouts]

        return LayoutListResponse(items=items, total=total, cnpjs_disponiveis=cnpjs)
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/campos-disponiveis")
async def campos_disponiveis():
    """Retorna campos disponíveis para mapeamento de colunas"""
    campos = get_campos_disponiveis()
    return {k: {"label": v["label"], "tipo": v["tipo"].value, "obrigatorio": v["obrigatorio"]} for k, v in campos.items()}


@router.post("/preview-excel", response_model=PreviewExcelResponse)
async def preview_excel(request: PreviewExcelRequest):
    """Extrai prévia de um arquivo Excel para configuração de layout"""
    try:
        from python_calamine import CalamineWorkbook

        arquivo_bytes = base64.b64decode(request.arquivo_base64)
        with tempfile.NamedTemporaryFile(suffix=".xls", delete=False) as tmp:
            tmp.write(arquivo_bytes)
            tmp_path = tmp.name

        try:
            wb = CalamineWorkbook.from_path(tmp_path)
            if not wb.sheet_names:
                raise HTTPException(status_code=400, detail="Arquivo Excel sem planilhas")

            aba = request.nome_aba if request.nome_aba and request.nome_aba in wb.sheet_names else wb.sheet_names[0]
            sheet_data = wb.get_sheet_by_name(aba).to_python()

            if len(sheet_data) == 0:
                raise HTTPException(status_code=400, detail="Planilha vazia")

            cabecalhos = []
            if request.linha_cabecalho < len(sheet_data):
                cabecalhos = [str(c) if c is not None else f"Col_{i}" for i, c in enumerate(sheet_data[request.linha_cabecalho])]

            inicio = request.linha_inicio_dados
            fim = min(inicio + request.max_linhas, len(sheet_data))
            linhas = []
            for row in sheet_data[inicio:fim]:
                linhas.append([_serialize_cell(c) for c in row])

            total_linhas = max(0, len(sheet_data) - request.linha_inicio_dados)
            total_colunas = len(cabecalhos) if cabecalhos else (len(sheet_data[0]) if sheet_data else 0)

            return PreviewExcelResponse(
                abas=wb.sheet_names,
                aba_selecionada=aba,
                cabecalhos=cabecalhos,
                linhas=linhas,
                total_linhas=total_linhas,
                total_colunas=total_colunas,
            )
        finally:
            os.unlink(tmp_path)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao processar preview Excel: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Erro ao processar arquivo: {str(e)}")


def _serialize_cell(value):
    """Serializa um valor de célula para JSON"""
    if value is None:
        return None
    from datetime import date, datetime
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    if isinstance(value, date):
        return value.strftime("%d/%m/%Y")
    if isinstance(value, (int, float)):
        return value
    return str(value)


@router.get("/cnpjs", response_model=list[str])
async def listar_cnpjs(layout_repo=Depends(get_layout_repository)):
    """Lista CNPJs distintos que possuem layouts"""
    use_case = ListarLayoutsUseCase(layout_repo)
    return await use_case.listar_cnpjs()


@router.get("/{layout_id}", response_model=LayoutResponse)
async def obter_layout(
    layout_id: str,
    layout_repo=Depends(get_layout_repository),
    regra_repo=Depends(get_regra_repository),
):
    """Obtém um layout específico por ID"""
    use_case = ListarLayoutsUseCase(layout_repo)

    layout = await use_case.buscar_por_id(layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout não encontrado")

    n_regras = await regra_repo.contar_por_layout(layout.id)
    return _layout_to_response(layout, n_regras)


@router.post("", response_model=LayoutResponse, status_code=201)
async def criar_layout(
    request: CriarLayoutRequest,
    layout_repo=Depends(get_layout_repository),
):
    """Cria um novo layout de importação"""
    try:
        use_case = CriarLayoutUseCase(layout_repo)

        layout = await use_case.executar(
            cnpj=request.cnpj,
            nome=request.nome,
            descricao=request.descricao,
            config_planilha=request.config_planilha.model_dump() if request.config_planilha else None,
            colunas=[c.model_dump() for c in request.colunas] if request.colunas else None,
            config_valor=request.config_valor.model_dump() if request.config_valor else None,
            config_historico_padrao=request.config_historico_padrao.model_dump() if request.config_historico_padrao else None,
            regras_conta=[r.model_dump() for r in request.regras_conta] if request.regras_conta is not None else None,
        )

        return _layout_to_response(layout)
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{layout_id}", response_model=LayoutResponse)
async def atualizar_layout(
    layout_id: str,
    request: AtualizarLayoutRequest,
    layout_repo=Depends(get_layout_repository),
    regra_repo=Depends(get_regra_repository),
):
    """Atualiza um layout existente"""
    try:
        use_case = AtualizarLayoutUseCase(layout_repo)

        layout = await use_case.executar(
            layout_id=layout_id,
            nome=request.nome,
            descricao=request.descricao,
            ativo=request.ativo,
            config_planilha=request.config_planilha.model_dump() if request.config_planilha else None,
            colunas=[c.model_dump() for c in request.colunas] if request.colunas else None,
            config_valor=request.config_valor.model_dump() if request.config_valor else None,
            config_historico_padrao=request.config_historico_padrao.model_dump() if request.config_historico_padrao else None,
            regras_conta=[r.model_dump() for r in request.regras_conta] if request.regras_conta is not None else None,
        )

        n_regras = await regra_repo.contar_por_layout(layout.id)
        return _layout_to_response(layout, n_regras)
    except LayoutNaoEncontradoError:
        raise HTTPException(status_code=404, detail="Layout não encontrado")
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{layout_id}/clone", response_model=LayoutResponse, status_code=201)
async def clonar_layout(
    layout_id: str,
    request: ClonarLayoutRequest,
    layout_repo=Depends(get_layout_repository),
    regra_repo=Depends(get_regra_repository),
):
    """Clona um layout existente"""
    try:
        use_case = ClonarLayoutUseCase(layout_repo, regra_repo)

        layout = await use_case.executar(
            layout_id=layout_id,
            novo_cnpj=request.novo_cnpj,
            novo_nome=request.novo_nome,
        )

        n_regras = await regra_repo.contar_por_layout(layout.id)
        return _layout_to_response(layout, n_regras)
    except LayoutNaoEncontradoError:
        raise HTTPException(status_code=404, detail="Layout não encontrado")
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{layout_id}", response_model=MensagemResponse)
async def deletar_layout(
    layout_id: str,
    layout_repo=Depends(get_layout_repository),
    regra_repo=Depends(get_regra_repository),
):
    """Remove um layout e suas regras"""
    try:
        use_case = DeletarLayoutUseCase(layout_repo, regra_repo)
        await use_case.executar(layout_id)
        return MensagemResponse(mensagem="Layout removido com sucesso")
    except LayoutNaoEncontradoError:
        raise HTTPException(status_code=404, detail="Layout não encontrado")
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))



# ─── Endpoints Fase 4: Auto-Detecção e Test-Parse ────────────────

@router.post("/detect", response_model=DetectarLayoutResponse)
async def detectar_layout(request: DetectarLayoutRequest):
    """Auto-detecta estrutura, tipos e mapeamento de um arquivo Excel"""
    try:
        use_case = DetectarLayoutUseCase()
        resultado = use_case.executar(
            arquivo_base64=request.arquivo_base64,
            nome_aba=request.nome_aba,
        )

        return DetectarLayoutResponse(
            config_planilha=resultado["config_planilha"],
            colunas=[ColunaSugeridaResponse(**c) for c in resultado["colunas"]],
            config_valor=resultado["config_valor"],
            templates_regras=[TemplateRegraResponse(**t) for t in resultado["templates_regras"]],
            preview_dados=resultado["preview_dados"],
            abas=resultado["abas"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro na auto-detecção: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro na auto-detecção: {str(e)}")


@router.post("/test-parse", response_model=TestParseResponse)
async def test_parse(
    request: TestParseRequest,
    layout_repo=Depends(get_layout_repository),
    mapeamento_repo=Depends(get_mapeamento_repository),
):
    """Simula parsing completo sem gravar — preview dos lançamentos"""
    try:
        use_case = PreviewParseUseCase(layout_repository=layout_repo)
        resultado = await use_case.executar(
            arquivo_base64=request.arquivo_base64,
            periodo_mes=request.periodo_mes,
            periodo_ano=request.periodo_ano,
            layout_id=request.layout_id,
            layout_config=request.layout_config,
            regras_conta=request.regras_conta,
            mapeamentos_manuais=request.mapeamentos_manuais,
        )

        # Coletar contas pendentes (sem mapeamento)
        contas_pendentes = []
        contas_vistas = set()
        mapeamentos_existentes = {}

        # Buscar mapeamentos existentes do banco se CNPJ fornecido
        if request.cnpj:
            cnpj_limpo = request.cnpj.replace(".", "").replace("/", "").replace("-", "")
            try:
                maps = await mapeamento_repo.listar_por_cnpj(cnpj_limpo)
                mapeamentos_existentes = {m.conta_cliente: m.conta_padrao for m in maps}
            except Exception:
                pass

        mapeamentos_manuais = request.mapeamentos_manuais or {}

        for lanc in resultado["lancamentos"]:
            if lanc.get("status") == "ok":
                continue
            for tipo, campo in [("debito", "conta_debito"), ("credito", "conta_credito")]:
                conta = lanc.get(campo, "")
                chave = f"{conta}:{tipo}"
                if conta and chave not in contas_vistas and conta not in mapeamentos_manuais:
                    contas_vistas.add(chave)
                    contas_pendentes.append(ContaPendenteResponse(
                        conta=conta,
                        tipo=tipo,
                        mapeamento_existente=mapeamentos_existentes.get(conta),
                    ))

        return TestParseResponse(
            lancamentos=[LancamentoPreviewResponse(**l) for l in resultado["lancamentos"]],
            resumo=ResumoTestParseResponse(**resultado["resumo"]),
            erros=[ErroTestParseResponse(**e) for e in resultado["erros"]],
            contas_pendentes=contas_pendentes,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro no test-parse: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro no test-parse: {str(e)}")