"""
Phase 5 Final Tests - OFXParserPort, ProcessarLoteUseCase with perfil_saida_repository, DI updates
"""
import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestHealthAndRegression:
    """Regression tests for basic endpoints"""

    def test_health_endpoint(self):
        """GET /api/health - Returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ GET /api/health - Returns healthy status")

    def test_import_layouts_endpoint(self):
        """GET /api/v1/import-layouts - Returns layouts list"""
        response = requests.get(f"{BASE_URL}/api/v1/import-layouts")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        print(f"✅ GET /api/v1/import-layouts - Returns {len(data['items'])} layouts")

    def test_lotes_estatisticas_endpoint(self):
        """GET /api/v1/lotes/estatisticas - Returns statistics"""
        response = requests.get(f"{BASE_URL}/api/v1/lotes/estatisticas")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "por_status" in data
        print(f"✅ GET /api/v1/lotes/estatisticas - Total: {data['total']}")


class TestOutputProfiles:
    """Test output profiles endpoint returns padrao flag"""

    def test_get_output_profiles(self):
        """GET /api/v1/output-profiles - Returns profiles with padrao flag"""
        response = requests.get(f"{BASE_URL}/api/v1/output-profiles")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) >= 1
        
        # Check padrao flag exists and at least one is padrao
        padrao_profiles = [p for p in data["items"] if p.get("padrao")]
        assert len(padrao_profiles) >= 1, "At least one profile should be marked as padrao"
        
        # Verify structure
        for profile in data["items"]:
            assert "id" in profile
            assert "nome" in profile
            assert "padrao" in profile
            assert "ativo" in profile
            assert "sistema_destino" in profile
            assert "formato" in profile
        
        print(f"✅ GET /api/v1/output-profiles - Returns {len(data['items'])} profiles, {len(padrao_profiles)} marked as padrao")
        return data["items"]


class TestDetectAndTestParse:
    """Test detect and test-parse endpoints (regression)"""

    @pytest.fixture
    def sample_file_base64(self):
        """Load sample file as base64"""
        sample_path = "/app/sample_input.xls"
        if os.path.exists(sample_path):
            with open(sample_path, "rb") as f:
                return base64.b64encode(f.read()).decode("utf-8")
        pytest.skip("Sample file not found")

    def test_detect_endpoint(self, sample_file_base64):
        """POST /api/v1/import-layouts/detect - Auto-detection works"""
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/detect",
            json={"arquivo_base64": sample_file_base64}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "config_planilha" in data
        assert "colunas" in data
        assert "config_valor" in data
        assert "templates_regras" in data
        assert "preview_dados" in data
        
        assert len(data["colunas"]) > 0
        print(f"✅ POST /api/v1/import-layouts/detect - Detected {len(data['colunas'])} columns")
        return data

    def test_test_parse_with_layout_id(self, sample_file_base64):
        """POST /api/v1/import-layouts/test-parse - Works with existing layout_id"""
        # Get existing layout
        layouts_response = requests.get(f"{BASE_URL}/api/v1/import-layouts")
        layouts = layouts_response.json().get("items", [])
        if not layouts:
            pytest.skip("No layouts available")
        
        layout_id = layouts[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/test-parse",
            json={
                "arquivo_base64": sample_file_base64,
                "layout_id": layout_id,
                "periodo_mes": 1,
                "periodo_ano": 2026
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "lancamentos" in data
        assert "resumo" in data
        print(f"✅ POST /api/v1/import-layouts/test-parse - Parsed {len(data['lancamentos'])} lancamentos")


class TestCreateLoteWithPerfilSaida:
    """Test creating lote with perfil_saida_id"""

    @pytest.fixture
    def sample_file_base64(self):
        """Load sample file as base64"""
        sample_path = "/app/sample_input.xls"
        if os.path.exists(sample_path):
            with open(sample_path, "rb") as f:
                return base64.b64encode(f.read()).decode("utf-8")
        pytest.skip("Sample file not found")

    @pytest.fixture
    def layout_id(self):
        """Get existing layout ID"""
        response = requests.get(f"{BASE_URL}/api/v1/import-layouts")
        layouts = response.json().get("items", [])
        if not layouts:
            pytest.skip("No layouts available")
        return layouts[0]["id"]

    @pytest.fixture
    def perfil_saida_id(self):
        """Get default perfil saida ID"""
        response = requests.get(f"{BASE_URL}/api/v1/output-profiles")
        profiles = response.json().get("items", [])
        padrao = [p for p in profiles if p.get("padrao")]
        if padrao:
            return padrao[0]["id"]
        if profiles:
            return profiles[0]["id"]
        pytest.skip("No output profiles available")

    def test_create_lote_with_perfil_saida_id(self, sample_file_base64, layout_id, perfil_saida_id):
        """POST /api/v1/lotes - Creates lote with perfil_saida_id"""
        response = requests.post(
            f"{BASE_URL}/api/v1/lotes",
            json={
                "cnpj": "18974278000125",
                "periodo_mes": 1,
                "periodo_ano": 2026,
                "email_notificacao": "",
                "arquivo_base64": sample_file_base64,
                "nome_arquivo": "test_phase5.xls",
                "layout_id": layout_id,
                "nome_layout": "Test Layout",
                "perfil_saida_id": perfil_saida_id
            }
        )
        assert response.status_code in [200, 201]
        data = response.json()
        
        # Verify lote was created with perfil_saida_id
        assert "id" in data
        assert "protocolo" in data
        assert data["perfil_saida_id"] == perfil_saida_id
        
        lote_id = data["id"]
        print(f"✅ POST /api/v1/lotes - Created lote {data['protocolo']} with perfil_saida_id={perfil_saida_id}")
        
        # Verify GET returns perfil_saida_id
        get_response = requests.get(f"{BASE_URL}/api/v1/lotes/{lote_id}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["perfil_saida_id"] == perfil_saida_id
        print(f"✅ GET /api/v1/lotes/{lote_id} - Confirms perfil_saida_id persisted")
        
        return lote_id

    def test_create_lote_without_perfil_saida_id(self, sample_file_base64, layout_id):
        """POST /api/v1/lotes - Creates lote without perfil_saida_id (null)"""
        response = requests.post(
            f"{BASE_URL}/api/v1/lotes",
            json={
                "cnpj": "18974278000125",
                "periodo_mes": 2,
                "periodo_ano": 2026,
                "email_notificacao": "",
                "arquivo_base64": sample_file_base64,
                "nome_arquivo": "test_no_perfil.xls",
                "layout_id": layout_id,
                "nome_layout": "Test Layout No Perfil"
            }
        )
        assert response.status_code in [200, 201]
        data = response.json()
        
        # Verify lote was created without perfil_saida_id
        assert "id" in data
        assert data.get("perfil_saida_id") is None
        print(f"✅ POST /api/v1/lotes - Created lote without perfil_saida_id (null)")


class TestOFXParserPortContract:
    """Test that OFXParserPort contract exists"""

    def test_ofx_parser_port_file_exists(self):
        """Verify OFXParserPort file exists at expected path"""
        port_path = "/app/backend/src/application/ports/services/ofx_parser_port.py"
        assert os.path.exists(port_path), f"OFXParserPort not found at {port_path}"
        print(f"✅ OFXParserPort contract exists at {port_path}")

    def test_ofx_parser_port_imports(self):
        """Verify OFXParserPort can be imported"""
        import sys
        sys.path.insert(0, "/app/backend")
        
        from src.application.ports.services.ofx_parser_port import (
            OFXParserPort,
            TransacaoOFX,
            ExtratoOFX
        )
        
        # Verify classes exist
        assert OFXParserPort is not None
        assert TransacaoOFX is not None
        assert ExtratoOFX is not None
        
        # Verify OFXParserPort is abstract
        import inspect
        assert inspect.isabstract(OFXParserPort)
        
        print("✅ OFXParserPort, TransacaoOFX, ExtratoOFX can be imported and are properly defined")


class TestDependencyInjection:
    """Test that DI factory includes perfil_saida_repository"""

    def test_dependencies_module_structure(self):
        """Verify dependencies.py has required providers"""
        import sys
        sys.path.insert(0, "/app/backend")
        
        from src.config.dependencies import (
            get_perfil_saida_repository,
            create_processar_lote_dependencies
        )
        
        # Verify functions exist
        assert callable(get_perfil_saida_repository)
        assert callable(create_processar_lote_dependencies)
        print("✅ DI module has get_perfil_saida_repository and create_processar_lote_dependencies")

    def test_processar_lote_usecase_signature(self):
        """Verify ProcessarLoteUseCase accepts perfil_saida_repository"""
        import sys
        sys.path.insert(0, "/app/backend")
        
        from src.application.usecases import ProcessarLoteUseCase
        import inspect
        
        sig = inspect.signature(ProcessarLoteUseCase.__init__)
        params = list(sig.parameters.keys())
        
        assert "perfil_saida_repository" in params
        print(f"✅ ProcessarLoteUseCase.__init__ accepts perfil_saida_repository parameter")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
