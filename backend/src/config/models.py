"""Modelos SQLAlchemy para persistência"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, Boolean, Enum as SQLEnum, JSON
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
    layout_id = Column(String(36), nullable=True)  # Referência ao layout usado
    perfil_saida_id = Column(String(36), nullable=True)  # Referência ao perfil de saída
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


class LayoutExcelModel(Base):
    """Modelo ORM para Layout de Importação Excel"""
    __tablename__ = "layouts_excel"
    
    id = Column(String(36), primary_key=True)
    cnpj = Column(String(14), index=True)
    nome = Column(String(100))
    descricao = Column(Text, nullable=True)
    ativo = Column(Boolean, default=True)
    
    # Configurações em JSON
    config_planilha_json = Column(JSON, default=dict)
    colunas_json = Column(JSON, default=list)
    config_valor_json = Column(JSON, default=dict)
    config_historico_padrao_json = Column(JSON, default=dict)
    
    criado_em = Column(DateTime, default=datetime.now)
    atualizado_em = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class RegraProcessamentoModel(Base):
    """Modelo ORM para Regra de Processamento"""
    __tablename__ = "regras_processamento"
    
    id = Column(String(36), primary_key=True)
    layout_id = Column(String(36), index=True)
    nome = Column(String(100))
    descricao = Column(Text, nullable=True)
    ordem = Column(Integer, default=0)
    ativo = Column(Boolean, default=True)
    
    tipo = Column(String(20))  # filtro, transformacao, validacao, enriquecimento
    
    # Configurações em JSON
    condicoes_json = Column(JSON, default=list)
    condicoes_ou_json = Column(JSON, default=list)
    acao_json = Column(JSON, default=dict)
    acoes_extras_json = Column(JSON, default=list)
    
    criado_em = Column(DateTime, default=datetime.now)
    atualizado_em = Column(DateTime, default=datetime.now, onupdate=datetime.now)



class PerfilSaidaModel(Base):
    """Modelo ORM para Perfil de Saída"""
    __tablename__ = "perfis_saida"

    id = Column(String(36), primary_key=True)
    nome = Column(String(150))
    sistema_destino = Column(String(50), index=True)
    formato = Column(String(30))
    descricao = Column(Text, nullable=True)
    padrao = Column(Boolean, default=False)
    ativo = Column(Boolean, default=True)

    config_json = Column(JSON, default=dict)

    criado_em = Column(DateTime, default=datetime.now)
    atualizado_em = Column(DateTime, default=datetime.now, onupdate=datetime.now)
