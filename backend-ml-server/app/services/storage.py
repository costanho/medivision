import hashlib
import os
from pathlib import Path
from datetime import datetime

DATA_ROOT = Path("/data")

async def save_xray(file_bytes: bytes, original_name: str) -> tuple[str, str]:
    """
    Save X-ray image with SHA-256 deduplication.

    Args:
        file_bytes: Raw image data
        original_name: Original filename (for extension)

    Returns:
        tuple: (file_path, sha256_hash)
    """
    # SHA-256 hash as filename — deduplication built in
    sha = hashlib.sha256(file_bytes).hexdigest()
    ext = Path(original_name).suffix.lower() or ".dcm"

    today = datetime.now()
    dir_path = DATA_ROOT / "xrays" / str(today.year) / f"{today.month:02d}"
    dir_path.mkdir(parents=True, exist_ok=True)

    file_path = dir_path / f"{sha}{ext}"

    # Idempotent — skip if already exists
    if not file_path.exists():
        with open(file_path, "wb") as f:
            f.write(file_bytes)

    return str(file_path), sha


def verify_file_exists(file_path: str) -> bool:
    """Verify that a saved file actually exists on disk"""
    return Path(file_path).exists()


def get_file_size(file_path: str) -> int:
    """Get file size in bytes"""
    return Path(file_path).stat().st_size if Path(file_path).exists() else 0
