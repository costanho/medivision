# Phase 6: LLM Integration with Ollama/Mistral

## Overview
Phase 6 implements clinical report generation using Ollama/Mistral LLM, integrating with the RAG engine and vision model predictions to create structured treatment recommendations following EDLIZ/WHO protocols.

## Implementation Summary

### 1. LLM Service Layer (`app/services/llm.py`)

**Purpose**: Core LLM inference with Ollama/Mistral integration

**Key Components**:
- `TreatmentReport`: Pydantic model with fields:
  - `diagnosis`: Confirmed diagnosis
  - `treatment_plan`: Step-by-step treatment approach
  - `drug_regimen`: List of dicts with {name, dose, duration, frequency}
  - `warnings`: List of dicts with {type, description, interaction_with}
  - `evidence_refs`: List of dicts with {source, relevance_score, key_excerpt}

- `SYSTEM_PROMPT`: Clinical decision support system prompt enforcing:
  - EDLIZ/WHO protocol usage only
  - No speculation beyond provided context
  - JSON-only output format
  - Drug-drug interaction checking for HIV co-infected patients

- `generate()`: Async function signature:
  ```python
  async def generate(
      prediction: dict,  # {label, confidence} from vision model
      chunks: list[dict],  # [{text, source, score}] from RAG
      patient: dict  # {hiv_status, art_regimen}
  ) -> TreatmentReport
  ```

**Features**:
- Lazy-loads ollama library
- Graceful error handling with detailed error messages
- Pydantic validation of LLM response
- Temperature=0.1 for deterministic output
- Context window=4096 tokens
- JSON output mode with Mistral 7B Instruct Q4_K_M

### 2. Ollama Initialization (`app/core/ollama_init.py`)

**Purpose**: Ensures Ollama service and Mistral model are ready on startup

**Key Functions**:
- `wait_for_ollama()`: Polls Ollama API until ready (30 second timeout)
- `ensure_model()`: Checks if model is available, pulls if missing
- `initialize_ollama()`: Orchestrates startup sequence

**Integration**: Called in `app/main.py` startup event

### 3. API Layer (`app/api/cases.py`)

**New Endpoint**: `POST /cases/{case_id}/report`

**Request Model** (`ReportGenerationRequest`):
```python
class ReportGenerationRequest(BaseModel):
    prediction_label: str  # Disease diagnosis from vision model
    prediction_confidence: float  # Confidence score (0-1)
    hiv_status: Optional[str] = None  # "positive", "negative", or None
    art_regimen: Optional[str] = None  # Current ART drugs if HIV+
```

**Response Model** (`ReportGenerationResponse`):
```python
class ReportGenerationResponse(BaseModel):
    case_id: str
    report: TreatmentReport
    generated_at: str  # ISO timestamp
```

**Workflow**:
1. Verify case exists
2. Retrieve patient information
3. Query RAG for relevant medical guidelines based on disease + HIV status + ART drugs
4. Call LLM service to generate structured treatment report
5. Return validated TreatmentReport

### 4. Docker Orchestration

**Updated `docker-compose.yml`**:
- Added `ollama` service:
  - Image: `ollama/ollama:latest`
  - Port: 11434
  - Health check: Curl /api/tags endpoint
  - Volume: `ollama-models` for persistent model storage
- Updated `backend` service:
  - Depends on: ollama (condition: service_healthy)
  - Environment: `OLLAMA_HOST` for cross-container communication
  - Updated startup to wait for Ollama readiness

**Volume Management**:
- `carenexus-data`: PostgreSQL persistence
- `ollama-models`: Ollama model storage

### 5. Dependencies

**Updated `requirements.txt`**:
- `ollama==0.1.48`: Python client for Ollama API

### 6. Schemas (`app/schemas/llm.py`)

**Data Models**:
- `DrugRegimen`: name, dose, duration, frequency
- `Warning`: type, description, interaction_with
- `EvidenceRef`: source, relevance_score, key_excerpt
- `TreatmentReport`: Full clinical report structure
- `ReportGenerationRequest`: API request format
- `ReportGenerationResponse`: API response format

## Integration Flow

```
Case with X-ray
    ↓
Vision Model (Phase 3)
    ↓ [prediction_label, confidence]
RAG Engine (Phase 5)
    ↓ [retrieve guidelines based on disease + HIV + ART]
LLM Service (Phase 6)
    ↓ [generate structured report]
TreatmentReport
    ↓ [diagnosis, treatment_plan, drug_regimen, warnings, evidence_refs]
API Response
```

## Usage Example

### Test TB case with HIV co-infection:

```bash
# Create case
case_id=$(curl -s -X POST http://localhost:8000/cases/ \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "d833c73a-ce23-4402-8652-3d54c87a2f73",
    "doctor_id": "550e8400-e29b-41d4-a716-446655440000",
    "clinical_notes": "TB screening"
  }' | jq -r '.id')

# Generate report
curl -X POST http://localhost:8000/cases/${case_id}/report \
  -H "Content-Type: application/json" \
  -d '{
    "prediction_label": "Tuberculosis",
    "prediction_confidence": 0.92,
    "hiv_status": "positive",
    "art_regimen": "tenofovir+lamivudine+dolutegravir"
  }' | jq '.report'
```

**Expected Output**:
```json
{
  "diagnosis": "Pulmonary Tuberculosis with HIV co-infection",
  "treatment_plan": "RHZE intensive phase (2 months) followed by RH continuation phase (4 months) with close monitoring for TB-IRIS",
  "drug_regimen": [
    {"name": "Rifampicin", "dose": "10mg/kg", "duration": "6 months", "frequency": "daily"},
    {"name": "Isoniazid", "dose": "5mg/kg", "duration": "6 months", "frequency": "daily"},
    {"name": "Pyrazinamide", "dose": "25mg/kg", "duration": "2 months", "frequency": "daily"},
    {"name": "Ethambutol", "dose": "15-25mg/kg", "duration": "2 months", "frequency": "daily"}
  ],
  "warnings": [
    {
      "type": "drug-drug-interaction",
      "description": "Rifampicin induces CYP3A4, reducing integrase inhibitor (dolutegravir) levels",
      "interaction_with": "dolutegravir"
    },
    {
      "type": "contraindication",
      "description": "Monitor CD4 count closely; TB-IRIS risk high if CD4 < 50",
      "interaction_with": "HIV co-infection"
    }
  ],
  "evidence_refs": [
    {
      "source": "EDLIZ 2023",
      "relevance_score": 0.98,
      "key_excerpt": "TB/HIV co-infected patients should start TB treatment immediately and ART within 2 weeks..."
    }
  ]
}
```

## Initialization Steps

### Manual Setup (If Not Using Docker):

1. **Install Ollama**: https://ollama.ai
2. **Pull Model**:
   ```bash
   ollama pull mistral:7b-instruct-q4_K_M
   ```
3. **Start Ollama**:
   ```bash
   ollama serve
   ```
4. **Start Backend**:
   ```bash
   python -m uvicorn app.main:app --reload
   ```

### Docker Setup:

```bash
# Start all services (Ollama will pull model on first startup)
docker compose up --build

# If model pull hangs, manually initialize in container:
docker compose exec ollama ollama pull mistral:7b-instruct-q4_K_M
```

## Testing

Run the comprehensive test script:
```bash
chmod +x test_phase6_llm.sh
./test_phase6_llm.sh
```

Test script validates:
- API health check
- Case creation
- Report generation with synthetic TB + HIV+ case
- Response structure and required fields

## Key Design Decisions

1. **Async LLM Generation**: Prevents blocking during long LLM inference
2. **Ollama Container**: Keeps LLM isolated, allows GPU acceleration
3. **RAG Integration**: Ensures LLM grounding in actual protocols (prevents hallucination)
4. **JSON Mode**: Enforces structured output, eliminates parsing errors
5. **Low Temperature (0.1)**: Deterministic output suitable for clinical use
6. **Lazy Loading**: Ollama client only imported when needed
7. **Startup Initialization**: Model pulled automatically, reduces first-request latency

## Error Handling

Common issues and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "Ollama API unreachable" | Ollama container not running | `docker compose up ollama` |
| "Model not found" | Mistral model not pulled | `docker compose exec ollama ollama pull mistral:7b-instruct-q4_K_M` |
| "Failed to parse response" | LLM returned non-JSON | Check system prompt enforcement, try with different temperature |
| "RAG retrieval failed" | No matching protocols | Ingest more medical documents, check disease name spelling |

## Files Created/Modified

### Created:
- `app/services/llm.py`: LLM service with Ollama integration
- `app/core/ollama_init.py`: Ollama initialization logic
- `app/schemas/llm.py`: Pydantic models for LLM API
- `test_phase6_llm.sh`: Comprehensive test script
- `docker/ollama-init.sh`: Ollama initialization shell script
- `PHASE6_IMPLEMENTATION.md`: This documentation

### Modified:
- `docker-compose.yml`: Added ollama service and dependencies
- `app/api/cases.py`: Added `/cases/{case_id}/report` endpoint
- `app/main.py`: Added Ollama initialization on startup
- `requirements.txt`: Added ollama==0.1.48

## Next Steps

1. **Verify Ollama runs**: `docker compose up -d ollama && sleep 30 && docker compose logs ollama`
2. **Run test script**: `bash test_phase6_llm.sh`
3. **Monitor logs**: `docker compose logs backend | grep -i llm`
4. **Integrate with frontend**: POST to `/cases/{case_id}/report` endpoint
5. **Performance tuning**: Adjust temperature/context based on clinical feedback

## References

- Ollama: https://ollama.ai
- Mistral 7B: https://mistral.ai/news/announcing-mistral-7b/
- EDLIZ: Essential Drugs List Zimbabwe
- WHO TB Guidelines: https://www.who.int/publications/guidelines/tuberculosis
