-- Carenexus AI Database Schema with SERIAL (numeric) IDs
-- Target database: carenexus_postgres_ai

-- Patients table
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    national_id VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    dob DATE,
    sex VARCHAR(1),
    hiv_status VARCHAR(10) DEFAULT 'unknown',
    art_regimen VARCHAR(100),
    facility_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cases table
CREATE TABLE cases (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    clinical_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- X-Ray Images table
CREATE TABLE xray_images (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_hash VARCHAR(64) UNIQUE NOT NULL,
    format VARCHAR(10),
    gradcam_path TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Predictions table
CREATE TABLE predictions (
    id SERIAL PRIMARY KEY,
    image_id INTEGER NOT NULL REFERENCES xray_images(id) ON DELETE CASCADE,
    model_name VARCHAR(80),
    model_version VARCHAR(20),
    label VARCHAR(80),
    confidence FLOAT,
    top_labels JSONB,
    inference_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RAG Queries table
CREATE TABLE rag_queries (
    id SERIAL PRIMARY KEY,
    prediction_id INTEGER NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    query_text TEXT,
    retrieved_chunks JSONB,
    collection_used VARCHAR(80),
    latency_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LLM Reports table
CREATE TABLE llm_reports (
    id SERIAL PRIMARY KEY,
    rag_query_id INTEGER NOT NULL REFERENCES rag_queries(id) ON DELETE CASCADE,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    diagnosis VARCHAR(120),
    treatment_plan TEXT,
    drug_regimen JSONB,
    warnings JSONB,
    evidence_refs JSONB,
    model_name VARCHAR(80),
    doctor_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document Chunks table
CREATE TABLE document_chunks (
    id SERIAL PRIMARY KEY,
    source_doc VARCHAR(200),
    source_version VARCHAR(40),
    chunk_index INTEGER,
    chunk_text TEXT,
    chroma_id TEXT,
    collection VARCHAR(80),
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    actor_id INTEGER,
    actor_role VARCHAR(40),
    action VARCHAR(80),
    resource_type VARCHAR(80),
    resource_id INTEGER,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_patients_national_id ON patients(national_id);
CREATE INDEX idx_cases_patient_id ON cases(patient_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_xray_case_id ON xray_images(case_id);
CREATE INDEX idx_predictions_image_id ON predictions(image_id);
CREATE INDEX idx_predictions_label ON predictions(label);
CREATE INDEX idx_rag_prediction_id ON rag_queries(prediction_id);
CREATE INDEX idx_llm_case_id ON llm_reports(case_id);
CREATE INDEX idx_audit_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
