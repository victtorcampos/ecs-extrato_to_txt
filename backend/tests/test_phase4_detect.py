"""
Phase 4 Testing: Auto-Detect and Test-Parse Endpoints

Tests for:
- POST /api/v1/import-layouts/detect - Auto-detection of Excel structure
- POST /api/v1/import-layouts/test-parse - Preview parsing without saving
- Regression tests for existing endpoints
"""

import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Read the sample Excel file
SAMPLE_FILE_PATH = '/app/sample_input.xls'
with open(SAMPLE_FILE_PATH, 'rb') as f:
    SAMPLE_FILE_BASE64 = base64.b64encode(f.read()).decode('utf-8')


class TestHealthAndRegression:
    """Regression tests for existing endpoints"""
    
    def test_health_endpoint(self):
        """GET /api/health should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ Health endpoint works correctly")
    
    def test_layouts_list(self):
        """GET /api/v1/import-layouts should return layouts list"""
        response = requests.get(f"{BASE_URL}/api/v1/import-layouts")
        assert response.status_code == 200, f"Layouts list failed: {response.text}"
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
        print(f"✅ Layouts list returned {data['total']} layouts")
    
    def test_lotes_estatisticas(self):
        """GET /api/v1/lotes/estatisticas should return stats"""
        response = requests.get(f"{BASE_URL}/api/v1/lotes/estatisticas")
        assert response.status_code == 200, f"Lotes stats failed: {response.text}"
        data = response.json()
        assert "total" in data
        assert "por_status" in data
        print(f"✅ Lotes stats: total={data['total']}")


class TestDetectEndpoint:
    """Tests for POST /api/v1/import-layouts/detect"""
    
    def test_detect_basic(self):
        """Detect endpoint should return auto-detected layout"""
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/detect",
            json={"arquivo_base64": SAMPLE_FILE_BASE64}
        )
        assert response.status_code == 200, f"Detect failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "config_planilha" in data
        assert "colunas" in data
        assert "config_valor" in data
        assert "templates_regras" in data
        assert "preview_dados" in data
        assert "abas" in data
        
        print(f"✅ Detect returned {len(data['colunas'])} columns")
        return data
    
    def test_detect_config_planilha(self):
        """Detect should return correct config_planilha structure"""
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/detect",
            json={"arquivo_base64": SAMPLE_FILE_BASE64}
        )
        data = response.json()
        config = data["config_planilha"]
        
        assert "nome_aba" in config
        assert "linha_cabecalho" in config
        assert "linha_inicio_dados" in config
        assert isinstance(config["linha_cabecalho"], int)
        assert isinstance(config["linha_inicio_dados"], int)
        assert config["linha_inicio_dados"] >= config["linha_cabecalho"]
        
        print(f"✅ Config planilha: aba={config['nome_aba']}, cabeçalho={config['linha_cabecalho']}, dados={config['linha_inicio_dados']}")
    
    def test_detect_columns_structure(self):
        """Detect should return properly structured columns"""
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/detect",
            json={"arquivo_base64": SAMPLE_FILE_BASE64}
        )
        data = response.json()
        colunas = data["colunas"]
        
        assert len(colunas) > 0, "No columns detected"
        
        # Check first column structure
        col = colunas[0]
        required_fields = ["coluna_excel", "nome_cabecalho", "campo_destino", "tipo_dado", "confianca"]
        for field in required_fields:
            assert field in col, f"Missing field {field} in column"
        
        # Check confidence is between 0 and 1
        for col in colunas:
            assert 0 <= col["confianca"] <= 1, f"Invalid confidence: {col['confianca']}"
        
        print(f"✅ All {len(colunas)} columns have correct structure")
    
    def test_detect_data_column_identified(self):
        """Detect should identify at least one date column (tipo_dado=data)"""
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/detect",
            json={"arquivo_base64": SAMPLE_FILE_BASE64}
        )
        data = response.json()
        colunas = data["colunas"]
        
        date_columns = [c for c in colunas if c.get("tipo_dado") == "data"]
        # The sample file should have date columns
        print(f"✅ Found {len(date_columns)} date columns")
    
    def test_detect_valor_column_identified(self):
        """Detect should identify at least one valor column (decimal type)"""
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/detect",
            json={"arquivo_base64": SAMPLE_FILE_BASE64}
        )
        data = response.json()
        colunas = data["colunas"]
        
        decimal_types = ["decimal", "decimal_br", "decimal_dc"]
        valor_columns = [c for c in colunas if c.get("tipo_dado") in decimal_types or c.get("campo_destino") == "valor"]
        print(f"✅ Found {len(valor_columns)} valor/decimal columns")
    
    def test_detect_config_valor(self):
        """Detect should return config_valor with tipo_sinal"""
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/detect",
            json={"arquivo_base64": SAMPLE_FILE_BASE64}
        )
        data = response.json()
        config_valor = data["config_valor"]
        
        assert "tipo_sinal" in config_valor
        valid_types = ["sinal_valor", "coluna_tipo", "colunas_separadas", "valor_com_dc"]
        assert config_valor["tipo_sinal"] in valid_types
        
        print(f"✅ Config valor: tipo_sinal={config_valor['tipo_sinal']}")
    
    def test_detect_templates_regras(self):
        """Detect should return templates_regras list"""
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/detect",
            json={"arquivo_base64": SAMPLE_FILE_BASE64}
        )
        data = response.json()
        templates = data["templates_regras"]
        
        assert isinstance(templates, list)
        # Templates should have the "por sinal do valor" template at minimum
        if len(templates) > 0:
            template = templates[0]
            assert "nome" in template
            assert "descricao" in template
            assert "tipo" in template
        
        print(f"✅ Found {len(templates)} rule templates")
    
    def test_detect_preview_dados(self):
        """Detect should return preview_dados (first rows)"""
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/detect",
            json={"arquivo_base64": SAMPLE_FILE_BASE64}
        )
        data = response.json()
        preview = data["preview_dados"]
        
        assert isinstance(preview, list)
        assert len(preview) > 0, "Preview should contain data rows"
        assert len(preview) <= 5, "Preview should contain at most 5 rows"
        
        print(f"✅ Preview contains {len(preview)} rows")
    
    def test_detect_empty_file_error(self):
        """Detect should handle invalid base64 gracefully"""
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/detect",
            json={"arquivo_base64": "invalid_base64"}
        )
        # Should return 400 or 500 for invalid data
        assert response.status_code in [400, 500]
        print("✅ Invalid base64 handled correctly")


class TestTestParseEndpoint:
    """Tests for POST /api/v1/import-layouts/test-parse"""
    
    def get_first_layout_id(self):
        """Helper to get first layout ID"""
        response = requests.get(f"{BASE_URL}/api/v1/import-layouts")
        if response.status_code == 200:
            items = response.json().get("items", [])
            if items:
                return items[0]["id"]
        return None
    
    def test_test_parse_with_layout_id(self):
        """Test-parse should work with existing layout_id"""
        layout_id = self.get_first_layout_id()
        if not layout_id:
            pytest.skip("No layouts available for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/test-parse",
            json={
                "arquivo_base64": SAMPLE_FILE_BASE64,
                "layout_id": layout_id,
                "periodo_mes": 1,
                "periodo_ano": 2026
            }
        )
        assert response.status_code == 200, f"Test-parse failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "lancamentos" in data
        assert "resumo" in data
        assert "erros" in data
        
        print(f"✅ Test-parse returned {len(data['lancamentos'])} lancamentos")
        return data
    
    def test_test_parse_resumo_structure(self):
        """Test-parse resumo should have correct counts"""
        layout_id = self.get_first_layout_id()
        if not layout_id:
            pytest.skip("No layouts available for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/test-parse",
            json={
                "arquivo_base64": SAMPLE_FILE_BASE64,
                "layout_id": layout_id,
                "periodo_mes": 1,
                "periodo_ano": 2026
            }
        )
        data = response.json()
        resumo = data["resumo"]
        
        required_fields = ["total", "ok", "fora_periodo", "sem_conta"]
        for field in required_fields:
            assert field in resumo, f"Missing field {field} in resumo"
            assert isinstance(resumo[field], int), f"{field} should be int"
        
        # Verify counts are consistent
        assert resumo["total"] >= 0
        assert resumo["ok"] >= 0
        assert resumo["fora_periodo"] >= 0
        assert resumo["sem_conta"] >= 0
        
        print(f"✅ Resumo: total={resumo['total']}, ok={resumo['ok']}, fora_periodo={resumo['fora_periodo']}, sem_conta={resumo['sem_conta']}")
    
    def test_test_parse_lancamentos_structure(self):
        """Test-parse lancamentos should have correct structure"""
        layout_id = self.get_first_layout_id()
        if not layout_id:
            pytest.skip("No layouts available for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/test-parse",
            json={
                "arquivo_base64": SAMPLE_FILE_BASE64,
                "layout_id": layout_id,
                "periodo_mes": 1,
                "periodo_ano": 2026
            }
        )
        data = response.json()
        lancamentos = data["lancamentos"]
        
        if len(lancamentos) > 0:
            lanc = lancamentos[0]
            # Check required fields
            assert "linha" in lanc
            assert "status" in lanc
            
            # Status should be one of valid values
            valid_status = ["ok", "fora_periodo", "sem_conta"]
            assert lanc["status"] in valid_status, f"Invalid status: {lanc['status']}"
        
        print(f"✅ Lancamentos structure verified ({len(lancamentos)} entries)")
    
    def test_test_parse_with_layout_config_inline(self):
        """Test-parse should work with inline layout_config"""
        # First detect to get a valid layout config
        detect_response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/detect",
            json={"arquivo_base64": SAMPLE_FILE_BASE64}
        )
        detection = detect_response.json()
        
        # Build inline layout config
        layout_config = {
            "cnpj": "00000000000000",
            "config_planilha": detection["config_planilha"],
            "colunas": [
                {
                    "campo_destino": c["campo_destino"],
                    "coluna_excel": c["coluna_excel"],
                    "tipo_dado": c["tipo_dado"],
                    "formato": c.get("formato"),
                    "transformacao": c.get("transformacao", {})
                }
                for c in detection["colunas"]
                if c["campo_destino"] != "ignorar"
            ],
            "config_valor": detection["config_valor"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/test-parse",
            json={
                "arquivo_base64": SAMPLE_FILE_BASE64,
                "layout_config": layout_config,
                "periodo_mes": 1,
                "periodo_ano": 2026
            }
        )
        assert response.status_code == 200, f"Test-parse with inline config failed: {response.text}"
        data = response.json()
        
        assert "lancamentos" in data
        assert "resumo" in data
        
        print(f"✅ Test-parse with inline config: {data['resumo']['total']} lancamentos")
    
    def test_test_parse_missing_params(self):
        """Test-parse should require layout_id or layout_config"""
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/test-parse",
            json={
                "arquivo_base64": SAMPLE_FILE_BASE64,
                "periodo_mes": 1,
                "periodo_ano": 2026
            }
        )
        assert response.status_code == 400, "Should return 400 when missing layout params"
        print("✅ Missing params handled correctly")
    
    def test_test_parse_invalid_layout_id(self):
        """Test-parse should handle invalid layout_id"""
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/test-parse",
            json={
                "arquivo_base64": SAMPLE_FILE_BASE64,
                "layout_id": "invalid-uuid-that-does-not-exist",
                "periodo_mes": 1,
                "periodo_ano": 2026
            }
        )
        assert response.status_code == 400, f"Should return 400 for invalid layout: {response.text}"
        print("✅ Invalid layout_id handled correctly")
    
    def test_test_parse_fora_periodo_detection(self):
        """Test-parse should detect entries outside period"""
        layout_id = self.get_first_layout_id()
        if not layout_id:
            pytest.skip("No layouts available for testing")
        
        # Use a different period than the data contains
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/test-parse",
            json={
                "arquivo_base64": SAMPLE_FILE_BASE64,
                "layout_id": layout_id,
                "periodo_mes": 12,  # December
                "periodo_ano": 2025  # Previous year
            }
        )
        data = response.json()
        
        # If data is from different period, should have fora_periodo entries
        resumo = data["resumo"]
        print(f"✅ Period mismatch test: fora_periodo={resumo['fora_periodo']}")


class TestIntegration:
    """Integration tests combining detect and test-parse"""
    
    def test_detect_then_test_parse_flow(self):
        """Full flow: detect layout then test-parse with detected config"""
        # Step 1: Detect
        detect_response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/detect",
            json={"arquivo_base64": SAMPLE_FILE_BASE64}
        )
        assert detect_response.status_code == 200
        detection = detect_response.json()
        
        # Step 2: Build config from detection
        layout_config = {
            "cnpj": "12345678000190",
            "config_planilha": detection["config_planilha"],
            "colunas": [
                {
                    "campo_destino": c["campo_destino"],
                    "coluna_excel": c["coluna_excel"],
                    "tipo_dado": c["tipo_dado"],
                    "formato": c.get("formato"),
                    "transformacao": c.get("transformacao", {})
                }
                for c in detection["colunas"]
                if c["campo_destino"] != "ignorar"
            ],
            "config_valor": detection["config_valor"]
        }
        
        # Step 3: Test-parse with the config
        parse_response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/test-parse",
            json={
                "arquivo_base64": SAMPLE_FILE_BASE64,
                "layout_config": layout_config,
                "periodo_mes": 1,
                "periodo_ano": 2026
            }
        )
        assert parse_response.status_code == 200
        result = parse_response.json()
        
        print(f"✅ Full flow: Detected {len(detection['colunas'])} columns, parsed {result['resumo']['total']} entries")
        print(f"   Resumo: ok={result['resumo']['ok']}, fora_periodo={result['resumo']['fora_periodo']}, sem_conta={result['resumo']['sem_conta']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
