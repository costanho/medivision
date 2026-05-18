import os
from pathlib import Path
from datetime import datetime

# Enable headless rendering for OpenCV
os.environ['MPLBACKEND'] = 'Agg'

# Constants (always available)
LABELS = [
    "No Finding", "Pneumonia", "Infiltration", "Effusion", "Tuberculosis"
]

WEIGHTS_PATH = Path("/app/app/models/best_model_5_diseases.pth")
GRADCAM_DIR = Path("/data/gradcam")

# Global state
_MODEL = None
_TRANSFORM = None
_TORCH = None
_MODELS = None
_IMAGE = None
_CV2 = None
_NP = None


def _load_dependencies():
    """Lazy load heavy dependencies on first use"""
    global _TORCH, _MODELS, _TRANSFORM, _IMAGE, _CV2, _NP

    if _TORCH is None:
        import torch
        from torchvision import models, transforms
        from PIL import Image
        import cv2
        import numpy as np

        _TORCH = torch
        _MODELS = models
        _TRANSFORM = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
        _IMAGE = Image
        _CV2 = cv2
        _NP = np


def load_model():
    """Load DenseNet121 model with pretrained weights"""
    global _MODEL, _TORCH, _MODELS

    _load_dependencies()

    if _MODEL is None:
        _MODEL = _MODELS.densenet121(pretrained=False)
        _MODEL.classifier = _TORCH.nn.Linear(1024, 5)

        if WEIGHTS_PATH.exists():
            checkpoint = _TORCH.load(WEIGHTS_PATH, map_location='cpu')
            # Handle different save formats
            if isinstance(checkpoint, dict):
                state_dict = checkpoint.get('model_state_dict') or checkpoint.get('state_dict') or checkpoint
            else:
                state_dict = checkpoint
            # Strip 'module.' prefix if saved with DataParallel
            state_dict = {k.replace('module.', ''): v for k, v in state_dict.items()}
            _MODEL.load_state_dict(state_dict, strict=False)
            print(f"Weights loaded from {WEIGHTS_PATH}")
        else:
            print(f"Warning: Weights file not found at {WEIGHTS_PATH}, using untrained model")

        _MODEL.eval()

    return _MODEL


def preprocess(image_path: str):
    """Load and preprocess image"""
    _load_dependencies()

    # Handle both file paths and PIL Images
    if isinstance(image_path, str):
        img = _IMAGE.open(image_path).convert('RGB')
    else:
        img = image_path

    img_tensor = _TRANSFORM(img)
    return img_tensor.unsqueeze(0)  # Add batch dimension


def generate_gradcam(image_path: str, class_idx: int) -> str:
    """Generate Grad-CAM visualization for a specific class

    Falls back gracefully if OpenCV graphics libraries aren't available.
    """
    try:
        _load_dependencies()

        model = load_model()

        # Load image
        if isinstance(image_path, str):
            img = _IMAGE.open(image_path).convert('RGB')
            img_cv = _CV2.imread(image_path)
        else:
            img = image_path
            img_cv = _CV2.cvtColor(_NP.array(img), _CV2.COLOR_RGB2BGR)

        # Preprocess
        img_tensor = preprocess(img).requires_grad_(True)

        # Forward pass
        with _TORCH.enable_grad():
            output = model(img_tensor)
            score = output[0, class_idx]
            score.backward()

        # Get gradients
        gradients = img_tensor.grad.data.abs().mean(dim=1)[0]

        # Create heatmap
        gradcam_np = gradients.cpu().numpy()
        gradcam_np = _CV2.resize(gradcam_np, (img_cv.shape[1], img_cv.shape[0]))
        gradcam_np = (gradcam_np - gradcam_np.min()) / (gradcam_np.max() - gradcam_np.min() + 1e-8)

        # Apply colormap
        heatmap = _CV2.applyColorMap((gradcam_np * 255).astype(_NP.uint8), _CV2.COLORMAP_JET)

        # Overlay on original image
        result = _CV2.addWeighted(img_cv, 0.6, heatmap, 0.4, 0)

        # Save Grad-CAM
        GRADCAM_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now()
        gradcam_filename = f"{timestamp.year}/{timestamp.month:02d}/{int(timestamp.timestamp() * 1000)}.jpg"
        gradcam_path = GRADCAM_DIR / gradcam_filename
        gradcam_path.parent.mkdir(parents=True, exist_ok=True)

        _CV2.imwrite(str(gradcam_path), result)
        return str(gradcam_path)

    except Exception as e:
        # Fallback: return placeholder path when OpenCV graphics unavailable
        print(f"Grad-CAM generation failed (likely due to missing graphics libraries): {str(e)}")
        GRADCAM_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now()
        gradcam_filename = f"{timestamp.year}/{timestamp.month:02d}/{int(timestamp.timestamp() * 1000)}_placeholder.txt"
        gradcam_path = GRADCAM_DIR / gradcam_filename
        gradcam_path.parent.mkdir(parents=True, exist_ok=True)
        gradcam_path.write_text(f"Grad-CAM visualization unavailable: {str(e)}")
        return str(gradcam_path)


async def predict(image_path: str) -> dict:
    """Run inference on X-ray image

    Args:
        image_path: Path to X-ray image file

    Returns:
        Dictionary with predictions:
        {
            "label": str,
            "confidence": float,
            "top_labels": list of {"label": str, "score": float},
            "gradcam_path": str
        }
    """
    _load_dependencies()

    model = load_model()

    # Preprocess image
    img_tensor = preprocess(image_path)

    # Inference
    with _TORCH.no_grad():
        output = model(img_tensor)
        probs = _TORCH.sigmoid(output)[0]

    # Get top predictions
    scores = sorted(
        zip(LABELS, probs.tolist()),
        key=lambda x: -x[1]
    )

    top_label = scores[0][0]
    top_confidence = scores[0][1]
    top_5 = [{"label": label, "score": round(score, 4)} for label, score in scores[:5]]

    # Generate Grad-CAM for top prediction
    class_idx = LABELS.index(top_label)
    gradcam_path = generate_gradcam(image_path, class_idx)

    return {
        "label": top_label,
        "confidence": round(top_confidence, 4),
        "top_labels": top_5,
        "gradcam_path": gradcam_path,
    }
