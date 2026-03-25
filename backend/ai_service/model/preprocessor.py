import io
import cv2
import numpy as np
import pydicom
from PIL import Image


def apply_clahe(img: Image.Image) -> Image.Image:
    """Apply Contrast Limited Adaptive Histogram Equalization for dynamic contrast enhancement (FR-08)."""
    img_array = np.array(img)
    lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    result = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
    return Image.fromarray(result)


def preprocess_to_pil(image_bytes: bytes, file_format: str) -> tuple[Image.Image, dict]:
    """
    Takes raw image bytes, decodes based on format, applies CLAHE enhancement,
    and returns an RGB PIL Image with metadata for bounding box mapping.
    """
    format_upper = file_format.upper()

    if format_upper == "DICOM":
        dicom_data = pydicom.dcmread(io.BytesIO(image_bytes))
        pixel_array = dicom_data.pixel_array

        if pixel_array.dtype != np.uint8:
            pixel_array = pixel_array.astype(np.float32)
            pixel_array = (np.maximum(pixel_array, 0) / pixel_array.max()) * 255.0
            pixel_array = np.uint8(pixel_array)

        img = Image.fromarray(pixel_array)
    else:
        img = Image.open(io.BytesIO(image_bytes))

    img = img.convert('RGB')
    orig_size = img.size  # (width, height)

    # FR-08: Apply CLAHE contrast enhancement
    img = apply_clahe(img)

    return img, {"orig_width": orig_size[0], "orig_height": orig_size[1]}
