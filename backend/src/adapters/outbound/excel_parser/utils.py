"""Utilitários compartilhados para parsers de Excel"""
from datetime import date, datetime


def serialize_cell(value):
    """Serializa um valor de célula do Excel para JSON"""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    if isinstance(value, date):
        return value.strftime("%d/%m/%Y")
    if isinstance(value, (int, float)):
        return value
    return str(value)
