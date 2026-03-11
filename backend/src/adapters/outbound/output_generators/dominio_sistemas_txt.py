"""
Gerador de arquivo TXT no formato Domínio Sistemas - Texto com Delimitador
Implementa fielmente o contrato: Leiaute Domínio Sistemas com Separador - Lançamentos Contábeis

Registros:
- 0000: Identificação da empresa (CNPJ)
- 6000: Cabeçalho do lote com tipo de lançamento (X/D/C/V)
- 6100: Detalhe do lançamento (data, contas, valor, histórico) — um por lançamento

Tipos de Lançamento:
- X: 1 débito / 1 crédito (simples)
- D: 1 débito / N créditos (rateio de débito)
- C: N débitos / 1 crédito (rateio de crédito)
- V: N débitos / N créditos balanceados (multilateral)
"""
from datetime import date as date_type, datetime as datetime_type
from typing import List, Dict, Any, Optional, Tuple
from src.application.ports.services.service_ports import OutputGeneratorPort
from src.domain.entities import Lancamento, TipoLancamento


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
        tipo_lanc_padrao = cfg.get("tipo_lancamento_padrao", "X")
        cod_usuario = cfg.get("codigo_usuario", "")
        nome_usuario = cfg.get("nome_usuario", "")
        cod_filial = cfg.get("codigo_filial", "")
        cod_hist_padrao = cfg.get("codigo_historico_padrao", "0")
        incluir_delim = cfg.get("incluir_delimitador_inicio_fim", True)

        linhas = []

        # Registro 0000 - Identificação da empresa (única vez)
        reg_0000 = self._montar_registro(sep, incluir_delim, [
            "0000",
            cnpj,
        ])
        linhas.append(reg_0000)

        # Agrupar lançamentos por tipo + grupo
        grupos = self._agrupar_lancamentos(lancamentos, tipo_lanc_padrao)

        # Para cada grupo: emitir 6000 + os 6100s correspondentes
        for tipo_grupo, grupo_lancs in grupos:
            # Registro 6000 - Cabeçalho com tipo do grupo
            tipo_str = tipo_grupo.value if hasattr(tipo_grupo, 'value') else tipo_grupo
            reg_6000 = self._montar_registro(sep, incluir_delim, [
                "6000",
                tipo_str,    # Tipo específico do grupo (X, D, C ou V) - como string
                "",          # Código Padrão
                "",          # Localizador
                "",          # RTT (S/N)
            ])
            linhas.append(reg_6000)

            # Registros 6100 - Um por lançamento do grupo
            for lanc in grupo_lancs:
                conta_deb = mapeamentos.get(lanc.conta_debito, lanc.conta_debito)
                conta_cred = mapeamentos.get(lanc.conta_credito, lanc.conta_credito)

                valor_formatado = self._formatar_valor(lanc.valor)
                data_formatada = self._formatar_data(lanc.data)
                historico = lanc.historico or ""

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
        
        # Validações globais
        if not cnpj or len(cnpj.replace(".", "").replace("/", "").replace("-", "")) < 11:
            erros.append("CNPJ inválido")
        if not lancamentos:
            erros.append("Nenhum lançamento para exportar")
            return erros
        
        # Agrupar e validar por grupo
        tipo_lanc_padrao = (config or {}).get("tipo_lancamento_padrao", "X")
        grupos = self._agrupar_lancamentos(lancamentos, tipo_lanc_padrao)
        
        for idx, (tipo_grupo, grupo_lancs) in enumerate(grupos):
            erros.extend(self._validar_grupo(tipo_grupo, grupo_lancs, idx + 1))
        
        return erros

    def _agrupar_lancamentos(
        self,
        lancamentos: List[Lancamento],
        tipo_padrao: str
    ) -> List[Tuple[str, List[Lancamento]]]:
        """
        Agrupa lançamentos por tipo e grupo_id.
        
        Regra:
        - Tipo X → grupo unitário por lançamento
        - Tipos D/C/V → agrupa por grupo_id (se disponível) ou por data (fallback)
        
        Retorna lista de (tipo, lista_de_lancamentos) preservando ordem de primeiro aparecimento.
        """
        grupos_dict = {}  # key: (tipo, grupo_key) -> list[Lancamento]
        ordem_grupos = []  # Para preservar ordem de primeiro aparecimento
        
        for lanc in lancamentos:
            tipo = lanc.tipo_lancamento or tipo_padrao
            
            if tipo == TipoLancamento.X or tipo == "X":
                # Tipo X: cada lançamento é um grupo separado
                key = (tipo, f"X_{len(ordem_grupos)}")  # Chave única por posição
                if key not in grupos_dict:
                    grupos_dict[key] = []
                    ordem_grupos.append(key)
                grupos_dict[key].append(lanc)
            else:
                # Tipos D, C, V: agrupar por grupo_id ou fallback por data
                grupo_key = lanc.grupo_id or str(lanc.data if lanc.data else "")
                key = (tipo, grupo_key)
                if key not in grupos_dict:
                    grupos_dict[key] = []
                    ordem_grupos.append(key)
                grupos_dict[key].append(lanc)
        
        # Retornar na ordem de primeiro aparecimento: (tipo, lancamentos)
        return [(tipo, grupos_dict[(tipo, gkey)]) for tipo, gkey in ordem_grupos]

    def _validar_grupo(
        self,
        tipo: str,
        grupo: List[Lancamento],
        idx_grupo: int
    ) -> List[str]:
        """
        Valida lançamentos dentro de um grupo conforme o tipo.
        
        Regras de validação por tipo:
        - X: cada lançament tem conta_debito E conta_credito (ambas não vazias)
        - D: exatamente 1 com só débito, ≥1 com só crédito, balanceado ±0.01
        - C: exatamente 1 com só crédito, ≥1 com só débito, balanceado ±0.01
        - V: todos com só débito OU só crédito (nunca ambos), balanceado ±0.01
        """
        erros = []
        tolerancia = 0.01
        
        if tipo == TipoLancamento.X or tipo == "X":
            # Tipo X: cada lançamento deve ter conta_debito E conta_credito
            for i, lanc in enumerate(grupo):
                if not lanc.conta_debito or not lanc.conta_debito.strip():
                    erros.append(f"Grupo {idx_grupo} (tipo {tipo}), lançamento {i+1}: conta débito ausente")
                if not lanc.conta_credito or not lanc.conta_credito.strip():
                    erros.append(f"Grupo {idx_grupo} (tipo {tipo}), lançamento {i+1}: conta crédito ausente")
                if lanc.valor is None or lanc.valor <= 0:
                    erros.append(f"Grupo {idx_grupo} (tipo {tipo}), lançamento {i+1}: valor inválido ({lanc.valor})")
        
        elif tipo == TipoLancamento.D or tipo == "D":
            # Tipo D: 1 apenas débito, ≥1 apenas crédito, balanceado
            linhas_debito = [l for l in grupo if l.conta_debito and not l.conta_credito]
            linhas_credito = [l for l in grupo if l.conta_credito and not l.conta_debito]
            
            if len(linhas_debito) != 1:
                erros.append(f"Grupo {idx_grupo} (tipo {tipo}): esperado 1 lançamento de débito, encontrado {len(linhas_debito)}")
            if len(linhas_credito) < 1:
                erros.append(f"Grupo {idx_grupo} (tipo {tipo}): esperado ≥1 lançamentos de crédito, encontrado {len(linhas_credito)}")
            
            if linhas_debito and linhas_credito:
                valor_debito = linhas_debito[0].valor
                valor_creditos = sum(l.valor for l in linhas_credito)
                if abs(valor_debito - valor_creditos) > tolerancia:
                    erros.append(
                        f"Grupo {idx_grupo} (tipo {tipo}): débito ({valor_debito:.2f}) ≠ créditos ({valor_creditos:.2f}), "
                        f"diferença: {abs(valor_debito - valor_creditos):.2f}"
                    )
        
        elif tipo == TipoLancamento.C or tipo == "C":
            # Tipo C: ≥1 apenas débito, 1 apenas crédito, balanceado
            linhas_debito = [l for l in grupo if l.conta_debito and not l.conta_credito]
            linhas_credito = [l for l in grupo if l.conta_credito and not l.conta_debito]
            
            if len(linhas_debito) < 1:
                erros.append(f"Grupo {idx_grupo} (tipo {tipo}): esperado ≥1 lançamentos de débito, encontrado {len(linhas_debito)}")
            if len(linhas_credito) != 1:
                erros.append(f"Grupo {idx_grupo} (tipo {tipo}): esperado 1 lançamento de crédito, encontrado {len(linhas_credito)}")
            
            if linhas_debito and linhas_credito:
                valor_debitos = sum(l.valor for l in linhas_debito)
                valor_credito = linhas_credito[0].valor
                if abs(valor_debitos - valor_credito) > tolerancia:
                    erros.append(
                        f"Grupo {idx_grupo} (tipo {tipo}): débitos ({valor_debitos:.2f}) ≠ crédito ({valor_credito:.2f}), "
                        f"diferença: {abs(valor_debitos - valor_credito):.2f}"
                    )
        
        elif tipo == TipoLancamento.V or tipo == "V":
            # Tipo V: linhas com só débito OU só crédito, balanceado
            linhas_debito = [l for l in grupo if l.conta_debito and not l.conta_credito]
            linhas_credito = [l for l in grupo if l.conta_credito and not l.conta_debito]
            linhas_mistas = [l for l in grupo if l.conta_debito and l.conta_credito]
            
            if linhas_mistas:
                erros.append(
                    f"Grupo {idx_grupo} (tipo {tipo}): encontrado {len(linhas_mistas)} lançamento(s) com ambas contas (débito E crédito), "
                    f"esperado apenas com uma das duas"
                )
            
            if linhas_debito and linhas_credito:
                valor_debitos = sum(l.valor for l in linhas_debito)
                valor_creditos = sum(l.valor for l in linhas_credito)
                if abs(valor_debitos - valor_creditos) > tolerancia:
                    erros.append(
                        f"Grupo {idx_grupo} (tipo {tipo}): débitos ({valor_debitos:.2f}) ≠ créditos ({valor_creditos:.2f}), "
                        f"diferença: {abs(valor_debitos - valor_creditos):.2f}"
                    )
        
        return erros

    def _montar_registro(self, sep: str, incluir_delim: bool, campos: list) -> str:
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

    def _formatar_data(self, data) -> str:
        """Formata data para DD/MM/AAAA — aceita date, datetime ou string"""
        if not data:
            return ""
        if isinstance(data, (date_type, datetime_type)):
            return data.strftime("%d/%m/%Y")
        data_str = str(data).strip()
        if "/" in data_str and len(data_str) >= 10:
            return data_str[:10]
        if "-" in data_str and len(data_str) >= 10:
            partes = data_str[:10].split("-")
            if len(partes) == 3:
                return f"{partes[2]}/{partes[1]}/{partes[0]}"
        return data_str
