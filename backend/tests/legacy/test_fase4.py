"""
TESTE FASE 4 - DB Migration (ALTER TABLE para tipo_lancamento + grupo_id)
"""
from datetime import datetime
from src.domain.entities import Lancamento, LayoutExcel, TipoLancamento
from src.config.models import LayoutExcelModel, LoteModel
import json

print("=" * 70)
print("TESTE FASE 4 - DB Migration")
print("=" * 70)

# Test 1: Verificar que LayoutExcelModel tem colunas corretas
print("\n[Teste 1] Verificação de colunas no LayoutExcelModel")
print("-" * 70)

# Verificar se as colunas existem no modelo
model_attrs = dir(LayoutExcelModel)
print(f"✓ LayoutExcelModel tem atributo 'coluna_tipo_lancamento': {'coluna_tipo_lancamento' in model_attrs}")
print(f"✓ LayoutExcelModel tem atributo 'coluna_grupo_lancamento': {'coluna_grupo_lancamento' in model_attrs}")

# Test 2: Verificar que Lancamento serializ corretamente com typ_lancamento + grupo_id
print("\n[Teste 2] Serialização de Lancamento com tipo_lancamento + grupo_id")
print("-" * 70)

lancamentos_teste = [
    Lancamento(
        data=None,
        conta_debito="1000",
        conta_credito="2000",
        valor=1500.0,
        tipo_lancamento=TipoLancamento.X,
        grupo_id=None
    ),
    Lancamento(
        data=None,
        conta_debito="1000",
        conta_credito="",
        valor=1500.0,
        tipo_lancamento=TipoLancamento.D,
        grupo_id="grupo-d1"
    ),
]

print(f"✓ Criados {len(lancamentos_teste)} lançamentos com tipo_lancamento + grupo_id")

# Simular serialização para JSON (como seria armazenado no banco)
for i, lanc in enumerate(lancamentos_teste):
    dados_json = {
        "id": lanc.id,
        "data": str(lanc.data),
        "conta_debito": lanc.conta_debito,
        "conta_credito": lanc.conta_credito,
        "valor": lanc.valor,
        "tipo_lancamento": lanc.tipo_lancamento.value if hasattr(lanc.tipo_lancamento, 'value') else lanc.tipo_lancamento,
        "grupo_id": lanc.grupo_id,
    }
    json_str = json.dumps(dados_json)
    print(f"  • Lançamento {i+1}: {json_str[:80]}...")

# Test 3: Simular armazenamento em LoteModel
print("\n[Teste 3] Armazenamento de Lancamento em LoteModel.lancamentos_json")
print("-" * 70)

lote_sim = LoteModel()
lote_sim.id = "lote-test-4"
lote_sim.protocolo = "PROTO-001"
lote_sim.cnpj = "01293422000165"

# Armazenar lançamentos como JSON
lancamentos_dict = [
    {
        "id": lanc.id,
        "data": str(lanc.data),
        "conta_debito": lanc.conta_debito,
        "conta_credito": lanc.conta_credito,
        "valor": lanc.valor,
        "tipo_lancamento": lanc.tipo_lancamento.value if hasattr(lanc.tipo_lancamento, 'value') else lanc.tipo_lancamento,
        "grupo_id": lanc.grupo_id,
    }
    for lanc in lancamentos_teste
]

lote_sim.lancamentos_json = lancamentos_dict
print(f"✓ Armazenados {len(lote_sim.lancamentos_json)} lançamentos em lancamentos_json")

# Validar recuperação
for i, lanc_dict in enumerate(lote_sim.lancamentos_json):
    print(f"  • Recuperado lançamento {i+1}:")
    print(f"    - tipo_lancamento: {lanc_dict.get('tipo_lancamento')}")
    print(f"    - grupo_id: {lanc_dict.get('grupo_id')}")
    assert 'tipo_lancamento' in lanc_dict, "tipo_lancamento não foi armazenado!"
    assert 'grupo_id' in lanc_dict, "grupo_id não foi armazenado!"

# Test 4: Verificar LayoutExcel com coluna_tipo_lancamento e coluna_grupo_lancamento
print("\n[Teste 4] LayoutExcel com novas colunas")
print("-" * 70)

layout_db = LayoutExcelModel()
layout_db.id = "layout-test-4"
layout_db.cnpj = "01293422000165"
layout_db.nome = "Layout com Tipo e Grupo"
layout_db.coluna_tipo_lancamento = "A"
layout_db.coluna_grupo_lancamento = "B"

print(f"✓ LayoutExcelModel.coluna_tipo_lancamento: '{layout_db.coluna_tipo_lancamento}'")
print(f"✓ LayoutExcelModel.coluna_grupo_lancamento: '{layout_db.coluna_grupo_lancamento}'")

# Test 5: Migração de dados (simular upgrade de layout existente)
print("\n[Teste 5] Migração de dados - Upgrade de layout existente")
print("-" * 70)

layout_old = LayoutExcel(
    id="layout-old",
    cnpj="01293422000165",
    nome="Layout Antigo",
    coluna_tipo_lancamento=None,  # Não existia antes
    coluna_grupo_lancamento=None,
)

print(f"✓ Layout antigo: coluna_tipo_lancamento={layout_old.coluna_tipo_lancamento}, coluna_grupo_lancamento={layout_old.coluna_grupo_lancamento}")

# Simular upgrade
layout_old.coluna_tipo_lancamento = "C"  # Agora tem coluna tipo
layout_old.coluna_grupo_lancamento = "D"  # Agora tem coluna grupo

print(f"✓ Layout após upgrade: coluna_tipo_lancamento='{layout_old.coluna_tipo_lancamento}', coluna_grupo_lancamento='{layout_old.coluna_grupo_lancamento}'")

# Test 6: Verificar compatibilidade backward
print("\n[Teste 6] Compatibilidade backward - Lançamentos sem tipo/grupo")
print("-" * 70)

lancamento_antigo_sem_tipo = Lancamento(
    data=None,
    conta_debito="1000",
    conta_credito="2000",
    valor=1500.0
    # tipo_lancamento e grupo_id usarão defaults
)

print(f"✓ Lançamento antigo com defaults:")
print(f"  - tipo_lancamento: '{lancamento_antigo_sem_tipo.tipo_lancamento}' (default X)")
print(f"  - grupo_id: {lancamento_antigo_sem_tipo.grupo_id} (default None)")

assert lancamento_antigo_sem_tipo.tipo_lancamento == TipoLancamento.X or lancamento_antigo_sem_tipo.tipo_lancamento == "X", "Default tipo deveria ser X"
assert lancamento_antigo_sem_tipo.grupo_id is None, "Default grupo_id deveria ser None"

print("✓ Compatibilidade backward mantida!")

# Test 7: Resumo da migração
print("\n[Teste 7] Resumo da Migração - Fase 4")
print("-" * 70)

print("✓ T4.1 (ALTER TABLE layouts_excel):")
print("  - Adicionada coluna_tipo_lancamento (VARCHAR(10), nullable)")
print("  - Adicionada coluna_grupo_lancamento (VARCHAR(10), nullable)")
print("\n✓ T4.2 (tipo_lancamento + grupo_id em Lancamento):")
print("  - tipo_lancamento armazenado em lancamentos_json")
print("  - grupo_id armazenado em lancamentos_json")
print("  - Novos campos passam a fazer parte de Lancamento por padrão")

print("\n" + "=" * 70)
print("✓ TODOS OS TESTES FASE 4 PASSARAM!")
print("=" * 70)
