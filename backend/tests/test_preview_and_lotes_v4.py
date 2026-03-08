"""
Backend tests for Iteration 4 features:
- POST /api/v1/import-layouts/preview-excel - Excel preview endpoint
- POST /api/v1/lotes with layout_id field
- GET /api/v1/lotes - Verify listing works after layout_id migration
- GET /api/v1/lotes/estatisticas - Statistics endpoint
"""
import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Read the sample Excel file and convert to base64
SAMPLE_EXCEL_PATH = '/app/sample_input.xls'

def get_excel_base64():
    """Read sample Excel file and return base64 string"""
    with open(SAMPLE_EXCEL_PATH, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')


class TestPreviewExcelEndpoint:
    """Tests for POST /api/v1/import-layouts/preview-excel endpoint"""
    
    def test_preview_excel_default_config(self):
        """Test preview-excel with default config"""
        excel_b64 = get_excel_base64()
        
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/preview-excel",
            json={
                "arquivo_base64": excel_b64
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "abas" in data, "Response should have 'abas'"
        assert "aba_selecionada" in data, "Response should have 'aba_selecionada'"
        assert "cabecalhos" in data, "Response should have 'cabecalhos'"
        assert "linhas" in data, "Response should have 'linhas'"
        assert "total_linhas" in data, "Response should have 'total_linhas'"
        assert "total_colunas" in data, "Response should have 'total_colunas'"
        
        # Verify data types
        assert isinstance(data["abas"], list), "abas should be a list"
        assert isinstance(data["cabecalhos"], list), "cabecalhos should be a list"
        assert isinstance(data["linhas"], list), "linhas should be a list"
        assert len(data["abas"]) > 0, "Should have at least one sheet"
        
        print(f"✅ Preview Excel default config: {len(data['cabecalhos'])} columns, {data['total_linhas']} rows")
        print(f"   Sheets: {data['abas']}")
        print(f"   Headers (first 5): {data['cabecalhos'][:5]}")
    
    def test_preview_excel_custom_config(self):
        """Test preview-excel with custom config (linha_cabecalho=0, linha_inicio_dados=1, max_linhas=3)"""
        excel_b64 = get_excel_base64()
        
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/preview-excel",
            json={
                "arquivo_base64": excel_b64,
                "linha_cabecalho": 0,
                "linha_inicio_dados": 1,
                "max_linhas": 3
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # With max_linhas=3, should have at most 3 preview rows
        assert len(data["linhas"]) <= 3, f"Expected max 3 rows, got {len(data['linhas'])}"
        
        print(f"✅ Preview Excel custom config: max_linhas=3 returned {len(data['linhas'])} rows")
    
    def test_preview_excel_select_sheet_by_name(self):
        """Test preview-excel selecting a specific sheet by name"""
        excel_b64 = get_excel_base64()
        
        # First get the sheet names
        response1 = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/preview-excel",
            json={"arquivo_base64": excel_b64}
        )
        assert response1.status_code == 200
        sheet_names = response1.json()["abas"]
        
        if len(sheet_names) > 0:
            sheet_name = sheet_names[0]  # Select first sheet by name
            
            response2 = requests.post(
                f"{BASE_URL}/api/v1/import-layouts/preview-excel",
                json={
                    "arquivo_base64": excel_b64,
                    "nome_aba": sheet_name
                }
            )
            
            assert response2.status_code == 200
            data = response2.json()
            assert data["aba_selecionada"] == sheet_name, f"Expected sheet '{sheet_name}', got '{data['aba_selecionada']}'"
            
            print(f"✅ Preview Excel sheet selection: selected '{sheet_name}'")
    
    def test_preview_excel_invalid_base64(self):
        """Test preview-excel with invalid base64"""
        response = requests.post(
            f"{BASE_URL}/api/v1/import-layouts/preview-excel",
            json={
                "arquivo_base64": "not_valid_base64!!!"
            }
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid base64, got {response.status_code}"
        print(f"✅ Preview Excel invalid base64 returns 400")


class TestLotesWithLayoutId:
    """Tests for Lotes with layout_id field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_cnpj = "11222333000181"
        self.test_email = "test@example.com"
    
    def test_lotes_estatisticas_endpoint(self):
        """Test GET /api/v1/lotes/estatisticas works"""
        response = requests.get(f"{BASE_URL}/api/v1/lotes/estatisticas")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total" in data, "Response should have 'total'"
        assert "por_status" in data, "Response should have 'por_status'"
        assert isinstance(data["total"], int), "total should be an integer"
        assert isinstance(data["por_status"], dict), "por_status should be a dict"
        
        print(f"✅ Lotes estatisticas: total={data['total']}, por_status={data['por_status']}")
    
    def test_listar_lotes_works(self):
        """Test GET /api/v1/lotes works after layout_id migration"""
        response = requests.get(f"{BASE_URL}/api/v1/lotes")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        # If there are existing lotes, verify they have layout_id field
        if len(data) > 0:
            lote = data[0]
            # layout_id can be null, but the field should exist in response
            assert "layout_id" in lote, "Lote response should have 'layout_id' field"
            print(f"✅ Lotes listing works: {len(data)} lotes found, layout_id field present")
        else:
            print(f"✅ Lotes listing works: empty list returned (no lotes)")
    
    def test_criar_lote_with_null_layout_id(self):
        """Test POST /api/v1/lotes with layout_id=null"""
        excel_b64 = get_excel_base64()
        
        payload = {
            "cnpj": self.test_cnpj,
            "periodo_mes": 1,
            "periodo_ano": 2026,
            "email_notificacao": self.test_email,
            "arquivo_base64": excel_b64,
            "nome_arquivo": "test_file.xls",
            "codigo_matriz_filial": "",
            "nome_layout": "padrao",
            "layout_id": None
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/lotes", json=payload)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Response should have 'id'"
        assert "protocolo" in data, "Response should have 'protocolo'"
        assert "layout_id" in data, "Response should have 'layout_id'"
        assert data["layout_id"] is None, f"layout_id should be null, got {data['layout_id']}"
        
        lote_id = data["id"]
        protocolo = data["protocolo"]
        print(f"✅ Criar lote with null layout_id: protocolo={protocolo}")
        
        # Cleanup: delete the test lote
        del_response = requests.delete(f"{BASE_URL}/api/v1/lotes/{lote_id}")
        print(f"   Cleanup: deleted lote {lote_id} (status={del_response.status_code})")
    
    def test_criar_lote_with_valid_layout_id(self):
        """Test POST /api/v1/lotes with a valid layout_id"""
        # First create a layout
        layout_payload = {
            "cnpj": self.test_cnpj,
            "nome": "TEST_Layout_For_Lote",
            "config_planilha": {
                "nome_aba": None,
                "linha_cabecalho": 0,
                "linha_inicio_dados": 1
            },
            "colunas": [
                {"campo_destino": "data", "coluna_excel": "0", "tipo_dado": "date"}
            ]
        }
        
        layout_response = requests.post(f"{BASE_URL}/api/v1/import-layouts", json=layout_payload)
        assert layout_response.status_code == 201, f"Failed to create layout: {layout_response.text}"
        layout_id = layout_response.json()["id"]
        
        try:
            # Now create lote with this layout_id
            excel_b64 = get_excel_base64()
            lote_payload = {
                "cnpj": self.test_cnpj,
                "periodo_mes": 1,
                "periodo_ano": 2026,
                "email_notificacao": self.test_email,
                "arquivo_base64": excel_b64,
                "nome_arquivo": "test_file.xls",
                "codigo_matriz_filial": "",
                "nome_layout": "padrao",
                "layout_id": layout_id
            }
            
            response = requests.post(f"{BASE_URL}/api/v1/lotes", json=lote_payload)
            
            assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
            data = response.json()
            
            assert data["layout_id"] == layout_id, f"Expected layout_id={layout_id}, got {data['layout_id']}"
            
            lote_id = data["id"]
            print(f"✅ Criar lote with valid layout_id: protocolo={data['protocolo']}, layout_id={layout_id}")
            
            # Cleanup lote
            requests.delete(f"{BASE_URL}/api/v1/lotes/{lote_id}")
        finally:
            # Cleanup layout
            requests.delete(f"{BASE_URL}/api/v1/import-layouts/{layout_id}")
    
    def test_obter_lote_includes_layout_id(self):
        """Test GET /api/v1/lotes/{id} includes layout_id field"""
        # Create a test lote
        excel_b64 = get_excel_base64()
        
        payload = {
            "cnpj": self.test_cnpj,
            "periodo_mes": 2,
            "periodo_ano": 2026,
            "email_notificacao": self.test_email,
            "arquivo_base64": excel_b64,
            "nome_arquivo": "test_obter.xls",
            "codigo_matriz_filial": "",
            "nome_layout": "padrao",
            "layout_id": None
        }
        
        create_response = requests.post(f"{BASE_URL}/api/v1/lotes", json=payload)
        assert create_response.status_code == 201, f"Failed to create lote: {create_response.text}"
        
        lote_id = create_response.json()["id"]
        
        try:
            # Get the lote
            get_response = requests.get(f"{BASE_URL}/api/v1/lotes/{lote_id}")
            
            assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}: {get_response.text}"
            data = get_response.json()
            
            assert "layout_id" in data, "GET lote response should have 'layout_id'"
            print(f"✅ GET lote includes layout_id field")
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/v1/lotes/{lote_id}")


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print(f"✅ Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
