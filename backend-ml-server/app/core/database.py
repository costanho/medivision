import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment variable
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user_postgress:mypassword@carenexus-postgres_db:5432/carenexus_posgress_db"
)

# Create database engine with proper connection pool management
engine = create_engine(
    DATABASE_URL,
    pool_size=20,  # Increased pool size for handling concurrent streaming requests
    max_overflow=10,  # Additional connections if pool is exhausted
    pool_timeout=30,  # Wait 30 seconds before timing out on pool exhaustion
    pool_pre_ping=True,  # Test connections before using them
    pool_recycle=3600,  # Recycle connections every hour to prevent stale connections
    pool_reset_on_return='rollback',  # Rollback any uncommitted transactions on return
    echo=False  # Set to True for SQL logging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Dependency for getting database session in FastAPI routes"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_session():
    """Direct session creation for streaming endpoints (not a dependency)"""
    return SessionLocal()


def init_db():
    """Initialize the database - create all tables"""
    # Import models to register them with Base
    from app.models import (
        Patient, Case, XRayImage, Prediction,
        RAGQuery, LLMReport, DocumentChunk, AuditLog
    )
    Base.metadata.create_all(bind=engine)
