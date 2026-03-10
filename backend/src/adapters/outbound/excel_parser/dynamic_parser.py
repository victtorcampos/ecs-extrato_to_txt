"""Parser Dinâmico de Excel - Usa Layout para ler e transformar dados"""
import base64
import re
import tempfile
import os
from typing import List, Dict, Any, Optional
from datetime import date, datetime

from python_calamine import CalamineWorkbook

from src.domain.entities import Lancamento
from src.domain.entities.layout_entities import LayoutExcel, ColunaLayout, ConfigValor, ConfigPlanilha, RegraContaLayout, CondicaoContaLayout
from src.domain.exceptions import ArquivoExcelInvalidoError
from src.config.logging_config import get_logger

logger = get_logger("dynamic_parser")

# Constantes para deteccao de formato numerico (B-12)
MAX_DECIMAL_PLACES = 2  # Maximo de casas decimais para separador decimal
CAMPOS_NUMERICOS = ('valor', 'saldo', 'saldo_inicial')
CAMPOS_DATA = ('data', 'data_mes_ano')
FORMATOS_DATA_COMUNS = ('%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%m/%Y', '%d/%m/%y')


def _col_letter_to_index(col: str) -> int:
    """Converte letra de coluna (A, B, ..., AA) para índice 0-based"""
    col = col.upper().strip()
    result = 0
    for c in col:
        if c.isalpha():
            result = result * 26 + (ord(c) - ord('A') + 1)
    return result - 1


def _resolve_col_index(col_excel: str) -> int:
    """Resolve referência de coluna: pode ser índice numérico ou letra"""
    col_excel = str(col_excel).strip()
    if col_excel.isdigit():
        return int(col_excel)
    if col_excel.isalpha():
        return _col_letter_to_index(col_excel)
    # Tentar numérico de qualquer forma
    try:
        return int(col_excel)
    except ValueError:
        return _col_letter_to_index(col_excel)


def _get_cell(row: list, col_ref: str) -> Any:
    """Obtém valor de uma célula pela referência de coluna"""
    idx = _resolve_col_index(col_ref)
    if 0 <= idx < len(row):
        return row[idx]
    return None


def _parse_number_br(text: str) -> float:
    """Parseia número no formato brasileiro: 1.234,56 ou 1234,56"""
    text = text.strip()
    text = re.sub(r'[R$\s]', '', text)
    text = text.replace('.', '').replace(',', '.')
    return float(text)


def _parse_number_us(text: str) -> float:
    """Parseia número no formato americano: 1,234.56"""
    text = text.strip()
    text = text.replace(',', '')
    return float(text)


def _parse_number_auto(value) -> float:
    """Detecta e parseia número automaticamente"""
    if isinstance(value, (int, float)):
        return float(value)
    if value is None:
        return 0.0
    text = str(value).strip()
    if not text:
        return 0.0
    # Remove R$ e espaços
    cleaned = re.sub(r'[R$\s]', '', text)
    # Se tem vírgula e ponto, decidir pelo formato
    if ',' in cleaned and '.' in cleaned:
        # Se vírgula vem depois do ponto: formato BR (1.234,56)
        if cleaned.rindex(',') > cleaned.rindex('.'):
            return _parse_number_br(text)
        else:
            return _parse_number_us(text)
    elif ',' in cleaned:
        # Apenas vírgula: verificar se é separador decimal BR
        parts = cleaned.split(',')
        if len(parts) == 2 and len(parts[1]) <= MAX_DECIMAL_PLACES:
            return _parse_number_br(text)
        # Pode ser separador de milhar US
        return _parse_number_us(text)
    elif '.' in cleaned:
        parts = cleaned.split('.')
        if len(parts) == 2 and len(parts[1]) <= MAX_DECIMAL_PLACES:
            return float(cleaned)
        # Separador de milhar BR sem decimais
        return float(cleaned.replace('.', ''))
    else:
        return float(cleaned)


def _apply_number_format(value, formato: str) -> float:
    """Aplica formatação de número conforme configuração"""
    if isinstance(value, (int, float)):
        if formato in ('br_virgula', 'br_moeda'):
            return float(value)
        return float(value)
    if value is None:
        return 0.0
    text = str(value).strip()
    if not text:
        return 0.0
    if formato == 'br_virgula' or formato == 'br_moeda':
        return _parse_number_br(text)
    elif formato == 'us_ponto':
        return _parse_number_us(text)
    else:
        return _parse_number_auto(value)


def _extract_dc_from_value(text: str, modo: str) -> tuple:
    """Extrai D/C embutido no valor. Retorna (valor_limpo, tipo_dc)"""
    text = str(text).strip()
    tipo = None
    if modo == 'sufixo':
        # "356,12 D" ou "356,12D"
        match = re.match(r'^(.*?)\s*([DCdc])\s*$', text)
        if match:
            text = match.group(1).strip()
            tipo = 'debito' if match.group(2).upper() == 'D' else 'credito'
    elif modo == 'prefixo':
        # "D 356,12" ou "D356,12"
        match = re.match(r'^\s*([DCdc])\s*(.*?)$', text)
        if match:
            text = match.group(2).strip()
            tipo = 'debito' if match.group(1).upper() == 'D' else 'credito'
    return text, tipo


def _extract_cnpj_cpf_nome(text: str, separador: str = " - ") -> tuple:
    """Extrai CNPJ/CPF e Nome de campo composto"""
    text = str(text).strip()
    if separador in text:
        parts = text.split(separador, 1)
        doc = re.sub(r'[^\d]', '', parts[0].strip())
        nome = parts[1].strip() if len(parts) > 1 else ''
        return doc, nome
    # Tentar detectar: números no início
    match = re.match(r'^([\d.\-/]+)\s*[-–]\s*(.*)$', text)
    if match:
        doc = re.sub(r'[^\d]', '', match.group(1))
        nome = match.group(2).strip()
        return doc, nome
    return text, ''


def _apply_regex(text: str, pattern: str) -> str:
    """Aplica regex e retorna o primeiro grupo ou match completo"""
    if not pattern:
        return text
    match = re.search(pattern, str(text))
    if match:
        if match.groups():
            return match.group(1)
        return match.group(0)
    return str(text)


def _apply_transformations(value: Any, coluna: ColunaLayout, row: list) -> Any:
    """Aplica todas as transformações configuradas em uma coluna"""
    trans = coluna.transformacao
    if not trans:
        return value

    # Regex extract
    regex_pattern = trans.get('regex_pattern', '')
    if regex_pattern and value is not None:
        value = _apply_regex(str(value), regex_pattern)

    # Concatenação
    concat_colunas = trans.get('concat_colunas', [])
    if concat_colunas:
        separador = trans.get('concat_separador', ' ')
        parts = []
        for col_ref in concat_colunas:
            cell = _get_cell(row, str(col_ref))
            if cell is not None:
                parts.append(str(cell).strip())
        if parts:
            value = separador.join(parts)

    return value


def _to_string(value) -> str:
    """Converte valor para string tratando None e tipos"""
    if value is None:
        return ''
    if isinstance(value, float):
        if value == int(value):
            return str(int(value))
    return str(value).strip()


def _parse_date_value(value, formato: Optional[str] = None) -> Optional[date]:
    """Parseia um valor como data"""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value

    text = str(value).strip()
    if not text:
        return None

    # Formato explícito
    if formato:
        try:
            return datetime.strptime(text, formato).date()
        except ValueError:
            pass

    # Formatos comuns
    for fmt in FORMATOS_DATA_COMUNS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue

    return None


class DynamicExcelParser:
    """Parser dinâmico que usa um LayoutExcel para extrair dados"""

    def parse(self, arquivo_base64: str, layout: LayoutExcel) -> List[Lancamento]:
        """Extrai lançamentos usando a configuração do layout"""
        try:
            arquivo_bytes = base64.b64decode(arquivo_base64)

            with tempfile.NamedTemporaryFile(suffix=".xls", delete=False) as tmp:
                tmp.write(arquivo_bytes)
                tmp_path = tmp.name

            try:
                wb = CalamineWorkbook.from_path(tmp_path)
                if not wb.sheet_names:
                    raise ArquivoExcelInvalidoError("Arquivo Excel sem planilhas")

                # Selecionar aba
                config = layout.config_planilha
                aba = config.nome_aba if config.nome_aba and config.nome_aba in wb.sheet_names else wb.sheet_names[0]
                sheet_data = wb.get_sheet_by_name(aba).to_python()

                if len(sheet_data) <= config.linha_inicio_dados:
                    raise ArquivoExcelInvalidoError("Arquivo Excel sem dados suficientes")

                lancamentos = []
                for row_idx, row in enumerate(sheet_data[config.linha_inicio_dados:], start=config.linha_inicio_dados + 1):
                    try:
                        lancamento = self._parse_row(row, layout)
                        if lancamento:
                            lancamentos.append(lancamento)
                    except Exception as e:
                        logger.warning(f"Erro na linha {row_idx}: {e}")
                        continue

                return lancamentos
            finally:
                os.unlink(tmp_path)

        except ArquivoExcelInvalidoError:
            raise
        except Exception as e:
            raise ArquivoExcelInvalidoError(f"Erro ao processar arquivo Excel: {str(e)}")

    def _parse_row(self, row: list, layout: LayoutExcel) -> Optional[Lancamento]:
        """Processa uma linha do Excel usando o layout"""
        dados: Dict[str, Any] = {}
        dc_info = None  # Informação de D/C extraída do valor

        for coluna in layout.colunas:
            if not coluna.campo_destino or not coluna.coluna_excel:
                continue

            raw_value = _get_cell(row, coluna.coluna_excel)

            # Aplicar transformações genéricas
            value = _apply_transformations(raw_value, coluna, row)

            trans = coluna.transformacao or {}

            # Campo composto (CNPJ/CPF + Nome)
            campo_composto = trans.get('campo_composto', 'nenhum')
            if campo_composto == 'cnpj_cpf_nome':
                separador = trans.get('separador_composto', ' - ')
                doc, nome = _extract_cnpj_cpf_nome(_to_string(value), separador)
                dados['cnpj_cpf_terceiro'] = doc
                dados['razao_social_terceiro'] = nome
                continue

            # Valor com D/C embutido
            valor_com_dc = trans.get('valor_com_dc', 'nenhum')
            if valor_com_dc and valor_com_dc != 'nenhum':
                text_val, tipo_dc = _extract_dc_from_value(_to_string(value), valor_com_dc)
                if tipo_dc:
                    dc_info = tipo_dc
                value = text_val

            # Converter conforme tipo de dado
            if coluna.tipo_dado.value in ('decimal', 'integer') or coluna.campo_destino in CAMPOS_NUMERICOS:
                formato_numero = trans.get('formato_numero', 'automatico')
                value = _apply_number_format(value, formato_numero)
            elif coluna.tipo_dado.value in ('date', 'datetime') or coluna.campo_destino in CAMPOS_DATA:
                value = _parse_date_value(value, coluna.formato)
            else:
                value = _to_string(value)

            # Valor padrão
            if (value is None or value == '') and coluna.valor_padrao:
                value = coluna.valor_padrao

            dados[coluna.campo_destino] = value

        # Se a linha está completamente vazia nos campos essenciais, pular
        if not any(dados.get(k) for k in ('valor', 'conta_debito', 'conta_credito', 'data')):
            return None

        # Determinar D/C usando ConfigValor
        self._resolver_debito_credito(dados, row, layout.config_valor, dc_info)

        # Avaliar regras de conta (primeira que bater vence)
        if layout.regras_conta:
            self._avaliar_regras_conta(dados, row, layout)

        # Montar Lancamento
        data_lanc = dados.get('data')
        # Se temos data_mes_ano + dia separado
        if not data_lanc and dados.get('data_mes_ano') and dados.get('dia'):
            dma = dados['data_mes_ano']
            if isinstance(dma, date):
                try:
                    data_lanc = date(dma.year, dma.month, int(dados['dia']))
                except (ValueError, TypeError):
                    data_lanc = dma

        valor = dados.get('valor', 0.0)
        if isinstance(valor, str):
            try:
                valor = _parse_number_auto(valor)
            except (ValueError, TypeError):
                valor = 0.0

        return Lancamento(
            data=data_lanc,
            conta_debito=_to_string(dados.get('conta_debito', '')),
            conta_credito=_to_string(dados.get('conta_credito', '')),
            valor=abs(float(valor)) if valor else 0.0,
            historico=_to_string(dados.get('historico', '')),
            documento=_to_string(dados.get('documento', '')),
            codigo_historico=int(dados.get('codigo_historico', 0) or 0),
            nome_empresa=_to_string(dados.get('nome_empresa', '')),
            unidade_negocio=_to_string(dados.get('unidade_negocio', '')),
            fantasia=_to_string(dados.get('fantasia', '')),
            fato_contabil=_to_string(dados.get('fato_contabil', '')),
            empresa=_to_string(dados.get('codigo_empresa', '')),
        )

    def _avaliar_regras_conta(self, dados: dict, row: list, layout: LayoutExcel):
        """Avalia regras de definição de contas em ordem. Primeira que bater, vence."""
        regras_ordenadas = sorted(
            [r for r in layout.regras_conta if r.ativo],
            key=lambda r: r.ordem
        )

        for regra in regras_ordenadas:
            if self._regra_bate(regra, dados, row):
                if regra.conta_debito:
                    dados['conta_debito'] = regra.conta_debito
                if regra.conta_credito:
                    dados['conta_credito'] = regra.conta_credito
                return  # Primeira que bater vence

    def _regra_bate(self, regra: RegraContaLayout, dados: dict, row: list) -> bool:
        """Verifica se TODAS as condições da regra são atendidas (AND)"""
        if not regra.condicoes:
            return False

        for cond in regra.condicoes:
            if not self._condicao_bate(cond, dados, row):
                return False
        return True

    def _condicao_bate(self, cond: CondicaoContaLayout, dados: dict, row: list) -> bool:
        """Avalia uma condição individual"""
        # Determinar o valor a ser comparado
        if cond.coluna_excel:
            # Referência direta a coluna do Excel
            valor_real = _to_string(_get_cell(row, cond.coluna_excel))
        elif cond.campo == '_sinal_valor':
            # Condição especial: sinal do valor
            valor_num = dados.get('valor', 0)
            if isinstance(valor_num, str):
                try:
                    valor_num = _parse_number_auto(valor_num)
                except (ValueError, TypeError):
                    valor_num = 0
            if cond.operador == 'positivo':
                return float(valor_num) >= 0
            elif cond.operador == 'negativo':
                return float(valor_num) < 0
            return False
        elif cond.campo == '_tipo_dc':
            # Condição especial: tipo D/C já determinado
            valor_real = _to_string(dados.get('_tipo_dc', ''))
        else:
            # Referência a campo_destino nos dados extraídos
            valor_real = _to_string(dados.get(cond.campo, ''))

        # Aplicar operador
        operador = cond.operador.lower()
        valor_cond = cond.valor

        if operador == 'igual':
            return valor_real.strip().lower() == valor_cond.strip().lower()
        elif operador == 'diferente':
            return valor_real.strip().lower() != valor_cond.strip().lower()
        elif operador == 'contem':
            return valor_cond.lower() in valor_real.lower()
        elif operador == 'nao_contem':
            return valor_cond.lower() not in valor_real.lower()
        elif operador == 'comeca_com':
            return valor_real.lower().startswith(valor_cond.lower())
        elif operador == 'termina_com':
            return valor_real.lower().endswith(valor_cond.lower())
        elif operador == 'dc_debito':
            return valor_real.lower() in ('debito', 'débito', 'd')
        elif operador == 'dc_credito':
            return valor_real.lower() in ('credito', 'crédito', 'c')
        elif operador == 'positivo':
            try:
                return float(_parse_number_auto(valor_real)) >= 0
            except (ValueError, TypeError):
                return False
        elif operador == 'negativo':
            try:
                return float(_parse_number_auto(valor_real)) < 0
            except (ValueError, TypeError):
                return False

        return False

    def _resolver_debito_credito(self, dados: dict, row: list, config: ConfigValor, dc_info: Optional[str]):
        """Resolve qual é débito e qual é crédito baseado na configuração"""
        tipo_sinal = config.tipo_sinal.value if hasattr(config.tipo_sinal, 'value') else config.tipo_sinal

        if tipo_sinal == 'sinal_valor':
            # Valor positivo = débito, negativo = crédito (ou vice-versa)
            valor = dados.get('valor', 0)
            if isinstance(valor, str):
                try:
                    valor = _parse_number_auto(valor)
                except (ValueError, TypeError):
                    valor = 0
            dados['valor'] = abs(float(valor))

        elif tipo_sinal == 'coluna_tipo':
            # Uma coluna contém D ou C
            if config.coluna_tipo:
                tipo_raw = _get_cell(row, config.coluna_tipo)
                tipo_text = _to_string(tipo_raw)
                if config.case_insensitive:
                    tipo_text_lower = tipo_text.lower().strip()
                    # Normalizar para comparação
                    for key, val in config.mapeamento_tipo.items():
                        if tipo_text_lower == key.lower().strip():
                            dc_info = val
                            break
                else:
                    dc_info = config.mapeamento_tipo.get(tipo_text.strip(), dc_info)

            # Se dc_info foi extraído do valor embutido, usar também
            if dc_info:
                dados['_tipo_dc'] = dc_info

        elif tipo_sinal == 'colunas_separadas':
            # Valores separados em colunas de débito e crédito
            val_deb = 0.0
            val_cred = 0.0
            if config.coluna_debito:
                raw = _get_cell(row, config.coluna_debito)
                if raw is not None:
                    try:
                        val_deb = abs(_parse_number_auto(raw))
                    except (ValueError, TypeError):
                        pass
            if config.coluna_credito:
                raw = _get_cell(row, config.coluna_credito)
                if raw is not None:
                    try:
                        val_cred = abs(_parse_number_auto(raw))
                    except (ValueError, TypeError):
                        pass
            # O que tiver valor é o tipo
            if val_deb > 0:
                dados['valor'] = val_deb
                dados['_tipo_dc'] = 'debito'
            elif val_cred > 0:
                dados['valor'] = val_cred
                dados['_tipo_dc'] = 'credito'

        elif tipo_sinal == 'fixo_debito':
            dados['_tipo_dc'] = 'debito'
        elif tipo_sinal == 'fixo_credito':
            dados['_tipo_dc'] = 'credito'

        # Aplicar dc_info extraído do valor (se não foi sobrescrito)
        if dc_info and '_tipo_dc' not in dados:
            dados['_tipo_dc'] = dc_info
