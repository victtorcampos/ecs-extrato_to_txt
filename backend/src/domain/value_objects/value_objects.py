"""Value Objects do Domínio Contábil"""
from dataclasses import dataclass
from datetime import date
import re
from typing import Optional


@dataclass(frozen=True)
class CNPJ:
    """Value Object para CNPJ"""
    valor: str
    
    def __post_init__(self):
        if not self._validar(self.valor):
            from src.domain.exceptions.domain_exceptions import CNPJInvalidoError
            raise CNPJInvalidoError(f"CNPJ inválido: {self.valor}")
    
    @staticmethod
    def _validar(cnpj: str) -> bool:
        cnpj_limpo = re.sub(r'[^\d]', '', cnpj)
        if len(cnpj_limpo) != 14:
            return False
        if cnpj_limpo == cnpj_limpo[0] * 14:
            return False
        
        def calc_digito(cnpj_parcial: str, pesos: list) -> int:
            soma = sum(int(d) * p for d, p in zip(cnpj_parcial, pesos))
            resto = soma % 11
            return 0 if resto < 2 else 11 - resto
        
        pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        
        d1 = calc_digito(cnpj_limpo[:12], pesos1)
        d2 = calc_digito(cnpj_limpo[:12] + str(d1), pesos2)
        
        return cnpj_limpo[-2:] == f"{d1}{d2}"
    
    @property
    def formatado(self) -> str:
        cnpj = re.sub(r'[^\d]', '', self.valor)
        return f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:]}"
    
    @property
    def numerico(self) -> str:
        return re.sub(r'[^\d]', '', self.valor)


@dataclass(frozen=True)
class PeriodoContabil:
    """Value Object para Período Contábil (mês/ano)"""
    mes: int
    ano: int
    
    def __post_init__(self):
        if not (1 <= self.mes <= 12):
            from src.domain.exceptions.domain_exceptions import PeriodoInvalidoError
            raise PeriodoInvalidoError(f"Mês inválido: {self.mes}")
        if self.ano < 2000 or self.ano > 2100:
            from src.domain.exceptions.domain_exceptions import PeriodoInvalidoError
            raise PeriodoInvalidoError(f"Ano inválido: {self.ano}")
    
    def contem(self, data: date) -> bool:
        """Verifica se a data pertence ao período"""
        return data.month == self.mes and data.year == self.ano
    
    @property
    def primeiro_dia(self) -> date:
        return date(self.ano, self.mes, 1)
    
    @property
    def ultimo_dia(self) -> date:
        if self.mes == 12:
            return date(self.ano + 1, 1, 1).replace(day=1) - __import__('datetime').timedelta(days=1)
        return date(self.ano, self.mes + 1, 1) - __import__('datetime').timedelta(days=1)
    
    def __str__(self) -> str:
        return f"{self.mes:02d}/{self.ano}"


@dataclass(frozen=True)
class Email:
    """Value Object para Email"""
    valor: str
    
    def __post_init__(self):
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, self.valor):
            from src.domain.exceptions.domain_exceptions import EmailInvalidoError
            raise EmailInvalidoError(f"Email inválido: {self.valor}")


@dataclass(frozen=True)
class ContaContabil:
    """Value Object para Conta Contábil"""
    codigo: str
    nome: Optional[str] = None
    
    def __post_init__(self):
        if not self.codigo or len(self.codigo) < 1:
            from src.domain.exceptions.domain_exceptions import ContaInvalidaError
            raise ContaInvalidaError("Código da conta não pode ser vazio")
    
    def __eq__(self, other):
        if isinstance(other, ContaContabil):
            return self.codigo == other.codigo
        return False
    
    def __hash__(self):
        return hash(self.codigo)
