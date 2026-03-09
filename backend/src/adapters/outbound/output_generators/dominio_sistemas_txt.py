"""
Gerador de arquivo TXT no formato Domínio Sistemas - Texto com Delimitador
Implementa fielmente o contrato: Leiaute Domínio Sistemas com Separador - Lançamentos Contábeis

Registros:
- 0000: Identificação da empresa (CNPJ)
- 6000: Cabeçalho do lançamento (tipo D/C/X/V)
- 6100: Detalhe do lançamento (data, contas, valor, histórico)
"""
from typing import List, Dict, Any, Optional
from src.application.ports.services.service_ports import OutputGeneratorPort
from src.domain.entities import Lancamento


class DominioSistemasTxtGenerator(OutputGeneratorPort):
    """Gerador TXT no formato Domínio Sistemas com delimitador pipe (|)"""

    def extensao(self) -> str:
        return ".txt"

    def gerar(
        self,
        lancamentos: List[Lancamento],
        cnpj: str,
        mapeamentos: Dict[str, str],
        config: Dict[str, Any] = None,
    ) -> str:
        cfg = config or {}
        sep = cfg.get("delimitador", "|")
        tipo_lanc = cfg.get("tipo_lancamento_padrao", "X")
        cod_usuario = cfg.get("codigo_usuario", "")
        nome_usuario = cfg.get("nome_usuario", "")
        cod_filial = cfg.get("codigo_filial", "")
        cod_hist_padrao = cfg.get("codigo_historico_padrao", "0")
        incluir_delim = cfg.get("incluir_delimitador_inicio_fim", True)

        linhas = []

        # Registro 0000 - Identificação da empresa
        reg_0000 = self._montar_registro(sep, incluir_delim, [
            "0000",
            cnpj,
        ])
        linhas.append(reg_0000)

        # Agrupar lançamentos por lote/sequência
        for lanc in lancamentos:
            conta_deb = mapeamentos.get(lanc.conta_debito, lanc.conta_debito)
            conta_cred = mapeamentos.get(lanc.conta_credito, lanc.conta_credito)

            valor_formatado = self._formatar_valor(lanc.valor)
            data_formatada = self._formatar_data(lanc.data)
            historico = lanc.historico or ""

            # Registro 6000 - Cabeçalho do lançamento
            # Formato: |6000|{tipo}|{cod_padrao}|{localizador}|{rtt}|
            reg_6000 = self._montar_registro(sep, incluir_delim, [
                "6000",
                tipo_lanc,   # Tipo: X (1 débito 1 crédito), D, C, V (vários débitos e créditos)
                "",          # Código Padrão
                "",          # Localizador
                "",          # RTT (S/N)
            ])
            linhas.append(reg_6000)

            # Registro 6100 - Detalhe do lançamento
            # Formato: |6100|{data}|{conta_deb}|{conta_cred}|{valor}|{cod_hist}|{historico}|{usuario}|{cod_filial}|{scp}|
            reg_6100 = self._montar_registro(sep, incluir_delim, [
                "6100",
                data_formatada,     # Data DD/MM/AAAA
                conta_deb,          # Conta débito
                conta_cred,         # Conta crédito
                valor_formatado,    # Valor com vírgula
                cod_hist_padrao,    # Código do histórico
                historico,          # Complemento do histórico
                nome_usuario,       # Nome do usuário
                cod_filial,         # Código da filial
                "",                 # SCP
            ])
            linhas.append(reg_6100)

        return "\n".join(linhas)

    def validar(
        self,
        lancamentos: List[Lancamento],
        cnpj: str,
        mapeamentos: Dict[str, str],
        config: Dict[str, Any] = None,
    ) -> List[str]:
        erros = []
        if not cnpj or len(cnpj.replace(".", "").replace("/", "").replace("-", "")) < 11:
            erros.append("CNPJ inválido")
        if not lancamentos:
            erros.append("Nenhum lançamento para exportar")
        for i, lanc in enumerate(lancamentos):
            if not lanc.conta_debito:
                erros.append(f"Lançamento {i+1}: conta débito não informada")
            if not lanc.conta_credito:
                erros.append(f"Lançamento {i+1}: conta crédito não informada")
            if lanc.valor is None or lanc.valor <= 0:
                erros.append(f"Lançamento {i+1}: valor inválido ({lanc.valor})")
        return erros

    def _montar_registro(self, sep: str, incluir_delim: bool, campos: List[str]) -> str:
        """Monta uma linha de registro com delimitador"""
        conteudo = sep.join(str(c) for c in campos)
        if incluir_delim:
            return f"{sep}{conteudo}{sep}"
        return conteudo

    def _formatar_valor(self, valor: float) -> str:
        """Formata valor numérico para o padrão Domínio (vírgula decimal, sem ponto de milhar)"""
        if valor is None:
            return "0,00"
        return f"{abs(valor):,.2f}".replace(",", "_").replace(".", ",").replace("_", "")

    def _formatar_data(self, data_str: str) -> str:
        """Formata data para DD/MM/AAAA"""
        if not data_str:
            return ""
        # Se já está em DD/MM/AAAA
        if "/" in data_str and len(data_str) >= 10:
            return data_str[:10]
        # Se está em YYYY-MM-DD
        if "-" in data_str and len(data_str) >= 10:
            partes = data_str[:10].split("-")
            if len(partes) == 3:
                return f"{partes[2]}/{partes[1]}/{partes[0]}"
        return data_str
