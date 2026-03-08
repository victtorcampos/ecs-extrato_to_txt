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