"""
Ollama initialization module for model management.

This module ensures that the required Mistral model is available
when the backend starts up.
"""

import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)


def wait_for_ollama(host: str = "http://localhost:11434", max_retries: int = 30) -> bool:
    """
    Wait for Ollama API to be ready.

    Args:
        host: Ollama API URL
        max_retries: Maximum number of connection attempts

    Returns:
        True if Ollama is ready, False if timeout
    """
    try:
        import requests
    except ImportError:
        logger.warning("requests library not available, skipping Ollama health check")
        return True

    for attempt in range(max_retries):
        try:
            response = requests.get(f"{host}/api/tags", timeout=5)
            if response.status_code == 200:
                logger.info(f"Ollama API is ready at {host}")
                return True
        except Exception as e:
            if attempt < max_retries - 1:
                logger.debug(f"Ollama not ready (attempt {attempt + 1}/{max_retries}): {str(e)}")
                time.sleep(2)
            else:
                logger.warning(f"Ollama API unreachable after {max_retries} attempts at {host}: {str(e)}")

    return False


def ensure_model(
    model_name: str = "llama3.2:3b",
    host: str = "http://localhost:11434"
) -> bool:
    """
    Ensure the required model is available in Ollama.

    Args:
        model_name: Model name (e.g., "llama3.2:3b")
        host: Ollama API URL

    Returns:
        True if model is available, False otherwise
    """
    try:
        import ollama
    except ImportError:
        logger.warning("ollama library not available, skipping model check")
        return False

    try:
        # Try to list available models
        response = ollama.list()
        available_models = [m.model for m in response.models] if hasattr(response, 'models') else []

        if model_name in available_models:
            logger.info(f"Model {model_name} is already available")
            return True

        logger.info(f"Model {model_name} not found, attempting to pull...")
        # Pull the model
        ollama.pull(model_name)
        logger.info(f"Successfully pulled model {model_name}")
        return True

    except Exception as e:
        logger.error(f"Failed to ensure model {model_name}: {str(e)}")
        return False


def initialize_ollama(
    model_name: str = "llama3.2:3b",
    host: str = None
) -> bool:
    """
    Initialize Ollama for LLM integration.

    This function:
    1. Waits for Ollama API to be ready
    2. Ensures the required model is available

    Args:
        model_name: Model to pull if not available
        host: Ollama API URL (defaults to environment var or service name in Docker)

    Returns:
        True if successfully initialized, False if initialization failed
    """
    import os

    logger.info("Initializing Ollama...")

    # Determine host - use environment variable or Docker service name
    if host is None:
        host = os.environ.get("OLLAMA_HOST")
        if not host:
            # Try service name first (Docker environment)
            host = "http://carenexus-ollama:11434"

    # Wait for Ollama to be ready
    if not wait_for_ollama(host):
        logger.warning(
            "Ollama API not available. LLM features will not work. "
            "Ensure Ollama is running: 'ollama serve' (localhost:11434) "
            "or available at configured OLLAMA_HOST endpoint."
        )
        return False

    # Ensure model is available
    if not ensure_model(model_name, host):
        logger.warning(
            f"Failed to ensure model {model_name}. "
            "LLM features may not work correctly. "
            f"You can manually pull with: 'ollama pull {model_name}'"
        )
        return False

    logger.info("Ollama initialization complete")
    return True
