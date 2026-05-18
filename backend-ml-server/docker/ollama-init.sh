#!/bin/bash
# Initialize Ollama with Mistral model

set -e

echo "Starting Ollama service..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama API to be ready
echo "Waiting for Ollama API to be ready..."
max_attempts=60
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "Ollama API is ready!"
        break
    fi
    echo "Attempt $((attempt + 1))/$max_attempts - Ollama not ready yet, waiting..."
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    echo "ERROR: Ollama API failed to start within timeout"
    kill $OLLAMA_PID
    exit 1
fi

# Pull Mistral model
echo "Pulling Mistral 7B Instruct Q4_K_M model..."
ollama pull mistral:7b-instruct-q4_K_M

echo "Ollama initialization complete!"

# Keep the service running
wait $OLLAMA_PID
