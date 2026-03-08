"""Casos de Uso para Regras de Processamento"""
from datetime import datetime
from typing import Optional, List, Any
from uuid import uuid4

from src.domain.entities import RegraProcessamento, CondicaoRegra, AcaoRegra
from src.domain.value_objects import TipoRegra, OperadorCondicao, TipoAcao
from src.domain.exceptions import (
    RegraNaoEncontradaError,
    RegraInvalidaError,
    LayoutNaoEncontradoError
)
from src.application.ports.repositories.layout_repository_port import LayoutRepositoryPort, RegraRepositoryPort


class CriarRegraUseCase:
    """Caso de uso para criar uma nova regra"""
    
    def __init__(
        self,
        regra_repository: RegraRepositoryPort,
        layout_repository: LayoutRepositoryPort
    ):
        self.regra_repository = regra_repository
        self.layout_repository = layout_repository
    
    async def executar(
        self,
        layout_id: str,
        nome: str,
        tipo: str,
        condicoes: List[dict],
        acao: dict,
        descricao: Optional[str] = None,
        condicoes_ou: Optional[List[dict]] = None,
        acoes_extras: Optional[List[dict]] = None,
        ativo: bool = True
    ) -> RegraProcessamento:
        """Cria uma nova regra de processamento"""
        
        # Verificar se layout existe
        layout = await self.layout_repository.buscar_por_id(layout_id)
        if not layout:
            raise LayoutNaoEncontradoError(f"Layout não encontrado: {layout_id}")
        
        # Obter próxima ordem
        ordem = await self.regra_repository.obter_proxima_ordem(layout_id)
        
        # Criar regra
        regra = RegraProcessamento(
            layout_id=layout_id,
            nome=nome,
            descricao=descricao,
            ordem=ordem,
            ativo=ativo,
            tipo=TipoRegra(tipo),
            condicoes=[CondicaoRegra.from_dict(c) for c in condicoes],
            condicoes_ou=[CondicaoRegra.from_dict(c) for c in (condicoes_ou or [])],
            acao=AcaoRegra.from_dict(acao),
            acoes_extras=[AcaoRegra.from_dict(a) for a in (acoes_extras or [])]
        )
        
        return await self.regra_repository.salvar(regra)


class AtualizarRegraUseCase:
    """Caso de uso para atualizar uma regra"""
    
    def __init__(self, repository: RegraRepositoryPort):
        self.repository = repository
    
    async def executar(
        self,
        regra_id: str,
        nome: Optional[str] = None,
        descricao: Optional[str] = None,
        tipo: Optional[str] = None,
        condicoes: Optional[List[dict]] = None,
        condicoes_ou: Optional[List[dict]] = None,
        acao: Optional[dict] = None,
        acoes_extras: Optional[List[dict]] = None,
        ativo: Optional[bool] = None
    ) -> RegraProcessamento:
        """Atualiza uma regra existente"""
        
        regra = await self.repository.buscar_por_id(regra_id)
        if not regra:
            raise RegraNaoEncontradaError(f"Regra não encontrada: {regra_id}")
        
        if nome is not None:
            regra.nome = nome
        
        if descricao is not None:
            regra.descricao = descricao
        
        if tipo is not None:
            regra.tipo = TipoRegra(tipo)
        
        if condicoes is not None:
            regra.condicoes = [CondicaoRegra.from_dict(c) for c in condicoes]
        
        if condicoes_ou is not None:
            regra.condicoes_ou = [CondicaoRegra.from_dict(c) for c in condicoes_ou]
        
        if acao is not None:
            regra.acao = AcaoRegra.from_dict(acao)
        
        if acoes_extras is not None:
            regra.acoes_extras = [AcaoRegra.from_dict(a) for a in acoes_extras]
        
        if ativo is not None:
            regra.ativo = ativo
        
        regra.atualizado_em = datetime.now()
        
        return await self.repository.atualizar(regra)


class ListarRegrasUseCase:
    """Caso de uso para listar regras"""
    
    def __init__(self, repository: RegraRepositoryPort):
        self.repository = repository
    
    async def listar_por_layout(
        self,
        layout_id: str,
        apenas_ativas: bool = False
    ) -> List[RegraProcessamento]:
        """Lista regras de um layout"""
        return await self.repository.listar_por_layout(layout_id, apenas_ativas)
    
    async def buscar_por_id(self, regra_id: str) -> Optional[RegraProcessamento]:
        """Busca regra por ID"""
        return await self.repository.buscar_por_id(regra_id)
    
    async def contar_por_layout(self, layout_id: str) -> int:
        """Conta regras de um layout"""
        return await self.repository.contar_por_layout(layout_id)


class ReordenarRegrasUseCase:
    """Caso de uso para reordenar regras"""
    
    def __init__(self, repository: RegraRepositoryPort):
        self.repository = repository
    
    async def executar(self, layout_id: str, ordem_ids: List[str]) -> bool:
        """Reordena as regras de um layout"""
        return await self.repository.reordenar(layout_id, ordem_ids)


class DeletarRegraUseCase:
    """Caso de uso para deletar regras"""
    
    def __init__(self, repository: RegraRepositoryPort):
        self.repository = repository
    
    async def executar(self, regra_id: str) -> bool:
        """Remove uma regra"""
        regra = await self.repository.buscar_por_id(regra_id)
        if not regra:
            raise RegraNaoEncontradaError(f"Regra não encontrada: {regra_id}")
        
        return await self.repository.deletar(regra_id)


class TestarRegraUseCase:
    """Caso de uso para testar uma regra com dados"""
    
    def __init__(self, repository: RegraRepositoryPort):
        self.repository = repository
    
    async def executar(
        self,
        regra_id: str,
        dados_teste: List[dict]
    ) -> List[dict]:
        """Testa uma regra com dados de exemplo"""
        
        regra = await self.repository.buscar_por_id(regra_id)
        if not regra:
            raise RegraNaoEncontradaError(f"Regra não encontrada: {regra_id}")
        
        resultados = []
        
        for dado in dados_teste:
            resultado = {
                "original": dado.copy(),
                "condicao_satisfeita": regra.avaliar_condicoes(dado),
                "acao_aplicada": False,
                "resultado": dado.copy()
            }
            
            if resultado["condicao_satisfeita"]:
                resultado["acao_aplicada"] = True
                # Simular aplicação da ação (sem modificar original)
                resultado["resultado"] = self._aplicar_acao(dado.copy(), regra)
            
            resultados.append(resultado)
        
        return resultados
    
    def _aplicar_acao(self, dado: dict, regra: RegraProcessamento) -> dict:
        """Aplica a ação da regra no dado"""
        from src.domain.value_objects import TipoAcao
        
        if regra.acao.tipo_acao == TipoAcao.EXCLUIR:
            return {"_excluido": True}
        
        if regra.acao.tipo_acao == TipoAcao.DEFINIR_VALOR:
            if regra.acao.campo_destino:
                dado[regra.acao.campo_destino] = regra.acao.valor
        
        if regra.acao.tipo_acao == TipoAcao.VALOR_ABSOLUTO:
            if regra.acao.campo_destino and regra.acao.campo_destino in dado:
                dado[regra.acao.campo_destino] = abs(float(dado[regra.acao.campo_destino] or 0))
        
        if regra.acao.tipo_acao == TipoAcao.TEMPLATE:
            if regra.acao.campo_destino:
                template = str(regra.acao.valor or "")
                for campo, valor in dado.items():
                    template = template.replace(f"{{{campo}}}", str(valor or ""))
                dado[regra.acao.campo_destino] = template
        
        return dado


class AplicarRegrasUseCase:
    """Caso de uso para aplicar regras em lançamentos"""
    
    def __init__(self, repository: RegraRepositoryPort):
        self.repository = repository
    
    async def executar(
        self,
        layout_id: str,
        lancamentos: List[dict]
    ) -> tuple[List[dict], List[dict]]:
        """
        Aplica regras do layout nos lançamentos
        Retorna: (lancamentos_processados, erros)
        """
        
        regras = await self.repository.listar_por_layout(layout_id, apenas_ativas=True)
        
        processados = []
        erros = []
        
        for idx, lanc in enumerate(lancamentos):
            lanc_copy = lanc.copy()
            lanc_copy["_regras_aplicadas"] = []
            excluido = False
            
            for regra in regras:
                if regra.avaliar_condicoes(lanc_copy):
                    resultado = self._aplicar_regra(lanc_copy, regra)
                    
                    if resultado.get("_excluido"):
                        excluido = True
                        break
                    
                    if resultado.get("_erro"):
                        erros.append({
                            "linha": idx + 1,
                            "regra": regra.nome,
                            "erro": resultado["_erro"]
                        })
                    
                    lanc_copy = resultado
                    lanc_copy["_regras_aplicadas"].append(regra.id)
            
            if not excluido:
                processados.append(lanc_copy)
        
        return processados, erros
    
    def _aplicar_regra(self, dado: dict, regra: RegraProcessamento) -> dict:
        """Aplica uma regra no dado"""
        from src.domain.value_objects import TipoAcao
        
        acao = regra.acao
        
        if acao.tipo_acao == TipoAcao.EXCLUIR:
            return {"_excluido": True}
        
        if acao.tipo_acao == TipoAcao.ERRO:
            dado["_erro"] = acao.valor
            return dado
        
        if acao.tipo_acao == TipoAcao.DEFINIR_VALOR:
            if acao.campo_destino:
                dado[acao.campo_destino] = acao.valor
        
        if acao.tipo_acao == TipoAcao.VALOR_ABSOLUTO:
            campo = acao.campo_destino or "valor"
            if campo in dado:
                dado[campo] = abs(float(dado[campo] or 0))
        
        if acao.tipo_acao == TipoAcao.MULTIPLICAR:
            campo = acao.campo_destino or "valor"
            if campo in dado:
                multiplicador = float(acao.valor or 1)
                dado[campo] = float(dado[campo] or 0) * multiplicador
        
        if acao.tipo_acao == TipoAcao.TEMPLATE:
            if acao.campo_destino:
                template = str(acao.valor or "")
                for campo, valor in dado.items():
                    if not campo.startswith("_"):
                        template = template.replace(f"{{{campo}}}", str(valor or ""))
                dado[acao.campo_destino] = template
        
        if acao.tipo_acao == TipoAcao.COPIAR_CAMPO:
            if acao.campo_destino and acao.valor:
                dado[acao.campo_destino] = dado.get(acao.valor)
        
        if acao.tipo_acao == TipoAcao.CONVERTER_MAIUSCULA:
            if acao.campo_destino and acao.campo_destino in dado:
                dado[acao.campo_destino] = str(dado[acao.campo_destino] or "").upper()
        
        if acao.tipo_acao == TipoAcao.CONVERTER_MINUSCULA:
            if acao.campo_destino and acao.campo_destino in dado:
                dado[acao.campo_destino] = str(dado[acao.campo_destino] or "").lower()
        
        if acao.tipo_acao == TipoAcao.SUBSTITUIR:
            if acao.campo_destino and acao.campo_destino in dado:
                params = acao.parametros or {}
                buscar = params.get("buscar", "")
                substituir = params.get("substituir", "")
                dado[acao.campo_destino] = str(dado[acao.campo_destino] or "").replace(buscar, substituir)
        
        if acao.tipo_acao == TipoAcao.CONCATENAR:
            if acao.campo_destino:
                params = acao.parametros or {}
                campos = params.get("campos", [])
                separador = params.get("separador", " ")
                valores = [str(dado.get(c, "")) for c in campos]
                dado[acao.campo_destino] = separador.join(valores)
        
        # Aplicar ações extras
        for acao_extra in regra.acoes_extras:
            dado = self._aplicar_acao_simples(dado, acao_extra)
        
        return dado
    
    def _aplicar_acao_simples(self, dado: dict, acao: AcaoRegra) -> dict:
        """Aplica uma ação simples"""
        from src.domain.value_objects import TipoAcao
        
        if acao.tipo_acao == TipoAcao.DEFINIR_VALOR and acao.campo_destino:
            dado[acao.campo_destino] = acao.valor
        
        return dado
