"""Gerador de arquivo TXT no formato padrão contábil"""
from typing import List, Dict
from src.application.ports.services import TxtGeneratorPort
from src.domain.entities import Lancamento


class TxtGenerator(TxtGeneratorPort):
    """Implementação do gerador de arquivo TXT"""
    
    # Configuração padrão para o formato de saída
    CODIGO_REGISTRO_MARCADOR = "6000"
    CODIGO_REGISTRO_LANCAMENTO = "6100"
    CODIGO_CONTA_PADRAO = "8818"  # Código de conta padrão
    CODIGO_USUARIO = "489"  # Código de usuário padrão
    NOME_USUARIO = "VICTOR"  # Nome do usuário
    
    def gerar(self, lancamentos: List[Lancamento], cnpj: str, mapeamentos: Dict[str, str]) -> str:
        """Gera arquivo TXT no formato esperado"""
        linhas = []
        
        # Header com CNPJ
        linhas.append(f"|0000|{cnpj}|")
        
        for lanc in lancamentos:
            # Linha marcadora antes de cada lançamento
            linhas.append(f"|{self.CODIGO_REGISTRO_MARCADOR}|X||||")
            
            # Linha de lançamento
            data_formatada = lanc.data.strftime("%d/%m/%Y") if lanc.data else ""
            
            # Determinar código de operação baseado no tipo de operação
            # Código 45 para aluguel, 9919 para demais operações
            codigo_operacao = "9919"
            historico_upper = (lanc.historico or "").upper()
            if "ALUGUEL" in historico_upper:
                codigo_operacao = "45"
            
            # Formatar valor com vírgula (sem separador de milhar)
            valor_formatado = f"{lanc.valor:.2f}".replace(".", ",")
            
            linha = "|".join([
                "",
                self.CODIGO_REGISTRO_LANCAMENTO,
                data_formatada,
                codigo_operacao,
                self.CODIGO_CONTA_PADRAO,  # Sempre usar código padrão 8818
                valor_formatado,
                "",
                lanc.historico or "",
                self.NOME_USUARIO,
                self.CODIGO_USUARIO,
                "",
                ""
            ])
            
            linhas.append(linha)
        
        return "\n".join(linhas)
