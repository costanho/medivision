"""
Pytest configuration and fixtures for Carenexus AI Backend tests.

Provides:
- In-memory SQLite database for testing
- FastAPI test client
- Mock ML services (vision, RAG, LLM)
- Test data factories
"""

import os
import pytest
from datetime import datetime, date
from uuid import uuid4
from unittest.mock import Mock, patch, AsyncMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import Base, get_db
from app.models.models import Patient, Case, XRayImage, Prediction, RAGQuery, LLMReport, AuditLog


# ===== DATABASE SETUP =====

@pytest.fixture(scope="session")
def db_engine():
    """Create in-memory SQLite engine for tests"""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        echo=False
    )
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create a fresh database session for each test"""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(autocommit=False, autoflush=False, bind=connection)()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def override_get_db(db_session):
    """Override FastAPI dependency for database session"""
    def _get_db():
        return db_session
    return _get_db


@pytest.fixture
def client(override_get_db):
    """FastAPI test client with mocked database"""
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


# ===== TEST DATA FACTORIES =====

@pytest.fixture
def test_patient(db_session):
    """Create a test patient"""
    patient = Patient(
        id=uuid4(),
        national_id="TEST001",
        full_name="Test Patient",
        dob=date(1980, 1, 1),
        sex="M",
        hiv_status="positive",
        art_regimen="tenofovir/lamivudine/dolutegravir",
        facility_id="FAC001"
    )
    db_session.add(patient)
    db_session.commit()
    return patient


@pytest.fixture
def test_case(db_session, test_patient):
    """Create a test case"""
    case = Case(
        id=uuid4(),
        patient_id=test_patient.id,
        doctor_id=uuid4(),
        status="pending",
        clinical_notes="Test case for TB screening"
    )
    db_session.add(case)
    db_session.commit()
    return case


@pytest.fixture
def test_xray_image(db_session, test_case):
    """Create a test X-ray image record"""
    xray = XRayImage(
        id=uuid4(),
        case_id=test_case.id,
        file_path="/tmp/test_xray.dcm",
        file_hash="abc123def456",
        format="dcm"
    )
    db_session.add(xray)
    db_session.commit()
    return xray


@pytest.fixture
def test_prediction(db_session, test_xray_image):
    """Create a test prediction record"""
    prediction = Prediction(
        id=uuid4(),
        image_id=test_xray_image.id,
        model_name="DenseNet121",
        model_version="cxr_5diseases",
        label="Tuberculosis",
        confidence=0.92,
        top_labels=[
            {"label": "Tuberculosis", "score": 0.92},
            {"label": "Pneumonia", "score": 0.05},
            {"label": "Normal", "score": 0.03}
        ],
        inference_ms=1200
    )
    db_session.add(prediction)
    db_session.commit()
    return prediction


@pytest.fixture
def test_rag_query(db_session, test_prediction):
    """Create a test RAG query record"""
    rag_query = RAGQuery(
        id=uuid4(),
        prediction_id=test_prediction.id,
        query_text="Tuberculosis treatment protocol Zimbabwe EDLIZ guidelines",
        retrieved_chunks=[
            {
                "source": "EDLIZ 2023",
                "relevance_score": 0.98,
                "text": "TB treatment protocol for PLHIV..."
            }
        ],
        collection_used="medical_guidelines,edliz_protocols",
        latency_ms=450
    )
    db_session.add(rag_query)
    db_session.commit()
    return rag_query


@pytest.fixture
def test_llm_report(db_session, test_case, test_rag_query):
    """Create a test LLM report record"""
    llm_report = LLMReport(
        id=uuid4(),
        rag_query_id=test_rag_query.id,
        case_id=test_case.id,
        diagnosis="Pulmonary Tuberculosis with HIV co-infection",
        treatment_plan="RHZE intensive phase (2 months) followed by RH continuation phase (4 months)",
        drug_regimen=[
            {
                "name": "Rifampicin",
                "dose": "10mg/kg",
                "duration": "6 months",
                "frequency": "daily"
            }
        ],
        warnings=[
            {
                "type": "drug-drug-interaction",
                "description": "Rifampicin induces CYP3A4, reducing integrase inhibitor levels",
                "interaction_with": "dolutegravir"
            }
        ],
        evidence_refs=[
            {
                "source": "EDLIZ 2023",
                "relevance_score": 0.98,
                "key_excerpt": "TB/HIV co-infected patients should start TB treatment immediately"
            }
        ],
        model_name="mistral:7b-instruct-q4_K_M"
    )
    db_session.add(llm_report)
    db_session.commit()
    return llm_report


# ===== MOCK SERVICES =====

@pytest.fixture
def mock_vision_service():
    """Mock vision prediction service"""
    async def mock_predict(file_path):
        return {
            "label": "Tuberculosis",
            "confidence": 0.92,
            "top_labels": [
                {"label": "Tuberculosis", "score": 0.92},
                {"label": "Pneumonia", "score": 0.05},
                {"label": "Normal", "score": 0.03}
            ],
            "gradcam_path": "/data/xrays/gradcam/test.png"
        }
    return mock_predict


@pytest.fixture
def mock_rag_service():
    """Mock RAG retrieval service"""
    def mock_retrieve(label, hiv, art_drugs):
        return [
            {
                "source": "EDLIZ 2023",
                "relevance_score": 0.98,
                "collection": "medical_guidelines",
                "text": "TB treatment protocol for PLHIV with integrase inhibitors..."
            },
            {
                "source": "WHO Guidelines",
                "relevance_score": 0.92,
                "collection": "who_guidelines",
                "text": "Standard TB treatment regimen..."
            }
        ]
    return mock_retrieve


@pytest.fixture
def mock_llm_service():
    """Mock LLM report generation service"""
    async def mock_generate(prediction, chunks, patient):
        class MockReport:
            diagnosis = "Pulmonary Tuberculosis with HIV co-infection"
            treatment_plan = "RHZE intensive phase (2 months) followed by RH continuation phase (4 months)"
            drug_regimen = [
                Mock(
                    name="Rifampicin",
                    dose="10mg/kg",
                    duration="6 months",
                    frequency="daily",
                    dict=lambda: {"name": "Rifampicin", "dose": "10mg/kg", "duration": "6 months", "frequency": "daily"}
                )
            ]
            warnings = [
                Mock(
                    type="drug-drug-interaction",
                    description="Rifampicin induces CYP3A4, reducing integrase inhibitor levels",
                    interaction_with="dolutegravir",
                    dict=lambda: {"type": "drug-drug-interaction", "description": "Rifampicin induces CYP3A4", "interaction_with": "dolutegravir"}
                )
            ]
            evidence_refs = [
                Mock(
                    source="EDLIZ 2023",
                    relevance_score=0.98,
                    key_excerpt="TB/HIV co-infected patients should start TB treatment immediately",
                    dict=lambda: {"source": "EDLIZ 2023", "relevance_score": 0.98, "key_excerpt": "TB/HIV co-infected"}
                )
            ]
        return MockReport()
    return mock_generate


@pytest.fixture
def mock_storage_service():
    """Mock X-ray storage service"""
    async def mock_save_xray(file_bytes, filename):
        import hashlib
        file_hash = hashlib.sha256(file_bytes).hexdigest()
        return f"/data/xrays/{file_hash}.dcm", file_hash
    return mock_save_xray


@pytest.fixture
def mock_services(mock_vision_service, mock_rag_service, mock_llm_service, mock_storage_service):
    """Patch all services for testing"""
    with patch("app.api.analysis.predict_image", mock_vision_service), \
         patch("app.api.analysis.retrieve_guidelines", mock_rag_service), \
         patch("app.api.analysis.generate_report", mock_llm_service), \
         patch("app.api.analysis.save_xray", mock_storage_service):
        yield


# ===== UTILITY FIXTURES =====

@pytest.fixture
def sample_xray_file():
    """Create a sample X-ray file for testing"""
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".dcm", delete=False) as f:
        # Write minimal DICOM header
        f.write(b"DICM" + b"\x00" * 128)
        f.write(b"test data")
        return f.name


@pytest.fixture
def audit_log_helper(db_session):
    """Helper to create audit logs"""
    def create_audit_log(actor_id, action, resource_type, resource_id):
        log = AuditLog(
            actor_id=actor_id,
            actor_role="doctor",
            action=action,
            resource_type=resource_type,
            resource_id=resource_id
        )
        db_session.add(log)
        db_session.commit()
        return log
    return create_audit_log


# ===== PYTEST CONFIGURATION =====

def pytest_configure(config):
    """Register custom markers"""
    config.addinivalue_line(
        "markers", "unit: mark test as unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "e2e: mark test as end-to-end test"
    )


@pytest.fixture(autouse=True)
def reset_modules():
    """Reset module state between tests"""
    yield
    # Clear any lazy-loaded models
    import sys
    modules_to_reset = [m for m in sys.modules if m.startswith("app.services")]
    for module in modules_to_reset:
        if hasattr(sys.modules[module], "_model"):
            sys.modules[module]._model = None
        if hasattr(sys.modules[module], "_embedder"):
            sys.modules[module]._embedder = None
