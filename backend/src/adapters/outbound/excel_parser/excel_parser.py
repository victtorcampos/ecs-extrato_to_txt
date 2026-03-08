"""Parser de Excel usando python-calamine"""
import base64
import tempfile
import os
from typing import List
from datetime import date, datetime

from python_calamine import CalamineWorkbook

from src.application.ports.services import ExcelParserPort
from src.domain.entities import Lancamento
from src.domain.exceptions import ArquivoExcelInvalidoError


class CalamineExcelParser(ExcelParserPort):
    """Implementação do parser de Excel com python-calamine"""
    
    # Mapeamento de colunas do layout padrão
    COLUNAS_PADRAO = {
        "data_mes_ano": 4,  # 'Data mes_ano'
        "dia_lancamento": 5,  # 'V_Dia Lancamento'
        "conta_debito": 6,  # 'V_Conta Debito'
        "conta_credito": 7,  # 'V_Conta Credito'
        "fato_contabil": 8,  # 'Fato Contabil'
        "transacao": 9,  # 'Transacao'
        "empresa": 10,  # 'Empresa'
        "valor": 11,  # 'Valor'
        "documento": 12,  # 'Documento'
        "codigo_historico": 13,  # 'Codigo Historico'
        "historico": 14,  # 'Historico compl'
        "nome_empresa": 15,  # 'EMP.Nome Completo'
        "unidade_negocio": 2,  # 'Unidade de Negocio'
        "fantasia": 3,  # 'UNG.Und. NegocioFantasia'
    }
    
    def parse(self, arquivo_base64: str, layout: str = "padrao") -> List[Lancamento]:
        """Extrai lançamentos de um arquivo Excel em base64"""
        try:
            # Decodificar base64
            arquivo_bytes = base64.b64decode(arquivo_base64)
            
            # Salvar em arquivo temporário
            with tempfile.NamedTemporaryFile(suffix=".xls", delete=False) as tmp:
                tmp.write(arquivo_bytes)
                tmp_path = tmp.name
            
            try:
                # Ler com calamine
                wb = CalamineWorkbook.from_path(tmp_path)
                
                if not wb.sheet_names:
                    raise ArquivoExcelInvalidoError("Arquivo Excel sem planilhas")
                
                # Usar primeira planilha
                sheet_data = wb.get_sheet_by_name(wb.sheet_names[0]).to_python()
                
                if len(sheet_data) < 2:
                    raise ArquivoExcelInvalidoError("Arquivo Excel sem dados")
                
                lancamentos = []
                
                # Processar linhas (pular cabeçalho)
                for row_idx, row in enumerate(sheet_data[1:], start=2):
                    try:
                        lancamento = self._parse_linha(row, layout)
                        if lancamento:
                            lancamentos.append(lancamento)
                    except Exception as e:
                        # Log erro mas continua processando
                        print(f"Erro na linha {row_idx}: {e}")
                        continue
                
                return lancamentos
                
            finally:
                os.unlink(tmp_path)
                
        except Exception as e:
            raise ArquivoExcelInvalidoError(f"Erro ao processar arquivo Excel: {str(e)}")
    
    def _parse_linha(self, row: list, layout: str) -> Lancamento:
        """Processa uma linha do Excel"""
        cols = self.COLUNAS_PADRAO
        
        # Extrair data
        data_valor = row[cols["data_mes_ano"]] if len(row) > cols["data_mes_ano"] else None
        dia = row[cols["dia_lancamento"]] if len(row) > cols["dia_lancamento"] else 1
        
        data_lanc = None
        if data_valor:
            if isinstance(data_valor, (date, datetime)):
                # Se é um objeto date/datetime, pegar mês/ano dele
                if isinstance(data_valor, datetime):
                    data_valor = data_valor.date()
                # Usar o dia do lançamento
                dia_int = int(dia) if dia else data_valor.day
                try:
                    data_lanc = date(data_valor.year, data_valor.month, dia_int)
                except ValueError:
                    data_lanc = data_valor
            elif isinstance(data_valor, str):
                # Tentar parsear string
                try:
                    parts = data_valor.replace("/", "-").split("-")
                    if len(parts) >= 2:
                        mes = int(parts[0])
                        ano = int(parts[1])
                        dia_int = int(dia) if dia else 1
                        data_lanc = date(ano, mes, dia_int)
                except:
                    pass
        
        # Extrair valores
        conta_debito = str(int(row[cols["conta_debito"]])) if len(row) > cols["conta_debito"] and row[cols["conta_debito"]] else ""
        conta_credito = str(int(row[cols["conta_credito"]])) if len(row) > cols["conta_credito"] and row[cols["conta_credito"]] else ""
        
        valor = 0.0
        valor_raw = row[cols["valor"]] if len(row) > cols["valor"] else 0
        if valor_raw:
            if isinstance(valor_raw, (int, float)):
                valor = float(valor_raw)
            elif isinstance(valor_raw, str):
                valor = float(valor_raw.replace(",", ".").replace(" ", ""))
        
        historico = str(row[cols["historico"]]) if len(row) > cols["historico"] and row[cols["historico"]] else ""
        documento = str(row[cols["documento"]]) if len(row) > cols["documento"] and row[cols["documento"]] else ""
        
        codigo_hist = 0
        cod_hist_raw = row[cols["codigo_historico"]] if len(row) > cols["codigo_historico"] else 0
        if cod_hist_raw:
            codigo_hist = int(cod_hist_raw) if isinstance(cod_hist_raw, (int, float)) else 0
        
        nome_empresa = str(row[cols["nome_empresa"]]) if len(row) > cols["nome_empresa"] and row[cols["nome_empresa"]] else ""
        unidade = str(row[cols["unidade_negocio"]]) if len(row) > cols["unidade_negocio"] and row[cols["unidade_negocio"]] else ""
        fantasia = str(row[cols["fantasia"]]) if len(row) > cols["fantasia"] and row[cols["fantasia"]] else ""
        fato = str(int(row[cols["fato_contabil"]])) if len(row) > cols["fato_contabil"] and row[cols["fato_contabil"]] else ""
        empresa = str(row[cols["empresa"]]) if len(row) > cols["empresa"] and row[cols["empresa"]] else ""
        
        return Lancamento(
            data=data_lanc,
            conta_debito=conta_debito,
            conta_credito=conta_credito,
            valor=valor,
            historico=historico,
            documento=documento,
            codigo_historico=codigo_hist,
            nome_empresa=nome_empresa,
            unidade_negocio=unidade,
            fantasia=fantasia,
            fato_contabil=fato,
            empresa=empresa
        )
    
    def validar_estrutura(self, arquivo_base64: str, layout: str = "padrao") -> bool:
        """Valida se o arquivo tem a estrutura esperada"""
        try:
            arquivo_bytes = base64.b64decode(arquivo_base64)
            with tempfile.NamedTemporaryFile(suffix=".xls", delete=False) as tmp:
                tmp.write(arquivo_bytes)
                tmp_path = tmp.name
            
            try:
                wb = CalamineWorkbook.from_path(tmp_path)
                if not wb.sheet_names:
                    return False
                
                sheet_data = wb.get_sheet_by_name(wb.sheet_names[0]).to_python()
                if len(sheet_data) < 2:
                    return False
                
                # Verificar se tem as colunas esperadas
                header = sheet_data[0]
                colunas_obrigatorias = ["Valor", "V_Conta Debito", "V_Conta Credito"]
                
                for col in colunas_obrigatorias:
                    if col not in header:
                        return False
                
                return True
            finally:
                os.unlink(tmp_path)
                
        except Exception:
            return False
