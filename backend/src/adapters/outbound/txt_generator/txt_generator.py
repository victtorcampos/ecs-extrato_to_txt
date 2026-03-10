"""Gerador de arquivo TXT no formato padrão contábil"""
from dataclasses import dataclass, field
from typing import List, Dict
from src.application.ports.services import TxtGeneratorPort
from src.domain.entities import Lancamento


@dataclass
class TxtConfig:
    """Configuração externalizável do formato TXT"""
    codigo_registro_marcador: str = "6000"
    codigo_registro_lancamento: str = "6100"
    codigo_conta_padrao: str = "8818"
    codigo_usuario: str = "489"
    nome_usuario: str = "VICTOR"
    separador: str = "|"
    codigo_operacao_padrao: str = "9919"
    mapeamento_operacao: Dict[str, str] = field(default_factory=lambda: {
        "ALUGUEL": "45",
    })


# Configuração padrão (Domínio Sistemas)
DEFAULT_TXT_CONFIG = TxtConfig()


class TxtGenerator(TxtGeneratorPort):
    """Implementação do gerador de arquivo TXT"""

    def __init__(self, config: TxtConfig = None):
        self.config = config or DEFAULT_TXT_CONFIG

    def gerar(self, lancamentos: List[Lancamento], cnpj: str, mapeamentos: Dict[str, str]) -> str:
        """Gera arquivo TXT no formato esperado"""
        c = self.config
        sep = c.separador
        linhas = []

        # Header com CNPJ
        linhas.append(f"{sep}0000{sep}{cnpj}{sep}")

        for lanc in lancamentos:
            # Linha marcadora antes de cada lançamento
            linhas.append(f"{sep}{c.codigo_registro_marcador}{sep}X{sep}{sep}{sep}{sep}")

            # Linha de lançamento
            data_formatada = lanc.data.strftime("%d/%m/%Y") if lanc.data else ""

            # Determinar código de operação
            codigo_operacao = c.codigo_operacao_padrao
            historico_upper = (lanc.historico or "").upper()
            for palavra, codigo in c.mapeamento_operacao.items():
                if palavra in historico_upper:
                    codigo_operacao = codigo
                    break

            # Formatar valor com vírgula (sem separador de milhar)
            valor_formatado = f"{lanc.valor:.2f}".replace(".", ",")

            linha = sep.join([
                "",
                c.codigo_registro_lancamento,
                data_formatada,
                codigo_operacao,
                c.codigo_conta_padrao,
                valor_formatado,
                "",
                lanc.historico or "",
                c.nome_usuario,
                c.codigo_usuario,
                "",
                ""
            ])

            linhas.append(linha)

        return "\n".join(linhas)
