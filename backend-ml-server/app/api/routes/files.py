from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
import os
from pathlib import Path

router = APIRouter(prefix="/files", tags=["files"])

# Safe directory for Grad-CAM heatmaps
GRADCAM_BASE_DIR = Path("/data/gradcam")


def _validate_path(filepath: str) -> Path:
    """
    Validate that the requested file path is within the safe directory.
    Prevents directory traversal attacks.

    Args:
        filepath: relative path to file

    Returns:
        Path: validated absolute path

    Raises:
        HTTPException: if path escape attempt detected
    """
    # Prevent directory traversal
    if ".." in filepath or filepath.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid file path")

    full_path = (GRADCAM_BASE_DIR / filepath).resolve()

    # Ensure path is within safe directory
    if not str(full_path).startswith(str(GRADCAM_BASE_DIR)):
        raise HTTPException(status_code=403, detail="Access denied")

    return full_path


@router.get("/gradcam/{year}/{month}/{timestamp}")
async def get_gradcam(
    year: int,
    month: int,
    timestamp: str,
    format: str = Query("jpg", regex="^(jpg|png|jpeg)$")
):
    """
    Serve Grad-CAM heatmap visualization image.

    Grad-CAM images are organized by date: /data/gradcam/{year}/{month:02d}/{timestamp}.{format}

    Args:
        year: Image year (e.g., 2026)
        month: Image month (1-12)
        timestamp: File timestamp (e.g., 1714435200000)
        format: Image format (jpg, png, jpeg)

    Returns:
        FileResponse: PNG or JPG image file

    Raises:
        HTTPException: 404 if file not found, 400 for invalid paths
    """
    try:
        # Validate inputs
        if not (1 <= month <= 12):
            raise HTTPException(status_code=400, detail="Invalid month")
        if year < 2020 or year > 2050:
            raise HTTPException(status_code=400, detail="Invalid year")

        # Build path
        relative_path = f"{year}/{month:02d}/{timestamp}.{format}"
        file_path = _validate_path(relative_path)

        # Check file exists
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Heatmap not found: {relative_path}"
            )

        # Determine media type
        media_type_map = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png"
        }
        media_type = media_type_map.get(format, "image/jpeg")

        # Return file
        return FileResponse(
            file_path,
            media_type=media_type,
            headers={
                "Cache-Control": "public, max-age=86400",  # Cache for 24 hours
                "Content-Disposition": f"inline; filename={file_path.name}"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error serving file: {str(e)}"
        )


@router.get("/gradcam/{filepath:path}")
async def get_gradcam_legacy(filepath: str):
    """
    Legacy endpoint for full relative path.

    Supports: GET /files/gradcam/2026/04/1714435200000.jpg

    Args:
        filepath: relative path like "2026/04/1714435200000.jpg"

    Returns:
        FileResponse: image file
    """
    try:
        # Validate path safety
        file_path = _validate_path(filepath)

        # Check file exists
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"File not found: {filepath}"
            )

        # Determine media type from extension
        suffix = file_path.suffix.lower()
        media_type_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png"
        }
        media_type = media_type_map.get(suffix, "image/jpeg")

        return FileResponse(
            file_path,
            media_type=media_type,
            headers={
                "Cache-Control": "public, max-age=86400",
                "Content-Disposition": f"inline; filename={file_path.name}"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error serving file: {str(e)}"
        )


@router.get("/xrays/{filepath:path}")
async def get_xray(filepath: str):
    """
    Serve X-ray images from /data/xrays directory.

    Args:
        filepath: relative path to X-ray file

    Returns:
        FileResponse: image file (DICOM, PNG, JPG, etc.)
    """
    try:
        xray_base = Path("/data/xrays")

        # Prevent directory traversal
        if ".." in filepath or filepath.startswith("/"):
            raise HTTPException(status_code=400, detail="Invalid file path")

        file_path = (xray_base / filepath).resolve()

        # Ensure within safe directory
        if not str(file_path).startswith(str(xray_base)):
            raise HTTPException(status_code=403, detail="Access denied")

        # Check existence
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="X-ray not found")

        # Determine media type
        suffix = file_path.suffix.lower()
        media_type_map = {
            ".dcm": "application/dicom",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png"
        }
        media_type = media_type_map.get(suffix, "application/octet-stream")

        return FileResponse(
            file_path,
            media_type=media_type,
            headers={
                "Cache-Control": "public, max-age=604800",  # Cache for 7 days
                "Content-Disposition": f"inline; filename={file_path.name}"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error serving file: {str(e)}"
        )
