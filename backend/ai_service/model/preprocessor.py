import io
import pydicom
import numpy as np
from PIL import Image

def preprocess_to_pil(image_bytes: bytes, file_format: str) -> tuple[Image.Image, dict]:
    """
    Takes raw image bytes, decodes based on format, and returns an RGB PIL Image
    along with metadata containing the original dimensions for bounding box mapping.
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
    orig_size = img.size # (width, height)
    return img, {"orig_width": orig_size[0], "orig_height": orig_size[1]}
