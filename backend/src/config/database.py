"""Configuração do Banco de Dados SQLite com SQLAlchemy Async"""
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./contabil.db")

engine = create_async_engine(DATABASE_URL, echo=False)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncSession:
    async with async_session_factory() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migração: adicionar coluna layout_id na tabela lotes se não existir
        result = await conn.execute(text("PRAGMA table_info(lotes)"))
        columns = [row[1] for row in result.fetchall()]
        if "layout_id" not in columns:
            await conn.execute(text("ALTER TABLE lotes ADD COLUMN layout_id VARCHAR(36)"))
        if "perfil_saida_id" not in columns:
            await conn.execute(text("ALTER TABLE lotes ADD COLUMN perfil_saida_id VARCHAR(36)"))
