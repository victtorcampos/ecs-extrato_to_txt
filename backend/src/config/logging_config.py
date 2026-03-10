"""Configuração de logging estruturado para o sistema contábil"""
import logging
import json
from datetime import datetime, timezone


class JSONFormatter(logging.Formatter):
    """Formatter que produz saída JSON para rastreabilidade"""

    def format(self, record):
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "module": record.module,
            "message": record.getMessage(),
        }
        if hasattr(record, "lote_id"):
            log_entry["lote_id"] = record.lote_id
        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = str(record.exc_info[1])
        return json.dumps(log_entry, ensure_ascii=False)


def setup_logging() -> logging.Logger:
    """Configura e retorna o logger principal da aplicação"""
    logger = logging.getLogger("contabil")

    if not logger.handlers:
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler()
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        logger.propagate = False

    return logger


def get_logger(name: str = "contabil") -> logging.Logger:
    """Obtém um logger filho nomeado"""
    setup_logging()
    return logging.getLogger(f"contabil.{name}")
