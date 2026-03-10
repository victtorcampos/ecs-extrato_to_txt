"""Port para parser de arquivos OFX (Open Financial Exchange).
Contrato definido para implementação futura.
"""
from abc import ABC, abstractmethod
from typing import List
from dataclasses import dataclass
from datetime import date


@dataclass
class TransacaoOFX:
    """Representa uma transação OFX"""
    data: date
    valor: float
    tipo: str  # DEBIT / CREDIT
    fitid: str  # Financial Institution Transaction ID
    memo: str = ""
    nome: str = ""
    ref_num: str = ""


@dataclass
class ExtratoOFX:
    """Representa um extrato OFX completo"""
    banco_id: str
    agencia: str
    conta: str
    tipo_conta: str  # CHECKING / SAVINGS / CREDITLINE
    moeda: str
    data_inicio: date
    data_fim: date
    saldo: float
    transacoes: List[TransacaoOFX]


class OFXParserPort(ABC):
    """Interface para parser de arquivos OFX/QFX.

    Implementações futuras devem:
    1. Ler arquivo OFX (base64 ou path)
    2. Extrair transações com data, valor, tipo (D/C), memo
    3. Retornar ExtratoOFX com metadados bancários
    4. Converter transações para Lancamento (domain entity)
    """

    @abstractmethod
    def parse(self, arquivo_base64: str) -> ExtratoOFX:
        """Faz parse de um arquivo OFX e retorna o extrato"""
        pass

    @abstractmethod
    def validar(self, arquivo_base64: str) -> bool:
        """Valida se o arquivo é um OFX válido"""
        pass
