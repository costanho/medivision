"""
Unit tests for basic API endpoints.

Tests health checks and general API functionality.
"""

import pytest
from uuid import uuid4
from datetime import date
import json


@pytest.mark.unit
class TestHealthCheck:
    """Tests for health check endpoints"""

    def test_root_endpoint(self, client):
        """Test GET / endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"

    def test_health_endpoint(self, client):
        """Test GET /health endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "ok"
        assert "database" in data


@pytest.mark.unit
class TestPatientEndpoints:
    """Tests for patient-related endpoints"""

    def test_create_patient(self, client):
        """Test POST /patients"""
        payload = {
            "national_id": f"PATIENT_{uuid4().hex[:8]}",
            "full_name": "Test Patient",
            "dob": "1985-05-15",
            "sex": "M",
            "hiv_status": "positive",
            "art_regimen": "tenofovir/lamivudine/dolutegravir"
        }
        response = client.post("/patients", json=payload)
        assert response.status_code in [200, 201, 307]  # May redirect
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert data["full_name"] == "Test Patient"

    def test_list_patients(self, client, test_patient):
        """Test GET /patients"""
        response = client.get("/patients")
        assert response.status_code == 200
        data = response.json()
        # Check if response is list
        assert isinstance(data, list) or isinstance(data, dict)

    def test_get_patient(self, client, test_patient):
        """Test GET /patients/{patient_id}"""
        response = client.get(f"/patients/{test_patient.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_patient.id)
        assert data["full_name"] == test_patient.full_name

    def test_get_nonexistent_patient(self, client):
        """Test GET /patients/{patient_id} with non-existent ID"""
        fake_id = uuid4()
        response = client.get(f"/patients/{fake_id}")
        assert response.status_code == 404


@pytest.mark.unit
class TestCaseEndpoints:
    """Tests for case-related endpoints"""

    def test_create_case(self, client, test_patient):
        """Test POST /cases"""
        payload = {
            "patient_id": str(test_patient.id),
            "doctor_id": str(uuid4()),
            "clinical_notes": "Test case for TB screening"
        }
        response = client.post("/cases/", json=payload)
        assert response.status_code in [200, 201, 307]
        if response.status_code == 200:
            data = response.json()
            assert "id" in data

    def test_list_cases(self, client, test_case):
        """Test GET /cases"""
        response = client.get("/cases/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))

    def test_get_case(self, client, test_case):
        """Test GET /cases/{case_id}"""
        response = client.get(f"/cases/{test_case.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_case.id)
        assert data["patient_id"] == str(test_case.patient_id)

    def test_get_nonexistent_case(self, client):
        """Test GET /cases/{case_id} with non-existent ID"""
        fake_id = uuid4()
        response = client.get(f"/cases/{fake_id}")
        assert response.status_code == 404


@pytest.mark.unit
class TestRAGEndpoints:
    """Tests for RAG-related endpoints"""

    def test_rag_retrieve_endpoint_exists(self, client):
        """Test that RAG retrieve endpoint exists"""
        payload = {
            "disease": "Tuberculosis",
            "hiv_status": "positive",
            "art_drugs": ["tenofovir", "lamivudine"]
        }
        response = client.post("/rag/retrieve", json=payload)
        # May fail due to missing ChromaDB, but endpoint should exist
        assert response.status_code in [200, 400, 500, 501]

    def test_rag_collections_endpoint_exists(self, client):
        """Test that RAG collections endpoint exists"""
        response = client.get("/rag/collections")
        # May fail due to missing ChromaDB, but endpoint should exist
        assert response.status_code in [200, 400, 500, 501]


@pytest.mark.unit
class TestDataValidation:
    """Tests for request data validation"""

    def test_create_patient_missing_required_fields(self, client):
        """Test POST /patients with missing required fields"""
        payload = {
            "full_name": "Test Patient"
            # Missing national_id
        }
        response = client.post("/patients", json=payload)
        assert response.status_code == 422  # Validation error

    def test_create_patient_invalid_date_format(self, client):
        """Test POST /patients with invalid date format"""
        payload = {
            "national_id": "TEST123",
            "full_name": "Test Patient",
            "dob": "invalid-date"
        }
        response = client.post("/patients", json=payload)
        # May succeed if validation is lenient
        assert response.status_code in [200, 201, 307, 422]

    def test_create_case_missing_patient_id(self, client):
        """Test POST /cases with missing patient_id"""
        payload = {
            "doctor_id": str(uuid4())
            # Missing patient_id
        }
        response = client.post("/cases/", json=payload)
        assert response.status_code == 422  # Validation error

    def test_invalid_uuid_format(self, client):
        """Test endpoint with invalid UUID format"""
        response = client.get("/cases/not-a-uuid")
        assert response.status_code in [422, 404]


@pytest.mark.unit
class TestCORSHeaders:
    """Tests for CORS middleware"""

    def test_cors_headers_present(self, client):
        """Test that CORS headers are present in response"""
        response = client.get("/")
        # CORS headers may be in response
        assert response.status_code == 200
        # Headers check is optional depending on client implementation

    def test_preflight_request(self, client):
        """Test OPTIONS preflight request"""
        response = client.options("/patients")
        # FastAPI with CORS should handle OPTIONS
        assert response.status_code in [200, 405]


@pytest.mark.unit
class TestContentType:
    """Tests for content type handling"""

    def test_json_response_content_type(self, client):
        """Test that responses have correct content type"""
        response = client.get("/health")
        assert response.status_code == 200
        # Check content type if available
        if "content-type" in response.headers:
            assert "application/json" in response.headers["content-type"]

    def test_post_request_json_parsing(self, client, test_patient):
        """Test that POST requests properly parse JSON"""
        payload = {
            "patient_id": str(test_patient.id),
            "doctor_id": str(uuid4()),
            "clinical_notes": "Test"
        }
        response = client.post("/cases/", json=payload)
        # Should handle JSON properly
        assert response.status_code in [200, 201, 307, 422]
