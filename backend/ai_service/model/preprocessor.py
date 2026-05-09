import io
import cv2
import time
import numpy as np
import SimpleITK as sitk
from PIL import Image
from lungmask import mask

def percentile_normalize(img, p_min=0.5, p_max=99.5):
    """Normalize image based on percentiles to handle outliers (Notebook V3)."""
    img_flat = img.flatten()
    low = np.percentile(img_flat, p_min)
    high = np.percentile(img_flat, p_max)
    img = np.clip(img, low, high)
    img = (img - low) / (high - low + 1e-8)
    return (img * 255).astype(np.uint8)

def preprocess_to_pil(image_bytes: bytes, image_format: str, lung_inferer=None) -> tuple[Image.Image, dict]:
    """
    Enhanced preprocessing (Notebook V4):
    1. Automated Lung Segmentation (via lungmask)
    2. Anatomical Cropping
    3. Percentile Normalization
    4. CLAHE Enhancement
    """
    # Load image
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError("Could not decode image")

    orig_h, orig_w = img.shape[:2]
    metadata = {"orig_width": orig_w, "orig_height": orig_h, "crop": {"cropped": False}}

    # 1. Automated Lung Segmentation & Cropping (FR-08)
    if lung_inferer is not None:
        try:
            t0 = time.time()
            input_sitk = sitk.GetImageFromArray(img)
            # volume_postprocessing=False significantly speeds up CPU processing
            # by skipping heavy morphological operations.
            segmentation = lung_inferer.apply(input_sitk)
            
            lung_mask = (segmentation > 0).astype(np.uint8)
            coords = np.column_stack(np.where(lung_mask > 0))
            
            seg_time = time.time() - t0
            print(f"[PREPROCESS] Lung segmentation completed in {seg_time:.2f}s")

            if len(coords) > 0:
                y_min, x_min = coords.min(axis=0)
                y_max, x_max = coords.max(axis=0)
                
                pad_h = int((y_max - y_min) * 0.05)
                pad_w = int((x_max - x_min) * 0.05)
                
                y_min = max(0, y_min - pad_h)
                x_min = max(0, x_min - pad_w)
                y_max = min(orig_h, y_max + pad_h)
                x_max = min(orig_w, x_max + pad_w)
                
                print(f"[PREPROCESS] Cropping to: y[{y_min}:{y_max}], x[{x_min}:{x_max}]")
                img = img[y_min:y_max, x_min:x_max]
                metadata["crop"] = {
                    "cropped": True,
                    "xmin": int(x_min), "ymin": int(y_min),
                    "xmax": int(x_max), "ymax": int(y_max)
                }
            else:
                print("[PREPROCESS] No lungs detected, skipping crop.")
        except Exception as e:
            print(f"Warning: Lung segmentation failed. Error: {e}")

    # 2. Percentile Normalization
    img = percentile_normalize(img)

    # 3. CLAHE Enhancement
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    img = clahe.apply(img)

    # 4. Convert to RGB PIL
    img_rgb = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    pil_img = Image.fromarray(img_rgb)

    return pil_img, metadata
