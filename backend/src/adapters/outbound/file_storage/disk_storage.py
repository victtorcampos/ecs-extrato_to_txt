"""Adapter de armazenamento de arquivos em disco local"""
import os
import aiofiles
from pathlib import Path

from src.application.ports.services.file_storage_port import FileStoragePort
from src.domain.exceptions import FileStorageError
from src.config.logging_config import get_logger

logger = get_logger("file_storage")

DEFAULT_STORAGE_DIR = os.environ.get("FILE_STORAGE_DIR", "data/files")


class DiskFileStorage(FileStoragePort):
    """Armazena arquivos no sistema de arquivos local."""

    def __init__(self, base_dir: str = DEFAULT_STORAGE_DIR):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve(self, caminho: str) -> Path:
        resolved = (self.base_dir / caminho).resolve()
        if not str(resolved).startswith(str(self.base_dir.resolve())):
            raise FileStorageError(f"Caminho invalido: {caminho}")
        return resolved

    async def salvar(self, conteudo: bytes, nome_arquivo: str, subdiretorio: str = "") -> str:
        try:
            target_dir = self.base_dir / subdiretorio if subdiretorio else self.base_dir
            target_dir.mkdir(parents=True, exist_ok=True)
            caminho_relativo = os.path.join(subdiretorio, nome_arquivo) if subdiretorio else nome_arquivo
            full_path = self._resolve(caminho_relativo)
            async with aiofiles.open(full_path, "wb") as f:
                await f.write(conteudo)
            logger.info(f"Arquivo salvo: {caminho_relativo} ({len(conteudo)} bytes)")
            return caminho_relativo
        except FileStorageError:
            raise
        except Exception as e:
            raise FileStorageError(f"Erro ao salvar arquivo {nome_arquivo}: {e}") from e

    async def ler(self, caminho: str) -> bytes:
        try:
            full_path = self._resolve(caminho)
            async with aiofiles.open(full_path, "rb") as f:
                return await f.read()
        except FileNotFoundError:
            raise FileStorageError(f"Arquivo nao encontrado: {caminho}")
        except FileStorageError:
            raise
        except Exception as e:
            raise FileStorageError(f"Erro ao ler arquivo {caminho}: {e}") from e

    async def deletar(self, caminho: str) -> bool:
        try:
            full_path = self._resolve(caminho)
            if full_path.exists():
                full_path.unlink()
                logger.info(f"Arquivo deletado: {caminho}")
                return True
            return False
        except FileStorageError:
            raise
        except Exception as e:
            raise FileStorageError(f"Erro ao deletar arquivo {caminho}: {e}") from e

    async def existe(self, caminho: str) -> bool:
        try:
            return self._resolve(caminho).exists()
        except FileStorageError:
            return False
