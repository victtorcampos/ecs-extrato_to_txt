#!/usr/bin/env python3
"""
Backend API Tests for Accounting Batch Processing System
Tests all endpoints using the public URL for production-ready testing
"""

import requests
import json
import base64
import sys
from datetime import datetime
from typing import Dict, Any

class AccountingBackendTester:
    def __init__(self):
        self.base_url = "https://contabil-backend.preview.emergentagent.com"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
        
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "details": details
        })

    def test_health_check(self):
        """Test /api/health endpoint"""
        try:
            response = requests.get(f"{self.base_url}/api/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy" and "service" in data:
                    self.log_test("Health Check", True, f"Service: {data.get('service')}")
                    return True
                else:
                    self.log_test("Health Check", False, f"Unexpected response: {data}")
            else:
                self.log_test("Health Check", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
        return False

    def test_lotes_list_empty(self):
        """Test /api/v1/lotes returns empty list initially"""
        try:
            response = requests.get(f"{self.base_url}/api/v1/lotes", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Lotes List (Empty)", True, f"Returned {len(data)} lotes")
                    return True, data
                else:
                    self.log_test("Lotes List (Empty)", False, f"Expected list, got: {type(data)}")
            else:
                self.log_test("Lotes List (Empty)", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Lotes List (Empty)", False, f"Exception: {str(e)}")
        return False, []

    def test_estatisticas(self):
        """Test /api/v1/lotes/estatisticas endpoint"""
        try:
            response = requests.get(f"{self.base_url}/api/v1/lotes/estatisticas", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["total", "por_status"]
                if all(field in data for field in required_fields):
                    self.log_test("Lotes Statistics", True, f"Total: {data.get('total', 0)}")
                    return True, data
                else:
                    self.log_test("Lotes Statistics", False, f"Missing fields in: {data}")
            else:
                self.log_test("Lotes Statistics", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Lotes Statistics", False, f"Exception: {str(e)}")
        return False, {}

    def create_sample_excel_base64(self):
        """Create a simple Excel file as base64 for testing"""
        # Simple CSV-like content that would be in an Excel file
        excel_content = "data:application/vnd.ms-excel;base64,UEsDBBQAAAAIAA=="
        # This is a minimal base64 representation - in real testing we'd use actual Excel
        return excel_content.split(',')[1] if ',' in excel_content else excel_content

    def test_create_lote(self):
        """Test creating a new lote via POST /api/v1/lotes"""
        try:
            # Create test payload
            payload = {
                "cnpj": "12345678000195",
                "periodo_mes": 12,
                "periodo_ano": 2024,
                "email_notificacao": "test@example.com",
                "arquivo_base64": self.create_sample_excel_base64(),
                "nome_arquivo": "test_lancamentos.xlsx",
                "codigo_matriz_filial": "001",
                "nome_layout": "padrao"
            }
            
            headers = {"Content-Type": "application/json"}
            response = requests.post(
                f"{self.base_url}/api/v1/lotes", 
                json=payload, 
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 201:
                data = response.json()
                required_fields = ["id", "protocolo", "cnpj", "status"]
                if all(field in data for field in required_fields):
                    self.log_test("Create Lote", True, f"Protocolo: {data.get('protocolo')}")
                    return True, data
                else:
                    self.log_test("Create Lote", False, f"Missing fields: {data}")
            else:
                error_msg = ""
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', response.text)
                except:
                    error_msg = response.text
                self.log_test("Create Lote", False, f"Status {response.status_code}: {error_msg}")
        except Exception as e:
            self.log_test("Create Lote", False, f"Exception: {str(e)}")
        return False, {}

    def test_get_lote_details(self, lote_id: str):
        """Test getting lote details via GET /api/v1/lotes/{id}"""
        try:
            response = requests.get(f"{self.base_url}/api/v1/lotes/{lote_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "protocolo", "lancamentos", "pendencias"]
                if all(field in data for field in required_fields):
                    self.log_test("Get Lote Details", True, f"Lote ID: {lote_id}")
                    return True, data
                else:
                    self.log_test("Get Lote Details", False, f"Missing fields: {data}")
            elif response.status_code == 404:
                self.log_test("Get Lote Details", False, f"Lote not found: {lote_id}")
            else:
                self.log_test("Get Lote Details", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Get Lote Details", False, f"Exception: {str(e)}")
        return False, {}

    def test_api_error_handling(self):
        """Test API error handling with invalid requests"""
        try:
            # Test invalid lote ID
            response = requests.get(f"{self.base_url}/api/v1/lotes/invalid-id", timeout=10)
            if response.status_code == 404:
                self.log_test("Error Handling (404)", True, "Correctly returns 404 for invalid ID")
            else:
                self.log_test("Error Handling (404)", False, f"Expected 404, got {response.status_code}")

            # Test invalid create request
            invalid_payload = {"invalid": "data"}
            headers = {"Content-Type": "application/json"}
            response = requests.post(
                f"{self.base_url}/api/v1/lotes", 
                json=invalid_payload, 
                headers=headers,
                timeout=10
            )
            if response.status_code in [400, 422]:  # 422 is FastAPI validation error
                self.log_test("Error Handling (Validation)", True, f"Correctly returns {response.status_code} for invalid data")
            else:
                self.log_test("Error Handling (Validation)", False, f"Expected 400/422, got {response.status_code}")
        except Exception as e:
            self.log_test("Error Handling", False, f"Exception: {str(e)}")

    # === Account Mappings Tests ===

    def test_account_mappings_list(self):
        """Test GET /api/v1/account-mappings - list all mappings"""
        try:
            response = requests.get(f"{self.base_url}/api/v1/account-mappings", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["items", "total", "cnpjs_disponiveis"]
                if all(field in data for field in required_fields):
                    self.log_test("Account Mappings List", True, f"Found {data['total']} mappings")
                    return True, data
                else:
                    self.log_test("Account Mappings List", False, f"Missing fields: {data}")
            else:
                self.log_test("Account Mappings List", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Account Mappings List", False, f"Exception: {str(e)}")
        return False, {}

    def test_account_mappings_filter_by_cnpj(self):
        """Test GET /api/v1/account-mappings?cnpj=xxx - filter by CNPJ"""
        test_cnpj = "24879861000150"  # Known CNPJ from context
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/account-mappings", 
                params={"cnpj": test_cnpj},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "items" in data:
                    # Check if all returned items have the filtered CNPJ
                    filtered_correctly = all(
                        item.get("cnpj") == test_cnpj for item in data["items"]
                    )
                    if filtered_correctly:
                        self.log_test("Account Mappings Filter (CNPJ)", True, f"Found {len(data['items'])} mappings for CNPJ {test_cnpj}")
                        return True, data
                    else:
                        self.log_test("Account Mappings Filter (CNPJ)", False, "Filter not working correctly")
                else:
                    self.log_test("Account Mappings Filter (CNPJ)", False, f"Missing 'items' in response: {data}")
            else:
                self.log_test("Account Mappings Filter (CNPJ)", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Account Mappings Filter (CNPJ)", False, f"Exception: {str(e)}")
        return False, {}

    def test_account_mappings_cnpjs_endpoint(self):
        """Test GET /api/v1/account-mappings/cnpjs - list available CNPJs"""
        try:
            response = requests.get(f"{self.base_url}/api/v1/account-mappings/cnpjs", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Account Mappings CNPJs", True, f"Found {len(data)} CNPJs")
                    return True, data
                else:
                    self.log_test("Account Mappings CNPJs", False, f"Expected list, got: {type(data)}")
            else:
                self.log_test("Account Mappings CNPJs", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Account Mappings CNPJs", False, f"Exception: {str(e)}")
        return False, []

    def test_create_account_mapping(self):
        """Test POST /api/v1/account-mappings - create new mapping"""
        try:
            # Generate unique account numbers to avoid conflicts
            import time
            suffix = str(int(time.time() % 1000))
            
            payload = {
                "cnpj": "11.222.333/0001-81",  # Valid CNPJ format
                "conta_cliente": f"10{suffix}",
                "conta_padrao": f"88{suffix}",
                "nome_conta_cliente": f"Teste Conta Cliente {suffix}",
                "nome_conta_padrao": f"Teste Conta Padrão {suffix}"
            }
            
            headers = {"Content-Type": "application/json"}
            response = requests.post(
                f"{self.base_url}/api/v1/account-mappings",
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 201:
                data = response.json()
                required_fields = ["id", "cnpj", "conta_cliente", "conta_padrao"]
                if all(field in data for field in required_fields):
                    self.log_test("Create Account Mapping", True, f"Created mapping ID: {data.get('id')}")
                    return True, data
                else:
                    self.log_test("Create Account Mapping", False, f"Missing fields: {data}")
            else:
                error_msg = ""
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', response.text)
                except:
                    error_msg = response.text
                self.log_test("Create Account Mapping", False, f"Status {response.status_code}: {error_msg}")
        except Exception as e:
            self.log_test("Create Account Mapping", False, f"Exception: {str(e)}")
        return False, {}

    def test_get_account_mapping(self, mapping_id: str):
        """Test GET /api/v1/account-mappings/{id} - get specific mapping"""
        try:
            response = requests.get(f"{self.base_url}/api/v1/account-mappings/{mapping_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "cnpj", "conta_cliente", "conta_padrao"]
                if all(field in data for field in required_fields):
                    self.log_test("Get Account Mapping", True, f"Retrieved mapping: {mapping_id}")
                    return True, data
                else:
                    self.log_test("Get Account Mapping", False, f"Missing fields: {data}")
            elif response.status_code == 404:
                self.log_test("Get Account Mapping", False, f"Mapping not found: {mapping_id}")
            else:
                self.log_test("Get Account Mapping", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Get Account Mapping", False, f"Exception: {str(e)}")
        return False, {}

    def test_update_account_mapping(self, mapping_id: str):
        """Test PUT /api/v1/account-mappings/{id} - update mapping"""
        try:
            payload = {
                "conta_padrao": "8820",  # Updated value
                "nome_conta_cliente": "Teste Atualizado",
                "nome_conta_padrao": "Padrão Atualizado"
            }
            
            headers = {"Content-Type": "application/json"}
            response = requests.put(
                f"{self.base_url}/api/v1/account-mappings/{mapping_id}",
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("conta_padrao") == payload["conta_padrao"]:
                    self.log_test("Update Account Mapping", True, f"Updated mapping: {mapping_id}")
                    return True, data
                else:
                    self.log_test("Update Account Mapping", False, f"Update not reflected: {data}")
            elif response.status_code == 404:
                self.log_test("Update Account Mapping", False, f"Mapping not found: {mapping_id}")
            else:
                error_msg = ""
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', response.text)
                except:
                    error_msg = response.text
                self.log_test("Update Account Mapping", False, f"Status {response.status_code}: {error_msg}")
        except Exception as e:
            self.log_test("Update Account Mapping", False, f"Exception: {str(e)}")
        return False, {}

    def test_bulk_update_account_mappings(self, mapping_ids: list):
        """Test PUT /api/v1/account-mappings/bulk/update - bulk update"""
        if not mapping_ids:
            self.log_test("Bulk Update Account Mappings", False, "No mapping IDs provided")
            return False, {}
            
        try:
            payload = {
                "ids": mapping_ids,
                "conta_padrao": "9999"  # Test bulk update value
            }
            
            headers = {"Content-Type": "application/json"}
            response = requests.put(
                f"{self.base_url}/api/v1/account-mappings/bulk/update",
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("sucesso") or "atualizado" in data.get("mensagem", "").lower():
                    self.log_test("Bulk Update Account Mappings", True, f"Updated {len(mapping_ids)} mappings")
                    return True, data
                else:
                    self.log_test("Bulk Update Account Mappings", False, f"Unexpected response: {data}")
            else:
                error_msg = ""
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', response.text)
                except:
                    error_msg = response.text
                self.log_test("Bulk Update Account Mappings", False, f"Status {response.status_code}: {error_msg}")
        except Exception as e:
            self.log_test("Bulk Update Account Mappings", False, f"Exception: {str(e)}")
        return False, {}

    def test_delete_account_mapping(self, mapping_id: str):
        """Test DELETE /api/v1/account-mappings/{id} - delete mapping"""
        try:
            response = requests.delete(f"{self.base_url}/api/v1/account-mappings/{mapping_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "removido" in data.get("mensagem", "").lower():
                    self.log_test("Delete Account Mapping", True, f"Deleted mapping: {mapping_id}")
                    return True, data
                else:
                    self.log_test("Delete Account Mapping", False, f"Unexpected response: {data}")
            elif response.status_code == 404:
                self.log_test("Delete Account Mapping", False, f"Mapping not found: {mapping_id}")
            else:
                self.log_test("Delete Account Mapping", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Delete Account Mapping", False, f"Exception: {str(e)}")
        return False, {}

    def test_bulk_delete_account_mappings(self, mapping_ids: list):
        """Test DELETE /api/v1/account-mappings/bulk/delete - bulk delete"""
        if not mapping_ids:
            self.log_test("Bulk Delete Account Mappings", False, "No mapping IDs provided")
            return False, {}
            
        try:
            payload = {"ids": mapping_ids}
            
            headers = {"Content-Type": "application/json"}
            response = requests.delete(
                f"{self.base_url}/api/v1/account-mappings/bulk/delete",
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "removido" in data.get("mensagem", "").lower():
                    self.log_test("Bulk Delete Account Mappings", True, f"Deleted {len(mapping_ids)} mappings")
                    return True, data
                else:
                    self.log_test("Bulk Delete Account Mappings", False, f"Unexpected response: {data}")
            else:
                error_msg = ""
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', response.text)
                except:
                    error_msg = response.text
                self.log_test("Bulk Delete Account Mappings", False, f"Status {response.status_code}: {error_msg}")
        except Exception as e:
            self.log_test("Bulk Delete Account Mappings", False, f"Exception: {str(e)}")
        return False, {}

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests")
        print(f"Testing against: {self.base_url}")
        print("-" * 50)

        # Test basic health
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return False

        # Test initial endpoints
        self.test_lotes_list_empty()
        self.test_estatisticas()

        # Test CRUD operations
        created_lote = None
        success, lote_data = self.test_create_lote()
        if success:
            created_lote = lote_data
            # Test getting the created lote
            self.test_get_lote_details(lote_data["id"])

        # Test error handling
        self.test_api_error_handling()

        print("\n" + "-" * 50)
        print("🔗 Testing Account Mappings APIs")
        print("-" * 50)

        # Test Account Mappings endpoints
        self.test_account_mappings_list()
        self.test_account_mappings_filter_by_cnpj()
        self.test_account_mappings_cnpjs_endpoint()

        # Test Account Mappings CRUD
        created_mapping = None
        test_mapping_ids = []
        
        # Create a new mapping for testing
        success, mapping_data = self.test_create_account_mapping()
        if success:
            created_mapping = mapping_data
            test_mapping_ids.append(mapping_data["id"])
            
            # Test getting the created mapping
            self.test_get_account_mapping(mapping_data["id"])
            
            # Test updating the mapping
            self.test_update_account_mapping(mapping_data["id"])

        # Create another mapping for bulk operations testing
        success2, mapping_data2 = self.test_create_account_mapping()
        if success2:
            test_mapping_ids.append(mapping_data2["id"])

        # Test bulk operations if we have mappings
        if test_mapping_ids:
            self.test_bulk_update_account_mappings(test_mapping_ids)
            
            # Clean up: delete the test mappings
            for mapping_id in test_mapping_ids:
                self.test_delete_account_mapping(mapping_id)

        # Print summary
        print("\n" + "=" * 50)
        print("📊 Test Summary")
        print("=" * 50)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result["passed"]:
                    print(f"  - {result['test']}: {result['details']}")

        return self.tests_passed == self.tests_run

def main():
    tester = AccountingBackendTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())