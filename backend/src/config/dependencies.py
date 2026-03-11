"""Módulo centralizado de Injeção de Dependências (DI) usando FastAPI Depends"""
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_session


# ─── Repository Providers ───────────────────────────────────────────

async def get_lote_repository(session: AsyncSession = Depends(get_session)):
    from src.adapters.outbound.repositories.sqlalchemy import SQLAlchemyLoteRepository
    return SQLAlchemyLoteRepository(session)


async def get_mapeamento_repository(session: AsyncSession = Depends(get_session)):
    from src.adapters.outbound.repositories.sqlalchemy import SQLAlchemyMapeamentoRepository
    return SQLAlchemyMapeamentoRepository(session)


async def get_layout_repository(session: AsyncSession = Depends(get_session)):
    from src.adapters.outbound.repositories.sqlalchemy import SQLAlchemyLayoutRepository
    return SQLAlchemyLayoutRepository(session)


async def get_regra_repository(session: AsyncSession = Depends(get_session)):
    from src.adapters.outbound.repositories.sqlalchemy import SQLAlchemyRegraRepository
    return SQLAlchemyRegraRepository(session)


async def get_perfil_saida_repository(session: AsyncSession = Depends(get_session)):
    from src.adapters.outbound.repositories.sqlalchemy import SQLAlchemyPerfilSaidaRepository
    return SQLAlchemyPerfilSaidaRepository(session)


# ─── Service Providers ──────────────────────────────────────────────

def get_excel_parser():
    from src.adapters.outbound.excel_parser import CalamineExcelParser
    return CalamineExcelParser()


def get_dynamic_parser():
    from src.adapters.outbound.excel_parser import DynamicExcelParser
    return DynamicExcelParser()


def get_txt_generator():
    from src.adapters.outbound.txt_generator import TxtGenerator
    return TxtGenerator()


def get_email_sender():
    from src.adapters.outbound.email import ResendEmailSender
    return ResendEmailSender()


def get_file_storage():
    from src.adapters.outbound.file_storage import DiskFileStorage
    return DiskFileStorage()


# ─── Background Task Factory ───────────────────────────────────────

async def create_processar_lote_dependencies():
    """Factory para criar dependências do processamento background.
    Cria sua própria sessão, pois background tasks rodam fora do request lifecycle."""
    from src.config.database import async_session_factory
    from src.adapters.outbound.repositories.sqlalchemy import (
        SQLAlchemyLoteRepository,
        SQLAlchemyMapeamentoRepository,
        SQLAlchemyLayoutRepository,
        SQLAlchemyPerfilSaidaRepository,
    )
    from src.adapters.outbound.excel_parser import CalamineExcelParser, DynamicExcelParser
    from src.adapters.outbound.txt_generator import TxtGenerator
    from src.adapters.outbound.email import ResendEmailSender
    from src.application.usecases import ProcessarLoteUseCase

    session = async_session_factory()
    try:
        lote_repo = SQLAlchemyLoteRepository(session)
        mapeamento_repo = SQLAlchemyMapeamentoRepository(session)
        layout_repo = SQLAlchemyLayoutRepository(session)
        perfil_saida_repo = SQLAlchemyPerfilSaidaRepository(session)

        from src.adapters.outbound.file_storage import DiskFileStorage
        file_storage = DiskFileStorage()

        use_case = ProcessarLoteUseCase(
            lote_repo,
            mapeamento_repo,
            CalamineExcelParser(),
            TxtGenerator(),
            ResendEmailSender(),
            layout_repository=layout_repo,
            dynamic_parser=DynamicExcelParser(),
            perfil_saida_repository=perfil_saida_repo,
            file_storage=file_storage,
        )
        return session, use_case
    except Exception as e:
        await session.close()
        from src.config.logging_config import get_logger
        get_logger("dependencies").error(f"Falha ao criar dependencias background: {e}")
        raise
