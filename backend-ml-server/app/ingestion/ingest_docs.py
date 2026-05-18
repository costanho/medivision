import chromadb
import pdfplumber
from sentence_transformers import SentenceTransformer
from pathlib import Path

# Initialize ChromaDB and embedder
client = chromadb.PersistentClient(path="/data/chroma")
embedder = SentenceTransformer("all-MiniLM-L6-v2")


def chunk_pdf(pdf_path: str, chunk_size: int = 512, overlap: int = 64) -> list[dict]:
    """Split PDF into overlapping chunks of words"""
    chunks = []
    
    with pdfplumber.open(pdf_path) as pdf:
        full_text = "\n".join(p.extract_text() or "" for p in pdf.pages)
    
    words = full_text.split()
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i : i + chunk_size])
        if len(chunk) > 100:  # Skip tiny fragments
            chunks.append({"text": chunk, "start_word": i})
    
    return chunks


def ingest(pdf_path: str, collection_name: str, metadata: dict):
    """Ingest PDF into ChromaDB with embeddings"""
    if not Path(pdf_path).exists():
        print(f"Error: PDF not found at {pdf_path}")
        return
    
    collection = client.get_or_create_collection(collection_name)
    chunks = chunk_pdf(pdf_path)
    
    print(f"Ingesting {len(chunks)} chunks from {pdf_path}...")
    
    # Batch embed
    texts = [c["text"] for c in chunks]
    embeddings = embedder.encode(
        texts,
        batch_size=32,
        show_progress_bar=True,
        normalize_embeddings=True
    )
    
    collection.add(
        ids=[f"{collection_name}_{i}" for i in range(len(chunks))],
        documents=texts,
        embeddings=embeddings.tolist(),
        metadatas=[
            {**metadata, "chunk_index": c["start_word"]}
            for c in chunks
        ]
    )
    
    print(f"Done — {collection.count()} total chunks in '{collection_name}'")


if __name__ == "__main__":
    # Example usage - update paths as needed
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python ingest_docs.py <pdf_path> <collection_name> [metadata_json]")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    collection_name = sys.argv[2]
    metadata = {}
    
    if len(sys.argv) > 3:
        import json
        metadata = json.loads(sys.argv[3])
    
    ingest(pdf_path, collection_name, metadata)
