"""
TESTE FASE 5 - E2E Tests para suporte X/D/C/V
"""
from datetime import date
from src.domain.entities import Lancamento, LayoutExcel, TipoLancamento
from src.adapters.outbound.output_generators.dominio_sistemas_txt import DominioSistemasTxtGenerator
from src.config.models import LayoutExcelModel
import re

print("=" * 70)
print("TESTE FASE 5 - E2E Tests (Tipo X/D/C/V + Rejeição)")
print("=" * 70)

generator = DominioSistemasTxtGenerator()
config = {"delimitador": "|", "incluir_delimitador_inicio_fim": True}

# =============== T5.1: Tipo X - Múltiplos lançamentos simples ===============
print("\n[T5.1] Tipo X - Múltiplos 6000 (um por lançamento)")
print("-" * 70)

lancamentos_x = [
    Lancamento(
        data=date(2026, 1, 1),
        conta_debito="1000",
        conta_credito="2000",
        valor=1000.0,
        tipo_lancamento=TipoLancamento.X,
        historico="Lançamento X #1"
    ),
    Lancamento(
        data=date(2026, 1, 2),
        conta_debito="1100",
        conta_credito="2100",
        valor=2000.0,
        tipo_lancamento=TipoLancamento.X,
        historico="Lançamento X #2"
    ),
    Lancamento(
        data=date(2026, 1, 3),
        conta_debito="1200",
        conta_credito="2200",
        valor=500.0,
        tipo_lancamento=TipoLancamento.X,
        historico="Lançamento X #3"
    ),
]

resultado_x = generator.gerar(lancamentos_x, "01293422000165", {}, config)
linhas_x = resultado_x.split("\n")
cont_6000_x = sum(1 for l in linhas_x if "|6000|" in l)
cont_6100_x = sum(1 for l in linhas_x if "|6100|" in l)

print(f"Gerado TXT com {len(linhas_x)} linhas")
print(f"Contagem: {cont_6000_x}x 6000, {cont_6100_x}x 6100")
assert cont_6000_x == 3, f"Esperado 3x 6000 para tipo X, encontrado {cont_6000_x}"
assert cont_6100_x == 3, f"Esperado 3x 6100, encontrado {cont_6100_x}"
erros_x = generator.validar(lancamentos_x, "01293422000165", {}, config)
assert not erros_x, f"Tipo X não deveria ter erros, mas teve: {erros_x}"
print("✓ T5.1 PASSOU! 3x 6000 (um por lançamento X), 3x 6100")

# =============== T5.2: Tipo D - Rateio de débito ===============
print("\n[T5.2] Tipo D - Rateio de débito (1 débito + N créditos)")
print("-" * 70)

lancamentos_d = [
    Lancamento(
        data=date(2026, 1, 10),
        conta_debito="1000",
        conta_credito="",
        valor=1000.0,
        tipo_lancamento=TipoLancamento.D,
        grupo_id="grupo-d1",
        historico="Débito para rateio"
    ),
    Lancamento(
        data=date(2026, 1, 10),
        conta_debito="",
        conta_credito="2000",
        valor=600.0,
        tipo_lancamento=TipoLancamento.D,
        grupo_id="grupo-d1",
        historico="Crédito 1"
    ),
    Lancamento(
        data=date(2026, 1, 10),
        conta_debito="",
        conta_credito="2100",
        valor=400.0,
        tipo_lancamento=TipoLancamento.D,
        grupo_id="grupo-d1",
        historico="Crédito 2"
    ),
]

resultado_d = generator.gerar(lancamentos_d, "01293422000165", {}, config)
linhas_d = resultado_d.split("\n")
cont_6000_d = sum(1 for l in linhas_d if "|6000|D|" in l)
cont_6100_d = sum(1 for l in linhas_d if "|6100|" in l)

print(f"Gerado TXT com {len(linhas_d)} linhas")
print(f"Contagem: {cont_6000_d}x 6000 (tipo D), {cont_6100_d}x 6100")
assert cont_6000_d == 1, f"Esperado 1x 6000 para tipo D, encontrado {cont_6000_d}"
assert cont_6100_d == 3, f"Esperado 3x 6100, encontrado {cont_6100_d}"
erros_d = generator.validar(lancamentos_d, "01293422000165", {}, config)
assert not erros_d, f"Tipo D balanceado não deveria ter erros, mas teve: {erros_d}"
print("✓ T5.2 PASSOU! 1x 6000 (tipo D), 3x 6100 (1 débito + 2 créditos balanceado)")

# =============== T5.3: Tipo C - Rateio de crédito ===============
print("\n[T5.3] Tipo C - Rateio de crédito (N débitos + 1 crédito)")
print("-" * 70)

lancamentos_c = [
    Lancamento(
        data=date(2026, 1, 15),
        conta_debito="1000",
        conta_credito="",
        valor=400.0,
        tipo_lancamento=TipoLancamento.C,
        grupo_id="grupo-c1",
        historico="Débito 1"
    ),
    Lancamento(
        data=date(2026, 1, 15),
        conta_debito="1100",
        conta_credito="",
        valor=600.0,
        tipo_lancamento=TipoLancamento.C,
        grupo_id="grupo-c1",
        historico="Débito 2"
    ),
    Lancamento(
        data=date(2026, 1, 15),
        conta_debito="",
        conta_credito="2000",
        valor=1000.0,
        tipo_lancamento=TipoLancamento.C,
        grupo_id="grupo-c1",
        historico="Crédito para rateio"
    ),
]

resultado_c = generator.gerar(lancamentos_c, "01293422000165", {}, config)
linhas_c = resultado_c.split("\n")
cont_6000_c = sum(1 for l in linhas_c if "|6000|C|" in l)
cont_6100_c = sum(1 for l in linhas_c if "|6100|" in l)

print(f"Gerado TXT com {len(linhas_c)} linhas")
print(f"Contagem: {cont_6000_c}x 6000 (tipo C), {cont_6100_c}x 6100")
assert cont_6000_c == 1, f"Esperado 1x 6000 para tipo C, encontrado {cont_6000_c}"
assert cont_6100_c == 3, f"Esperado 3x 6100, encontrado {cont_6100_c}"
erros_c = generator.validar(lancamentos_c, "01293422000165", {}, config)
assert not erros_c, f"Tipo C balanceado não deveria ter erros, mas teve: {erros_c}"
print("✓ T5.3 PASSOU! 1x 6000 (tipo C), 3x 6100 (2 débitos + 1 crédito balanceado)")

# =============== T5.4: Tipo V - Multilateral ===============
print("\n[T5.4] Tipo V - Multilateral (N débitos + N créditos balanceado)")
print("-" * 70)

lancamentos_v = [
    Lancamento(
        data=date(2026, 1, 20),
        conta_debito="1000",
        conta_credito="",
        valor=500.0,
        tipo_lancamento=TipoLancamento.V,
        grupo_id="grupo-v1",
        historico="Débito 1"
    ),
    Lancamento(
        data=date(2026, 1, 20),
        conta_debito="1100",
        conta_credito="",
        valor=500.0,
        tipo_lancamento=TipoLancamento.V,
        grupo_id="grupo-v1",
        historico="Débito 2"
    ),
    Lancamento(
        data=date(2026, 1, 20),
        conta_debito="",
        conta_credito="2000",
        valor=600.0,
        tipo_lancamento=TipoLancamento.V,
        grupo_id="grupo-v1",
        historico="Crédito 1"
    ),
    Lancamento(
        data=date(2026, 1, 20),
        conta_debito="",
        conta_credito="2100",
        valor=400.0,
        tipo_lancamento=TipoLancamento.V,
        grupo_id="grupo-v1",
        historico="Crédito 2"
    ),
]

resultado_v = generator.gerar(lancamentos_v, "01293422000165", {}, config)
linhas_v = resultado_v.split("\n")
cont_6000_v = sum(1 for l in linhas_v if "|6000|V|" in l)
cont_6100_v = sum(1 for l in linhas_v if "|6100|" in l)

print(f"Gerado TXT com {len(linhas_v)} linhas")
print(f"Contagem: {cont_6000_v}x 6000 (tipo V), {cont_6100_v}x 6100")
assert cont_6000_v == 1, f"Esperado 1x 6000 para tipo V, encontrado {cont_6000_v}"
assert cont_6100_v == 4, f"Esperado 4x 6100, encontrado {cont_6100_v}"
erros_v = generator.validar(lancamentos_v, "01293422000165", {}, config)
assert not erros_v, f"Tipo V balanceado não deveria ter erros, mas teve: {erros_v}"
print("✓ T5.4 PASSOU! 1x 6000 (tipo V), 4x 6100 (2 débitos + 2 créditos balanceado)")

# =============== T5.5: Rejeição - Desbalanceamento ===============
print("\n[T5.5] Rejeição - Desbalanceamento (deve gerar erro)")
print("-" * 70)

lancamentos_rejeitar = [
    Lancamento(
        data=date(2026, 1, 25),
        conta_debito="1000",
        conta_credito="",
        valor=500.0,
        tipo_lancamento=TipoLancamento.D,
        grupo_id="grupo-reject1",
        historico="Débito 500"
    ),
    Lancamento(
        data=date(2026, 1, 25),
        conta_debito="",
        conta_credito="2000",
        valor=300.0,  # Total créditos = 300, débito = 500 → desbalanceado!
        tipo_lancamento=TipoLancamento.D,
        grupo_id="grupo-reject1",
        historico="Crédito 300"
    ),
]

erros_rejeitar = generator.validar(lancamentos_rejeitar, "01293422000165", {}, config)
print(f"Validação retornou {len(erros_rejeitar)} erro(s)")
assert len(erros_rejeitar) > 0, "Deveria detectar desbalanceamento!"
print(f"Erro capturado: {erros_rejeitar[0][:70]}...")
print("✓ T5.5 PASSOU! Desbalanceamento detectado e rejeitado")

# =============== Teste integrado: Múltiplos grupos em um único lote ===============
print("\n[Teste Integrado] Múltiplos tipos em um único lote")
print("-" * 70)

lancamentos_mix = lancamentos_x + lancamentos_d + lancamentos_c + lancamentos_v

resultado_integrado = generator.gerar(lancamentos_mix, "01293422000165", {}, config)
linhas_integrado = resultado_integrado.split("\n")

# Contar por tipo
cont_6000_x_int = sum(1 for l in linhas_integrado if "|6000|X|" in l)
cont_6000_d_int = sum(1 for l in linhas_integrado if "|6000|D|" in l)
cont_6000_c_int = sum(1 for l in linhas_integrado if "|6000|C|" in l)
cont_6000_v_int = sum(1 for l in linhas_integrado if "|6000|V|" in l)
cont_6100_total = sum(1 for l in linhas_integrado if "|6100|" in l)

print(f"Integrado: {cont_6000_x_int}x X + {cont_6000_d_int}x D + {cont_6000_c_int}x C + {cont_6000_v_int}x V")
print(f"Total: {cont_6000_x_int + cont_6000_d_int + cont_6000_c_int + cont_6000_v_int}x 6000, {cont_6100_total}x 6100")

assert cont_6000_x_int == 3, f"Esperado 3x X, encontrado {cont_6000_x_int}"
assert cont_6000_d_int == 1, f"Esperado 1x D, encontrado {cont_6000_d_int}"
assert cont_6000_c_int == 1, f"Esperado 1x C, encontrado {cont_6000_c_int}"
assert cont_6000_v_int == 1, f"Esperado 1x V, encontrado {cont_6000_v_int}"
assert cont_6100_total == 13, f"Esperado 13x 6100 (3+3+3+4), encontrado {cont_6100_total}"

erros_integrado = generator.validar(lancamentos_mix, "01293422000165", {}, config)
assert not erros_integrado, f"Lote integrado não deveria ter erros, mas teve: {erros_integrado}"

print("✓ TESTE INTEGRADO PASSOU!")

# =============== Resumo Final ===============
print("\n" + "=" * 70)
print("✓ TODOS OS 5 TESTES FASE 5 PASSARAM!")
print("=" * 70)
print("\nResumo:")
print("  T5.1 ✓ Tipo X - Múltiplos 6000 (um por lançamento)")
print("  T5.2 ✓ Tipo D - Rateio de débito (1 débito + N créditos)")
print("  T5.3 ✓ Tipo C - Rateio de crédito (N débitos + 1 crédito)")
print("  T5.4 ✓ Tipo V - Multilateral (N débitos + N créditos)")
print("  T5.5 ✓ Rejeição - Desbalanceamento detectado")
print("\nImplementação Completa!")
print("  • Domain Layer (Fase 1) ✓")
print("  • Generator Refactor (Fase 2) ✓")
print("  • Parser Extension (Fase 3) ✓")
print("  • DB Migration (Fase 4) ✓")
print("  • E2E Tests (Fase 5) ✓")
print("\n🎉 Suporte Completo aos Tipos X/D/C/V - CONCLUÍDO!")
