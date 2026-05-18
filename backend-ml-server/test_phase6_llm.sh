#!/bin/bash
# Phase 6: LLM Integration Test
# This script tests the complete workflow: case creation -> X-ray analysis -> report generation

set -e

BASE_URL="http://localhost:8000"
PATIENT_ID="d833c73a-ce23-4402-8652-3d54c87a2f73"
DOCTOR_ID="550e8400-e29b-41d4-a716-446655440000"

echo "=========================================="
echo "Phase 6: LLM Integration Test"
echo "=========================================="

# Health check
echo -e "\n1. Checking API health..."
if ! curl -sf "${BASE_URL}/health" > /dev/null; then
    echo "ERROR: API not responding at ${BASE_URL}"
    exit 1
fi
echo "✓ API is healthy"

# Create a case
echo -e "\n2. Creating case..."
CASE_RESPONSE=$(curl -s -X POST "${BASE_URL}/cases/" \
  -H "Content-Type: application/json" \
  -d "{
    \"patient_id\": \"${PATIENT_ID}\",
    \"doctor_id\": \"${DOCTOR_ID}\",
    \"clinical_notes\": \"Phase 6 test: TB screening with HIV co-infection\"
  }")

CASE_ID=$(echo "$CASE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)
if [ -z "$CASE_ID" ]; then
    echo "ERROR: Failed to create case"
    echo "Response: $CASE_RESPONSE"
    exit 1
fi
echo "✓ Case created: $CASE_ID"

# Check if we have test X-ray images
TEST_XRAY_PATH="/Users/cosy/Documents/Data_2/test_xray.dcm"
if [ ! -f "$TEST_XRAY_PATH" ]; then
    echo "⚠ Test X-ray not found at $TEST_XRAY_PATH"
    echo "Generating test report with synthetic prediction..."

    # Test the report generation endpoint directly with synthetic data
    echo -e "\n3. Testing report generation endpoint (synthetic data)..."
    REPORT_RESPONSE=$(curl -s -X POST "${BASE_URL}/cases/${CASE_ID}/report" \
      -H "Content-Type: application/json" \
      -d '{
        "prediction_label": "Tuberculosis",
        "prediction_confidence": 0.92,
        "hiv_status": "positive",
        "art_regimen": "tenofovir+lamivudine+dolutegravir"
      }')

    echo "Report Generation Response:"
    echo "$REPORT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REPORT_RESPONSE"

    # Check if response contains expected fields
    if echo "$REPORT_RESPONSE" | grep -q "diagnosis"; then
        echo "✓ Report generated successfully with diagnosis"
    else
        echo "⚠ Report response may be incomplete - check if Ollama is running"
        echo "To start Ollama: docker compose up -d ollama"
        echo "To pull model: ollama pull mistral:7b-instruct-q4_K_M"
    fi
else
    echo "✓ Test X-ray found, proceeding with full workflow..."

    # Upload X-ray
    echo -e "\n3. Uploading X-ray image..."
    UPLOAD_RESPONSE=$(curl -s -X POST "${BASE_URL}/cases/${CASE_ID}/upload" \
      -F "file=@${TEST_XRAY_PATH}")

    XRAY_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)
    if [ -z "$XRAY_ID" ]; then
        echo "ERROR: Failed to upload X-ray"
        echo "Response: $UPLOAD_RESPONSE"
        exit 1
    fi
    echo "✓ X-ray uploaded: $XRAY_ID"

    # Analyze X-ray
    echo -e "\n4. Analyzing X-ray with vision model..."
    ANALYSIS_RESPONSE=$(curl -s -X POST "${BASE_URL}/cases/analyse" \
      -H "Content-Type: application/json" \
      -d "{\"xray_id\": \"${XRAY_ID}\"}")

    PREDICTION_LABEL=$(echo "$ANALYSIS_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('label', ''))" 2>/dev/null)
    PREDICTION_CONFIDENCE=$(echo "$ANALYSIS_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('confidence', 0))" 2>/dev/null)

    if [ -z "$PREDICTION_LABEL" ]; then
        echo "ERROR: Failed to analyze X-ray"
        echo "Response: $ANALYSIS_RESPONSE"
        exit 1
    fi
    echo "✓ Vision model prediction: ${PREDICTION_LABEL} (${PREDICTION_CONFIDENCE})"

    # Generate clinical report
    echo -e "\n5. Generating clinical report with LLM..."
    REPORT_RESPONSE=$(curl -s -X POST "${BASE_URL}/cases/${CASE_ID}/report" \
      -H "Content-Type: application/json" \
      -d "{
        \"prediction_label\": \"${PREDICTION_LABEL}\",
        \"prediction_confidence\": ${PREDICTION_CONFIDENCE},
        \"hiv_status\": \"positive\",
        \"art_regimen\": \"tenofovir+lamivudine\"
      }")

    echo "Clinical Report:"
    echo "$REPORT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REPORT_RESPONSE"
fi

echo -e "\n=========================================="
echo "Phase 6 Test Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Verify the report contains diagnosis, treatment_plan, drug_regimen, warnings, and evidence_refs"
echo "2. Check that warnings include drug-drug interactions if applicable"
echo "3. Verify evidence_refs point to EDLIZ/WHO protocol sources"
echo ""
echo "If Ollama errors appear, ensure it's running:"
echo "  docker compose up -d ollama"
echo "  docker compose exec ollama ollama pull mistral:7b-instruct-q4_K_M"
