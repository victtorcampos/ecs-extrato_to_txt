"""Casos de Uso para Layouts de Importação Excel"""
from datetime import datetime
from typing import Optional, List
from uuid import uuid4

from src.domain.entities import LayoutExcel, ColunaLayout, ConfigPlanilha, ConfigValor, ConfigHistoricoPadrao, RegraContaLayout
from src.domain.value_objects import CNPJ, TipoDado, TipoSinal, CAMPOS_DESTINO
from src.domain.exceptions import (
    LayoutNaoEncontradoError, 
    LayoutInvalidoError,
    ColunaObrigatoriaError,
    ColunaDuplicadaError
)
from src.application.ports.repositories.layout_repository_port import LayoutRepositoryPort, RegraRepositoryPort


class CriarLayoutUseCase:
    """Caso de uso para criar um novo layout"""
    
    def __init__(self, repository: LayoutRepositoryPort):
        self.repository = repository
    
    async def executar(
        self,
        cnpj: str,
        nome: str,
        descricao: Optional[str] = None,
        config_planilha: Optional[dict] = None,
        colunas: Optional[List[dict]] = None,
        config_valor: Optional[dict] = None,
        config_historico_padrao: Optional[dict] = None,
        regras_conta: Optional[List[dict]] = None,
    ) -> LayoutExcel:
        """Cria um novo layout de importação"""
        
        # Validar CNPJ
        cnpj_vo = CNPJ(cnpj)
        
        # Verificar se já existe layout com mesmo nome para o CNPJ
        existente = await self.repository.buscar_por_nome(cnpj_vo.numerico, nome)
        if existente:
            raise LayoutInvalidoError(f"Já existe um layout com nome '{nome}' para este CNPJ")
        
        # Criar layout
        layout = LayoutExcel(
            cnpj=cnpj_vo.numerico,
            nome=nome,
            descricao=descricao,
            ativo=True
        )
        
        # Configurar planilha
        if config_planilha:
            layout.config_planilha = ConfigPlanilha.from_dict(config_planilha)
        
        # Configurar colunas
        if colunas:
            campos_mapeados = set()
            for col_data in colunas:
                campo = col_data.get("campo_destino")
                if campo in campos_mapeados:
                    raise ColunaDuplicadaError(campo)
                campos_mapeados.add(campo)
                layout.colunas.append(ColunaLayout.from_dict(col_data))
        
        # Configurar valor (D/C)
        if config_valor:
            layout.config_valor = ConfigValor.from_dict(config_valor)
        
        # Configurar histórico padrão
        if config_historico_padrao:
            layout.config_historico_padrao = ConfigHistoricoPadrao.from_dict(config_historico_padrao)
        
        # Configurar regras de conta
        if regras_conta:
            layout.regras_conta = [RegraContaLayout.from_dict(r) for r in regras_conta]
        
        return await self.repository.salvar(layout)


class AtualizarLayoutUseCase:
    """Caso de uso para atualizar um layout"""
    
    def __init__(self, repository: LayoutRepositoryPort):
        self.repository = repository
    
    async def executar(
        self,
        layout_id: str,
        nome: Optional[str] = None,
        descricao: Optional[str] = None,
        ativo: Optional[bool] = None,
        config_planilha: Optional[dict] = None,
        colunas: Optional[List[dict]] = None,
        config_valor: Optional[dict] = None,
        config_historico_padrao: Optional[dict] = None,
        regras_conta: Optional[List[dict]] = None,
    ) -> LayoutExcel:
        """Atualiza um layout existente"""
        
        layout = await self.repository.buscar_por_id(layout_id)
        if not layout:
            raise LayoutNaoEncontradoError(f"Layout não encontrado: {layout_id}")
        
        if nome is not None:
            # Verificar duplicidade
            existente = await self.repository.buscar_por_nome(layout.cnpj, nome)
            if existente and existente.id != layout_id:
                raise LayoutInvalidoError(f"Já existe um layout com nome '{nome}'")
            layout.nome = nome
        
        if descricao is not None:
            layout.descricao = descricao
        
        if ativo is not None:
            layout.ativo = ativo
        
        if config_planilha is not None:
            layout.config_planilha = ConfigPlanilha.from_dict(config_planilha)
        
        if colunas is not None:
            campos_mapeados = set()
            novas_colunas = []
            for col_data in colunas:
                campo = col_data.get("campo_destino")
                if campo in campos_mapeados:
                    raise ColunaDuplicadaError(campo)
                campos_mapeados.add(campo)
                novas_colunas.append(ColunaLayout.from_dict(col_data))
            layout.colunas = novas_colunas
        
        if config_valor is not None:
            layout.config_valor = ConfigValor.from_dict(config_valor)
        
        if config_historico_padrao is not None:
            layout.config_historico_padrao = ConfigHistoricoPadrao.from_dict(config_historico_padrao)
        
        if regras_conta is not None:
            layout.regras_conta = [RegraContaLayout.from_dict(r) for r in regras_conta]
        
        layout.atualizado_em = datetime.now()
        
        return await self.repository.atualizar(layout)


class ListarLayoutsUseCase:
    """Caso de uso para listar layouts"""
    
    def __init__(self, repository: LayoutRepositoryPort):
        self.repository = repository
    
    async def listar(
        self,
        cnpj: Optional[str] = None,
        apenas_ativos: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> List[LayoutExcel]:
        """Lista layouts com filtros opcionais"""
        
        if cnpj:
            cnpj_vo = CNPJ(cnpj)
            return await self.repository.listar_por_cnpj(cnpj_vo.numerico, apenas_ativos)
        
        return await self.repository.listar(skip, limit)
    
    async def buscar_por_id(self, layout_id: str) -> Optional[LayoutExcel]:
        """Busca layout por ID"""
        return await self.repository.buscar_por_id(layout_id)
    
    async def listar_cnpjs(self) -> List[str]:
        """Lista CNPJs distintos"""
        return await self.repository.listar_cnpjs_distintos()
    
    async def contar(self, cnpj: Optional[str] = None) -> int:
        """Conta layouts"""
        if cnpj:
            cnpj_vo = CNPJ(cnpj)
            return await self.repository.contar(cnpj_vo.numerico)
        return await self.repository.contar()


class DeletarLayoutUseCase:
    """Caso de uso para deletar layouts"""
    
    def __init__(
        self, 
        layout_repository: LayoutRepositoryPort,
        regra_repository: RegraRepositoryPort
    ):
        self.layout_repository = layout_repository
        self.regra_repository = regra_repository
    
    async def executar(self, layout_id: str) -> bool:
        """Remove um layout e suas regras"""
        
        layout = await self.layout_repository.buscar_por_id(layout_id)
        if not layout:
            raise LayoutNaoEncontradoError(f"Layout não encontrado: {layout_id}")
        
        # Remover regras do layout
        await self.regra_repository.deletar_por_layout(layout_id)
        
        # Remover layout
        return await self.layout_repository.deletar(layout_id)


class ClonarLayoutUseCase:
    """Caso de uso para clonar um layout"""
    
    def __init__(
        self,
        layout_repository: LayoutRepositoryPort,
        regra_repository: RegraRepositoryPort
    ):
        self.layout_repository = layout_repository
        self.regra_repository = regra_repository
    
    async def executar(
        self,
        layout_id: str,
        novo_cnpj: Optional[str] = None,
        novo_nome: Optional[str] = None
    ) -> LayoutExcel:
        """Clona um layout existente"""
        
        layout_original = await self.layout_repository.buscar_por_id(layout_id)
        if not layout_original:
            raise LayoutNaoEncontradoError(f"Layout não encontrado: {layout_id}")
        
        # Determinar CNPJ e nome
        cnpj = novo_cnpj if novo_cnpj else layout_original.cnpj
        if novo_cnpj:
            cnpj_vo = CNPJ(novo_cnpj)
            cnpj = cnpj_vo.numerico
        
        nome = novo_nome if novo_nome else f"{layout_original.nome} (cópia)"
        
        # Verificar duplicidade
        existente = await self.layout_repository.buscar_por_nome(cnpj, nome)
        if existente:
            raise LayoutInvalidoError(f"Já existe um layout com nome '{nome}'")
        
        # Criar cópia
        novo_layout = LayoutExcel(
            cnpj=cnpj,
            nome=nome,
            descricao=layout_original.descricao,
            ativo=True,
            config_planilha=ConfigPlanilha.from_dict(layout_original.config_planilha.to_dict()),
            colunas=[ColunaLayout.from_dict(c.to_dict()) for c in layout_original.colunas],
            config_valor=ConfigValor.from_dict(layout_original.config_valor.to_dict()),
            config_historico_padrao=ConfigHistoricoPadrao.from_dict(layout_original.config_historico_padrao.to_dict()),
            regras_conta=[RegraContaLayout.from_dict(r.to_dict()) for r in layout_original.regras_conta],
        )
        
        # Gerar novos IDs para colunas
        for coluna in novo_layout.colunas:
            coluna.id = str(uuid4())
        
        layout_salvo = await self.layout_repository.salvar(novo_layout)
        
        # Clonar regras
        regras_originais = await self.regra_repository.listar_por_layout(layout_id, apenas_ativas=False)
        for regra in regras_originais:
            from src.domain.entities import RegraProcessamento, CondicaoRegra, AcaoRegra
            nova_regra = RegraProcessamento(
                layout_id=layout_salvo.id,
                nome=regra.nome,
                descricao=regra.descricao,
                ordem=regra.ordem,
                ativo=regra.ativo,
                tipo=regra.tipo,
                condicoes=[CondicaoRegra.from_dict(c.to_dict()) for c in regra.condicoes],
                condicoes_ou=[CondicaoRegra.from_dict(c.to_dict()) for c in regra.condicoes_ou],
                acao=AcaoRegra.from_dict(regra.acao.to_dict()),
                acoes_extras=[AcaoRegra.from_dict(a.to_dict()) for a in regra.acoes_extras]
            )
            await self.regra_repository.salvar(nova_regra)
        
        return layout_salvo
