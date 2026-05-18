from fastapi import APIRouter
from typing import Optional
from pydantic import BaseModel
from app.schemas.rag import RAGQueryRequest, RAGQueryResponse, RAGDocument
from app.services.rag import query_knowledge_base, get_available_collections, get_collection_stats, retrieve

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/query", response_model=RAGQueryResponse)
def query_knowledge(request: RAGQueryRequest):
    """
    Query the RAG knowledge base for relevant documents
    
    - Returns top-n relevant document chunks
    - Supports filtering by collection and disease
    """
    result = query_knowledge_base(
        query_text=request.query,
        collection_name=request.collection_name,
        n_results=request.n_results,
        disease_filter=request.disease_filter
    )
    
    if "error" in result:
        return RAGQueryResponse(
            query=request.query,
            collection=request.collection_name,
            documents=[],
            message=result["error"]
        )
    
    documents = [
        RAGDocument(
            text=doc,
            metadata=meta,
            distance=dist
        )
        for doc, meta, dist in zip(
            result["documents"],
            result["metadatas"],
            result["distances"]
        )
    ]
    
    return RAGQueryResponse(
        query=request.query,
        collection=request.collection_name,
        documents=documents,
        message=f"Retrieved {len(documents)} relevant documents"
    )


@router.get("/collections")
def list_collections():
    """Get list of available collections"""
    collections = get_available_collections()
    return {
        "collections": collections,
        "count": len(collections)
    }


@router.get("/collections/{collection_name}/stats")
def collection_stats(collection_name: str):
    """Get stats for a collection"""
    stats = get_collection_stats(collection_name)
    return stats


class RetrieveRequest(BaseModel):
    """Request for context-aware retrieval"""
    disease: str
    hiv_status: str = "negative"  # "positive" or "negative"
    art_drugs: Optional[list[str]] = None


class RetrieveResponse(BaseModel):
    """Response with retrieved context chunks"""
    disease: str
    hiv_status: str
    chunks: list[dict]
    query: str


@router.post("/retrieve", response_model=RetrieveResponse)
def retrieve_context(request: RetrieveRequest):
    """
    Retrieve relevant medical guidelines for a disease and HIV status.

    Returns top 5 chunks matching the query, sorted by relevance score.
    """
    chunks = retrieve(
        label=request.disease,
        hiv=request.hiv_status,
        art_drugs=request.art_drugs or []
    )

    from app.services.rag import build_query
    query = build_query(request.disease, request.hiv_status, request.art_drugs or [])

    return RetrieveResponse(
        disease=request.disease,
        hiv_status=request.hiv_status,
        chunks=chunks,
        query=query
    )
