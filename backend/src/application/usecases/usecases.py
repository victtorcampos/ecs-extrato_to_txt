"""Casos de Uso da Aplicação"""
from datetime import datetime
from typing import Optional, List, Dict
from uuid import uuid4

from src.domain.entities import Lote, StatusLote, PendenciaMapeamento, MapeamentoConta, Lancamento
from src.domain.value_objects import CNPJ, PeriodoContabil, Email
from src.domain.exceptions import (
    ProtocoloNaoEncontradoError,
    LancamentoForaDoPeriodoError,
    PendenciasMapeamentoError,
    ArquivoExcelInvalidoError,
)
from src.application.ports.repositories import LoteRepositoryPort, MapeamentoContaRepositoryPort
from src.application.ports.repositories.layout_repository_port import LayoutRepositoryPort
from src.application.ports.services import TxtGeneratorPort, EmailSenderPort, FileStoragePort
from src.config.logging_config import get_logger

logger = get_logger("usecases")


class CriarProtocoloUseCase:
    """Caso de uso para criar um novo protocolo/lote"""

    def __init__(self, lote_repository: LoteRepositoryPort, file_storage: FileStoragePort = None):
        self.lote_repository = lote_repository
        self.file_storage = file_storage

    async def executar(
        self,
        cnpj: str,
        periodo_mes: int,
        periodo_ano: int,
        email_notificacao: str,
        arquivo_base64: str,
        nome_arquivo: str,
        codigo_matriz_filial: str = "",
        nome_layout: str = "padrao",
        layout_id: str = None,
        perfil_saida_id: str = None
    ) -> Lote:
        """Cria um novo lote com protocolo único"""
        import base64 as _base64

        # Validar Value Objects
        cnpj_vo = CNPJ(cnpj)
        periodo_vo = PeriodoContabil(periodo_mes, periodo_ano)
        email_valor = ""
        if email_notificacao:
            email_vo = Email(email_notificacao)
            email_valor = email_vo.valor

        # Gerar protocolo único
        protocolo = f"PROT-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(uuid4())[:8].upper()}"

        # Salvar arquivo Excel em disco
        caminho_original = None
        if self.file_storage and arquivo_base64:
            arquivo_bytes = _base64.b64decode(arquivo_base64)
            caminho_original = await self.file_storage.salvar(
                conteudo=arquivo_bytes,
                nome_arquivo=nome_arquivo or f"{protocolo}.xlsx",
                subdiretorio="originais"
            )

        # Criar lote
        lote = Lote(
            protocolo=protocolo,
            cnpj=cnpj_vo.numerico,
            periodo_mes=periodo_vo.mes,
            periodo_ano=periodo_vo.ano,
            email_notificacao=email_valor,
            nome_layout=nome_layout,
            layout_id=layout_id,
            perfil_saida_id=perfil_saida_id,
            codigo_matriz_filial=codigo_matriz_filial,
            nome_arquivo=nome_arquivo,
            caminho_arquivo_original=caminho_original,
            status=StatusLote.AGUARDANDO
        )

        # Persistir
        return await self.lote_repository.salvar(lote)


class ProcessarLoteUseCase:
    """Caso de uso para processar um lote"""
    
    def __init__(
        self,
        lote_repository: LoteRepositoryPort,
        mapeamento_repository: MapeamentoContaRepositoryPort,
        txt_generator: TxtGeneratorPort,
        email_sender: EmailSenderPort,
        layout_repository: LayoutRepositoryPort = None,
        dynamic_parser=None,
        perfil_saida_repository=None,
        file_storage: FileStoragePort = None,
    ):
        self.lote_repository = lote_repository
        self.mapeamento_repository = mapeamento_repository
        self.txt_generator = txt_generator
        self.email_sender = email_sender
        self.layout_repository = layout_repository
        self.dynamic_parser = dynamic_parser
        self.perfil_saida_repository = perfil_saida_repository
        self.file_storage = file_storage
    
    async def executar(self, lote_id: str) -> Lote:
        """Processa um lote existente"""
        
        # Buscar lote
        lote = await self.lote_repository.buscar_por_id(lote_id)
        if not lote:
            raise ProtocoloNaoEncontradoError(f"Lote não encontrado: {lote_id}")
        
        try:
            # Atualizar status
            lote.status = StatusLote.PROCESSANDO
            lote.atualizado_em = datetime.now()
            await self.lote_repository.atualizar(lote)
            
            # Parse do Excel - usar parser dinâmico se layout_id disponível
            lancamentos = await self._parse_excel(lote)
            
            # Validar período
            lancamentos_fora = []
            for lanc in lancamentos:
                if lanc.data and not lanc.esta_no_periodo(lote.periodo_mes, lote.periodo_ano):
                    lancamentos_fora.append(lanc)
            
            if lancamentos_fora:
                raise LancamentoForaDoPeriodoError(
                    f"{len(lancamentos_fora)} lançamento(s) fora do período {lote.periodo_mes:02d}/{lote.periodo_ano}"
                )
            
            lote.lancamentos = lancamentos
            
            # Buscar mapeamentos existentes
            mapeamentos_existentes = await self.mapeamento_repository.listar_por_cnpj(lote.cnpj)
            mapeamentos_dict = {m.conta_cliente: m.conta_padrao for m in mapeamentos_existentes}
            
            # Coletar contas que são destinos de regras_conta (não precisam de mapeamento)
            contas_de_regras: set = set()
            if lote.layout_id and self.layout_repository:
                layout_para_regras = await self.layout_repository.buscar_por_id(lote.layout_id)
                if layout_para_regras:
                    for regra in layout_para_regras.regras_conta:
                        if regra.conta_debito:
                            contas_de_regras.add(regra.conta_debito)
                        if regra.conta_credito:
                            contas_de_regras.add(regra.conta_credito)
                        for acao in regra.acoes:
                            if acao.campo_destino in ("conta_debito", "conta_credito") and acao.valor:
                                contas_de_regras.add(acao.valor)

            # Identificar contas sem mapeamento (excluindo destinos de regras)
            contas_sem_mapeamento = set()
            for lanc in lancamentos:
                if lanc.conta_debito \
                        and lanc.conta_debito not in mapeamentos_dict \
                        and lanc.conta_debito not in contas_de_regras:
                    contas_sem_mapeamento.add((lanc.conta_debito, "debito"))
                if lanc.conta_credito \
                        and lanc.conta_credito not in mapeamentos_dict \
                        and lanc.conta_credito not in contas_de_regras:
                    contas_sem_mapeamento.add((lanc.conta_credito, "credito"))
            
            if contas_sem_mapeamento:
                # Criar pendências
                lote.pendencias = []
                for conta, tipo in contas_sem_mapeamento:
                    pendencia = PendenciaMapeamento(
                        conta_cliente=conta,
                        tipo=tipo,
                        resolvida=False
                    )
                    lote.adicionar_pendencia(pendencia)
                
                lote.status = StatusLote.PENDENTE
                lote.atualizado_em = datetime.now()
                await self.lote_repository.atualizar(lote)
                return lote
            
            # Gerar arquivo de saída
            arquivo_saida = await self._gerar_saida(lote, lancamentos, mapeamentos_dict)

            # Salvar em disco
            caminho = await self.file_storage.salvar(
                conteudo=arquivo_saida.encode('utf-8'),
                nome_arquivo=f"{lote.protocolo}.txt",
                subdiretorio="saidas"
            )
            lote.caminho_arquivo_saida = caminho

            lote.status = StatusLote.CONCLUIDO
            lote.processado_em = datetime.now()
            lote.atualizado_em = datetime.now()
            
            await self.lote_repository.atualizar(lote)
            
            # Enviar email de notificação
            try:
                if lote.email_notificacao:
                    await self.email_sender.enviar(
                        destinatario=lote.email_notificacao,
                        assunto=f"Lote {lote.protocolo} Processado com Sucesso",
                        corpo_html=f"""
                        <h2>Processamento Concluído</h2>
                        <p>O lote <strong>{lote.protocolo}</strong> foi processado com sucesso.</p>
                        <p>Total de lançamentos: {lote.total_lancamentos}</p>
                        <p>Valor total: R$ {lote.valor_total:,.2f}</p>
                        <p>Acesse o sistema para baixar o arquivo gerado.</p>
                        """
                    )
            except Exception as e:
                logger.warning(f"Falha ao enviar email de notificação para {lote.email_notificacao}: {e}")
            
            return lote
            
        except LancamentoForaDoPeriodoError as e:
            lote.status = StatusLote.ERRO
            lote.mensagem_erro = str(e)
            lote.atualizado_em = datetime.now()
            await self.lote_repository.atualizar(lote)
            raise
        except Exception as e:
            lote.status = StatusLote.ERRO
            lote.mensagem_erro = str(e)
            lote.atualizado_em = datetime.now()
            await self.lote_repository.atualizar(lote)
            raise

    async def _parse_excel(self, lote: Lote) -> List[Lancamento]:
        """Parse Excel usando parser dinâmico"""
        if not (lote.layout_id and self.layout_repository and self.dynamic_parser):
            raise ArquivoExcelInvalidoError("Layout não configurado para este lote")
        if not lote.caminho_arquivo_original:
            raise ArquivoExcelInvalidoError("Arquivo original não encontrado no disco")
        layout = await self.layout_repository.buscar_por_id(lote.layout_id)
        if not (layout and layout.colunas):
            raise ArquivoExcelInvalidoError("Layout sem colunas configuradas")
        import base64 as _base64
        arquivo_bytes = await self.file_storage.ler(lote.caminho_arquivo_original)
        arquivo_base64 = _base64.b64encode(arquivo_bytes).decode('utf-8')
        return self.dynamic_parser.parse(arquivo_base64, layout)

    async def _gerar_saida(self, lote: Lote, lancamentos: List[Lancamento], mapeamentos: Dict[str, str]) -> str:
        """Gera arquivo de saída usando perfil de saída (se disponível) ou TXT padrão"""
        if lote.perfil_saida_id and self.perfil_saida_repository:
            try:
                perfil = await self.perfil_saida_repository.buscar_por_id(lote.perfil_saida_id)
                if perfil:
                    from src.adapters.outbound.output_generators import OutputGeneratorFactory
                    gerador = OutputGeneratorFactory.obter_gerador(
                        perfil.sistema_destino.value,
                        perfil.formato.value,
                    )
                    erros = gerador.validar(lancamentos, lote.cnpj, mapeamentos, perfil.config.to_dict())
                    if erros:
                        logger.warning(f"Validação do perfil de saída retornou erros: {erros}")
                    return gerador.gerar(lancamentos, lote.cnpj, mapeamentos, perfil.config.to_dict())
            except Exception as e:
                logger.warning(f"Erro ao usar perfil de saída {lote.perfil_saida_id}, usando TXT padrão: {e}")
        # Fallback: TXT generator padrão
        return self.txt_generator.gerar(lancamentos, lote.cnpj, mapeamentos)


class ResolverPendenciaUseCase:
    """Caso de uso para resolver pendências de mapeamento"""
    
    def __init__(
        self,
        lote_repository: LoteRepositoryPort,
        mapeamento_repository: MapeamentoContaRepositoryPort
    ):
        self.lote_repository = lote_repository
        self.mapeamento_repository = mapeamento_repository
    
    async def executar(
        self,
        lote_id: str,
        mapeamentos: Dict[str, str]  # conta_cliente -> conta_padrao
    ) -> Lote:
        """Resolve pendências de mapeamento"""
        
        lote = await self.lote_repository.buscar_por_id(lote_id)
        if not lote:
            raise ProtocoloNaoEncontradoError(f"Lote não encontrado: {lote_id}")
        
        # Aplicar mapeamentos
        for conta_cliente, conta_padrao in mapeamentos.items():
            # Resolver pendência no lote
            lote.resolver_pendencia(conta_cliente, conta_padrao)
            
            # Salvar mapeamento para uso futuro
            mapeamento = MapeamentoConta(
                cnpj=lote.cnpj,
                conta_cliente=conta_cliente,
                conta_padrao=conta_padrao
            )
            await self.mapeamento_repository.salvar(mapeamento)
        
        # Se todas pendências resolvidas, atualizar status
        if not lote.tem_pendencias:
            lote.status = StatusLote.AGUARDANDO  # Pronto para reprocessar
        
        lote.atualizado_em = datetime.now()
        await self.lote_repository.atualizar(lote)
        
        return lote


class ConsultarLoteUseCase:
    """Caso de uso para consultar lotes"""
    
    def __init__(self, lote_repository: LoteRepositoryPort):
        self.lote_repository = lote_repository
    
    async def buscar_por_id(self, id: str) -> Optional[Lote]:
        return await self.lote_repository.buscar_por_id(id)
    
    async def buscar_por_protocolo(self, protocolo: str) -> Optional[Lote]:
        return await self.lote_repository.buscar_por_protocolo(protocolo)
    
    async def buscar_por_cnpj(self, cnpj: str) -> List[Lote]:
        cnpj_vo = CNPJ(cnpj)
        return await self.lote_repository.buscar_por_cnpj(cnpj_vo.numerico)
    
    async def listar(self, skip: int = 0, limit: int = 100) -> List[Lote]:
        return await self.lote_repository.listar(skip, limit)
    
    async def estatisticas(self) -> dict:
        total = await self.lote_repository.contar()
        por_status = await self.lote_repository.contar_por_status()
        return {
            "total": total,
            "por_status": por_status
        }


class DeletarLoteUseCase:
    """Caso de uso para deletar lotes"""
    
    def __init__(self, lote_repository: LoteRepositoryPort):
        self.lote_repository = lote_repository
    
    async def executar(self, id: str) -> bool:
        lote = await self.lote_repository.buscar_por_id(id)
        if not lote:
            raise ProtocoloNaoEncontradoError(f"Lote não encontrado: {id}")
        return await self.lote_repository.deletar(id)
