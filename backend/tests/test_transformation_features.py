"""
Test suite for Iteration 6: Advanced Data Transformation Features
- Tests DynamicExcelParser with transformacao config
- Tests layout creation with transformacao fields
- Tests ProcessarLoteUseCase with layout_id and dynamic parser
"""
import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Valid CNPJ for testing
TEST_CNPJ = "11222333000181"

# Sample Excel base64 - We'll use a small valid Excel file for testing
# This is a minimal XLS file with just a few rows
SAMPLE_EXCEL_B64 = None


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def sample_excel():
    """Load sample Excel file for testing"""
    global SAMPLE_EXCEL_B64
    sample_path = "/app/sample_input.xls"
    if os.path.exists(sample_path):
        with open(sample_path, "rb") as f:
            SAMPLE_EXCEL_B64 = base64.b64encode(f.read()).decode('utf-8')
    return SAMPLE_EXCEL_B64


class TestHealthCheck:
    """Basic health check to ensure service is running"""
    
    def test_health_endpoint(self, api_client):
        """Test /api/health returns healthy status"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✅ Health check passed: {data}")


class TestCamposDisponiveis:
    """Test campos-disponiveis endpoint for transformation field support"""
    
    def test_campos_disponiveis_returns_fields(self, api_client):
        """Test GET /api/v1/import-layouts/campos-disponiveis returns all expected fields"""
        response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/campos-disponiveis")
        assert response.status_code == 200
        
        data = response.json()
        # Check for key fields that can have transformations
        assert "valor" in data, "valor field should be present"
        assert "conta_debito" in data, "conta_debito field should be present"
        assert "conta_credito" in data, "conta_credito field should be present"
        assert "data" in data, "data field should be present"
        assert "cnpj_cpf_terceiro" in data, "cnpj_cpf_terceiro field should be present"
        assert "cnpj_cpf_e_nome" in data, "cnpj_cpf_e_nome (composto) field should be present"
        
        # Verify field structure
        valor_field = data["valor"]
        assert valor_field["tipo"] == "decimal"
        assert valor_field["obrigatorio"] == True
        print(f"✅ campos-disponiveis returned {len(data)} fields")


class TestLayoutWithTransformation:
    """Test creating layouts with transformacao config"""
    
    created_layout_id = None
    
    def test_create_layout_with_transformacao_config(self, api_client):
        """Test POST /api/v1/import-layouts creates layout with transformacao"""
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": "TEST_Layout_Transformacao_V6",
            "descricao": "Layout para testar transformações avançadas",
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
                    "obrigatorio": True,
                    "transformacao": {}
                },
                {
                    "campo_destino": "valor",
                    "coluna_excel": "B",
                    "tipo_dado": "decimal",
                    "obrigatorio": True,
                    "transformacao": {
                        "formato_numero": "br_virgula"
                    }
                },
                {
                    "campo_destino": "conta_debito",
                    "coluna_excel": "C",
                    "tipo_dado": "string",
                    "obrigatorio": True,
                    "transformacao": {
                        "regex_pattern": "^(\\d+)"
                    }
                },
                {
                    "campo_destino": "conta_credito",
                    "coluna_excel": "D",
                    "tipo_dado": "string",
                    "obrigatorio": True,
                    "transformacao": {}
                },
                {
                    "campo_destino": "cnpj_cpf_e_nome",
                    "coluna_excel": "E",
                    "tipo_dado": "string",
                    "obrigatorio": False,
                    "transformacao": {
                        "campo_composto": "cnpj_cpf_nome",
                        "separador_composto": " - "
                    }
                },
                {
                    "campo_destino": "historico",
                    "coluna_excel": "F",
                    "tipo_dado": "string",
                    "obrigatorio": False,
                    "transformacao": {
                        "concat_colunas": ["F", "G"],
                        "concat_separador": " | "
                    }
                }
            ],
            "config_valor": {
                "tipo_sinal": "sinal_valor"
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain layout ID"
        assert data["nome"] == "TEST_Layout_Transformacao_V6"
        TestLayoutWithTransformation.created_layout_id = data["id"]
        print(f"✅ Created layout with transformations. ID: {data['id']}")
    
    def test_get_layout_contains_transformacao(self, api_client):
        """Test GET /api/v1/import-layouts/{id} returns transformacao data"""
        if not TestLayoutWithTransformation.created_layout_id:
            pytest.skip("No layout created")
        
        response = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{TestLayoutWithTransformation.created_layout_id}")
        assert response.status_code == 200
        
        data = response.json()
        colunas = data.get("colunas", [])
        assert len(colunas) >= 5, f"Expected at least 5 columns, got {len(colunas)}"
        
        # Check that valor column has formato_numero transformation
        valor_col = next((c for c in colunas if c["campo_destino"] == "valor"), None)
        assert valor_col is not None, "valor column should exist"
        trans = valor_col.get("transformacao", {})
        assert trans.get("formato_numero") == "br_virgula", f"formato_numero should be br_virgula, got {trans}"
        
        # Check conta_debito has regex_pattern
        conta_debito_col = next((c for c in colunas if c["campo_destino"] == "conta_debito"), None)
        assert conta_debito_col is not None
        trans_cd = conta_debito_col.get("transformacao", {})
        assert "regex_pattern" in trans_cd, "conta_debito should have regex_pattern"
        
        # Check cnpj_cpf_e_nome has campo_composto
        cnpj_col = next((c for c in colunas if c["campo_destino"] == "cnpj_cpf_e_nome"), None)
        assert cnpj_col is not None
        trans_cnpj = cnpj_col.get("transformacao", {})
        assert trans_cnpj.get("campo_composto") == "cnpj_cpf_nome"
        
        # Check historico has concat_colunas
        hist_col = next((c for c in colunas if c["campo_destino"] == "historico"), None)
        assert hist_col is not None
        trans_hist = hist_col.get("transformacao", {})
        assert "concat_colunas" in trans_hist
        assert trans_hist.get("concat_separador") == " | "
        
        print(f"✅ Layout transformacao config verified for all columns")
    
    def test_list_layouts_includes_new_layout(self, api_client):
        """Test GET /api/v1/import-layouts lists the created layout"""
        response = api_client.get(f"{BASE_URL}/api/v1/import-layouts", params={"cnpj": TEST_CNPJ})
        assert response.status_code == 200
        
        data = response.json()
        items = data.get("items", [])
        layout_found = any(l["nome"] == "TEST_Layout_Transformacao_V6" for l in items)
        assert layout_found, "Created layout should appear in list"
        print(f"✅ Layout found in list. Total layouts for CNPJ: {len(items)}")
    
    def test_cleanup_layout(self, api_client):
        """Cleanup: Delete test layout"""
        if TestLayoutWithTransformation.created_layout_id:
            response = api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{TestLayoutWithTransformation.created_layout_id}")
            assert response.status_code in [200, 204], f"Delete failed: {response.status_code}"
            print(f"✅ Test layout deleted")


class TestLoteWithLayoutId:
    """Test creating lotes that reference layouts with transformations"""
    
    layout_id = None
    lote_id = None
    
    def test_create_layout_for_lote(self, api_client):
        """Create a layout with transformations to be used by lote"""
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": "TEST_Layout_For_Lote_V6",
            "config_planilha": {
                "nome_aba": None,
                "linha_cabecalho": 0,
                "linha_inicio_dados": 1
            },
            "colunas": [
                {
                    "campo_destino": "data",
                    "coluna_excel": "0",
                    "tipo_dado": "date",
                    "obrigatorio": True,
                    "transformacao": {}
                },
                {
                    "campo_destino": "valor",
                    "coluna_excel": "1",
                    "tipo_dado": "decimal",
                    "obrigatorio": True,
                    "transformacao": {
                        "formato_numero": "br_virgula"
                    }
                },
                {
                    "campo_destino": "conta_debito",
                    "coluna_excel": "2",
                    "tipo_dado": "string",
                    "obrigatorio": True,
                    "transformacao": {}
                },
                {
                    "campo_destino": "conta_credito",
                    "coluna_excel": "3",
                    "tipo_dado": "string",
                    "obrigatorio": True,
                    "transformacao": {}
                }
            ],
            "config_valor": {
                "tipo_sinal": "sinal_valor"
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        assert response.status_code == 201
        TestLoteWithLayoutId.layout_id = response.json()["id"]
        print(f"✅ Layout created for lote test. ID: {TestLoteWithLayoutId.layout_id}")
    
    def test_create_lote_with_layout_id(self, api_client, sample_excel):
        """Test POST /api/v1/lotes creates lote with layout_id"""
        if not sample_excel:
            pytest.skip("Sample Excel not available")
        if not TestLoteWithLayoutId.layout_id:
            pytest.skip("Layout not created")
        
        payload = {
            "cnpj": TEST_CNPJ,
            "periodo_mes": 1,
            "periodo_ano": 2026,
            "email_notificacao": "",
            "arquivo_base64": sample_excel,
            "nome_arquivo": "test_transform.xls",
            "nome_layout": "padrao",
            "layout_id": TestLoteWithLayoutId.layout_id
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/lotes", json=payload)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "protocolo" in data
        assert data.get("layout_id") == TestLoteWithLayoutId.layout_id
        TestLoteWithLayoutId.lote_id = data["id"]
        print(f"✅ Lote created with layout_id. Protocol: {data['protocolo']}")
    
    def test_get_lote_shows_layout_id(self, api_client):
        """Test GET /api/v1/lotes/{id} returns layout_id"""
        if not TestLoteWithLayoutId.lote_id:
            pytest.skip("Lote not created")
        
        response = api_client.get(f"{BASE_URL}/api/v1/lotes/{TestLoteWithLayoutId.lote_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("layout_id") == TestLoteWithLayoutId.layout_id
        print(f"✅ Lote GET returns layout_id correctly")
    
    def test_cleanup_lote_and_layout(self, api_client):
        """Cleanup test data"""
        if TestLoteWithLayoutId.lote_id:
            api_client.delete(f"{BASE_URL}/api/v1/lotes/{TestLoteWithLayoutId.lote_id}")
            print("✅ Test lote deleted")
        
        if TestLoteWithLayoutId.layout_id:
            api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{TestLoteWithLayoutId.layout_id}")
            print("✅ Test layout deleted")


class TestTransformationOptions:
    """Test all transformation options that should be available"""
    
    def test_formato_numero_options(self, api_client):
        """Verify formato_numero transformation options work"""
        # Create layout with different formato_numero values
        formatos = ["automatico", "br_virgula", "br_moeda", "us_ponto"]
        
        for formato in formatos:
            payload = {
                "cnpj": TEST_CNPJ,
                "nome": f"TEST_Formato_{formato}",
                "config_planilha": {"linha_inicio_dados": 1},
                "colunas": [
                    {
                        "campo_destino": "valor",
                        "coluna_excel": "A",
                        "tipo_dado": "decimal",
                        "transformacao": {"formato_numero": formato}
                    },
                    {
                        "campo_destino": "conta_debito",
                        "coluna_excel": "B",
                        "tipo_dado": "string"
                    },
                    {
                        "campo_destino": "conta_credito",
                        "coluna_excel": "C",
                        "tipo_dado": "string"
                    },
                    {
                        "campo_destino": "data",
                        "coluna_excel": "D",
                        "tipo_dado": "date"
                    }
                ]
            }
            
            response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
            assert response.status_code == 201, f"Failed to create layout with formato_numero={formato}"
            layout_id = response.json()["id"]
            
            # Verify it was saved correctly
            get_resp = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
            assert get_resp.status_code == 200
            colunas = get_resp.json().get("colunas", [])
            valor_col = next((c for c in colunas if c["campo_destino"] == "valor"), None)
            assert valor_col is not None
            saved_formato = valor_col.get("transformacao", {}).get("formato_numero")
            # Note: automatico might be stored as None or not present
            if formato != "automatico":
                assert saved_formato == formato, f"Expected {formato}, got {saved_formato}"
            
            # Cleanup
            api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        
        print(f"✅ All formato_numero options tested: {formatos}")
    
    def test_regex_pattern_transformation(self, api_client):
        """Test regex_pattern transformation is stored correctly"""
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": "TEST_Regex_Pattern",
            "config_planilha": {"linha_inicio_dados": 1},
            "colunas": [
                {
                    "campo_destino": "documento",
                    "coluna_excel": "A",
                    "tipo_dado": "string",
                    "transformacao": {"regex_pattern": "(\\d{8})"}
                },
                {
                    "campo_destino": "valor",
                    "coluna_excel": "B",
                    "tipo_dado": "decimal"
                },
                {
                    "campo_destino": "conta_debito",
                    "coluna_excel": "C",
                    "tipo_dado": "string"
                },
                {
                    "campo_destino": "conta_credito",
                    "coluna_excel": "D",
                    "tipo_dado": "string"
                },
                {
                    "campo_destino": "data",
                    "coluna_excel": "E",
                    "tipo_dado": "date"
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        assert response.status_code == 201
        layout_id = response.json()["id"]
        
        # Verify
        get_resp = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        colunas = get_resp.json().get("colunas", [])
        doc_col = next((c for c in colunas if c["campo_destino"] == "documento"), None)
        assert doc_col is not None
        assert doc_col.get("transformacao", {}).get("regex_pattern") == "(\\d{8})"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        print("✅ regex_pattern transformation tested")
    
    def test_campo_composto_transformation(self, api_client):
        """Test campo_composto (cnpj_cpf_nome) transformation"""
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": "TEST_Campo_Composto",
            "config_planilha": {"linha_inicio_dados": 1},
            "colunas": [
                {
                    "campo_destino": "cnpj_cpf_e_nome",
                    "coluna_excel": "A",
                    "tipo_dado": "string",
                    "transformacao": {
                        "campo_composto": "cnpj_cpf_nome",
                        "separador_composto": " - "
                    }
                },
                {
                    "campo_destino": "valor",
                    "coluna_excel": "B",
                    "tipo_dado": "decimal"
                },
                {
                    "campo_destino": "conta_debito",
                    "coluna_excel": "C",
                    "tipo_dado": "string"
                },
                {
                    "campo_destino": "conta_credito",
                    "coluna_excel": "D",
                    "tipo_dado": "string"
                },
                {
                    "campo_destino": "data",
                    "coluna_excel": "E",
                    "tipo_dado": "date"
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        assert response.status_code == 201
        layout_id = response.json()["id"]
        
        # Verify
        get_resp = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        colunas = get_resp.json().get("colunas", [])
        cnpj_col = next((c for c in colunas if c["campo_destino"] == "cnpj_cpf_e_nome"), None)
        assert cnpj_col is not None
        trans = cnpj_col.get("transformacao", {})
        assert trans.get("campo_composto") == "cnpj_cpf_nome"
        assert trans.get("separador_composto") == " - "
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        print("✅ campo_composto transformation tested")
    
    def test_concat_colunas_transformation(self, api_client):
        """Test concat_colunas transformation"""
        payload = {
            "cnpj": TEST_CNPJ,
            "nome": "TEST_Concat_Colunas",
            "config_planilha": {"linha_inicio_dados": 1},
            "colunas": [
                {
                    "campo_destino": "historico",
                    "coluna_excel": "A",
                    "tipo_dado": "string",
                    "transformacao": {
                        "concat_colunas": ["A", "B", "C"],
                        "concat_separador": " / "
                    }
                },
                {
                    "campo_destino": "valor",
                    "coluna_excel": "D",
                    "tipo_dado": "decimal"
                },
                {
                    "campo_destino": "conta_debito",
                    "coluna_excel": "E",
                    "tipo_dado": "string"
                },
                {
                    "campo_destino": "conta_credito",
                    "coluna_excel": "F",
                    "tipo_dado": "string"
                },
                {
                    "campo_destino": "data",
                    "coluna_excel": "G",
                    "tipo_dado": "date"
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/import-layouts", json=payload)
        assert response.status_code == 201
        layout_id = response.json()["id"]
        
        # Verify
        get_resp = api_client.get(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        colunas = get_resp.json().get("colunas", [])
        hist_col = next((c for c in colunas if c["campo_destino"] == "historico"), None)
        assert hist_col is not None
        trans = hist_col.get("transformacao", {})
        assert trans.get("concat_colunas") == ["A", "B", "C"]
        assert trans.get("concat_separador") == " / "
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
        print("✅ concat_colunas transformation tested")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
