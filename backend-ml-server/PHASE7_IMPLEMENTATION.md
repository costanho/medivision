# Phase 7: Unified Analysis Endpoint

## Overview

Phase 7 implements the **primary analysis endpoint** that orchestrates all previous phases (3-6) into a single unified call. This is the main user-facing endpoint for end-to-end TB screening analysis.

## Workflow

```
POST /cases/{case_id}/analyse + X-ray file
    ↓
1. Image Storage (Phase 2)
    ↓
2. Vision Prediction (Phase 3) → DenseNet121 classification
    ↓
3. Patient Context Retrieval → HIV status, ART regimen
    ↓
4. RAG Retrieval (Phase 5) → Medical guidelines from ChromaDB
    ↓
5. LLM Report Generation (Phase 6) → Ollama/Mistral
    ↓
6. Database Record Creation → All entities stored
    ↓
7. Audit Logging → Track who did what
    ↓
Complete Structured Report
```

## API Endpoint

**Endpoint**: `POST /cases/{case_id}/analyse`

**Request**:
```bash
curl -X POST http://localhost:8000/cases/{case_id}/analyse \
  -F "file=@/path/to/xray.dcm"
```

**Response**:
```json
{
  "case_id": "550e8400-e29b-41d4-a716-446655440000",
  "prediction": {
    "label": "Tuberculosis",
    "confidence": 0.92,
    "top_labels": [
      {"label": "Tuberculosis", "score": 0.92},
      {"label": "Pneumonia", "score": 0.05},
      {"label": "Normal", "score": 0.03}
    ],
    "gradcam_path": "/data/xrays/gradcam/550e8400-e29b-41d4-a716-446655440000.png"
  },
  "report": {
    "diagnosis": "Pulmonary Tuberculosis with HIV co-infection",
    "treatment_plan": "RHZE intensive phase (2 months) followed by RH continuation phase (4 months)...",
    "drug_regimen": [
      {
        "name": "Rifampicin",
        "dose": "10mg/kg",
        "duration": "6 months",
        "frequency": "daily"
      },
      ...
    ],
    "warnings": [
      {
        "type": "drug-drug-interaction",
        "description": "Rifampicin induces CYP3A4, reducing integrase inhibitor levels",
        "interaction_with": "dolutegravir"
      }
    ],
    "evidence_refs": [
      {
        "source": "EDLIZ 2023",
        "relevance_score": 0.98,
        "key_excerpt": "TB/HIV co-infected patients should start TB treatment immediately..."
      }
    ]
  },
  "metadata": {
    "case_id": "550e8400-e29b-41d4-a716-446655440000",
    "patient_hiv_status": "positive",
    "patient_art_regimen": "tenofovir+lamivudine+dolutegravir",
    "xray_id": "550e8400-e29b-41d4-a716-446655440001",
    "prediction_id": "550e8400-e29b-41d4-a716-446655440002",
    "rag_query_id": "550e8400-e29b-41d4-a716-446655440003",
    "llm_report_id": "550e8400-e29b-41d4-a716-446655440004",
    "timing": {
      "vision_ms": 1240,
      "rag_ms": 450,
      "total_ms": 3120
    },
    "models": {
      "vision": "DenseNet121_cxr_5diseases",
      "embeddings": "sentence-transformers/all-MiniLM-L6-v2",
      "llm": "mistral:7b-instruct-q4_K_M"
    },
    "analysis_timestamp": "2026-04-24T06:55:00.123456"
  }
}
```

## Implementation Details

### File: `app/api/analysis.py`

**Key Components**:

1. **Image Handling**:
   - Saves X-ray to disk with SHA-256 deduplication
   - Stores metadata in `XRayImage` table
   - Creates record before prediction for traceability

2. **Vision Prediction**:
   - Calls DenseNet121 model for disease classification
   - Returns top 5 predictions with confidence scores
   - Generates Grad-CAM visualization
   - Stores in `Prediction` table with latency metrics

3. **Patient Context**:
   - Retrieves patient info from database
   - Extracts HIV status and ART regimen
   - Parses comma/plus/slash-separated ART drug lists

4. **RAG Retrieval**:
   - Calls retrieve() with disease + HIV status + ART drugs
   - Queries 4 collections: medical_guidelines, edliz_protocols, who_guidelines, drug_interactions
   - Returns top 5 chunks with relevance scores
   - Stores in `RAGQuery` table with latency

5. **LLM Report Generation**:
   - Calls async generate() with prediction + chunks + patient context
   - Returns structured TreatmentReport with:
     - Diagnosis based on EDLIZ protocols
     - Step-by-step treatment plan
     - Drug regimen with dosing
     - Drug-drug interaction warnings
     - Evidence references with scores
   - Stores complete report in `LLMReport` table

6. **Audit Logging**:
   - Records action in `AuditLog` with:
     - Doctor ID (actor)
     - Action: RUN_COMPLETE_ANALYSIS
     - Case ID and timestamp
   - Non-blocking: errors don't fail the analysis

7. **Database Transaction**:
   - All records created in single transaction
   - Proper rollback on any failure
   - Maintains referential integrity

### Database Records Created

| Table | Purpose | Relationship |
|-------|---------|--------------|
| `XRayImage` | Store image metadata | case_id → Case |
| `Prediction` | Store vision output | image_id → XRayImage |
| `RAGQuery` | Store retrieval results | prediction_id → Prediction |
| `LLMReport` | Store clinical report | rag_query_id → RAGQuery, case_id → Case |
| `AuditLog` | Log actions | resource_id → Case |

### Error Handling

| Error | Status | Message |
|-------|--------|---------|
| Case not found | 404 | "Case not found" |
| Patient not found | 404 | "Patient not found" |
| File is empty | 400 | "File is empty" |
| File save fails | 500 | "Failed to save X-ray: {error}" |
| Vision fails | 500 | "Vision prediction failed: {error}" |
| RAG fails | 500 | "RAG retrieval failed: {error}" |
| LLM fails | 500 | "LLM report generation failed: {error}" |
| DB commit fails | 500 | "Database commit failed: {error}" |

## Pre-requisites

1. **Running Services**:
   - FastAPI backend running on port 8000
   - PostgreSQL database configured
   - Ollama service with Mistral model
   - ChromaDB with medical guidelines

2. **Database Setup**:
   - Tables created via `init_db()` on startup
   - Relationships properly configured
   - Foreign keys enabled

3. **Dependencies**:
   - Vision model at `/Users/cosy/Documents/Data_2/best_model_5_diseases.pth`
   - ChromaDB knowledge base at `/Users/cosy/Documents/Data_2/knowledge_base`
   - Ollama with `mistral:7b-instruct-q4_K_M` model

## Performance Characteristics

**Typical Execution Times** (observed from metadata.timing):
- Vision prediction: 1000-1500ms (GPU/CPU dependent)
- RAG retrieval: 300-600ms (ChromaDB query + embedding)
- LLM generation: 2000-5000ms (Mistral inference)
- **Total end-to-end**: 4000-8000ms (~4-8 seconds)

**Optimizations**:
- Lazy loading of ML models (first request slower)
- Batch embedding in RAG
- Cached models in Ollama
- Database connection pooling
- Async I/O for file operations

## Testing

### Test Case: TB + HIV Co-infection

```bash
# 1. Create patient
PATIENT_ID=$(curl -s -X POST http://localhost:8000/patients \
  -H "Content-Type: application/json" \
  -d '{
    "national_id": "TB001",
    "full_name": "Test Patient TB",
    "dob": "1975-01-15",
    "sex": "M",
    "hiv_status": "positive",
    "art_regimen": "tenofovir/lamivudine/dolutegravir"
  }' | jq -r '.id')

# 2. Create case
CASE_ID=$(curl -s -X POST http://localhost:8000/cases/ \
  -H "Content-Type: application/json" \
  -d "{
    \"patient_id\": \"$PATIENT_ID\",
    \"clinical_notes\": \"TB suspect with HIV co-infection\"
  }" | jq -r '.id')

# 3. Run full analysis
curl -X POST http://localhost:8000/cases/$CASE_ID/analyse \
  -F "file=@/path/to/tb_xray.dcm" | jq '.'
```

**Expected Output**:
- Prediction: Tuberculosis with ~0.90+ confidence
- Report: RHZE regimen + rifampicin-integrase warning
- Timing: Total < 10 seconds

## Integration with Frontend

The endpoint is designed for direct integration with web/mobile frontends:

```javascript
// Frontend example
const formData = new FormData();
formData.append('file', xrayFile);

const response = await fetch(`/cases/${caseId}/analyse`, {
  method: 'POST',
  body: formData
});

const result = await response.json();

// Display results
displayPrediction(result.prediction);
displayReport(result.report);
displayMetrics(result.metadata.timing);
```

## Next Steps (Phase 8+)

Potential enhancements:
1. **Batch Analysis**: Multiple X-rays per patient
2. **Follow-up Monitoring**: Compare predictions over time
3. **Doctor Approval Flow**: Flag reports for physician review
4. **Explanation Generation**: Natural language summaries
5. **Multi-language Support**: Localize reports
6. **Integration**: HL7/FHIR export for EHR systems

## Files Modified/Created

**Created**:
- `app/api/analysis.py` - Main analysis endpoint

**Modified**:
- `app/main.py` - Registered analysis router

## Deployment Checklist

- [ ] All services running (backend, PostgreSQL, Ollama, ChromaDB)
- [ ] Vision model file present and readable
- [ ] Knowledge base populated with medical documents
- [ ] Mistral model pulled in Ollama
- [ ] Database tables initialized
- [ ] API health check passing
- [ ] Test end-to-end with TB + HIV case
- [ ] Monitor logs for errors

## Reference

See also:
- Phase 3: Vision Module (DenseNet121 classification)
- Phase 4: Knowledge Ingestion (PDF processing)
- Phase 5: RAG Engine (semantic search)
- Phase 6: LLM Integration (clinical report generation)
