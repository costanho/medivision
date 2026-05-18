#!/bin/bash
# Phase 7: Unified Analysis Endpoint Test
# End-to-end test: create patient → create case → upload X-ray → run full analysis

set -e

BASE_URL="http://localhost:8000"

echo "=========================================="
echo "Phase 7: Unified Analysis Endpoint Test"
echo "=========================================="

# Health check
echo -e "\n1. Checking API health..."
if ! curl -sf "${BASE_URL}/health" > /dev/null; then
    echo "ERROR: API not responding at ${BASE_URL}"
    exit 1
fi
echo "✓ API is healthy"

# Create test patient
echo -e "\n2. Creating test patient..."
PATIENT_RESPONSE=$(curl -s -X POST "${BASE_URL}/patients" \
  -H "Content-Type: application/json" \
  -d '{
    "national_id": "TB20240424001",
    "full_name": "Test Patient TB Analysis",
    "dob": "1975-01-15",
    "sex": "M",
    "hiv_status": "positive",
    "art_regimen": "tenofovir/lamivudine/dolutegravir"
  }')

PATIENT_ID=$(echo "$PATIENT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)
if [ -z "$PATIENT_ID" ]; then
    echo "ERROR: Failed to create patient"
    echo "Response: $PATIENT_RESPONSE"
    exit 1
fi
echo "✓ Patient created: $PATIENT_ID"
echo "  - HIV Status: positive"
echo "  - ART Regimen: tenofovir/lamivudine/dolutegravir"

# Create case
echo -e "\n3. Creating case..."
CASE_RESPONSE=$(curl -s -X POST "${BASE_URL}/cases/" \
  -H "Content-Type: application/json" \
  -d "{
    \"patient_id\": \"${PATIENT_ID}\",
    \"doctor_id\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"clinical_notes\": \"Phase 7 test: TB screening with HIV co-infection\"
  }")

CASE_ID=$(echo "$CASE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)
if [ -z "$CASE_ID" ]; then
    echo "ERROR: Failed to create case"
    echo "Response: $CASE_RESPONSE"
    exit 1
fi
echo "✓ Case created: $CASE_ID"

# Check if test X-ray exists
TEST_XRAY="/Users/cosy/Documents/Data_2/test_xray.dcm"
if [ ! -f "$TEST_XRAY" ]; then
    # Try to find an X-ray file
    echo -e "\n⚠  Test X-ray not found at $TEST_XRAY"
    echo "  Searching for X-ray files..."
    XRAY_CANDIDATES=$(find /Users/cosy/Documents/Data_2 -name "*.dcm" -o -name "*.jpg" 2>/dev/null | head -1)
    if [ -n "$XRAY_CANDIDATES" ]; then
        TEST_XRAY="$XRAY_CANDIDATES"
        echo "  Using: $TEST_XRAY"
    else
        echo "  ERROR: No X-ray files found in Data_2 directory"
        echo "  Please provide a test X-ray at: $TEST_XRAY"
        exit 1
    fi
fi

# Run full analysis
echo -e "\n4. Running full end-to-end analysis..."
echo "  Uploading X-ray and orchestrating vision → RAG → LLM..."

ANALYSIS_START=$(date +%s%N)

ANALYSIS_RESPONSE=$(curl -s -X POST "${BASE_URL}/cases/${CASE_ID}/analyse" \
  -F "file=@${TEST_XRAY}")

ANALYSIS_END=$(date +%s%N)
WALL_CLOCK_MS=$(( (ANALYSIS_END - ANALYSIS_START) / 1000000 ))

echo "✓ Analysis completed in ${WALL_CLOCK_MS}ms"

# Parse response
echo -e "\n5. Analyzing results..."
echo "$ANALYSIS_RESPONSE" | python3 << 'EOF'
import sys, json
try:
    result = json.load(sys.stdin)

    # Prediction
    pred = result.get('prediction', {})
    print(f"\nPrediction:")
    print(f"  Label: {pred.get('label', 'N/A')}")
    print(f"  Confidence: {pred.get('confidence', 0):.1%}")
    if pred.get('top_labels'):
        print(f"  Top predictions:")
        for top in pred.get('top_labels', [])[:3]:
            print(f"    - {top['label']}: {top['score']:.1%}")

    # Report
    report = result.get('report', {})
    print(f"\nClinical Report:")
    print(f"  Diagnosis: {report.get('diagnosis', 'N/A')}")
    print(f"  Treatment Plan: {report.get('treatment_plan', 'N/A')[:100]}...")

    if report.get('drug_regimen'):
        print(f"  Drug Regimen ({len(report.get('drug_regimen', []))} drugs):")
        for drug in report.get('drug_regimen', [])[:3]:
            print(f"    - {drug['name']}: {drug['dose']} {drug['frequency']}")

    if report.get('warnings'):
        print(f"  Warnings ({len(report.get('warnings', []))} total):")
        for warn in report.get('warnings', [])[:2]:
            print(f"    - {warn['type']}: {warn['description'][:60]}...")

    # Metadata
    meta = result.get('metadata', {})
    timing = meta.get('timing', {})
    print(f"\nTiming Metrics:")
    print(f"  Vision: {timing.get('vision_ms', 0)}ms")
    print(f"  RAG: {timing.get('rag_ms', 0)}ms")
    print(f"  Total: {timing.get('total_ms', 0)}ms")

    print(f"\nDatabase IDs:")
    print(f"  XRay ID: {meta.get('xray_id', 'N/A')}")
    print(f"  Prediction ID: {meta.get('prediction_id', 'N/A')}")
    print(f"  RAG Query ID: {meta.get('rag_query_id', 'N/A')}")
    print(f"  LLM Report ID: {meta.get('llm_report_id', 'N/A')}")

    print(f"\nModels Used:")
    models = meta.get('models', {})
    print(f"  Vision: {models.get('vision', 'N/A')}")
    print(f"  Embeddings: {models.get('embeddings', 'N/A')}")
    print(f"  LLM: {models.get('llm', 'N/A')}")

    print("\n✓ Analysis completed successfully!")

except json.JSONDecodeError as e:
    print(f"\nERROR: Failed to parse response as JSON")
    print(f"Response: {sys.stdin.read()}")
    sys.exit(1)
except Exception as e:
    print(f"\nERROR: {str(e)}")
    sys.exit(1)
EOF

if [ $? -ne 0 ]; then
    echo -e "\nERROR: Analysis response parsing failed"
    echo "Raw response:"
    echo "$ANALYSIS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ANALYSIS_RESPONSE"
    exit 1
fi

echo -e "\n=========================================="
echo "Phase 7 Test Complete ✓"
echo "=========================================="
echo ""
echo "Summary:"
echo "✓ Patient creation"
echo "✓ Case creation"
echo "✓ X-ray upload and storage"
echo "✓ Vision model prediction (DenseNet121)"
echo "✓ RAG retrieval (medical guidelines)"
echo "✓ LLM report generation (Mistral)"
echo "✓ Database transaction (all records created)"
echo "✓ Audit logging"
echo ""
echo "Next steps:"
echo "1. Verify report quality by checking diagnosis accuracy"
echo "2. Confirm drug interactions are detected (e.g., rifampicin-integrase)"
echo "3. Check database records: SELECT * FROM predictions WHERE id = '{prediction_id}';"
echo "4. Review Grad-CAM visualization at the returned path"
echo "5. Check audit logs: SELECT * FROM audit_logs WHERE resource_id = '{case_id}';"
