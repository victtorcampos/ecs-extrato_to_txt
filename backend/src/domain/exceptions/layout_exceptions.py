"""Exceções de Domínio para Layouts e Regras"""
from .domain_exceptions import DomainError


class LayoutError(DomainError):
    """Erro base para layouts"""
    pass


class LayoutNaoEncontradoError(LayoutError):
    """Layout não encontrado"""
    pass


class LayoutInvalidoError(LayoutError):
    """Layout com configuração inválida"""
    pass


class ColunaObrigatoriaError(LayoutError):
    """Coluna obrigatória não mapeada"""
    def __init__(self, campo: str):
        self.campo = campo
        super().__init__(f"Campo obrigatório não mapeado: {campo}")


class ColunaDuplicadaError(LayoutError):
    """Campo destino já mapeado"""
    def __init__(self, campo: str):
        self.campo = campo
        super().__init__(f"Campo já mapeado: {campo}")


class RegraError(DomainError):
    """Erro base para regras"""
    pass


class RegraNaoEncontradaError(RegraError):
    """Regra não encontrada"""
    pass


class RegraInvalidaError(RegraError):
    """Regra com configuração inválida"""
    pass


class CondicaoInvalidaError(RegraError):
    """Condição de regra inválida"""
    pass


class AcaoInvalidaError(RegraError):
    """Ação de regra inválida"""
    pass


class ErroProcessamentoRegra(RegraError):
    """Erro durante processamento de regra"""
    def __init__(self, regra_nome: str, mensagem: str):
        self.regra_nome = regra_nome
        super().__init__(f"Erro na regra '{regra_nome}': {mensagem}")
