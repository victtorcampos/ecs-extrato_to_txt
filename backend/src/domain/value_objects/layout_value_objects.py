"""Value Objects para Layouts e Regras de Importação"""
from enum import Enum


class TipoDado(str, Enum):
    """Tipos de dados suportados nas colunas"""
    STRING = "string"
    INTEGER = "integer"
    DECIMAL = "decimal"
    DATE = "date"
    DATETIME = "datetime"
    BOOLEAN = "boolean"


class TipoSinal(str, Enum):
    """Como determinar se lançamento é débito ou crédito"""
    COLUNA_TIPO = "coluna_tipo"      # Usa uma coluna específica (D/C)
    SINAL_VALOR = "sinal_valor"      # Positivo=Débito, Negativo=Crédito
    FIXO_DEBITO = "fixo_debito"      # Sempre débito
    FIXO_CREDITO = "fixo_credito"    # Sempre crédito


class TipoRegra(str, Enum):
    """Tipos de regras de processamento"""
    FILTRO = "filtro"                # Excluir linhas
    TRANSFORMACAO = "transformacao"  # Alterar valores
    VALIDACAO = "validacao"          # Verificar/validar dados
    ENRIQUECIMENTO = "enriquecimento"  # Adicionar/completar dados


class OperadorCondicao(str, Enum):
    """Operadores para condições de regras"""
    IGUAL = "igual"
    DIFERENTE = "diferente"
    MAIOR = "maior"
    MENOR = "menor"
    MAIOR_IGUAL = "maior_igual"
    MENOR_IGUAL = "menor_igual"
    ENTRE = "entre"
    CONTEM = "contem"
    NAO_CONTEM = "nao_contem"
    COMECA_COM = "comeca_com"
    TERMINA_COM = "termina_com"
    VAZIO = "vazio"
    NAO_VAZIO = "nao_vazio"
    REGEX = "regex"


class TipoAcao(str, Enum):
    """Tipos de ações de regras"""
    EXCLUIR = "excluir"                    # Remove o lançamento
    DEFINIR_VALOR = "definir_valor"        # Define valor em campo
    CONCATENAR = "concatenar"              # Concatena strings
    SUBSTITUIR = "substituir"              # Substitui texto
    CONVERTER_MAIUSCULA = "maiuscula"      # Converte para maiúscula
    CONVERTER_MINUSCULA = "minuscula"      # Converte para minúscula
    VALOR_ABSOLUTO = "absoluto"            # Converte para valor absoluto
    MULTIPLICAR = "multiplicar"            # Multiplica valor
    TEMPLATE = "template"                  # Aplica template com variáveis
    COPIAR_CAMPO = "copiar_campo"          # Copia valor de outro campo
    ERRO = "erro"                          # Marca erro de validação


# Campos destino disponíveis para mapeamento
CAMPOS_DESTINO = {
    # Obrigatórios
    "valor": {"label": "Valor", "tipo": TipoDado.DECIMAL, "obrigatorio": True},
    "conta_debito": {"label": "Conta Débito", "tipo": TipoDado.STRING, "obrigatorio": True},
    "conta_credito": {"label": "Conta Crédito", "tipo": TipoDado.STRING, "obrigatorio": True},
    
    # Data
    "data": {"label": "Data", "tipo": TipoDado.DATE, "obrigatorio": True},
    "data_mes_ano": {"label": "Mês/Ano", "tipo": TipoDado.DATE, "obrigatorio": False},
    "dia": {"label": "Dia", "tipo": TipoDado.INTEGER, "obrigatorio": False},
    
    # Tipo D/C
    "tipo_lancamento": {"label": "Tipo (D/C)", "tipo": TipoDado.STRING, "obrigatorio": False},
    
    # Histórico
    "historico": {"label": "Histórico", "tipo": TipoDado.STRING, "obrigatorio": False},
    "codigo_historico": {"label": "Código Histórico", "tipo": TipoDado.INTEGER, "obrigatorio": False},
    
    # Documento
    "documento": {"label": "Documento", "tipo": TipoDado.STRING, "obrigatorio": False},
    "tipo_documento": {"label": "Tipo Documento", "tipo": TipoDado.STRING, "obrigatorio": False},
    
    # Empresa
    "nome_empresa": {"label": "Nome Empresa", "tipo": TipoDado.STRING, "obrigatorio": False},
    "codigo_empresa": {"label": "Código Empresa", "tipo": TipoDado.STRING, "obrigatorio": False},
    "unidade_negocio": {"label": "Unidade Negócio", "tipo": TipoDado.STRING, "obrigatorio": False},
    "centro_custo": {"label": "Centro de Custo", "tipo": TipoDado.STRING, "obrigatorio": False},
    "fantasia": {"label": "Nome Fantasia", "tipo": TipoDado.STRING, "obrigatorio": False},
    "fato_contabil": {"label": "Fato Contábil", "tipo": TipoDado.STRING, "obrigatorio": False},
    
    # Banco
    "codigo_banco": {"label": "Código Banco", "tipo": TipoDado.STRING, "obrigatorio": False},
    "agencia": {"label": "Agência", "tipo": TipoDado.STRING, "obrigatorio": False},
    "conta_banco": {"label": "Conta Bancária", "tipo": TipoDado.STRING, "obrigatorio": False},
    "nome_banco": {"label": "Nome Banco", "tipo": TipoDado.STRING, "obrigatorio": False},
    
    # Extras
    "observacao": {"label": "Observação", "tipo": TipoDado.STRING, "obrigatorio": False},
    "referencia": {"label": "Referência", "tipo": TipoDado.STRING, "obrigatorio": False},
}


def get_campos_disponiveis() -> dict:
    """Retorna campos disponíveis para mapeamento"""
    return CAMPOS_DESTINO
