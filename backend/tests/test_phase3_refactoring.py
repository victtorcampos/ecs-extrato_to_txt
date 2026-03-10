"""
Test Phase 3 Refactoring - FSD Completo + Robustez Backend
Tests:
  - B-08: No 'except Exception: pass' remaining (now all log)
  - B-09: TxtGenerator uses TxtConfig dataclass
  - API regression tests
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# B-08: Verify no silent exception handling in codebase
class TestExceptionHandling:
    """Verify 'except Exception: pass' replaced with logging"""
    
    def test_usecases_has_logging(self):
        """B-08a: usecases.py email exception logs instead of pass"""
        filepath = "/app/backend/src/application/usecases/usecases.py"
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Should have logger.warning for email failures
        assert "logger.warning" in content, "usecases.py should use logger.warning"
        assert 'Falha ao enviar email' in content, "Should log email failure message"
        # Should NOT have bare 'except Exception: pass'
        assert "except Exception:\n                pass" not in content

    def test_excel_parser_has_logging(self):
        """B-08b: excel_parser.py row parsing exception logs"""
        filepath = "/app/backend/src/adapters/outbound/excel_parser/excel_parser.py"
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Should have logger.warning for row parsing errors
        assert "logger.warning" in content, "excel_parser.py should use logger.warning"
        assert "Erro na linha" in content, "Should log row error message"

    def test_no_silent_exceptions_in_core_paths(self):
        """B-08c: No silent 'except Exception: pass' in main code paths"""
        import subprocess
        result = subprocess.run(
            ["grep", "-rn", "except Exception: pass", "/app/backend/src/application", "/app/backend/src/adapters"],
            capture_output=True, text=True
        )
        # Should not find any in application/adapters (core business logic)
        assert result.stdout == "", f"Found silent exceptions: {result.stdout}"


# B-09: Verify TxtConfig dataclass usage
class TestTxtConfigDataclass:
    """Verify TxtGenerator uses externalized TxtConfig"""
    
    def test_txtconfig_dataclass_exists(self):
        """B-09a: TxtConfig dataclass is defined"""
        filepath = "/app/backend/src/adapters/outbound/txt_generator/txt_generator.py"
        with open(filepath, 'r') as f:
            content = f.read()
        
        assert "@dataclass" in content, "Should have @dataclass decorator"
        assert "class TxtConfig:" in content, "TxtConfig class should be defined"
        assert "codigo_registro_marcador" in content, "Should have codigo_registro_marcador field"
        assert "codigo_registro_lancamento" in content, "Should have codigo_registro_lancamento field"
        assert "mapeamento_operacao" in content, "Should have mapeamento_operacao field"

    def test_txtgenerator_uses_config(self):
        """B-09b: TxtGenerator constructor accepts config"""
        filepath = "/app/backend/src/adapters/outbound/txt_generator/txt_generator.py"
        with open(filepath, 'r') as f:
            content = f.read()
        
        assert "def __init__(self, config: TxtConfig = None):" in content, "Should accept TxtConfig in __init__"
        assert "self.config = config or DEFAULT_TXT_CONFIG" in content, "Should use default config"

    def test_default_txtconfig_defined(self):
        """B-09c: DEFAULT_TXT_CONFIG constant exists"""
        filepath = "/app/backend/src/adapters/outbound/txt_generator/txt_generator.py"
        with open(filepath, 'r') as f:
            content = f.read()
        
        assert "DEFAULT_TXT_CONFIG = TxtConfig()" in content, "DEFAULT_TXT_CONFIG should be defined"


# API Regression Tests
class TestAPIRegression:
    """Regression tests for all main endpoints"""

    def test_health_endpoint(self):
        """API: GET /api/health returns healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    def test_lotes_estatisticas(self):
        """API: GET /api/v1/lotes/estatisticas"""
        response = requests.get(f"{BASE_URL}/api/v1/lotes/estatisticas")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "por_status" in data

    def test_import_layouts(self):
        """API: GET /api/v1/import-layouts returns layouts list"""
        response = requests.get(f"{BASE_URL}/api/v1/import-layouts")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        # Verify N+1 fix field exists
        if len(data["items"]) > 0:
            assert "total_regras" in data["items"][0], "Layouts should have total_regras field"

    def test_account_mappings(self):
        """API: GET /api/v1/account-mappings"""
        response = requests.get(f"{BASE_URL}/api/v1/account-mappings")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    def test_output_profiles(self):
        """API: GET /api/v1/output-profiles"""
        response = requests.get(f"{BASE_URL}/api/v1/output-profiles")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data


# FSD Barrel Exports Tests (file existence checks)
class TestFSDBarrelExports:
    """F-02: Verify FSD barrel exports exist and are importable"""

    def test_features_barrel_exports_exist(self):
        """F-02a: All feature barrel exports exist"""
        feature_dirs = [
            "dashboard", "layouts", "lotes", "mapeamentos", 
            "pendencias", "perfis-saida", "upload"
        ]
        for feature in feature_dirs:
            index_path = f"/app/frontend/src/features/{feature}/index.js"
            assert os.path.exists(index_path), f"Missing barrel: {index_path}"
            with open(index_path, 'r') as f:
                content = f.read()
            assert "export" in content, f"{index_path} should have exports"

    def test_shared_barrel_exports_exist(self):
        """F-02b: Shared barrel exports exist"""
        shared_dirs = ["api", "hooks"]
        for shared in shared_dirs:
            index_path = f"/app/frontend/src/shared/{shared}/index.js"
            assert os.path.exists(index_path), f"Missing barrel: {index_path}"
            with open(index_path, 'r') as f:
                content = f.read()
            assert "export" in content, f"{index_path} should have exports"

    def test_dashboard_barrel_content(self):
        """F-02c: Dashboard barrel exports Dashboard component"""
        filepath = "/app/frontend/src/features/dashboard/index.js"
        with open(filepath, 'r') as f:
            content = f.read()
        assert "Dashboard" in content
        assert "export" in content

    def test_layouts_barrel_content(self):
        """F-02d: Layouts barrel exports all 3 components"""
        filepath = "/app/frontend/src/features/layouts/index.js"
        with open(filepath, 'r') as f:
            content = f.read()
        assert "LayoutsList" in content
        assert "LayoutForm" in content
        assert "LayoutDetail" in content


# F-10: Lazy Loading Tests
class TestLazyLoading:
    """F-10: Verify lazy loading is configured in App.js"""

    def test_app_uses_lazy_imports(self):
        """F-10a: App.js uses React.lazy for page components"""
        filepath = "/app/frontend/src/App.js"
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Check lazy imports exist
        assert "lazy(() =>" in content, "Should use React.lazy"
        assert "Suspense" in content, "Should use Suspense"
        
        # Check specific lazy imports
        lazy_components = [
            "UploadForm", "LotesList", "LoteDetail", "PendenciasResolver",
            "MapeamentosList", "LayoutsList", "LayoutForm", "LayoutDetail", "PerfisSaidaList"
        ]
        for comp in lazy_components:
            assert f"const {comp} = lazy" in content, f"{comp} should be lazy loaded"

    def test_app_has_suspense_fallback(self):
        """F-10b: App.js Suspense has PageLoader fallback"""
        filepath = "/app/frontend/src/App.js"
        with open(filepath, 'r') as f:
            content = f.read()
        
        assert "PageLoader" in content, "Should have PageLoader component"
        assert "fallback={<PageLoader />}" in content, "Suspense should use PageLoader as fallback"
        assert "data-testid=\"page-loader\"" in content, "PageLoader should have data-testid"

    def test_dashboard_is_eager_loaded(self):
        """F-10c: Dashboard is NOT lazy loaded (stays eager)"""
        filepath = "/app/frontend/src/App.js"
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Dashboard should be regular import, not lazy
        assert "import { Layout } from './components/layout'" in content or "import Layout from" in content
        assert "import { Dashboard } from './components/dashboard'" in content or "import Dashboard from" in content
        assert "const Dashboard = lazy" not in content, "Dashboard should NOT be lazy loaded"


# Default Exports Tests
class TestDefaultExports:
    """Verify 4 components have default exports for lazy loading"""

    def test_layoutslist_has_default_export(self):
        """LayoutsList has default export"""
        filepath = "/app/frontend/src/components/layouts/LayoutsList.jsx"
        with open(filepath, 'r') as f:
            content = f.read()
        assert "export default LayoutsList" in content, "LayoutsList should have default export"

    def test_layoutform_has_default_export(self):
        """LayoutForm has default export"""
        filepath = "/app/frontend/src/components/layouts/LayoutForm.jsx"
        with open(filepath, 'r') as f:
            content = f.read()
        assert "export default LayoutForm" in content, "LayoutForm should have default export"

    def test_layoutdetail_has_default_export(self):
        """LayoutDetail has default export"""
        filepath = "/app/frontend/src/components/layouts/LayoutDetail.jsx"
        with open(filepath, 'r') as f:
            content = f.read()
        assert "export default LayoutDetail" in content, "LayoutDetail should have default export"

    def test_perfissaidalist_has_default_export(self):
        """PerfisSaidaList has default export"""
        filepath = "/app/frontend/src/components/perfis-saida/PerfisSaidaList.jsx"
        with open(filepath, 'r') as f:
            content = f.read()
        assert "export default PerfisSaidaList" in content, "PerfisSaidaList should have default export"
