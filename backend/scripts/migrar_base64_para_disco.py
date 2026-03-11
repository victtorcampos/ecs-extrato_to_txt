#!/usr/bin/env python3
"""
Script de migração: converte arquivos Base64 do banco para armazenamento em disco.

Uso:
    python scripts/migrar_base64_para_disco.py

O script:
1. Lê todos os lotes com arquivo_saida preenchido e caminho_arquivo_saida vazio
2. Decodifica o Base64
3. Salva no disco via DiskFileStorage
4. Atualiza a coluna caminho_arquivo_saida e limpa arquivo_saida
5. Mostra progresso durante a execução
"""

import asyncio
import sys
import os
import base64
from pathlib import Path

# Adicionar diretório backend ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config.database import engine, async_session_factory
from src.adapters.outbound.repositories.sqlalchemy import SQLAlchemyLoteRepository
from src.adapters.outbound.file_storage import DiskFileStorage
from src.config.logging_config import get_logger

logger = get_logger("migrar_base64")


async def migrar_lotes():
    """Executa a migração de Base64 para disco"""

    session = async_session_factory()
    try:
        logger.info("=== Iniciando migração de arquivos Base64 para disco ===")

        repo = SQLAlchemyLoteRepository(session)
        storage = DiskFileStorage()

        # Buscar todos os lotes
        lotes = await repo.listar(skip=0, limit=10000)

        # Filtrar: ter arquivo_saida e NÃO ter caminho_arquivo_saida
        lotes_para_migrar = [
            l for l in lotes
            if l.arquivo_saida and not l.caminho_arquivo_saida
        ]

        total = len(lotes_para_migrar)
        logger.info(f"Total de lotes para migrar: {total}")

        if total == 0:
            logger.info("Nenhum lote pendente de migração")
            return

        sucesso = 0
        erro = 0

        for idx, lote in enumerate(lotes_para_migrar, 1):
            try:
                logger.info(f"[{idx}/{total}] Migrando {lote.protocolo}...")

                # Decodificar Base64
                try:
                    arquivo_bytes = base64.b64decode(lote.arquivo_saida)
                except Exception as e:
                    logger.error(f"  ❌ Erro ao decodificar Base64: {e}")
                    erro += 1
                    continue

                # Salvar no disco
                try:
                    caminho = await storage.salvar(
                        conteudo=arquivo_bytes,
                        nome_arquivo=f"{lote.protocolo}.txt",
                        subdiretorio="saidas"
                    )
                    logger.info(f"  ✓ Arquivo salvo em: {caminho}")
                except Exception as e:
                    logger.error(f"  ❌ Erro ao salvar no disco: {e}")
                    erro += 1
                    continue

                # Atualizar lote
                try:
                    lote.caminho_arquivo_saida = caminho
                    lote.arquivo_saida = None  # Limpar Base64
                    await repo.atualizar(lote)
                    logger.info(f"  ✓ Lote atualizado no banco")
                    sucesso += 1
                except Exception as e:
                    logger.error(f"  ❌ Erro ao atualizar lote: {e}")
                    erro += 1
                    continue

            except Exception as e:
                logger.error(f"  ❌ Erro inesperado para {lote.protocolo}: {e}")
                erro += 1
                continue

        logger.info("")
        logger.info("=== Resumo da migração ===")
        logger.info(f"✓ Sucesso: {sucesso}")
        logger.info(f"❌ Erros: {erro}")
        logger.info(f"Total processado: {sucesso + erro}/{total}")

        if erro == 0:
            logger.info("✅ Migração concluída com sucesso!")
        else:
            logger.warning(f"⚠️  Migração concluída com {erro} erro(s). Revise o log.")

    except Exception as e:
        logger.error(f"Erro fatal durante migração: {e}", exc_info=True)
        sys.exit(1)
    finally:
        await session.close()


async def main():
    """Ponto de entrada"""
    # Inicializar banco
    from src.config.database import init_db
    await init_db()

    # Executar migração
    await migrar_lotes()


if __name__ == "__main__":
    asyncio.run(main())
