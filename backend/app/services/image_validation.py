from io import BytesIO
import numpy as np
from PIL import Image, UnidentifiedImageError

def inspect_image(content: bytes) -> tuple[dict, str | None]:
    try:
        image = Image.open(BytesIO(content)); image.verify()
        image = Image.open(BytesIO(content)).convert('L')
    except (UnidentifiedImageError, OSError):
        return {'valid': False, 'reason': 'The uploaded file is not a readable image.'}, 'invalid'
    width, height = image.size
    if width < 160 or height < 160:
        return {'valid': False, 'width': width, 'height': height, 'reason': 'Image resolution is too small; use at least 160×160 pixels.'}, 'invalid'
    pixels = np.asarray(image, dtype=np.float32)
    brightness = float(pixels.mean())
    # Variance of adjacent intensity provides a conservative blur signal without claiming device recognition.
    sharpness = float(np.var(np.diff(pixels, axis=0)) + np.var(np.diff(pixels, axis=1)))
    if brightness < 12:
        return {'valid': False, 'width': width, 'height': height, 'brightness': round(brightness,1), 'reason': 'Image is extremely dark; upload a clearer photo.'}, 'invalid'
    if sharpness < 8:
        return {'valid': False, 'width': width, 'height': height, 'sharpness': round(sharpness,1), 'reason': 'Image appears excessively blurred; upload a clearer photo.'}, 'invalid'
    return {'valid': True, 'width': width, 'height': height, 'brightness': round(brightness,1), 'sharpness': round(sharpness,1)}, None
