"""Exceções de Domínio"""


class DomainError(Exception):
    """Exceção base para erros de domínio"""
    pass


class CNPJInvalidoError(DomainError):
    """CNPJ com formato ou dígitos verificadores inválidos"""
    pass


class PeriodoInvalidoError(DomainError):
    """Período contábil inválido"""
    pass


class EmailInvalidoError(DomainError):
    """Email com formato inválido"""
    pass


class ContaInvalidaError(DomainError):
    """Conta contábil inválida"""
    pass


class LancamentoForaDoPeriodoError(DomainError):
    """Lançamento com data fora do período informado"""
    pass


class ProtocoloNaoEncontradoError(DomainError):
    """Protocolo não encontrado no sistema"""
    pass


class LoteJaProcessadoError(DomainError):
    """Tentativa de processar um lote já processado"""
    pass


class PendenciasMapeamentoError(DomainError):
    """Existem contas sem mapeamento definido"""
    def __init__(self, contas_pendentes: list):
        self.contas_pendentes = contas_pendentes
        super().__init__(f"Existem {len(contas_pendentes)} conta(s) sem mapeamento")


class LayoutNaoEncontradoError(DomainError):
    """Layout de Excel não encontrado"""
    pass


class ArquivoExcelInvalidoError(DomainError):
    """Arquivo Excel com formato inválido"""
    pass
