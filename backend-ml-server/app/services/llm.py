import json
import asyncio
from typing import Optional, AsyncGenerator
from pydantic import BaseModel


class TreatmentReport(BaseModel):
    """Structured clinical treatment report"""
    diagnosis: str
    treatment_plan: str
    drug_regimen: list[dict]
    warnings: list[dict]
    evidence_refs: list[dict]


SYSTEM_PROMPT = """You are a clinical decision support system for Zimbabwean doctors using EDLIZ (Essential Drugs List) guidelines.

CRITICAL RULES:
1. Use ONLY the provided EDLIZ and WHO protocol excerpts as evidence
2. Never speculate or recommend treatments beyond the provided context
3. For HIV co-infected patients, always check for drug-drug interactions with ART regimens
4. Respond ONLY in valid JSON format with these exact keys:
   - diagnosis (string): confirmed diagnosis based on protocol
   - treatment_plan (string): step-by-step treatment approach from guidelines
   - drug_regimen (list of dicts): each dict has {name, dose, duration, frequency}
   - warnings (list of dicts): each dict has {type, description, interaction_with}
   - evidence_refs (list of dicts): each dict has {source, relevance_score, key_excerpt}

Do not include any text outside of JSON. Ensure all drug names match EDLIZ standards."""


async def generate(
    prediction: dict,
    chunks: list[dict],
    patient: dict
) -> TreatmentReport:
    """
    Generate structured clinical treatment recommendation using Ollama/Mistral.

    Args:
        prediction: dict with keys {label, confidence} from vision model
        chunks: list of dicts from RAG retrieval, each with {text, source, score}
        patient: dict with keys {hiv_status, art_regimen} (may include other fields)

    Returns:
        TreatmentReport: Pydantic model with diagnosis, treatment_plan, drug_regimen, warnings, evidence_refs

    Raises:
        Exception: if Ollama API unavailable or response parsing fails
    """
    try:
        import ollama
    except ImportError:
        raise ImportError(
            "ollama library not installed. Install with: pip install ollama"
        )

    # Format context from retrieved chunks
    context = "\n\n".join(
        f"[{c['source']} — relevance {c['score']}]\n{c['text']}"
        for c in chunks
    ) if chunks else "[No protocol excerpts available in knowledge base]"

    # Build user message with patient context
    hiv_status = patient.get('hiv_status', 'unknown')
    art_regimen = patient.get('art_regimen', 'none')
    confidence = prediction.get('confidence', 0)

    user_msg = f"""
Diagnosis: {prediction['label']} ({confidence*100:.0f}% confidence)
Patient HIV Status: {hiv_status}
ART Regimen: {art_regimen}

Protocol excerpts:
{context}

Generate structured treatment recommendation in JSON format. Use ONLY the above evidence."""

    # Call Ollama with Mistral model
    try:
        response = ollama.chat(
            model="llama3.2:3b",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg}
            ],
            format="json",
            options={
                "temperature": 0.1,
                "num_ctx": 2048
            }
        )
    except Exception as e:
        raise Exception(
            f"Ollama API call failed. Ensure Ollama is running on localhost:11434 "
            f"with 'ollama serve' and model pulled: 'ollama pull llama3.2:3b'. "
            f"Error: {str(e)}"
        )

    # Parse JSON response
    try:
        raw_response = response["message"]["content"]
        report_dict = json.loads(raw_response)
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        raise Exception(
            f"Failed to parse Ollama response as JSON. "
            f"Response: {response.get('message', {}).get('content', 'No content')}. "
            f"Error: {str(e)}"
        )

    # Validate with Pydantic model
    try:
        return TreatmentReport(**report_dict)
    except Exception as e:
        raise Exception(
            f"Pydantic validation failed. Report dict: {report_dict}. "
            f"Error: {str(e)}"
        )


async def stream(
    prediction: dict,
    chunks: list[dict],
    patient: dict
) -> AsyncGenerator[str, None]:
    """
    Stream tokens one-by-one as Mistral generates them in real-time.

    This is an async generator that yields individual tokens as they arrive
    from the Ollama streaming API. Used for real-time frontend updates.

    Args:
        prediction: dict with keys {label, confidence}
        chunks: list of dicts from RAG, each with {text, source, score}
        patient: dict with keys {hiv_status, art_regimen}

    Yields:
        str: Individual tokens from the LLM (word fragments)

    Raises:
        Exception: if Ollama unavailable or connection fails
    """
    try:
        import ollama
    except ImportError:
        raise ImportError(
            "ollama library not installed. Install with: pip install ollama"
        )

    # Format context from retrieved chunks
    context = "\n\n".join(
        f"[{c['source']} — relevance {c['score']}]\n{c['text']}"
        for c in chunks
    ) if chunks else "[No protocol excerpts available]"

    # Build user message
    hiv_status = patient.get('hiv_status', 'unknown')
    art_regimen = patient.get('art_regimen', 'none')
    confidence = prediction.get('confidence', 0)

    user_msg = f"""
Diagnosis: {prediction['label']} ({confidence*100:.0f}% confidence)
Patient HIV Status: {hiv_status}
ART Regimen: {art_regimen}

Protocol excerpts:
{context}

Generate structured treatment recommendation in JSON format. Use ONLY the above evidence."""

    # Call Ollama with streaming enabled
    try:
        # Run in thread pool to avoid blocking async loop
        stream_gen = await asyncio.to_thread(
            _stream_ollama,
            prediction['label'],
            user_msg
        )

        # Yield tokens as they arrive
        async for token in stream_gen:
            yield token

    except Exception as e:
        raise Exception(
            f"Ollama streaming failed. Ensure Ollama running on localhost:11434. "
            f"Error: {str(e)}"
        )


def _stream_ollama(disease: str, user_msg: str) -> AsyncGenerator[str, None]:
    """
    Synchronous wrapper that calls Ollama's streaming API.

    Args:
        disease: disease label for context
        user_msg: formatted user message for LLM

    Yields:
        str: tokens from stream
    """
    try:
        import ollama
    except ImportError:
        raise ImportError("ollama library required")

    stream_response = ollama.chat(
        model="llama3.2:3b",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg}
        ],
        stream=True,
        options={
            "temperature": 0.1,
            "num_ctx": 2048
        }
    )

    # This is a generator, not async generator
    # We'll convert it in the async function above
    for chunk in stream_response:
        token = chunk.get('message', {}).get('content', '')
        if token:
            yield token


async def stream_async(
    prediction: dict,
    chunks: list[dict],
    patient: dict
) -> AsyncGenerator[str, None]:
    """
    Async version of streaming that properly handles async iteration.

    Yields tokens from Ollama Mistral model one-by-one.
    """
    try:
        import ollama
    except ImportError:
        raise ImportError(
            "ollama library not installed. Install with: pip install ollama"
        )

    # Format context
    context = "\n\n".join(
        f"[{c['source']} — relevance {c['score']}]\n{c['text']}"
        for c in chunks
    ) if chunks else "[No protocol excerpts available]"

    hiv_status = patient.get('hiv_status', 'unknown')
    art_regimen = patient.get('art_regimen', 'none')
    confidence = prediction.get('confidence', 0)

    user_msg = f"""
Diagnosis: {prediction['label']} ({confidence*100:.0f}% confidence)
Patient HIV Status: {hiv_status}
ART Regimen: {art_regimen}

Protocol excerpts:
{context}

Generate structured treatment recommendation in JSON format."""

    # Call Ollama with streaming
    try:
        response_stream = ollama.chat(
            model="llama3.2:3b",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg}
            ],
            stream=True,
            options={
                "temperature": 0.1,
                "num_ctx": 2048
            }
        )

        # Iterate through streaming response
        for chunk in response_stream:
            token = chunk.get('message', {}).get('content', '')
            if token:
                yield token
                # Allow other tasks to run
                await asyncio.sleep(0)

    except Exception as e:
        raise Exception(
            f"Ollama streaming API failed. "
            f"Ensure: 'ollama serve' running, model: 'ollama pull llama3.2:3b'. "
            f"Error: {str(e)}"
        )


def build_prompt(prediction: dict, context: str, patient: dict) -> str:
    """
    Build the user prompt for LLM with diagnosis, patient context, and evidence.

    Args:
        prediction: {label, confidence}
        context: formatted guideline excerpts
        patient: {hiv_status, art_regimen}

    Returns:
        str: formatted prompt for Mistral
    """
    hiv_status = patient.get('hiv_status', 'unknown')
    art_regimen = patient.get('art_regimen', 'none')
    confidence = prediction.get('confidence', 0)

    return f"""
Diagnosis: {prediction['label']} ({confidence*100:.0f}% confidence)
Patient HIV Status: {hiv_status}
ART Regimen: {art_regimen}

Protocol excerpts:
{context}

Generate structured treatment recommendation in JSON format with:
- diagnosis: confirmed diagnosis
- treatment_plan: step-by-step approach
- drug_regimen: list of drugs with dose/duration
- warnings: drug interactions and contraindications
- evidence_refs: references to guidelines used

Use ONLY the provided evidence. Ensure all drug names match EDLIZ standards."""
