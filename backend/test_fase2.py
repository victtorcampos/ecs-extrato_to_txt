#!/usr/bin/env python
"""Teste da Fase 2 - Gerador com agrupamento tipo X/D/C/V"""
from datetime import date
from src.domain.entities import Lancamento, TipoLancamento
from src.adapters.outbound.output_generators.dominio_sistemas_txt import DominioSistemasTxtGenerator

print("=" * 70)
print("TESTE FASE 2 - Gerador Domínio Sistemas com Agrupamento")
print("=" * 70)

# = = = Teste 1: Tipo X (3 lançamentos simples) = = =
print("\n[Teste 1] Tipo X - 3 lançamentos simples (1 débito / 1 crédito cada)")
print("-" * 70)

l1 = Lancamento(
    data=date(2026, 1, 1), 
    conta_debito="12", 
    conta_credito="78", 
    valor=60000.00, 
    historico="Lançamento 1", 
    tipo_lancamento=TipoLancamento.X
)
l2 = Lancamento(
    data=date(2026, 1, 2), 
    conta_debito="78", 
    conta_credito="25", 
    valor=14073.93, 
    historico="Lançamento 2", 
    tipo_lancamento=TipoLancamento.X
)
l3 = Lancamento(
    data=date(2026, 1, 3), 
    conta_debito="18", 
    conta_credito="22", 
    valor=1438.71, 
    historico="Lançamento 3", 
    tipo_lancamento=TipoLancamento.X
)

lancamentos_x = [l1, l2, l3]
gerador = DominioSistemasTxtGenerator()
config = {
    "tipo_lancamento_padrao": "X",
    "delimitador": "|",
    "incluir_delimitador_inicio_fim": True,
    "nome_usuario": "VICTOR_CAMPOS",
    "codigo_filial": "456"
}

resultado_x = gerador.gerar(lancamentos_x, "01293422000165", {}, config)
print("Gerado:")
print(resultado_x)

cont_6000 = resultado_x.count("|6000|")
cont_6100 = resultado_x.count("|6100|")
print(f"\n✓ Contagem: {cont_6000} x 6000, {cont_6100} x 6100")
print(f"✓ Esperado: 3 x 6000 (um por lançamento tipo X), 3 x 6100")
assert cont_6000 == 3 and cont_6100 == 3, "Falha: quantidades incorretas!"
print("✓ TESTE 1 PASSOU!")

# = = = Teste 2: Tipo D (1 débito + 2 créditos em grupo) = = =
print("\n[Teste 2] Tipo D - 1 débito + 2 créditos (rateio de débito)")
print("-" * 70)

ld1 = Lancamento(
    data=date(2026, 1, 3), 
    conta_debito="25", 
    conta_credito="",  # Só débito
    valor=500.00, 
    historico="Débito para rateio", 
    tipo_lancamento=TipoLancamento.D,
    grupo_id="grupo_1"
)
ld2 = Lancamento(
    data=date(2026, 1, 3), 
    conta_debito="", 
    conta_credito="45",  # Só crédito
    valor=200.00, 
    historico="Crédito 1", 
    tipo_lancamento=TipoLancamento.D,
    grupo_id="grupo_1"
)
ld3 = Lancamento(
    data=date(2026, 1, 3), 
    conta_debito="", 
    conta_credito="45",  # Só crédito
    valor=300.00, 
    historico="Crédito 2", 
    tipo_lancamento=TipoLancamento.D,
    grupo_id="grupo_1"
)

lancamentos_d = [ld1, ld2, ld3]
resultado_d = gerador.gerar(lancamentos_d, "01293422000165", {}, config)
print("Gerado:")
print(resultado_d)

cont_d_6000 = resultado_d.count("|6000|D|")
cont_d_6100 = resultado_d.count("|6100|")
print(f"\n✓ Contagem: {cont_d_6000} x (6000 tipo D), {cont_d_6100} x 6100")
print(f"✓ Esperado: 1 x (6000 tipo D), 3 x 6100")
assert cont_d_6000 == 1 and cont_d_6100 == 3, "Falha: quantidades incorretas!"
print("✓ TESTE 2 PASSOU!")

# = = = Teste 3: Validação com balanceamento correto (D) = = =
print("\n[Teste 3] Validação D - Balanceamento correto (débito 500 = créditos 200+300)")
print("-" * 70)

erros = gerador.validar(lancamentos_d, "01293422000165", {}, config)
if erros:
    print(f"Erros encontrados: {erros}")
    assert False, "Esperado sem erros!"
else:
    print("✓ Sem erros - balanceamento válido!")
    print("✓ TESTE 3 PASSOU!")

# = = = Teste 4: Validação com desbalanceamento (D falha) = = =
print("\n[Teste 4] Validação D - Desbalanceamento (débito 500 ≠ créditos 100+200)")
print("-" * 70)

ld_erro = [
    ld1,  # débito 500
    Lancamento(data=date(2026, 1, 3), conta_debito="", conta_credito="45", valor=100.00, 
               tipo_lancamento=TipoLancamento.D, grupo_id="grupo_2"),  # crédito 100
    Lancamento(data=date(2026, 1, 3), conta_debito="", conta_credito="45", valor=200.00, 
               tipo_lancamento=TipoLancamento.D, grupo_id="grupo_2"),  # crédito 200
]

erros = gerador.validar(ld_erro, "01293422000165", {}, config)
print(f"Erros encontrados: {erros}")
if not erros:
    print("✗ Esperado erro de desbalanceamento!")
    assert False
else:
    print("✓ Erro capturado corretamente!")
    print("✓ TESTE 4 PASSOU!")

print("\n" + "=" * 70)
print("✓ TODOS OS TESTES PASSARAM!")
print("=" * 70)
