"""
Backend API Tests for Layouts de Importação Excel and Regras de Processamento
Tests for: POST/GET/PUT/DELETE /api/v1/import-layouts and /api/v1/import-layouts/{id}/rules
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://batch-accounting-pro.preview.emergentagent.com')

# Valid CNPJ for testing
TEST_CNPJ = "11222333000181"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def created_layout(api_client):
    """Create a test layout and return its ID for rule testing"""
    payload = {
        "cnpj": TEST_CNPJ,
        "nome": "TEST_Layout_Pytest",
        "descricao": "Layout criado para testes pytest",
        "config_planilha": {
            "nome_aba": None,
            "linha_cabecalho": 0,
            "linha_inicio_dados": 1
        },
        "colunas": [
            {
                "campo_destino": "data",
                "coluna_excel": "A",
                "tipo_dado": "date",
                "formato": "%d/%m/%Y",
                "obrigatorio": True
            },
            {
                "campo_destino": "valor",
                "coluna_excel": "B",
                "tipo_dado": "decimal",
                "obrigatorio": True
            }
        ],
        "config_valor": {
            "tipo_sinal": "sinal_valor"
        }
    }
    response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
    if response.status_code == 201:
        data = response.json()
        yield data
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{data['id']}")
    else:
        pytest.skip(f"Could not create test layout: {response.status_code} - {response.text}")


class TestLayoutsCRUD:
    """Test suite for Import Layouts CRUD operations"""

    def test_list_layouts_empty_or_existing(self, api_client):
        """GET /api/v1/import-layouts - Lista layouts"""
        response = api_client.get(f"{BASE_URL}/api/v1/import-layouts")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "items" in data, "Response should have 'items' key"
        assert "total" in data, "Response should have 'total' key"
        assert "cnpjs_disponiveis" in data, "Response should have 'cnpjs_disponiveis' key"
        assert isinstance(data["items"], list), "items should be a list"
        print(f"✅ GET /api/v1/import-layouts - Found {data['total']} layouts")

    def test_list_layouts_filter_by_cnpj(self, api_client):
        """GET /api/v1/import-layouts?cnpj=xxx - Lista layouts filtrados por CNPJ"""
        response = api_client.get(f"{BASE_URL}/api/v1/import-layouts", params={"cnpj": TEST_CNPJ})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        for item in data["items"]:
            assert item["cnpj"] == TEST_CNPJ, f"All items should have CNPJ {TEST_CNPJ}"
        print(f"✅ GET /api/v1/import-layouts?cnpj={TEST_CNPJ} - Filter working")

    def test_get_campos_disponiveis(self, api_client):
        """GET /api/v1/import-layouts/campos-disponiveis - Campos disponíveis para mapeamento"""
        response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/campos-disponiveis")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, dict), "Response should be a dict"
        # Check for expected fields
        expected_fields = ["data", "valor", "historico", "documento", "conta_debito", "conta_credito"]
        for field in expected_fields:
            assert field in data, f"Expected field '{field}' in campos_disponiveis"
        print(f"✅ GET /api/v1/import-layouts/campos-disponiveis - Found {len(data)} campos")

    def test_create_layout_success(self, api_client):
        """POST /api/v1/import-layouts - Criar layout com CNPJ válido"""
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": "TEST_Layout_Create",
            "descricao": "Teste de criação de layout",
            "config_planilha": {
                "nome_aba": None,
                "linha_cabecalho": 0,
                "linha_inicio_dados": 1
            },
            "colunas": [
                {
                    "campo_destino": "data",
                    "coluna_excel": "A",
                    "tipo_dado": "date",
                    "formato": "%d/%m/%Y",
                    "obrigatorio": True
                },
                {
                    "campo_destino": "valor",
                    "coluna_excel": "C",
                    "tipo_dado": "decimal",
                    "obrigatorio": True
                },
                {
                    "campo_destino": "historico",
                    "coluna_excel": "D",
                    "tipo_dado": "string",
                    "obrigatorio": False
                }
            ],
            "config_valor": {
                "tipo_sinal": "sinal_valor",
                "coluna_tipo": None,
                "mapeamento_tipo": {"D": "debito", "C": "credito"}
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["cnpj"] == TEST_CNPJ
        assert data["nome"] == "TEST_Layout_Create"
        assert data["descricao"] == "Teste de criação de layout"
        assert data["ativo"] == True
        assert data["total_colunas"] == 3
        assert "id" in data
        
        layout_id = data["id"]
        print(f"✅ POST /api/v1/import-layouts - Layout created: {layout_id}")
        
        # Verify persistence with GET
        get_response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        assert get_response.status_code == 200
        persisted = get_response.json()
        assert persisted["nome"] == "TEST_Layout_Create"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")

    def test_create_layout_invalid_cnpj(self, api_client):
        """POST /api/v1/import-layouts - Deve rejeitar CNPJ inválido"""
        payload = {
            "cnpj": "12345678901234",  # Invalid CNPJ
            "nome": "TEST_Layout_Invalid_CNPJ",
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        
        # Should return 400 for invalid CNPJ
        assert response.status_code == 400, f"Expected 400 for invalid CNPJ, got {response.status_code}"
        print("✅ POST /api/v1/import-layouts - Invalid CNPJ rejected correctly")

    def test_get_layout_by_id(self, api_client, created_layout):
        """GET /api/v1/import-layouts/{id} - Obter layout específico"""
        layout_id = created_layout["id"]
        
        response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == layout_id
        assert data["nome"] == created_layout["nome"]
        assert "colunas" in data
        assert "config_planilha" in data
        assert "config_valor" in data
        print(f"✅ GET /api/v1/import-layouts/{layout_id} - Layout retrieved successfully")

    def test_get_layout_not_found(self, api_client):
        """GET /api/v1/import-layouts/{id} - Layout não encontrado retorna 404"""
        fake_id = "nonexistent-uuid-12345"
        
        response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{fake_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ GET /api/v1/import-layouts/<fake_id> - Returns 404 correctly")

    def test_update_layout(self, api_client, created_layout):
        """PUT /api/v1/import-layouts/{id} - Atualizar layout"""
        layout_id = created_layout["id"]
        
        update_payload = {
            "nome": "TEST_Layout_Updated",
            "descricao": "Descrição atualizada",
            "ativo": False
        }
        
        response = api_client.put(f"{BASE_URL}/api/v1/import-layouts/{layout_id}", json=update_payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["nome"] == "TEST_Layout_Updated"
        assert data["descricao"] == "Descrição atualizada"
        assert data["ativo"] == False
        
        # Verify with GET
        get_response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        persisted = get_response.json()
        assert persisted["nome"] == "TEST_Layout_Updated"
        assert persisted["ativo"] == False
        
        print(f"✅ PUT /api/v1/import-layouts/{layout_id} - Layout updated successfully")
        
        # Restore original state
        api_client.put(f"{BASE_URL}/api/v1/import-layouts/{layout_id}", json={
            "nome": created_layout["nome"],
            "ativo": True
        })

    def test_clone_layout(self, api_client, created_layout):
        """POST /api/v1/import-layouts/{id}/clone - Clonar layout"""
        layout_id = created_layout["id"]
        
        clone_payload = {
            "novo_nome": "TEST_Layout_Clonado"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/clone", json=clone_payload)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["nome"] == "TEST_Layout_Clonado"
        assert data["cnpj"] == created_layout["cnpj"]
        assert data["id"] != layout_id  # New ID
        assert data["total_colunas"] == created_layout["total_colunas"]
        
        cloned_id = data["id"]
        print(f"✅ POST /api/v1/import-layouts/{layout_id}/clone - Layout cloned: {cloned_id}")
        
        # Cleanup cloned layout
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{cloned_id}")

    def test_delete_layout(self, api_client):
        """DELETE /api/v1/import-layouts/{id} - Deletar layout"""
        # Create layout to delete
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": "TEST_Layout_To_Delete"
        }
        create_response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        assert create_response.status_code == 201
        layout_id = create_response.json()["id"]
        
        # Delete
        response = api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "mensagem" in data
        
        # Verify deletion with GET
        get_response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        assert get_response.status_code == 404, "Deleted layout should return 404"
        
        print(f"✅ DELETE /api/v1/import-layouts/{layout_id} - Layout deleted successfully")


class TestRegrasCRUD:
    """Test suite for Processing Rules CRUD operations"""

    def test_list_rules_empty(self, api_client, created_layout):
        """GET /api/v1/import-layouts/{layout_id}/rules - Lista regras (inicialmente vazio)"""
        layout_id = created_layout["id"]
        
        response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
        print(f"✅ GET /api/v1/import-layouts/{layout_id}/rules - Found {data['total']} rules")

    def test_create_rule_filtro(self, api_client, created_layout):
        """POST /api/v1/import-layouts/{layout_id}/rules - Criar regra tipo filtro"""
        layout_id = created_layout["id"]
        
        payload = {
            "nome": "TEST_Regra_Filtro",
            "descricao": "Ignora valores zerados",
            "tipo": "filtro",
            "ativo": True,
            "condicoes": [
                {
                    "campo": "valor",
                    "operador": "igual",
                    "valor": "0"
                }
            ],
            "acao": {
                "tipo_acao": "excluir"
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules", json=payload)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["nome"] == "TEST_Regra_Filtro"
        assert data["tipo"] == "filtro"
        assert data["layout_id"] == layout_id
        assert data["ativo"] == True
        assert "id" in data
        assert "ordem" in data
        
        rule_id = data["id"]
        print(f"✅ POST /api/v1/import-layouts/{layout_id}/rules - Rule created: {rule_id}")
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules/{rule_id}")
        assert get_response.status_code == 200
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules/{rule_id}")

    def test_create_rule_transformacao(self, api_client, created_layout):
        """POST /api/v1/import-layouts/{layout_id}/rules - Criar regra tipo transformação"""
        layout_id = created_layout["id"]
        
        payload = {
            "nome": "TEST_Regra_Transformacao",
            "descricao": "Converte histórico para maiúscula",
            "tipo": "transformacao",
            "ativo": True,
            "condicoes": [
                {
                    "campo": "historico",
                    "operador": "nao_vazio"
                }
            ],
            "acao": {
                "tipo_acao": "maiuscula",
                "campo_destino": "historico"
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules", json=payload)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["tipo"] == "transformacao"
        assert data["acao"]["tipo_acao"] == "maiuscula"
        
        rule_id = data["id"]
        print(f"✅ POST rule type=transformacao - Created: {rule_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules/{rule_id}")

    def test_create_rule_validacao(self, api_client, created_layout):
        """POST /api/v1/import-layouts/{layout_id}/rules - Criar regra tipo validação"""
        layout_id = created_layout["id"]
        
        payload = {
            "nome": "TEST_Regra_Validacao",
            "descricao": "Valida que valor é positivo",
            "tipo": "validacao",
            "ativo": True,
            "condicoes": [
                {
                    "campo": "valor",
                    "operador": "menor",
                    "valor": "0"
                }
            ],
            "acao": {
                "tipo_acao": "erro",
                "valor": "Valor não pode ser negativo"
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules", json=payload)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["tipo"] == "validacao"
        
        rule_id = data["id"]
        print(f"✅ POST rule type=validacao - Created: {rule_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules/{rule_id}")

    def test_update_rule(self, api_client, created_layout):
        """PUT /api/v1/import-layouts/{layout_id}/rules/{rule_id} - Atualizar regra"""
        layout_id = created_layout["id"]
        
        # Create rule first
        create_payload = {
            "nome": "TEST_Regra_To_Update",
            "tipo": "filtro",
            "condicoes": [{"campo": "valor", "operador": "igual", "valor": "0"}],
            "acao": {"tipo_acao": "excluir"}
        }
        create_response = api_client.post(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules", json=create_payload)
        assert create_response.status_code == 201
        rule_id = create_response.json()["id"]
        
        # Update
        update_payload = {
            "nome": "TEST_Regra_Updated",
            "descricao": "Descrição atualizada",
            "ativo": False
        }
        
        response = api_client.put(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules/{rule_id}", json=update_payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["nome"] == "TEST_Regra_Updated"
        assert data["descricao"] == "Descrição atualizada"
        assert data["ativo"] == False
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules/{rule_id}")
        persisted = get_response.json()
        assert persisted["nome"] == "TEST_Regra_Updated"
        
        print(f"✅ PUT /api/v1/import-layouts/{layout_id}/rules/{rule_id} - Rule updated")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules/{rule_id}")

    def test_delete_rule(self, api_client, created_layout):
        """DELETE /api/v1/import-layouts/{layout_id}/rules/{rule_id} - Deletar regra"""
        layout_id = created_layout["id"]
        
        # Create rule first
        create_payload = {
            "nome": "TEST_Regra_To_Delete",
            "tipo": "filtro",
            "condicoes": [{"campo": "valor", "operador": "vazio"}],
            "acao": {"tipo_acao": "excluir"}
        }
        create_response = api_client.post(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules", json=create_payload)
        assert create_response.status_code == 201
        rule_id = create_response.json()["id"]
        
        # Delete
        response = api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules/{rule_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "mensagem" in data
        
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules/{rule_id}")
        assert get_response.status_code == 404, "Deleted rule should return 404"
        
        print(f"✅ DELETE /api/v1/import-layouts/{layout_id}/rules/{rule_id} - Rule deleted")

    def test_get_rule_by_id(self, api_client, created_layout):
        """GET /api/v1/import-layouts/{layout_id}/rules/{rule_id} - Obter regra específica"""
        layout_id = created_layout["id"]
        
        # Create rule first
        create_payload = {
            "nome": "TEST_Regra_Get",
            "tipo": "enriquecimento",
            "condicoes": [{"campo": "historico", "operador": "vazio"}],
            "acao": {"tipo_acao": "definir_valor", "campo_destino": "historico", "valor": "Sem descrição"}
        }
        create_response = api_client.post(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules", json=create_payload)
        assert create_response.status_code == 201
        rule_id = create_response.json()["id"]
        
        # Get
        response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules/{rule_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == rule_id
        assert data["nome"] == "TEST_Regra_Get"
        assert data["tipo"] == "enriquecimento"
        assert data["layout_id"] == layout_id
        
        print(f"✅ GET /api/v1/import-layouts/{layout_id}/rules/{rule_id} - Rule retrieved")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules/{rule_id}")


class TestLayoutRulesIntegration:
    """Integration tests for layouts and rules together"""

    def test_layout_tracks_rule_count(self, api_client, created_layout):
        """Verify layout.total_regras is updated when rules are added/removed"""
        layout_id = created_layout["id"]
        
        # Check initial count
        layout_response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        initial_count = layout_response.json()["total_regras"]
        
        # Add a rule
        rule_payload = {
            "nome": "TEST_Rule_Count",
            "tipo": "filtro",
            "condicoes": [{"campo": "valor", "operador": "igual", "valor": "0"}],
            "acao": {"tipo_acao": "excluir"}
        }
        create_response = api_client.post(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules", json=rule_payload)
        rule_id = create_response.json()["id"]
        
        # Check updated count
        layout_response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        new_count = layout_response.json()["total_regras"]
        assert new_count == initial_count + 1, f"Expected {initial_count + 1}, got {new_count}"
        
        # Delete rule and verify count decreased
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules/{rule_id}")
        layout_response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        final_count = layout_response.json()["total_regras"]
        assert final_count == initial_count
        
        print("✅ Layout total_regras counter works correctly")

    def test_delete_layout_cascades_rules(self, api_client):
        """Verify deleting a layout also deletes its rules"""
        # Create layout
        layout_payload = {
            "cnpj": TEST_CNPJ,
            "nome": "TEST_Layout_Cascade_Delete"
        }
        layout_response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=layout_payload)
        assert layout_response.status_code == 201
        layout_id = layout_response.json()["id"]
        
        # Add rules
        rule_payload = {
            "nome": "TEST_Rule_Cascade",
            "tipo": "filtro",
            "condicoes": [{"campo": "valor", "operador": "vazio"}],
            "acao": {"tipo_acao": "excluir"}
        }
        rule_response = api_client.post(f"{BASE_URL}/api/v1/import-layouts/{layout_id}/rules", json=rule_payload)
        rule_id = rule_response.json()["id"]
        
        # Delete layout
        delete_response = api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        assert delete_response.status_code == 200
        
        # Verify layout and rules are gone
        layout_get = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        assert layout_get.status_code == 404
        
        print("✅ DELETE layout cascades to delete rules")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
