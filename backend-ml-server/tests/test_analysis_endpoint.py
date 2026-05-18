"""
End-to-end tests for Phase 7 unified analysis endpoint.

Tests the complete workflow:
1. Image upload and storage
2. Vision prediction
3. RAG retrieval
4. LLM report generation
5. Database persistence
"""

import pytest
from io import BytesIO
from uuid import uuid4
from unittest.mock import patch, MagicMock


@pytest.mark.e2e
@pytest.mark.requires_db
class TestAnalysisEndpoint:
    """Tests for POST /cases/{case_id}/analyse endpoint"""

    def test_analyse_case_success_with_mocks(
        self,
        client,
        test_case,
        mock_services,
        sample_xray_file
    ):
        """Test successful end-to-end analysis with all services mocked"""

        with patch("app.api.analysis.predict_image") as mock_predict, \
             patch("app.api.analysis.retrieve_guidelines") as mock_retrieve, \
             patch("app.api.analysis.generate_report") as mock_generate, \
             patch("app.api.analysis.save_xray") as mock_save:

            # Setup mocks
            mock_predict.return_value = {
                "label": "Tuberculosis",
                "confidence": 0.92,
                "top_labels": [
                    {"label": "Tuberculosis", "score": 0.92},
                    {"label": "Pneumonia", "score": 0.05},
                    {"label": "Normal", "score": 0.03}
                ],
                "gradcam_path": "/data/xrays/gradcam/test.png"
            }

            mock_retrieve.return_value = [
                {
                    "source": "EDLIZ 2023",
                    "relevance_score": 0.98,
                    "text": "TB treatment protocol..."
                }
            ]

            class MockReport:
                diagnosis = "Pulmonary Tuberculosis"
                treatment_plan = "RHZE protocol"
                drug_regimen = []
                warnings = []
                evidence_refs = []

                def __init__(self):
                    self.drug_regimen = [
                        MagicMock(
                            name="Rifampicin",
                            dose="10mg/kg",
                            duration="6 months",
                            frequency="daily",
                            dict=lambda: {"name": "Rifampicin", "dose": "10mg/kg", "duration": "6 months", "frequency": "daily"}
                        )
                    ]
                    self.warnings = [
                        MagicMock(
                            type="drug-interaction",
                            description="Test warning",
                            interaction_with="drug",
                            dict=lambda: {"type": "drug-interaction", "description": "Test warning", "interaction_with": "drug"}
                        )
                    ]
                    self.evidence_refs = [
                        MagicMock(
                            source="EDLIZ",
                            relevance_score=0.98,
                            key_excerpt="Evidence",
                            dict=lambda: {"source": "EDLIZ", "relevance_score": 0.98, "key_excerpt": "Evidence"}
                        )
                    ]

            mock_generate.return_value = MockReport()
            mock_save.return_value = ("/data/xrays/test.dcm", "hash123")

            # Read sample X-ray
            with open(sample_xray_file, "rb") as f:
                xray_data = f.read()

            # Make request
            response = client.post(
                f"/cases/{test_case.id}/analyse",
                files={"file": ("test.dcm", BytesIO(xray_data), "application/octet-stream")}
            )

            # Assertions
            assert response.status_code == 200
            result = response.json()

            # Check prediction
            assert result["prediction"]["label"] == "Tuberculosis"
            assert result["prediction"]["confidence"] == 0.92
            assert len(result["prediction"]["top_labels"]) > 0

            # Check report
            assert result["report"]["diagnosis"] == "Pulmonary Tuberculosis"
            assert result["report"]["treatment_plan"] == "RHZE protocol"

            # Check metadata
            assert result["metadata"]["case_id"] == str(test_case.id)
            assert result["metadata"]["patient_hiv_status"] == "positive"
            assert "timing" in result["metadata"]
            assert result["metadata"]["timing"]["vision_ms"] > 0

    def test_analyse_case_not_found(self, client):
        """Test analysis with non-existent case"""
        fake_case_id = uuid4()
        response = client.post(
            f"/cases/{fake_case_id}/analyse",
            files={"file": ("test.dcm", BytesIO(b"test"), "application/octet-stream")}
        )
        assert response.status_code == 404
        assert "Case not found" in response.json()["detail"]

    def test_analyse_case_empty_file(self, client, test_case):
        """Test analysis with empty file"""
        response = client.post(
            f"/cases/{test_case.id}/analyse",
            files={"file": ("test.dcm", BytesIO(b""), "application/octet-stream")}
        )
        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()

    def test_analyse_case_missing_file(self, client, test_case):
        """Test analysis without file"""
        response = client.post(f"/cases/{test_case.id}/analyse")
        assert response.status_code == 422  # Unprocessable Entity

    def test_analyse_response_structure(
        self,
        client,
        test_case,
        sample_xray_file
    ):
        """Test response has correct structure"""
        with patch("app.api.analysis.predict_image") as mock_predict, \
             patch("app.api.analysis.retrieve_guidelines") as mock_retrieve, \
             patch("app.api.analysis.generate_report") as mock_generate, \
             patch("app.api.analysis.save_xray") as mock_save:

            # Setup minimal mocks
            mock_predict.return_value = {
                "label": "Normal",
                "confidence": 0.85,
                "top_labels": [],
                "gradcam_path": None
            }
            mock_retrieve.return_value = []

            class MinimalReport:
                diagnosis = "Normal chest"
                treatment_plan = "None"
                drug_regimen = []
                warnings = []
                evidence_refs = []

            mock_generate.return_value = MinimalReport()
            mock_save.return_value = ("/data/xrays/test.dcm", "hash")

            with open(sample_xray_file, "rb") as f:
                xray_data = f.read()

            response = client.post(
                f"/cases/{test_case.id}/analyse",
                files={"file": ("test.dcm", BytesIO(xray_data))}
            )

            assert response.status_code == 200
            result = response.json()

            # Verify structure
            assert "prediction" in result
            assert "report" in result
            assert "metadata" in result

            # Verify prediction structure
            assert "label" in result["prediction"]
            assert "confidence" in result["prediction"]
            assert "top_labels" in result["prediction"]
            assert "gradcam_path" in result["prediction"]

            # Verify report structure
            assert "diagnosis" in result["report"]
            assert "treatment_plan" in result["report"]
            assert "drug_regimen" in result["report"]
            assert "warnings" in result["report"]
            assert "evidence_refs" in result["report"]

            # Verify metadata structure
            assert "case_id" in result["metadata"]
            assert "xray_id" in result["metadata"]
            assert "prediction_id" in result["metadata"]
            assert "rag_query_id" in result["metadata"]
            assert "llm_report_id" in result["metadata"]
            assert "timing" in result["metadata"]
            assert "models" in result["metadata"]

            # Verify timing has all components
            timing = result["metadata"]["timing"]
            assert "vision_ms" in timing
            assert "rag_ms" in timing
            assert "total_ms" in timing

            # Verify models are set
            models = result["metadata"]["models"]
            assert "vision" in models
            assert "embeddings" in models
            assert "llm" in models


@pytest.mark.unit
class TestAnalysisErrorHandling:
    """Unit tests for error handling in analysis endpoint"""

    def test_vision_failure_handling(self, client, test_case, sample_xray_file):
        """Test handling of vision prediction failure"""
        with patch("app.api.analysis.predict_image") as mock_predict, \
             patch("app.api.analysis.save_xray") as mock_save:

            mock_save.return_value = ("/data/xrays/test.dcm", "hash")
            mock_predict.side_effect = Exception("Vision service error")

            with open(sample_xray_file, "rb") as f:
                xray_data = f.read()

            response = client.post(
                f"/cases/{test_case.id}/analyse",
                files={"file": ("test.dcm", BytesIO(xray_data))}
            )

            assert response.status_code == 500
            assert "Vision prediction failed" in response.json()["detail"]

    def test_rag_failure_handling(self, client, test_case, sample_xray_file):
        """Test handling of RAG retrieval failure"""
        with patch("app.api.analysis.predict_image") as mock_predict, \
             patch("app.api.analysis.retrieve_guidelines") as mock_retrieve, \
             patch("app.api.analysis.save_xray") as mock_save:

            mock_save.return_value = ("/data/xrays/test.dcm", "hash")
            mock_predict.return_value = {
                "label": "TB",
                "confidence": 0.9,
                "top_labels": [],
                "gradcam_path": None
            }
            mock_retrieve.side_effect = Exception("RAG service error")

            with open(sample_xray_file, "rb") as f:
                xray_data = f.read()

            response = client.post(
                f"/cases/{test_case.id}/analyse",
                files={"file": ("test.dcm", BytesIO(xray_data))}
            )

            assert response.status_code == 500
            assert "RAG retrieval failed" in response.json()["detail"]

    def test_llm_failure_handling(self, client, test_case, sample_xray_file):
        """Test handling of LLM report generation failure"""
        with patch("app.api.analysis.predict_image") as mock_predict, \
             patch("app.api.analysis.retrieve_guidelines") as mock_retrieve, \
             patch("app.api.analysis.generate_report") as mock_generate, \
             patch("app.api.analysis.save_xray") as mock_save:

            mock_save.return_value = ("/data/xrays/test.dcm", "hash")
            mock_predict.return_value = {
                "label": "TB",
                "confidence": 0.9,
                "top_labels": [],
                "gradcam_path": None
            }
            mock_retrieve.return_value = []
            mock_generate.side_effect = Exception("LLM service error")

            with open(sample_xray_file, "rb") as f:
                xray_data = f.read()

            response = client.post(
                f"/cases/{test_case.id}/analyse",
                files={"file": ("test.dcm", BytesIO(xray_data))}
            )

            assert response.status_code == 500
            assert "LLM report generation failed" in response.json()["detail"]
