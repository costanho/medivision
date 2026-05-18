import chromadb
from typing import Optional

# Initialize ChromaDB client
client = chromadb.PersistentClient(path="/data/chroma")

# Lazy-load sentence transformer to avoid dependency conflicts
_embedder = None

def _get_embedder():
    """Lazy-load sentence transformer embedder"""
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedder


def query_knowledge_base(
    query_text: str,
    collection_name: str = "edliz_protocols",
    n_results: int = 3,
    disease_filter: Optional[str] = None
) -> dict:
    """
    Query ChromaDB knowledge base for relevant documents
    
    Args:
        query_text: Query string (e.g., "TB treatment HIV positive")
        collection_name: Collection to search (default: edliz_protocols)
        n_results: Number of results to return
        disease_filter: Optional disease filter for metadata
    
    Returns:
        dict with documents, metadatas, and distances
    """
    try:
        collection = client.get_collection(collection_name)
    except Exception as e:
        return {
            "error": f"Collection '{collection_name}' not found. Available collections: {[c.name for c in client.list_collections()]}",
            "documents": [],
            "metadatas": [],
            "distances": []
        }
    
    # Query with or without metadata filter
    where = None
    if disease_filter:
        where = {"disease": disease_filter}
    
    results = collection.query(
        query_texts=[query_text],
        n_results=n_results,
        where=where
    )
    
    return {
        "documents": results["documents"][0] if results["documents"] else [],
        "metadatas": results["metadatas"][0] if results["metadatas"] else [],
        "distances": results["distances"][0] if results["distances"] else [],
        "query": query_text,
        "collection": collection_name
    }


def get_available_collections() -> list[str]:
    """Get list of available collections"""
    return [c.name for c in client.list_collections()]


def get_collection_stats(collection_name: str) -> dict:
    """Get stats about a collection"""
    try:
        collection = client.get_collection(collection_name)
        return {
            "name": collection_name,
            "count": collection.count(),
            "status": "ready"
        }
    except Exception as e:
        return {
            "name": collection_name,
            "status": "error",
            "error": str(e)
        }


def build_query(label: str, hiv: str, art_drugs: Optional[list] = None) -> str:
    """
    Build context-aware query based on disease, HIV status, and ART drugs.

    Args:
        label: Disease name (e.g., "Tuberculosis", "Pneumonia")
        hiv: HIV status ("positive" or "negative")
        art_drugs: List of ART drug names (optional)

    Returns:
        Formatted query string for semantic search
    """
    parts = [f"{label} treatment protocol Zimbabwe EDLIZ guidelines"]
    if hiv == "positive":
        parts.append("HIV co-infection management")
        if art_drugs:
            parts.append(f"drug interactions {' '.join(art_drugs)}")
    return " ".join(parts)


def retrieve(label: str, hiv: str, art_drugs: Optional[list] = None) -> list[dict]:
    """
    Retrieve relevant medical guidelines from knowledge base.

    Queries multiple collections and filters by relevance score.

    Args:
        label: Disease name
        hiv: HIV status ("positive" or "negative")
        art_drugs: List of ART drug names (optional)

    Returns:
        List of dicts with keys: text, source, score
        Sorted by relevance score (highest first), max 5 results
    """
    query = build_query(label, hiv, art_drugs)
    embedder = _get_embedder()
    embedding = embedder.encode(query, normalize_embeddings=True)

    chunks = []
    collection_names = ["medical_guidelines", "edliz_protocols", "who_guidelines", "drug_interactions"]

    for collection_name in collection_names:
        try:
            col = client.get_collection(collection_name)
            results = col.query(
                query_embeddings=[embedding.tolist()],
                n_results=3,
                include=["documents", "metadatas", "distances"]
            )

            for doc, meta, dist in zip(
                results["documents"][0] if results["documents"] else [],
                results["metadatas"][0] if results["metadatas"] else [],
                results["distances"][0] if results["distances"] else []
            ):
                score = round(1 - dist, 3)  # Convert distance to similarity
                if score > 0.60:  # Relevance threshold
                    chunks.append({
                        "text": doc,
                        "source": meta.get("source", collection_name),
                        "score": score
                    })
        except Exception:
            # Collection doesn't exist, skip
            pass

    # Sort by score descending and return top 5
    return sorted(chunks, key=lambda x: -x["score"])[:5]
