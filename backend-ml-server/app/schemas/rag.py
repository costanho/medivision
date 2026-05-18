from pydantic import BaseModel
from typing import Optional


class RAGQueryRequest(BaseModel):
    """Request for RAG knowledge base query"""
    query: str
    collection_name: str = "edliz_protocols"
    n_results: int = 3
    disease_filter: Optional[str] = None


class RAGDocument(BaseModel):
    """Retrieved document chunk"""
    text: str
    metadata: dict
    distance: float


class RAGQueryResponse(BaseModel):
    """Response from RAG query"""
    query: str
    collection: str
    documents: list[RAGDocument]
    message: str
