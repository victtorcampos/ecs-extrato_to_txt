"""Excecoes de Infraestrutura — usadas nos Adapters"""


class InfraError(Exception):
    """Excecao base para erros de infraestrutura"""
    pass


class RepositoryError(InfraError):
    """Erro de acesso ao repositorio (banco de dados, file system)"""
    pass


class IntegrationError(InfraError):
    """Erro de integracao com servico externo (email, API terceiros)"""
    pass


class FileStorageError(InfraError):
    """Erro de armazenamento de arquivo"""
    pass
