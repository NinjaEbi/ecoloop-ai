from pathlib import Path
from functools import lru_cache

import torch
from ultralytics import YOLO


MODEL_PATH = (
    Path(__file__).resolve().parents[3]
    / "models"
    / "ecoloop_yolo11n"
    / "best.pt"
)

CONFIDENCE_THRESHOLD = 0.50


def get_inference_device():
    """
    Automatically select the best available inference device.

    Local machine with NVIDIA CUDA:
        -> cuda:0

    Render / CPU-only server:
        -> cpu
    """
    return 0 if torch.cuda.is_available() else "cpu"


@lru_cache(maxsize=1)
def get_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

    return YOLO(str(MODEL_PATH))


def predict_device(image_path: str) -> dict:
    model = get_model()

    device = get_inference_device()

    results = model.predict(
        source=image_path,
        conf=CONFIDENCE_THRESHOLD,
        device=device,
        verbose=False,
    )

    result = results[0]

    if result.boxes is None or len(result.boxes) == 0:
        return {
            "device_type": None,
            "confidence": 0.0,
            "status": "unknown",
            "findings": [
                "Image quality passed.",
                "No supported device was confidently detected.",
            ],
        }

    # Select the highest-confidence detection.
    best_index = int(result.boxes.conf.argmax())

    confidence = float(
        result.boxes.conf[best_index].item()
    )

    class_id = int(
        result.boxes.cls[best_index].item()
    )

    class_name = str(
        result.names[class_id]
    )

    DEVICE_MAP = {
        "Computer-Keyboard": "keyboard",
        "Computer-Mouse": "mouse",
        "Flat-Panel-Monitor": "monitor",
        "Flat-Panel-TV": "television",
        "Laptop": "laptop",
        "Smartphone": "smartphone",
    }

    device_type = DEVICE_MAP.get(class_name)

    if device_type is None:
        return {
            "device_type": None,
            "confidence": confidence,
            "status": "unsupported",
            "findings": [
                f"Model detected {class_name}.",
                "This device category is not enabled in the Phase-1 application.",
            ],
        }

    return {
        "device_type": device_type,
        "confidence": confidence,
        "status": "supported",
        "findings": [
            f"AI detected {class_name}.",
            f"Detection confidence: {confidence:.1%}.",
        ],
    }