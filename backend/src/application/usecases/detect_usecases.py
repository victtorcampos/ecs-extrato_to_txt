"""Use Cases de Auto-Detecção e Preview (Fase 4)"""
import base64
import re
import tempfile
import os
from typing import List, Dict, Any, Optional
from datetime import date, datetime

from python_calamine import CalamineWorkbook

from src.config.logging_config import get_logger

logger = get_logger("detect_usecases")


# ─── Constantes de Detecção ────────────────────────────────────────

HEADER_KEYWORDS = {
    "data": ["data", "dt", "date", "dt_lanc", "data_lanc", "dt_mov", "data_mov"],
    "valor": ["valor", "vlr", "value", "amount", "montante", "total"],
    "historico": ["hist", "desc", "descricao", "descrição", "memo", "historico", "histórico", "obs", "complemento"],
    "conta_debito": ["deb", "debito", "débito", "debit", "conta_deb", "conta_debito"],
    "conta_credito": ["cred", "credito", "crédito", "credit", "conta_cred", "conta_credito"],
    "documento": ["doc", "nf", "nota", "documento", "num_doc", "nr_doc", "doc_fiscal"],
    "cnpj_cpf_terceiro": ["cnpj", "cpf", "cnpj_cpf", "cnpj/cpf"],
    "razao_social_terceiro": ["empresa", "fornecedor", "razao", "razão", "razao_social", "nome_empresa", "cliente"],
    "tipo_dc": ["d/c", "tipo", "debito/credito", "dc", "tipo_dc", "natureza"],
}

DATE_PATTERNS = [
    (r'^\d{2}/\d{2}/\d{4}$', "DD/MM/AAAA"),
    (r'^\d{2}-\d{2}-\d{4}$', "DD-MM-AAAA"),
    (r'^\d{4}-\d{2}-\d{2}$', "AAAA-MM-DD"),
    (r'^\d{2}\.\d{2}\.\d{4}$', "DD.MM.AAAA"),
]

DC_PATTERNS = [
    (r'^[\d.,]+\s*[DCdc]$', "sufixo"),
    (r'^[DCdc]\s*[\d.,]+$', "prefixo"),
]


# ─── Helpers ───────────────────────────────────────────────────────

def _serialize_cell(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    if isinstance(value, date):
        return value.strftime("%d/%m/%Y")
    if isinstance(value, (int, float)):
        return value
    return str(value)


def _is_text(value) -> bool:
    if value is None or str(value).strip() == "":
        return False
    text = str(value).strip()
    try:
        float(text.replace(",", ".").replace(".", "", text.count(".") - 1))
        return False
    except (ValueError, TypeError):
        pass
    if isinstance(value, (date, datetime)):
        return False
    return True


def _is_numeric(value) -> bool:
    if isinstance(value, (int, float)):
        return True
    if value is None:
        return False
    text = str(value).strip()
    if not text:
        return False
    cleaned = re.sub(r'[R$\s.,]', '', text)
    return cleaned.replace('-', '').isdigit() and len(cleaned) > 0


def _is_date_value(value) -> bool:
    if isinstance(value, (date, datetime)):
        return True
    if value is None:
        return False
    text = str(value).strip()
    for pattern, _ in DATE_PATTERNS:
        if re.match(pattern, text):
            return True
    return False


# ─── 2A. Detecção de Estrutura ────────────────────────────────────

def detectar_estrutura(rows: List[List]) -> Dict:
    """Detecta linha de cabeçalho e início dos dados"""
    if not rows:
        return {"linha_cabecalho": 0, "linha_inicio_dados": 1}

    best_header_idx = 0
    best_header_score = -1

    for i, row in enumerate(rows[:20]):  # Verificar primeiras 20 linhas
        if not row:
            continue
        non_empty = [c for c in row if c is not None and str(c).strip() != ""]
        if len(non_empty) == 0:
            continue
        text_count = sum(1 for c in non_empty if _is_text(c))
        text_ratio = text_count / len(non_empty) if non_empty else 0
        # Penalizar linhas com poucas colunas
        col_bonus = min(len(non_empty) / 3, 1.0)
        score = text_ratio * col_bonus
        if score > best_header_score:
            best_header_score = score
            best_header_idx = i

    # Encontrar primeira linha de dados após o cabeçalho
    data_start = best_header_idx + 1
    for i in range(best_header_idx + 1, min(len(rows), best_header_idx + 10)):
        row = rows[i]
        if not row:
            continue
        has_numeric = any(_is_numeric(c) for c in row)
        has_date = any(_is_date_value(c) for c in row)
        if has_numeric or has_date:
            data_start = i
            break

    return {
        "linha_cabecalho": best_header_idx,
        "linha_inicio_dados": data_start,
    }


# ─── 2B. Detecção de Tipos de Coluna ─────────────────────────────

def detectar_tipo_coluna(valores: List) -> Dict:
    """Detecta o tipo de dados de uma coluna baseado em amostra"""
    if not valores:
        return {"tipo_dado": "string", "formato": None, "confianca": 0.0}

    non_empty = [v for v in valores if v is not None and str(v).strip() != ""]
    if not non_empty:
        return {"tipo_dado": "string", "formato": None, "confianca": 0.0}

    total = len(non_empty)

    # Testar data
    date_count = sum(1 for v in non_empty if _is_date_value(v))
    if date_count / total >= 0.7:
        fmt = None
        for v in non_empty:
            text = str(v).strip()
            for pattern, fmt_name in DATE_PATTERNS:
                if re.match(pattern, text):
                    fmt = fmt_name
                    break
            if isinstance(v, (date, datetime)):
                fmt = "date_object"
            if fmt:
                break
        return {"tipo_dado": "data", "formato": fmt or "DD/MM/AAAA", "confianca": date_count / total}

    # Testar D/C (valor com sufixo/prefixo)
    dc_count = 0
    dc_tipo = None
    for v in non_empty:
        text = str(v).strip()
        for pattern, tipo in DC_PATTERNS:
            if re.match(pattern, text):
                dc_count += 1
                dc_tipo = tipo
                break
    if dc_count / total >= 0.5:
        return {"tipo_dado": "decimal_dc", "formato": dc_tipo, "confianca": dc_count / total}

    # Testar decimal BR (1.234,56 ou R$ 1.234,56)
    decimal_br_count = 0
    for v in non_empty:
        text = str(v).strip()
        cleaned = re.sub(r'[R$\s]', '', text)
        if re.match(r'^-?[\d.]+,\d{2}$', cleaned):
            decimal_br_count += 1
    if decimal_br_count / total >= 0.5:
        return {"tipo_dado": "decimal_br", "formato": "1.234,56", "confianca": decimal_br_count / total}

    # Testar numérico puro (float/int)
    numeric_count = sum(1 for v in non_empty if isinstance(v, (int, float)))
    if numeric_count / total >= 0.7:
        return {"tipo_dado": "decimal", "formato": "numerico", "confianca": numeric_count / total}

    # Testar CNPJ/CPF (14 ou 11 dígitos)
    cnpj_cpf_count = 0
    for v in non_empty:
        text = re.sub(r'[.\-/]', '', str(v).strip())
        if text.isdigit() and len(text) in (11, 14):
            cnpj_cpf_count += 1
    if cnpj_cpf_count / total >= 0.5:
        return {"tipo_dado": "cnpj_cpf", "formato": "numerico", "confianca": cnpj_cpf_count / total}

    # Testar campo composto (CNPJ + nome)
    compound_count = 0
    for v in non_empty:
        text = str(v).strip()
        if re.match(r'^\d{14}\s*[-–]\s*\S', text):
            compound_count += 1
    if compound_count / total >= 0.3:
        return {"tipo_dado": "campo_composto", "formato": "cnpj_nome", "confianca": compound_count / total}

    # Testar D/C puro (valores como "D", "C", "Débito", "Crédito")
    dc_pure = {"d", "c", "debito", "credito", "débito", "crédito"}
    dc_pure_count = sum(1 for v in non_empty if str(v).strip().lower() in dc_pure)
    if dc_pure_count / total >= 0.7:
        return {"tipo_dado": "tipo_dc", "formato": "coluna_tipo", "confianca": dc_pure_count / total}

    return {"tipo_dado": "string", "formato": None, "confianca": 0.5}


# ─── 2C. Sugestão de Mapeamento ──────────────────────────────────

def sugerir_campo_destino(header_name: str, tipo_detectado: Dict) -> tuple:
    """Retorna (campo_destino, confianca) baseado no nome do cabeçalho e tipo"""
    name_lower = header_name.lower().strip()
    tipo_dado = tipo_detectado.get("tipo_dado", "string")

    # Verificar pelo nome do cabeçalho
    for campo, keywords in HEADER_KEYWORDS.items():
        for kw in keywords:
            if kw == name_lower or kw in name_lower:
                return campo, 0.9

    # Se não achou pelo nome, tentar pelo tipo
    if tipo_dado == "data":
        return "data", 0.7
    if tipo_dado in ("decimal_br", "decimal", "decimal_dc"):
        return "valor", 0.6
    if tipo_dado == "cnpj_cpf":
        return "cnpj_cpf_terceiro", 0.7
    if tipo_dado == "campo_composto":
        return "razao_social_terceiro", 0.6
    if tipo_dado == "tipo_dc":
        return "tipo_dc", 0.8

    return "ignorar", 0.3


# ─── 2D. Sugestão de ConfigValor ─────────────────────────────────

def sugerir_config_valor(colunas_detectadas: List[Dict]) -> Dict:
    """Analisa colunas para sugerir como interpretar débito/crédito"""

    # Verificar se existe coluna tipo_dc
    for col in colunas_detectadas:
        if col.get("campo_destino") == "tipo_dc":
            return {
                "tipo_sinal": "coluna_tipo",
                "coluna_tipo": col["coluna_excel"],
            }

    # Verificar se valor tem D/C embutido
    for col in colunas_detectadas:
        if col.get("tipo_dado") == "decimal_dc":
            formato = col.get("formato", "sufixo")
            return {
                "tipo_sinal": "valor_com_dc",
                "formato_dc": formato,
            }

    # Verificar colunas separadas de débito e crédito
    has_debito_col = any(c.get("campo_destino") == "conta_debito" for c in colunas_detectadas)
    has_credito_col = any(c.get("campo_destino") == "conta_credito" for c in colunas_detectadas)
    valor_cols = [c for c in colunas_detectadas
                  if c.get("campo_destino") == "valor" and c.get("tipo_dado") in ("decimal_br", "decimal")]
    if len(valor_cols) >= 2:
        return {
            "tipo_sinal": "colunas_separadas",
            "coluna_debito": valor_cols[0]["coluna_excel"],
            "coluna_credito": valor_cols[1]["coluna_excel"],
        }

    # Verificar se valores têm sinais positivos/negativos
    for col in colunas_detectadas:
        if col.get("campo_destino") == "valor":
            samples = col.get("valores_amostra", [])
            has_negative = any(
                (isinstance(v, (int, float)) and v < 0) or
                (isinstance(v, str) and v.strip().startswith("-"))
                for v in samples
            )
            if has_negative:
                return {"tipo_sinal": "sinal_valor"}

    return {"tipo_sinal": "sinal_valor"}


# ─── Templates Contextuais de Regras ─────────────────────────────

def gerar_templates_regras(colunas: List[Dict], data_rows: List[List], headers: List[str]) -> List[Dict]:
    """Gera templates de regras baseados nos dados reais"""
    templates = []

    # Encontrar coluna de histórico/descrição para análise
    hist_col_idx = None
    for col in colunas:
        if col.get("campo_destino") in ("historico", "documento"):
            try:
                col_ref = col["coluna_excel"]
                if str(col_ref).isdigit():
                    hist_col_idx = int(col_ref)
                else:
                    hist_col_idx = headers.index(col_ref) if col_ref in headers else None
            except (ValueError, IndexError):
                pass
            if hist_col_idx is not None:
                break

    if hist_col_idx is not None:
        # Coletar valores únicos de descrição
        unique_descs = set()
        for row in data_rows[:50]:
            if hist_col_idx < len(row) and row[hist_col_idx]:
                desc = str(row[hist_col_idx]).strip()
                if desc:
                    unique_descs.add(desc)

        if len(unique_descs) > 0 and len(unique_descs) <= 20:
            templates.append({
                "nome": "Por descrição",
                "descricao": "Definir contas com base no texto da descrição/histórico",
                "tipo": "por_descricao",
                "condicoes": [{"campo": "historico", "operador": "contem", "valor": ""}],
                "conta_debito": "",
                "conta_credito": "",
                "valores_encontrados": sorted(list(unique_descs))[:15],
            })

    # Template por sinal do valor
    templates.append({
        "nome": "Por sinal do valor",
        "descricao": "Valor positivo = uma conta, negativo = outra",
        "tipo": "por_sinal",
        "condicoes": [{"campo": "valor", "operador": "maior_que", "valor": "0"}],
        "conta_debito": "",
        "conta_credito": "",
        "valores_encontrados": [],
    })

    return templates


# ─── DetectarLayoutUseCase ────────────────────────────────────────

class DetectarLayoutUseCase:
    """Analisa um arquivo Excel e sugere um layout completo automaticamente"""

    def executar(self, arquivo_base64: str, nome_aba: Optional[str] = None) -> Dict:
        """Executa auto-detecção completa"""
        # 1. Ler arquivo
        arquivo_bytes = base64.b64decode(arquivo_base64)
        with tempfile.NamedTemporaryFile(suffix=".xls", delete=False) as tmp:
            tmp.write(arquivo_bytes)
            tmp_path = tmp.name

        try:
            wb = CalamineWorkbook.from_path(tmp_path)
            abas = wb.sheet_names
            if not abas:
                raise ValueError("Arquivo Excel sem planilhas")

            aba = nome_aba if nome_aba and nome_aba in abas else abas[0]
            all_rows = wb.get_sheet_by_name(aba).to_python()

            if not all_rows or len(all_rows) < 2:
                raise ValueError("Planilha sem dados suficientes")

            # 2A. Detectar estrutura
            estrutura = detectar_estrutura(all_rows)
            linha_cab = estrutura["linha_cabecalho"]
            linha_dados = estrutura["linha_inicio_dados"]

            # Extrair cabeçalhos
            headers = []
            if linha_cab < len(all_rows):
                headers = [str(c).strip() if c is not None else f"Col_{i}"
                           for i, c in enumerate(all_rows[linha_cab])]

            # Extrair linhas de dados para análise
            data_rows = all_rows[linha_dados:linha_dados + 50]

            # 2B + 2C. Para cada coluna, detectar tipo e sugerir mapeamento
            colunas_detectadas = []
            for col_idx, header in enumerate(headers):
                # Coletar amostra de valores
                amostra = []
                for row in data_rows[:20]:
                    if col_idx < len(row):
                        amostra.append(row[col_idx])

                # Detectar tipo
                tipo_info = detectar_tipo_coluna(amostra)

                # Sugerir mapeamento
                campo_destino, conf_nome = sugerir_campo_destino(header, tipo_info)

                # Confiança final = média da detecção de tipo e do mapeamento
                confianca_final = (tipo_info["confianca"] + conf_nome) / 2

                # Montar transformação se necessário
                transformacao = {}
                if tipo_info["tipo_dado"] == "decimal_br":
                    transformacao["formato_numero"] = "br"
                elif tipo_info["tipo_dado"] == "decimal_dc":
                    transformacao["valor_com_dc"] = tipo_info.get("formato", "sufixo")
                elif tipo_info["tipo_dado"] == "campo_composto":
                    transformacao["campo_composto"] = True
                    transformacao["separador_composto"] = " - "

                colunas_detectadas.append({
                    "coluna_excel": str(col_idx),
                    "nome_cabecalho": header,
                    "campo_destino": campo_destino,
                    "tipo_dado": tipo_info["tipo_dado"],
                    "formato": tipo_info.get("formato"),
                    "transformacao": transformacao,
                    "confianca": round(confianca_final, 2),
                    "valores_amostra": [_serialize_cell(v) for v in amostra[:5]],
                })

            # 2D. Sugerir ConfigValor
            config_valor = sugerir_config_valor(colunas_detectadas)

            # Templates de regras contextuais
            templates = gerar_templates_regras(colunas_detectadas, data_rows, headers)

            # Preview de dados (primeiras 5 linhas)
            preview = []
            for row in data_rows[:5]:
                preview.append([_serialize_cell(c) for c in row])

            return {
                "config_planilha": {
                    "nome_aba": aba,
                    "linha_cabecalho": linha_cab,
                    "linha_inicio_dados": linha_dados,
                },
                "colunas": colunas_detectadas,
                "config_valor": config_valor,
                "templates_regras": templates,
                "preview_dados": preview,
                "abas": abas,
            }
        finally:
            os.unlink(tmp_path)


# ─── PreviewParseUseCase ─────────────────────────────────────────

class PreviewParseUseCase:
    """Simula parsing completo sem gravar — retorna preview dos lançamentos"""

    def __init__(self, layout_repository=None, dynamic_parser=None):
        self.layout_repository = layout_repository
        if dynamic_parser is None:
            from src.adapters.outbound.excel_parser import DynamicExcelParser
            self.dynamic_parser = DynamicExcelParser()
        else:
            self.dynamic_parser = dynamic_parser

    async def executar(
        self,
        arquivo_base64: str,
        periodo_mes: int,
        periodo_ano: int,
        layout_id: Optional[str] = None,
        layout_config: Optional[Dict] = None,
        regras_conta: Optional[List[Dict]] = None,
    ) -> Dict:
        """Executa test-parse e retorna preview"""
        from src.domain.entities.layout_entities import LayoutExcel

        # Obter layout (por ID ou inline)
        layout = None
        if layout_id and self.layout_repository:
            layout = await self.layout_repository.buscar_por_id(layout_id)
            if not layout:
                raise ValueError(f"Layout {layout_id} não encontrado")
        elif layout_config:
            layout = LayoutExcel.from_dict({
                "id": "preview-temp",
                "cnpj": layout_config.get("cnpj", "00000000000000"),
                "nome": "Preview Temporário",
                **layout_config,
            })
        else:
            raise ValueError("Necessário layout_id ou layout_config")

        # Aplicar regras de conta se fornecidas
        if regras_conta is not None:
            from src.domain.entities.layout_entities import RegraContaLayout
            layout.regras_conta = [RegraContaLayout.from_dict(r) for r in regras_conta]

        # Executar parsing via DynamicExcelParser
        try:
            lancamentos = self.dynamic_parser.parse(arquivo_base64, layout)
        except Exception as e:
            logger.error(f"Erro no test-parse: {e}", exc_info=True)
            return {
                "lancamentos": [],
                "resumo": {"total": 0, "ok": 0, "fora_periodo": 0, "sem_conta": 0, "erros": 1},
                "erros": [{"linha": 0, "campo": "", "mensagem": str(e)}],
            }

        # Classificar cada lançamento
        preview_lancamentos = []
        resumo = {"total": 0, "ok": 0, "fora_periodo": 0, "sem_conta": 0, "erros": 0}
        erros = []

        for idx, lanc in enumerate(lancamentos):
            resumo["total"] += 1
            status = "ok"
            mensagem = None

            # Validar período
            if lanc.data:
                if lanc.data.month != periodo_mes or lanc.data.year != periodo_ano:
                    status = "fora_periodo"
                    mensagem = f"Data {lanc.data.strftime('%d/%m/%Y')} fora do período {periodo_mes:02d}/{periodo_ano}"
                    resumo["fora_periodo"] += 1

            # Validar contas
            if not lanc.conta_debito and not lanc.conta_credito:
                if status == "ok":
                    status = "sem_conta"
                    mensagem = "Conta de débito e crédito não definidas"
                    resumo["sem_conta"] += 1
            elif not lanc.conta_debito:
                if status == "ok":
                    status = "sem_conta"
                    mensagem = "Conta de débito não definida"
                    resumo["sem_conta"] += 1
            elif not lanc.conta_credito:
                if status == "ok":
                    status = "sem_conta"
                    mensagem = "Conta de crédito não definida"
                    resumo["sem_conta"] += 1

            if status == "ok":
                resumo["ok"] += 1

            preview_lancamentos.append({
                "linha": idx + 1,
                "data": lanc.data.strftime("%d/%m/%Y") if lanc.data else None,
                "valor": lanc.valor,
                "conta_debito": lanc.conta_debito or "",
                "conta_credito": lanc.conta_credito or "",
                "historico": lanc.historico or "",
                "documento": lanc.documento or "",
                "status": status,
                "mensagem": mensagem,
            })

        return {
            "lancamentos": preview_lancamentos,
            "resumo": resumo,
            "erros": erros,
        }
