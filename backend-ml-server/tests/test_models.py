"""
Unit tests for SQLAlchemy ORM models.

Tests model creation, relationships, and constraints.
"""

import pytest
from uuid import uuid4
from datetime import date

from app.models.models import Patient, Case, XRayImage, Prediction, RAGQuery, LLMReport, AuditLog


@pytest.mark.unit
class TestPatientModel:
    """Tests for Patient model"""

    def test_patient_creation(self, db_session):
        """Test creating a patient"""
        patient = Patient(
            national_id="TEST001",
            full_name="John Doe",
            dob=date(1985, 5, 15),
            sex="M",
            hiv_status="negative",
            facility_id="FAC001"
        )
        db_session.add(patient)
        db_session.commit()

        retrieved = db_session.query(Patient).filter(Patient.national_id == "TEST001").first()
        assert retrieved is not None
        assert retrieved.full_name == "John Doe"
        assert retrieved.hiv_status == "negative"

    def test_patient_unique_national_id(self, db_session, test_patient):
        """Test national_id uniqueness constraint"""
        duplicate = Patient(
            national_id=test_patient.national_id,
            full_name="Different Name",
            sex="F"
        )
        db_session.add(duplicate)
        with pytest.raises(Exception):  # SQLAlchemy integrity error
            db_session.commit()

    def test_patient_hiv_status_default(self, db_session):
        """Test default HIV status is 'unknown'"""
        patient = Patient(
            national_id="TEST002",
            full_name="Test Patient"
        )
        db_session.add(patient)
        db_session.commit()

        retrieved = db_session.query(Patient).filter(Patient.national_id == "TEST002").first()
        assert retrieved.hiv_status == "unknown"

    def test_patient_cascade_delete_cases(self, db_session, test_patient, test_case):
        """Test that deleting patient cascades to cases"""
        case_id = test_case.id
        patient_id = test_patient.id

        db_session.delete(test_patient)
        db_session.commit()

        # Case should be deleted
        deleted_case = db_session.query(Case).filter(Case.id == case_id).first()
        assert deleted_case is None


@pytest.mark.unit
class TestCaseModel:
    """Tests for Case model"""

    def test_case_creation(self, db_session, test_patient):
        """Test creating a case"""
        case = Case(
            patient_id=test_patient.id,
            doctor_id=uuid4(),
            status="pending",
            clinical_notes="Initial screening"
        )
        db_session.add(case)
        db_session.commit()

        retrieved = db_session.query(Case).filter(Case.id == case.id).first()
        assert retrieved.patient_id == test_patient.id
        assert retrieved.status == "pending"

    def test_case_default_status(self, db_session, test_patient):
        """Test default case status"""
        case = Case(patient_id=test_patient.id)
        db_session.add(case)
        db_session.commit()

        retrieved = db_session.query(Case).filter(Case.id == case.id).first()
        assert retrieved.status == "pending"

    def test_case_relationship_to_patient(self, db_session, test_case, test_patient):
        """Test case-patient relationship"""
        assert test_case.patient == test_patient
        assert test_case in test_patient.cases


@pytest.mark.unit
class TestXRayImageModel:
    """Tests for XRayImage model"""

    def test_xray_creation(self, db_session, test_case):
        """Test creating an X-ray image record"""
        xray = XRayImage(
            case_id=test_case.id,
            file_path="/data/xrays/test.dcm",
            file_hash="abc123def456",
            format="dcm"
        )
        db_session.add(xray)
        db_session.commit()

        retrieved = db_session.query(XRayImage).filter(XRayImage.id == xray.id).first()
        assert retrieved.file_path == "/data/xrays/test.dcm"
        assert retrieved.format == "dcm"

    def test_xray_unique_file_hash(self, db_session, test_case):
        """Test file_hash uniqueness constraint"""
        xray1 = XRayImage(
            case_id=test_case.id,
            file_path="/data/xrays/test1.dcm",
            file_hash="unique_hash_123",
            format="dcm"
        )
        db_session.add(xray1)
        db_session.commit()

        xray2 = XRayImage(
            case_id=test_case.id,
            file_path="/data/xrays/test2.dcm",
            file_hash="unique_hash_123",  # Duplicate hash
            format="dcm"
        )
        db_session.add(xray2)
        with pytest.raises(Exception):  # SQLAlchemy integrity error
            db_session.commit()


@pytest.mark.unit
class TestPredictionModel:
    """Tests for Prediction model"""

    def test_prediction_creation(self, db_session, test_xray_image):
        """Test creating a prediction record"""
        prediction = Prediction(
            image_id=test_xray_image.id,
            model_name="DenseNet121",
            model_version="cxr_5diseases",
            label="Tuberculosis",
            confidence=0.92,
            top_labels=[{"label": "TB", "score": 0.92}],
            inference_ms=1200
        )
        db_session.add(prediction)
        db_session.commit()

        retrieved = db_session.query(Prediction).filter(Prediction.id == prediction.id).first()
        assert retrieved.label == "Tuberculosis"
        assert retrieved.confidence == 0.92
        assert retrieved.inference_ms == 1200

    def test_prediction_top_labels_jsonb(self, db_session, test_xray_image):
        """Test JSONB storage of top_labels"""
        labels = [
            {"label": "TB", "score": 0.85},
            {"label": "Normal", "score": 0.10}
        ]
        prediction = Prediction(
            image_id=test_xray_image.id,
            model_name="DenseNet121",
            label="TB",
            confidence=0.85,
            top_labels=labels
        )
        db_session.add(prediction)
        db_session.commit()

        retrieved = db_session.query(Prediction).filter(Prediction.id == prediction.id).first()
        assert len(retrieved.top_labels) == 2
        assert retrieved.top_labels[0]["label"] == "TB"


@pytest.mark.unit
class TestRAGQueryModel:
    """Tests for RAGQuery model"""

    def test_rag_query_creation(self, db_session, test_prediction):
        """Test creating a RAG query record"""
        chunks = [
            {"source": "EDLIZ", "relevance": 0.98, "text": "TB protocol..."}
        ]
        rag_query = RAGQuery(
            prediction_id=test_prediction.id,
            query_text="Tuberculosis treatment",
            retrieved_chunks=chunks,
            collection_used="medical_guidelines",
            latency_ms=450
        )
        db_session.add(rag_query)
        db_session.commit()

        retrieved = db_session.query(RAGQuery).filter(RAGQuery.id == rag_query.id).first()
        assert retrieved.query_text == "Tuberculosis treatment"
        assert retrieved.latency_ms == 450
        assert len(retrieved.retrieved_chunks) == 1


@pytest.mark.unit
class TestLLMReportModel:
    """Tests for LLMReport model"""

    def test_llm_report_creation(self, db_session, test_case, test_rag_query):
        """Test creating an LLM report record"""
        drug_regimen = [
            {"name": "Rifampicin", "dose": "10mg/kg", "frequency": "daily"}
        ]
        warnings = [
            {"type": "drug-interaction", "description": "Test warning"}
        ]
        evidence = [
            {"source": "EDLIZ", "relevance_score": 0.98, "excerpt": "Test"}
        ]

        report = LLMReport(
            rag_query_id=test_rag_query.id,
            case_id=test_case.id,
            diagnosis="Pulmonary TB",
            treatment_plan="6-month TB protocol",
            drug_regimen=drug_regimen,
            warnings=warnings,
            evidence_refs=evidence,
            model_name="mistral"
        )
        db_session.add(report)
        db_session.commit()

        retrieved = db_session.query(LLMReport).filter(LLMReport.id == report.id).first()
        assert retrieved.diagnosis == "Pulmonary TB"
        assert len(retrieved.drug_regimen) == 1
        assert retrieved.model_name == "mistral"

    def test_llm_report_doctor_approval_default(self, db_session, test_case, test_rag_query):
        """Test default doctor_approved is False"""
        report = LLMReport(
            rag_query_id=test_rag_query.id,
            case_id=test_case.id,
            diagnosis="TB",
            treatment_plan="Protocol"
        )
        db_session.add(report)
        db_session.commit()

        retrieved = db_session.query(LLMReport).filter(LLMReport.id == report.id).first()
        assert retrieved.doctor_approved is False


@pytest.mark.unit
class TestAuditLogModel:
    """Tests for AuditLog model"""

    def test_audit_log_creation(self, db_session, test_case):
        """Test creating an audit log"""
        actor_id = uuid4()
        audit = AuditLog(
            actor_id=actor_id,
            actor_role="doctor",
            action="RUN_ANALYSIS",
            resource_type="case",
            resource_id=test_case.id
        )
        db_session.add(audit)
        db_session.commit()

        retrieved = db_session.query(AuditLog).filter(AuditLog.action == "RUN_ANALYSIS").first()
        assert retrieved.actor_role == "doctor"
        assert retrieved.resource_type == "case"
        assert str(retrieved.resource_id) == str(test_case.id)

    def test_audit_log_auto_increment_id(self, db_session, test_case):
        """Test that audit log IDs auto-increment"""
        actor_id = uuid4()

        audit1 = AuditLog(
            actor_id=actor_id,
            action="ACTION1",
            resource_type="case",
            resource_id=test_case.id
        )
        db_session.add(audit1)
        db_session.commit()

        audit2 = AuditLog(
            actor_id=actor_id,
            action="ACTION2",
            resource_type="case",
            resource_id=test_case.id
        )
        db_session.add(audit2)
        db_session.commit()

        assert audit2.id > audit1.id
