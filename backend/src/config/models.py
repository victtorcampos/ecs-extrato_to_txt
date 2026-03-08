"""Modelos SQLAlchemy para persistência"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from .database import Base


class LoteModel(Base):
    """Modelo ORM para Lote"""
    __tablename__ = "lotes"
    
    id = Column(String(36), primary_key=True)
    protocolo = Column(String(50), unique=True, index=True)
    cnpj = Column(String(14), index=True)
    periodo_mes = Column(Integer)
    periodo_ano = Column(Integer)
    email_notificacao = Column(String(255))
    nome_layout = Column(String(100))
    codigo_matriz_filial = Column(String(50))
    
    status = Column(String(20), default="aguardando")
    mensagem_erro = Column(Text, nullable=True)
    
    arquivo_original = Column(Text, nullable=True)
    nome_arquivo = Column(String(255), nullable=True)
    arquivo_saida = Column(Text, nullable=True)
    
    # JSON para lançamentos e pendências
    lancamentos_json = Column(JSON, default=list)
    pendencias_json = Column(JSON, default=list)
    
    criado_em = Column(DateTime, default=datetime.now)
    atualizado_em = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    processado_em = Column(DateTime, nullable=True)


class MapeamentoContaModel(Base):
    """Modelo ORM para Mapeamento de Conta"""
    __tablename__ = "mapeamentos_conta"
    
    id = Column(String(36), primary_key=True)
    cnpj = Column(String(14), index=True)
    conta_cliente = Column(String(50))
    conta_padrao = Column(String(50))
    nome_conta_cliente = Column(String(255), nullable=True)
    nome_conta_padrao = Column(String(255), nullable=True)
    criado_em = Column(DateTime, default=datetime.now)
