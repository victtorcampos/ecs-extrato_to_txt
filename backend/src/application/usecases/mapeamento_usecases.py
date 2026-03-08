"""Casos de Uso para Mapeamento de Contas Contábeis"""
from datetime import datetime
from typing import Optional, List
from uuid import uuid4

from src.domain.entities import MapeamentoConta
from src.domain.value_objects import CNPJ
from src.domain.exceptions import DomainError
from src.application.ports.repositories import MapeamentoContaRepositoryPort


class MapeamentoNaoEncontradoError(DomainError):
    """Mapeamento não encontrado"""
    pass


class CriarMapeamentoUseCase:
    """Caso de uso para criar um novo mapeamento"""
    
    def __init__(self, repository: MapeamentoContaRepositoryPort):
        self.repository = repository
    
    async def executar(
        self,
        cnpj: str,
        conta_cliente: str,
        conta_padrao: str,
        nome_conta_cliente: Optional[str] = None,
        nome_conta_padrao: Optional[str] = None
    ) -> MapeamentoConta:
        """Cria um novo mapeamento de conta"""
        
        # Validar CNPJ
        cnpj_vo = CNPJ(cnpj)
        
        # Verificar se já existe mapeamento para esta conta
        existente = await self.repository.buscar_por_conta_cliente(
            cnpj_vo.numerico, 
            conta_cliente
        )
        
        if existente:
            # Atualizar existente
            existente.conta_padrao = conta_padrao
            existente.nome_conta_cliente = nome_conta_cliente
            existente.nome_conta_padrao = nome_conta_padrao
            return await self.repository.atualizar(existente)
        
        # Criar novo
        mapeamento = MapeamentoConta(
            cnpj=cnpj_vo.numerico,
            conta_cliente=conta_cliente,
            conta_padrao=conta_padrao,
            nome_conta_cliente=nome_conta_cliente,
            nome_conta_padrao=nome_conta_padrao
        )
        
        return await self.repository.salvar(mapeamento)


class AtualizarMapeamentoUseCase:
    """Caso de uso para atualizar um mapeamento"""
    
    def __init__(self, repository: MapeamentoContaRepositoryPort):
        self.repository = repository
    
    async def executar(
        self,
        id: str,
        conta_padrao: Optional[str] = None,
        nome_conta_cliente: Optional[str] = None,
        nome_conta_padrao: Optional[str] = None
    ) -> MapeamentoConta:
        """Atualiza um mapeamento existente"""
        
        mapeamento = await self.repository.buscar_por_id(id)
        if not mapeamento:
            raise MapeamentoNaoEncontradoError(f"Mapeamento não encontrado: {id}")
        
        if conta_padrao is not None:
            mapeamento.conta_padrao = conta_padrao
        if nome_conta_cliente is not None:
            mapeamento.nome_conta_cliente = nome_conta_cliente
        if nome_conta_padrao is not None:
            mapeamento.nome_conta_padrao = nome_conta_padrao
        
        return await self.repository.atualizar(mapeamento)


class AtualizarLoteMapeamentoUseCase:
    """Caso de uso para atualizar mapeamentos em lote"""
    
    def __init__(self, repository: MapeamentoContaRepositoryPort):
        self.repository = repository
    
    async def executar(self, ids: List[str], conta_padrao: str) -> int:
        """Atualiza a conta padrão de múltiplos mapeamentos"""
        
        if not ids:
            return 0
        
        return await self.repository.atualizar_em_lote(ids, conta_padrao)


class ListarMapeamentosUseCase:
    """Caso de uso para listar mapeamentos"""
    
    def __init__(self, repository: MapeamentoContaRepositoryPort):
        self.repository = repository
    
    async def listar(
        self, 
        cnpj: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[MapeamentoConta]:
        """Lista mapeamentos, opcionalmente filtrado por CNPJ"""
        
        if cnpj:
            cnpj_vo = CNPJ(cnpj)
            return await self.repository.listar_por_cnpj(cnpj_vo.numerico)
        
        return await self.repository.listar(skip, limit)
    
    async def buscar_por_id(self, id: str) -> Optional[MapeamentoConta]:
        """Busca mapeamento por ID"""
        return await self.repository.buscar_por_id(id)
    
    async def listar_cnpjs(self) -> List[str]:
        """Lista CNPJs distintos"""
        return await self.repository.listar_cnpjs_distintos()
    
    async def contar(self, cnpj: Optional[str] = None) -> int:
        """Conta mapeamentos"""
        if cnpj:
            cnpj_vo = CNPJ(cnpj)
            return await self.repository.contar(cnpj_vo.numerico)
        return await self.repository.contar()


class DeletarMapeamentoUseCase:
    """Caso de uso para deletar mapeamentos"""
    
    def __init__(self, repository: MapeamentoContaRepositoryPort):
        self.repository = repository
    
    async def executar(self, id: str) -> bool:
        """Remove um mapeamento"""
        
        mapeamento = await self.repository.buscar_por_id(id)
        if not mapeamento:
            raise MapeamentoNaoEncontradoError(f"Mapeamento não encontrado: {id}")
        
        return await self.repository.deletar(id)
    
    async def executar_em_lote(self, ids: List[str]) -> int:
        """Remove múltiplos mapeamentos"""
        
        if not ids:
            return 0
        
        return await self.repository.deletar_em_lote(ids)
