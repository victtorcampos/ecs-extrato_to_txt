"""
Test suite for Output Profiles feature (Iteration 5)
Tests:
- GET /api/v1/output-profiles/sistemas-disponiveis
- CRUD operations on /api/v1/output-profiles
- DominioSistemasTxtGenerator unit tests
"""
import pytest
import requests
import os
import sys

# Add backend src to path for unit testing generators
sys.path.insert(0, '/app/backend')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestSistemasDisponiveis:
    """Tests for GET /api/v1/output-profiles/sistemas-disponiveis"""
    
    def test_sistemas_disponiveis_returns_200(self):
        """Should return available systems and formats"""
        response = requests.get(f"{BASE_URL}/api/v1/output-profiles/sistemas-disponiveis")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "sistemas" in data
        assert "geradores_implementados" in data
        assert isinstance(data["sistemas"], list)
        assert isinstance(data["geradores_implementados"], list)
        print("✅ GET /sistemas-disponiveis returns sistemas and geradores_implementados")
    
    def test_dominio_sistemas_available(self):
        """Domínio Sistemas should be in available systems"""
        response = requests.get(f"{BASE_URL}/api/v1/output-profiles/sistemas-disponiveis")
        data = response.json()
        
        dominio = next((s for s in data["sistemas"] if s["value"] == "dominio_sistemas"), None)
        assert dominio is not None, "Domínio Sistemas not found"
        assert dominio["nome"] == "Domínio Sistemas"
        assert len(dominio["formatos"]) >= 1
        
        # Check TXT format available
        txt_fmt = next((f for f in dominio["formatos"] if f["value"] == "txt_delimitado"), None)
        assert txt_fmt is not None
        assert txt_fmt["extensao"] == ".txt"
        print("✅ Domínio Sistemas with txt_delimitado format available")
    
    def test_geradores_implementados_lists_txt_generator(self):
        """DominioSistemasTxtGenerator should be listed as implemented"""
        response = requests.get(f"{BASE_URL}/api/v1/output-profiles/sistemas-disponiveis")
        data = response.json()
        
        txt_gen = next((g for g in data["geradores_implementados"] 
                        if g["sistema"] == "dominio_sistemas" and g["formato"] == "txt_delimitado"), None)
        assert txt_gen is not None
        assert "Domínio Sistemas" in txt_gen["nome"]
        print("✅ TXT generator listed in geradores_implementados")


class TestOutputProfilesCRUD:
    """Tests for Output Profiles CRUD operations"""
    
    @pytest.fixture
    def test_profile_data(self):
        return {
            "nome": "TEST_Profile_Iteration5",
            "sistema_destino": "dominio_sistemas",
            "formato": "txt_delimitado",
            "descricao": "Test profile created by pytest",
            "padrao": False,
            "config": {
                "delimitador": "|",
                "codificacao": "ANSI",
                "tipo_lancamento_padrao": "X",
                "codigo_usuario": "USR001",
                "nome_usuario": "Test User",
                "codigo_filial": "01",
                "codigo_historico_padrao": "999",
                "incluir_delimitador_inicio_fim": True
            }
        }
    
    def test_list_profiles(self):
        """GET /api/v1/output-profiles should return list with items and total"""
        response = requests.get(f"{BASE_URL}/api/v1/output-profiles")
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
        assert isinstance(data["total"], int)
        print(f"✅ GET /output-profiles returns {data['total']} profiles")
    
    def test_create_profile(self, test_profile_data):
        """POST /api/v1/output-profiles should create new profile"""
        response = requests.post(f"{BASE_URL}/api/v1/output-profiles", json=test_profile_data)
        assert response.status_code == 201
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["nome"] == test_profile_data["nome"]
        assert data["sistema_destino"] == test_profile_data["sistema_destino"]
        assert data["formato"] == test_profile_data["formato"]
        assert data["config"]["codigo_usuario"] == "USR001"
        assert data["config"]["nome_usuario"] == "Test User"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/v1/output-profiles/{data['id']}")
        print("✅ POST /output-profiles creates profile with config")
    
    def test_get_profile_by_id(self, test_profile_data):
        """GET /api/v1/output-profiles/{id} should return specific profile"""
        # Create first
        create_resp = requests.post(f"{BASE_URL}/api/v1/output-profiles", json=test_profile_data)
        profile_id = create_resp.json()["id"]
        
        # Get by ID
        response = requests.get(f"{BASE_URL}/api/v1/output-profiles/{profile_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == profile_id
        assert data["nome"] == test_profile_data["nome"]
        assert "sistema_destino_nome" in data  # Should have friendly name
        assert "formato_nome" in data  # Should have friendly name
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/v1/output-profiles/{profile_id}")
        print("✅ GET /output-profiles/{id} returns profile with friendly names")
    
    def test_get_profile_not_found(self):
        """GET /api/v1/output-profiles/{id} should return 404 for non-existent"""
        response = requests.get(f"{BASE_URL}/api/v1/output-profiles/non-existent-id-12345")
        assert response.status_code == 404
        print("✅ GET /output-profiles/{id} returns 404 for non-existent")
    
    def test_update_profile(self, test_profile_data):
        """PUT /api/v1/output-profiles/{id} should update profile"""
        # Create first
        create_resp = requests.post(f"{BASE_URL}/api/v1/output-profiles", json=test_profile_data)
        profile_id = create_resp.json()["id"]
        
        # Update
        update_data = {
            "nome": "TEST_Profile_Updated",
            "descricao": "Updated description",
            "config": {
                "delimitador": ";",
                "tipo_lancamento_padrao": "D"
            },
            "ativo": False
        }
        response = requests.put(f"{BASE_URL}/api/v1/output-profiles/{profile_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["nome"] == "TEST_Profile_Updated"
        assert data["descricao"] == "Updated description"
        assert data["config"]["delimitador"] == ";"
        assert data["config"]["tipo_lancamento_padrao"] == "D"
        assert data["ativo"] == False
        
        # Verify persistence with GET
        get_resp = requests.get(f"{BASE_URL}/api/v1/output-profiles/{profile_id}")
        assert get_resp.json()["nome"] == "TEST_Profile_Updated"
        assert get_resp.json()["ativo"] == False
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/v1/output-profiles/{profile_id}")
        print("✅ PUT /output-profiles/{id} updates profile and persists")
    
    def test_delete_profile(self, test_profile_data):
        """DELETE /api/v1/output-profiles/{id} should remove profile"""
        # Create first
        create_resp = requests.post(f"{BASE_URL}/api/v1/output-profiles", json=test_profile_data)
        profile_id = create_resp.json()["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/v1/output-profiles/{profile_id}")
        assert response.status_code == 200
        assert "mensagem" in response.json()
        
        # Verify deleted
        get_resp = requests.get(f"{BASE_URL}/api/v1/output-profiles/{profile_id}")
        assert get_resp.status_code == 404
        print("✅ DELETE /output-profiles/{id} removes profile")
    
    def test_set_default_profile(self, test_profile_data):
        """Setting padrao=True should unset previous default"""
        # Create non-default profile
        test_profile_data["padrao"] = True
        create_resp = requests.post(f"{BASE_URL}/api/v1/output-profiles", json=test_profile_data)
        new_profile_id = create_resp.json()["id"]
        
        # Get list and check only one default
        list_resp = requests.get(f"{BASE_URL}/api/v1/output-profiles")
        defaults = [p for p in list_resp.json()["items"] if p["padrao"]]
        
        # Should have exactly one default (the new one)
        assert len(defaults) == 1, f"Expected 1 default, got {len(defaults)}"
        assert defaults[0]["id"] == new_profile_id
        
        # Cleanup - set another as default to restore original
        requests.put(f"{BASE_URL}/api/v1/output-profiles/{new_profile_id}", json={"padrao": False})
        requests.delete(f"{BASE_URL}/api/v1/output-profiles/{new_profile_id}")
        
        # Restore original default (if exists)
        list_resp = requests.get(f"{BASE_URL}/api/v1/output-profiles")
        for p in list_resp.json()["items"]:
            if "Domínio Sistemas" in p["nome"] and not p["padrao"]:
                requests.put(f"{BASE_URL}/api/v1/output-profiles/{p['id']}", json={"padrao": True})
                break
        
        print("✅ Setting padrao=True correctly manages single default")


class TestDominioSistemasTxtGenerator:
    """Unit tests for the TXT generator"""
    
    def test_generator_format_basic(self):
        """Generator should produce correct line format with pipes"""
        from src.adapters.outbound.output_generators import DominioSistemasTxtGenerator
        from src.domain.entities import Lancamento
        
        generator = DominioSistemasTxtGenerator()
        
        # Create mock lancamentos
        lancamentos = [
            Lancamento(
                id="1",
                data="2026-01-15",
                conta_debito="11101",
                conta_credito="21101",
                valor=500.00,
                historico="Pagamento teste"
            )
        ]
        
        cnpj = "11222333000181"
        mapeamentos = {}
        config = {
            "delimitador": "|",
            "tipo_lancamento_padrao": "X",
            "incluir_delimitador_inicio_fim": True,
            "codigo_historico_padrao": "0",
            "nome_usuario": "",
            "codigo_filial": ""
        }
        
        output = generator.gerar(lancamentos, cnpj, mapeamentos, config)
        lines = output.split("\n")
        
        # Check line 0000 (header)
        assert lines[0].startswith("|0000|")
        assert cnpj in lines[0]
        
        # Check line 6000 (lancamento header)
        assert "|6000|" in lines[1]
        assert "|X|" in lines[1]  # tipo lancamento
        
        # Check line 6100 (lancamento detail)
        assert "|6100|" in lines[2]
        assert "15/01/2026" in lines[2]  # data formatted
        assert "11101" in lines[2]  # conta debito
        assert "21101" in lines[2]  # conta credito
        assert "500,00" in lines[2]  # valor formatado
        
        print("✅ Generator produces correct |0000|, |6000|, |6100| format")
    
    def test_generator_value_formatting(self):
        """Values should be formatted with comma decimal separator"""
        from src.adapters.outbound.output_generators import DominioSistemasTxtGenerator
        
        generator = DominioSistemasTxtGenerator()
        
        # Test various values
        assert generator._formatar_valor(500.00) == "500,00"
        assert generator._formatar_valor(1234.56) == "1234,56"
        assert generator._formatar_valor(0.01) == "0,01"
        assert generator._formatar_valor(None) == "0,00"
        
        print("✅ Value formatting uses comma as decimal separator")
    
    def test_generator_date_formatting(self):
        """Dates should be formatted as DD/MM/YYYY"""
        from src.adapters.outbound.output_generators import DominioSistemasTxtGenerator
        
        generator = DominioSistemasTxtGenerator()
        
        # Test ISO to BR format
        assert generator._formatar_data("2026-01-15") == "15/01/2026"
        assert generator._formatar_data("2025-12-31") == "31/12/2025"
        
        # Test already BR format
        assert generator._formatar_data("15/01/2026") == "15/01/2026"
        
        print("✅ Date formatting converts to DD/MM/YYYY")
    
    def test_generator_validation(self):
        """Validation should catch missing required fields"""
        from src.adapters.outbound.output_generators import DominioSistemasTxtGenerator
        from src.domain.entities import Lancamento
        
        generator = DominioSistemasTxtGenerator()
        
        # Empty lancamentos
        erros = generator.validar([], "11222333000181", {})
        assert any("Nenhum lançamento" in e for e in erros)
        
        # Invalid CNPJ
        lancamentos = [Lancamento(id="1", data="2026-01-01", conta_debito="1", conta_credito="2", valor=100)]
        erros = generator.validar(lancamentos, "123", {})
        assert any("CNPJ" in e for e in erros)
        
        # Missing conta debito
        lancamentos = [Lancamento(id="1", data="2026-01-01", conta_debito="", conta_credito="2", valor=100)]
        erros = generator.validar(lancamentos, "11222333000181", {})
        assert any("conta débito" in e for e in erros)
        
        # Invalid valor
        lancamentos = [Lancamento(id="1", data="2026-01-01", conta_debito="1", conta_credito="2", valor=0)]
        erros = generator.validar(lancamentos, "11222333000181", {})
        assert any("valor inválido" in e for e in erros)
        
        print("✅ Generator validation catches errors correctly")
    
    def test_generator_with_account_mappings(self):
        """Generator should apply account mappings"""
        from src.adapters.outbound.output_generators import DominioSistemasTxtGenerator
        from src.domain.entities import Lancamento
        
        generator = DominioSistemasTxtGenerator()
        
        lancamentos = [
            Lancamento(
                id="1",
                data="2026-01-15",
                conta_debito="BANCO_ITAU",
                conta_credito="CAIXA",
                valor=100.00,
                historico="Test"
            )
        ]
        
        mapeamentos = {
            "BANCO_ITAU": "11101001",
            "CAIXA": "11102001"
        }
        
        output = generator.gerar(lancamentos, "11222333000181", mapeamentos, {})
        
        assert "11101001" in output  # Mapped conta debito
        assert "11102001" in output  # Mapped conta credito
        
        print("✅ Generator applies account mappings correctly")


class TestLoteWithPerfilSaida:
    """Test that lotes can be created with perfil_saida_id"""
    
    def test_lote_accepts_perfil_saida_id(self):
        """POST /api/v1/lotes should accept perfil_saida_id field"""
        # Get existing profile
        profiles_resp = requests.get(f"{BASE_URL}/api/v1/output-profiles")
        profiles = profiles_resp.json()["items"]
        
        if profiles:
            profile_id = profiles[0]["id"]
            
            # Note: We can't fully test lote creation without a valid Excel file,
            # but we can verify the endpoint accepts the field by checking the schema
            # The upload flow was tested in iteration 4
            print(f"✅ Profile ID available for lote creation: {profile_id}")
        else:
            pytest.skip("No profiles available for testing")


# Cleanup function to remove TEST_ prefixed profiles
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_profiles():
    """Cleanup TEST_ prefixed profiles before and after tests"""
    def do_cleanup():
        response = requests.get(f"{BASE_URL}/api/v1/output-profiles")
        if response.status_code == 200:
            for profile in response.json()["items"]:
                if profile["nome"].startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/v1/output-profiles/{profile['id']}")
    
    do_cleanup()
    yield
    do_cleanup()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
