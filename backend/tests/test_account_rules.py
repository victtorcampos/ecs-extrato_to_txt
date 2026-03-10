"""
Backend API Tests for Account Rules (Regras de Definição de Contas)
Tests for: regras_conta field in layouts - POST/GET/PUT with account rules
Iteration 7 - Account Rules Feature Testing
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://batch-accounting-pro.preview.emergentagent.com').rstrip('/')

# Valid CNPJ for testing
TEST_CNPJ = "11222333000181"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestAccountRulesCreate:
    """Test creating layouts with regras_conta field"""

    def test_create_layout_with_single_regra_conta(self, api_client):
        """POST /api/v1/import-layouts - Create layout with 1 account rule"""
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": f"TEST_AccountRules_Single_{uuid.uuid4().hex[:6]}",
            "descricao": "Layout com 1 regra de conta",
            "config_planilha": {"linha_cabecalho": 0, "linha_inicio_dados": 1},
            "colunas": [
                {"campo_destino": "data", "coluna_excel": "A", "tipo_dado": "date"},
                {"campo_destino": "valor", "coluna_excel": "B", "tipo_dado": "decimal"}
            ],
            "regras_conta": [
                {
                    "nome": "Valor positivo -> D:1001 C:2001",
                    "ordem": 0,
                    "ativo": True,
                    "condicoes": [
                        {"campo": "_sinal_valor", "operador": "positivo", "valor": "", "coluna_excel": ""}
                    ],
                    "conta_debito": "1001",
                    "conta_credito": "2001"
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "regras_conta" in data, "Response should include regras_conta"
        assert len(data["regras_conta"]) == 1, f"Expected 1 rule, got {len(data['regras_conta'])}"
        
        regra = data["regras_conta"][0]
        assert regra["nome"] == "Valor positivo -> D:1001 C:2001"
        assert regra["conta_debito"] == "1001"
        assert regra["conta_credito"] == "2001"
        assert regra["ativo"] == True
        assert len(regra["condicoes"]) == 1
        assert regra["condicoes"][0]["campo"] == "_sinal_valor"
        assert regra["condicoes"][0]["operador"] == "positivo"
        
        layout_id = data["id"]
        print(f"✅ POST create layout with 1 account rule - Layout ID: {layout_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")

    def test_create_layout_with_multiple_regras_conta(self, api_client):
        """POST /api/v1/import-layouts - Create layout with multiple account rules (template: Por sinal do valor)"""
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": f"TEST_AccountRules_Multi_{uuid.uuid4().hex[:6]}",
            "descricao": "Layout com 2 regras (positivo/negativo)",
            "colunas": [
                {"campo_destino": "valor", "coluna_excel": "A", "tipo_dado": "decimal"}
            ],
            "regras_conta": [
                {
                    "nome": "Valor negativo",
                    "ordem": 0,
                    "ativo": True,
                    "condicoes": [{"campo": "_sinal_valor", "operador": "negativo", "valor": "", "coluna_excel": ""}],
                    "conta_debito": "45",
                    "conta_credito": "25"
                },
                {
                    "nome": "Valor positivo",
                    "ordem": 1,
                    "ativo": True,
                    "condicoes": [{"campo": "_sinal_valor", "operador": "positivo", "valor": "", "coluna_excel": ""}],
                    "conta_debito": "25",
                    "conta_credito": "45"
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert len(data["regras_conta"]) == 2, f"Expected 2 rules, got {len(data['regras_conta'])}"
        
        # Verify order is preserved
        assert data["regras_conta"][0]["ordem"] == 0
        assert data["regras_conta"][1]["ordem"] == 1
        assert data["regras_conta"][0]["nome"] == "Valor negativo"
        assert data["regras_conta"][1]["nome"] == "Valor positivo"
        
        layout_id = data["id"]
        print(f"✅ POST create layout with 2 account rules (Por sinal do valor template)")
        
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")

    def test_create_layout_with_dc_operators(self, api_client):
        """POST /api/v1/import-layouts - Create layout with D/C operators (dc_debito, dc_credito)"""
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": f"TEST_AccountRules_DC_{uuid.uuid4().hex[:6]}",
            "descricao": "Layout com regras D/C",
            "colunas": [{"campo_destino": "valor", "coluna_excel": "A", "tipo_dado": "decimal"}],
            "config_valor": {"tipo_sinal": "coluna_tipo", "coluna_tipo": "E"},
            "regras_conta": [
                {
                    "nome": "Débito",
                    "ordem": 0,
                    "ativo": True,
                    "condicoes": [{"campo": "_tipo_dc", "operador": "dc_debito", "valor": "", "coluna_excel": ""}],
                    "conta_debito": "1100",
                    "conta_credito": ""
                },
                {
                    "nome": "Crédito",
                    "ordem": 1,
                    "ativo": True,
                    "condicoes": [{"campo": "_tipo_dc", "operador": "dc_credito", "valor": "", "coluna_excel": ""}],
                    "conta_debito": "",
                    "conta_credito": "2200"
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert len(data["regras_conta"]) == 2
        
        # Verify dc_debito and dc_credito operators saved
        assert data["regras_conta"][0]["condicoes"][0]["operador"] == "dc_debito"
        assert data["regras_conta"][1]["condicoes"][0]["operador"] == "dc_credito"
        
        layout_id = data["id"]
        print(f"✅ POST create layout with D/C operators (dc_debito, dc_credito)")
        
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")

    def test_create_layout_with_multiple_conditions_and(self, api_client):
        """POST /api/v1/import-layouts - Create layout with multiple conditions (AND logic)"""
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": f"TEST_AccountRules_AND_{uuid.uuid4().hex[:6]}",
            "descricao": "Layout com regra de múltiplas condições (AND)",
            "colunas": [
                {"campo_destino": "valor", "coluna_excel": "A", "tipo_dado": "decimal"},
                {"campo_destino": "historico", "coluna_excel": "B", "tipo_dado": "string"}
            ],
            "regras_conta": [
                {
                    "nome": "Valor positivo E histórico contém PAGTO",
                    "ordem": 0,
                    "ativo": True,
                    "condicoes": [
                        {"campo": "_sinal_valor", "operador": "positivo", "valor": "", "coluna_excel": ""},
                        {"campo": "historico", "operador": "contem", "valor": "PAGTO", "coluna_excel": ""}
                    ],
                    "conta_debito": "3301",
                    "conta_credito": "4401"
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        regra = data["regras_conta"][0]
        
        # Verify multiple conditions saved (AND)
        assert len(regra["condicoes"]) == 2, f"Expected 2 conditions, got {len(regra['condicoes'])}"
        assert regra["condicoes"][0]["operador"] == "positivo"
        assert regra["condicoes"][1]["operador"] == "contem"
        assert regra["condicoes"][1]["valor"] == "PAGTO"
        
        layout_id = data["id"]
        print(f"✅ POST create layout with multiple conditions (AND) - 2 conditions saved")
        
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")

    def test_create_layout_with_coluna_excel_direct(self, api_client):
        """POST /api/v1/import-layouts - Create layout with coluna_excel direct reference"""
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": f"TEST_AccountRules_ColExcel_{uuid.uuid4().hex[:6]}",
            "descricao": "Layout com referência direta a coluna Excel",
            "colunas": [{"campo_destino": "valor", "coluna_excel": "A", "tipo_dado": "decimal"}],
            "regras_conta": [
                {
                    "nome": "Coluna D contém 'VENDA'",
                    "ordem": 0,
                    "ativo": True,
                    "condicoes": [
                        {"campo": "", "operador": "contem", "valor": "VENDA", "coluna_excel": "D"}
                    ],
                    "conta_debito": "5501",
                    "conta_credito": "6601"
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        regra = data["regras_conta"][0]
        
        # Verify coluna_excel saved directly
        assert regra["condicoes"][0]["coluna_excel"] == "D"
        assert regra["condicoes"][0]["campo"] == ""
        assert regra["condicoes"][0]["operador"] == "contem"
        assert regra["condicoes"][0]["valor"] == "VENDA"
        
        layout_id = data["id"]
        print(f"✅ POST create layout with coluna_excel direct reference")
        
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")


class TestAccountRulesRetrieve:
    """Test retrieving layouts with regras_conta"""

    def test_get_layout_returns_regras_conta(self, api_client):
        """GET /api/v1/import-layouts/{id} - Verify regras_conta is returned"""
        # First create
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": f"TEST_AccountRules_Get_{uuid.uuid4().hex[:6]}",
            "regras_conta": [
                {
                    "nome": "Test Rule",
                    "ordem": 0,
                    "ativo": True,
                    "condicoes": [{"campo": "_sinal_valor", "operador": "positivo", "valor": "", "coluna_excel": ""}],
                    "conta_debito": "100",
                    "conta_credito": "200"
                }
            ]
        }
        create_response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        assert create_response.status_code == 201
        layout_id = create_response.json()["id"]
        
        # GET and verify
        response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "regras_conta" in data
        assert isinstance(data["regras_conta"], list)
        assert len(data["regras_conta"]) == 1
        assert data["regras_conta"][0]["conta_debito"] == "100"
        assert data["regras_conta"][0]["conta_credito"] == "200"
        
        print(f"✅ GET /api/v1/import-layouts/{layout_id} returns regras_conta correctly")
        
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")

    def test_get_existing_layout_with_regras_conta(self, api_client):
        """GET /api/v1/import-layouts/{id} - Check existing layout from context (ffebdf32-da26-4c97-a3c0-de3f14715a42)"""
        # This layout was mentioned in the agent context as already having 2 regras_conta rules
        existing_layout_id = "ffebdf32-da26-4c97-a3c0-de3f14715a42"
        
        response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{existing_layout_id}")
        
        if response.status_code == 404:
            pytest.skip(f"Existing layout {existing_layout_id} not found, may have been deleted")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "regras_conta" in data
        
        if len(data["regras_conta"]) > 0:
            print(f"✅ GET existing layout has {len(data['regras_conta'])} regras_conta rules")
            # Verify structure
            for regra in data["regras_conta"]:
                assert "id" in regra or "nome" in regra
                assert "condicoes" in regra
                assert "conta_debito" in regra
                assert "conta_credito" in regra
        else:
            print(f"⚠️ Existing layout has no regras_conta (may have been modified)")


class TestAccountRulesUpdate:
    """Test updating layouts with regras_conta"""

    def test_update_layout_add_regras_conta(self, api_client):
        """PUT /api/v1/import-layouts/{id} - Add regras_conta to existing layout"""
        # Create layout without regras_conta
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": f"TEST_AccountRules_Update_{uuid.uuid4().hex[:6]}",
        }
        create_response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        assert create_response.status_code == 201
        layout_id = create_response.json()["id"]
        
        # Update to add regras_conta
        update_payload = {
            "regras_conta": [
                {
                    "nome": "Added Rule",
                    "ordem": 0,
                    "ativo": True,
                    "condicoes": [{"campo": "_sinal_valor", "operador": "negativo", "valor": "", "coluna_excel": ""}],
                    "conta_debito": "777",
                    "conta_credito": "888"
                }
            ]
        }
        
        response = api_client.put(f"{BASE_URL}/api/v1/import-layouts/{layout_id}", json=update_payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert len(data["regras_conta"]) == 1
        assert data["regras_conta"][0]["conta_debito"] == "777"
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        persisted = get_response.json()
        assert len(persisted["regras_conta"]) == 1
        assert persisted["regras_conta"][0]["conta_credito"] == "888"
        
        print(f"✅ PUT update layout - added regras_conta and persisted correctly")
        
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")

    def test_update_layout_modify_regras_conta(self, api_client):
        """PUT /api/v1/import-layouts/{id} - Modify existing regras_conta"""
        # Create layout with initial regras_conta
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": f"TEST_AccountRules_Modify_{uuid.uuid4().hex[:6]}",
            "regras_conta": [
                {
                    "nome": "Original Rule",
                    "ordem": 0,
                    "ativo": True,
                    "condicoes": [{"campo": "_sinal_valor", "operador": "positivo", "valor": "", "coluna_excel": ""}],
                    "conta_debito": "111",
                    "conta_credito": "222"
                }
            ]
        }
        create_response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        assert create_response.status_code == 201
        layout_id = create_response.json()["id"]
        
        # Update - change the rule
        update_payload = {
            "regras_conta": [
                {
                    "nome": "Modified Rule",
                    "ordem": 0,
                    "ativo": True,
                    "condicoes": [{"campo": "_sinal_valor", "operador": "negativo", "valor": "", "coluna_excel": ""}],
                    "conta_debito": "999",
                    "conta_credito": "888"
                }
            ]
        }
        
        response = api_client.put(f"{BASE_URL}/api/v1/import-layouts/{layout_id}", json=update_payload)
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["regras_conta"][0]["nome"] == "Modified Rule"
        assert data["regras_conta"][0]["conta_debito"] == "999"
        assert data["regras_conta"][0]["condicoes"][0]["operador"] == "negativo"
        
        print(f"✅ PUT update layout - modified regras_conta correctly")
        
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")

    def test_update_layout_replace_regras_conta(self, api_client):
        """PUT /api/v1/import-layouts/{id} - Replace regras_conta with different rules"""
        # Create layout with initial regras_conta
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": f"TEST_AccountRules_Replace_{uuid.uuid4().hex[:6]}",
            "regras_conta": [
                {
                    "nome": "Original Rule 1",
                    "ordem": 0,
                    "ativo": True,
                    "condicoes": [{"campo": "_sinal_valor", "operador": "positivo", "valor": "", "coluna_excel": ""}],
                    "conta_debito": "123",
                    "conta_credito": "456"
                },
                {
                    "nome": "Original Rule 2",
                    "ordem": 1,
                    "ativo": True,
                    "condicoes": [{"campo": "_sinal_valor", "operador": "negativo", "valor": "", "coluna_excel": ""}],
                    "conta_debito": "789",
                    "conta_credito": "012"
                }
            ]
        }
        create_response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        assert create_response.status_code == 201
        layout_id = create_response.json()["id"]
        assert len(create_response.json()["regras_conta"]) == 2
        
        # Update - replace with single new rule
        update_payload = {
            "regras_conta": [
                {
                    "nome": "Replacement Rule",
                    "ordem": 0,
                    "ativo": True,
                    "condicoes": [{"campo": "historico", "operador": "contem", "valor": "NOVO", "coluna_excel": ""}],
                    "conta_debito": "AAA",
                    "conta_credito": "BBB"
                }
            ]
        }
        
        response = api_client.put(f"{BASE_URL}/api/v1/import-layouts/{layout_id}", json=update_payload)
        
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["regras_conta"]) == 1, f"Expected 1 rule, got {len(data['regras_conta'])}"
        assert data["regras_conta"][0]["nome"] == "Replacement Rule"
        assert data["regras_conta"][0]["conta_debito"] == "AAA"
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        persisted = get_response.json()
        assert len(persisted["regras_conta"]) == 1
        assert persisted["regras_conta"][0]["nome"] == "Replacement Rule"
        
        print(f"✅ PUT update layout - replaced regras_conta correctly (2 → 1)")
        
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")


class TestAccountRulesOperators:
    """Test all different operators for regras_conta conditions"""

    def test_operators_positivo_negativo(self, api_client):
        """Test positivo and negativo operators"""
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": f"TEST_Operators_PosNeg_{uuid.uuid4().hex[:6]}",
            "regras_conta": [
                {"nome": "Positivo", "ordem": 0, "ativo": True, "condicoes": [{"campo": "_sinal_valor", "operador": "positivo", "valor": "", "coluna_excel": ""}], "conta_debito": "1", "conta_credito": "2"},
                {"nome": "Negativo", "ordem": 1, "ativo": True, "condicoes": [{"campo": "_sinal_valor", "operador": "negativo", "valor": "", "coluna_excel": ""}], "conta_debito": "3", "conta_credito": "4"}
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        assert response.status_code == 201
        
        data = response.json()
        assert data["regras_conta"][0]["condicoes"][0]["operador"] == "positivo"
        assert data["regras_conta"][1]["condicoes"][0]["operador"] == "negativo"
        
        print("✅ Operators positivo and negativo work correctly")
        
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{data['id']}")

    def test_operators_igual_diferente(self, api_client):
        """Test igual and diferente operators"""
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": f"TEST_Operators_IgualDif_{uuid.uuid4().hex[:6]}",
            "regras_conta": [
                {"nome": "Igual", "ordem": 0, "ativo": True, "condicoes": [{"campo": "documento", "operador": "igual", "valor": "NF001", "coluna_excel": ""}], "conta_debito": "1", "conta_credito": "2"},
                {"nome": "Diferente", "ordem": 1, "ativo": True, "condicoes": [{"campo": "documento", "operador": "diferente", "valor": "NF999", "coluna_excel": ""}], "conta_debito": "3", "conta_credito": "4"}
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        assert response.status_code == 201
        
        data = response.json()
        assert data["regras_conta"][0]["condicoes"][0]["operador"] == "igual"
        assert data["regras_conta"][0]["condicoes"][0]["valor"] == "NF001"
        assert data["regras_conta"][1]["condicoes"][0]["operador"] == "diferente"
        
        print("✅ Operators igual and diferente work correctly")
        
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{data['id']}")

    def test_operators_contem_nao_contem(self, api_client):
        """Test contem and nao_contem operators"""
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": f"TEST_Operators_Contem_{uuid.uuid4().hex[:6]}",
            "regras_conta": [
                {"nome": "Contém", "ordem": 0, "ativo": True, "condicoes": [{"campo": "historico", "operador": "contem", "valor": "PAGAMENTO", "coluna_excel": ""}], "conta_debito": "1", "conta_credito": "2"},
                {"nome": "Não Contém", "ordem": 1, "ativo": True, "condicoes": [{"campo": "historico", "operador": "nao_contem", "valor": "ESTORNO", "coluna_excel": ""}], "conta_debito": "3", "conta_credito": "4"}
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        assert response.status_code == 201
        
        data = response.json()
        assert data["regras_conta"][0]["condicoes"][0]["operador"] == "contem"
        assert data["regras_conta"][1]["condicoes"][0]["operador"] == "nao_contem"
        
        print("✅ Operators contem and nao_contem work correctly")
        
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{data['id']}")

    def test_operators_dc_debito_credito(self, api_client):
        """Test dc_debito and dc_credito operators"""
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": f"TEST_Operators_DC_{uuid.uuid4().hex[:6]}",
            "regras_conta": [
                {"nome": "É Débito", "ordem": 0, "ativo": True, "condicoes": [{"campo": "_tipo_dc", "operador": "dc_debito", "valor": "", "coluna_excel": ""}], "conta_debito": "1", "conta_credito": "2"},
                {"nome": "É Crédito", "ordem": 1, "ativo": True, "condicoes": [{"campo": "_tipo_dc", "operador": "dc_credito", "valor": "", "coluna_excel": ""}], "conta_debito": "3", "conta_credito": "4"}
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        assert response.status_code == 201
        
        data = response.json()
        assert data["regras_conta"][0]["condicoes"][0]["operador"] == "dc_debito"
        assert data["regras_conta"][1]["condicoes"][0]["operador"] == "dc_credito"
        
        print("✅ Operators dc_debito and dc_credito work correctly")
        
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{data['id']}")


class TestAccountRulesListResponse:
    """Test that regras_conta appears in list responses"""

    def test_list_layouts_includes_regras_conta(self, api_client):
        """GET /api/v1/import-layouts - List response includes regras_conta"""
        # Create layout with regras_conta
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": f"TEST_AccountRules_List_{uuid.uuid4().hex[:6]}",
            "regras_conta": [
                {"nome": "List Test Rule", "ordem": 0, "ativo": True, "condicoes": [{"campo": "_sinal_valor", "operador": "positivo", "valor": "", "coluna_excel": ""}], "conta_debito": "1", "conta_credito": "2"}
            ]
        }
        create_response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        assert create_response.status_code == 201
        layout_id = create_response.json()["id"]
        
        # List and find our layout
        response = api_client.get(f"{BASE_URL}/api/v1/import-layouts", params={"cnpj": TEST_CNPJ})
        assert response.status_code == 200
        
        data = response.json()
        our_layout = next((l for l in data["items"] if l["id"] == layout_id), None)
        
        assert our_layout is not None, "Created layout should be in list"
        assert "regras_conta" in our_layout, "List response should include regras_conta"
        assert len(our_layout["regras_conta"]) == 1
        
        print("✅ GET list layouts includes regras_conta in response")
        
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
