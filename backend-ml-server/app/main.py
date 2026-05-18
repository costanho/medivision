from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import requests
import os

# Import routers from app.api.routes
from app.api.routes import auth, files, analyse
from app.api.routes.analyse import shortcut_router
from app.api import patients, cases, rag, analysis

# Import initialization functions
from app.core.database import init_db, SessionLocal
from app.core.ollama_init import initialize_ollama

# Initialize FastAPI app
app = FastAPI(
    title="Carenexus AI Backend",
    description="Backend API for Carenexus AI - TB Screening and Clinical Decision Support",
    version="1.0.0"
)

# CORS Configuration (Critical — frontend can't talk to backend without this)
ALLOWED_ORIGINS = [
    "http://localhost:3000",      # React dev server
    "http://localhost:5173",      # Vite dev server
    "http://localhost:8080",      # Alternative dev port
    "http://127.0.0.1:3000",      # Localhost alternative
    "http://127.0.0.1:5173",      # Localhost alternative
    "http://carenexus-frontend:3000",  # Docker network
]

# Add production URLs from environment variable
PRODUCTION_URLS = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
if PRODUCTION_URLS and PRODUCTION_URLS[0]:
    ALLOWED_ORIGINS.extend([url.strip() for url in PRODUCTION_URLS if url.strip()])

# Development mode: allow all (set ENV variable to disable)
if os.getenv("ENVIRONMENT", "development") == "development":
    ALLOWED_ORIGINS.append("*")

# Add CORS middleware BEFORE routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,
)

# Register all routers with prefixes and tags
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(patients.router, tags=["Patients"])  # Already has /patients prefix
app.include_router(cases.router, tags=["Cases"])        # Already has /cases prefix
app.include_router(rag.router, tags=["RAG"])            # Already has /rag prefix
app.include_router(analysis.router, tags=["Analysis"])
app.include_router(analyse.router, tags=["Streaming Analysis"])
app.include_router(shortcut_router, tags=["Streaming Analysis"])
app.include_router(files.router, tags=["Files"])


@app.on_event("startup")
def startup_event():
    """Initialize database and LLM services on startup"""
    init_db()
    initialize_ollama()


@app.get("/")
def read_root():
    """Health check endpoint"""
    return {
        "message": "Carenexus AI Backend is running",
        "status": "healthy",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    """Comprehensive health check for all services"""
    health_status = {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {}
    }

    # Check database
    try:
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        health_status["services"]["database"] = "ok"
    except Exception as e:
        health_status["services"]["database"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    # Check ChromaDB
    try:
        from app.services.rag import client
        if client is not None:
            client.list_collections()
            health_status["services"]["chromadb"] = "ok"
        else:
            health_status["services"]["chromadb"] = "not_initialized"
    except Exception as e:
        health_status["services"]["chromadb"] = f"error: {str(e)}"

    # Check Ollama/LLM
    try:
        ollama_url = "http://carenexus-ollama:11434"
        response = requests.get(f"{ollama_url}/api/tags", timeout=5)
        if response.status_code == 200:
            health_status["services"]["ollama"] = "ok"
        else:
            health_status["services"]["ollama"] = f"error: status {response.status_code}"
    except Exception as e:
        health_status["services"]["ollama"] = f"error: {str(e)}"

    # Determine overall status
    error_services = [s for s, status in health_status["services"].items() if "error" in str(status).lower()]
    if error_services:
        health_status["status"] = "degraded"
        health_status["errors"] = error_services

    return health_status


@app.get("/docs/routes")
def get_routes_list():
    """Get list of all available routes"""
    routes = []
    for route in app.routes:
        if hasattr(route, 'methods'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods),
                "name": route.name,
                "tags": getattr(route, 'tags', [])
            })
    return {"routes": routes, "total": len(routes)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
