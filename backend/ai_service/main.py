import logging
import os
import time
import io
import base64
import requests
import httpx
import torch
from fastapi import FastAPI, HTTPException, Request, status, Header
from pydantic import BaseModel
import uuid as uuid_pkg

from ai_service.model.preprocessor import preprocess_to_pil
from ai_service.model.inference import YOLOxInferenceEngine, DISEASE_CLASSES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_service")

INTERNAL_API_KEY = os.getenv("AI_INTERNAL_API_KEY", "replace_this_with_a_random_internal_api_key")

app = FastAPI(title="Lung Disease AI Inference Service")

# Initialize the model at startup
try:
    # Check if GPU is available
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Initializing YOLOX Model on {device}...")

    # Path is relative to /app/ in the docker container
    weights_path = "ai_service/model/weights/best_model.pth"
    if not os.path.exists(weights_path):
        weights_path = "ai_service/model/weights/yolox_tiny.pth"
        
    model_engine = YOLOxInferenceEngine(weights_path, device=device)
    logger.info("YOLOX Model Initialized successfully!")
except Exception as e:
    logger.error(f"Failed to load YOLOx model on startup: {e}")
    model_engine = None

class PredictRequest(BaseModel):
    inference_id: uuid_pkg.UUID
    image_url: str
    image_format: str

MODEL_VERSION = "yolox-lung-v1.0"

def download_image(url: str) -> bytes:
    """Downloads image using requests. Works with Pre-Signed Minio URLs."""
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    return response.content

@app.post("/predict")
async def predict(
    request: PredictRequest,
    x_internal_api_key: str = Header(None)
):
    if x_internal_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API Key")
        
    if model_engine is None:
        raise HTTPException(status_code=500, detail="Inference engine is not initialized.")
        
    start_time = time.time()
    logger.info(f"Starting inference job {request.inference_id}")
    
    try:
        # 1. Fetch image bytes from MinIO/S3 Pre-Signed URL
        logger.info(f"Downloading image from {request.image_url}")
        image_bytes = download_image(request.image_url)
        
        # 2. Preprocess to RGB PIL Image and get original size metadata
        logger.info("Preprocessing image...")
        pil_img, metadata = preprocess_to_pil(image_bytes, request.image_format)
        
        # 3. Run Inference and scale bounds mapped to original size
        logger.info("Running YOLOX Inference...")
        predictions = model_engine.run_inference(pil_img, metadata)
        
        processing_time = time.time() - start_time
        logger.info(f"Inference job {request.inference_id} completed in {processing_time:.2f}s with {len(predictions)} detections.")
        
        return {
            "inference_id": str(request.inference_id),
            "predictions": predictions,
            "processing_time_sec": processing_time,
            "model_version": MODEL_VERSION
        }
        
    except Exception as e:
        logger.error(f"Inference failed for {request.inference_id}: {e}", exc_info=True)
        # Return internal error payload so celery can handle and mark as FAILED
        return {
            "error": True,
            "message": str(e),
            "inference_id": str(request.inference_id)
        }

@app.get("/model/info")
async def model_info():
    """Return current model metadata for versioning (GAP-06)."""
    return {
        "model_variant": "yolox_tiny",  # Will be yolox_m after retraining
        "num_classes": model_engine.num_classes if model_engine else 0,
        "class_names": list(DISEASE_CLASSES.values()),
        "input_size": 640,
        "version": os.environ.get("AI_MODEL_VERSION", "v1.0.0"),
    }

@app.post("/heatmap")
async def generate_heatmap(request: Request):
    """Generate Grad-CAM heatmap for explainability (TECH-02, GAP-05)."""
    try:
        body = await request.json()
        image_url = body["image_url"]
        image_format = body.get("image_format", "PNG")

        # Download image
        async with httpx.AsyncClient() as client:
            resp = await client.get(image_url)
            resp.raise_for_status()
            image_bytes = resp.content

        from ai_service.model.gradcam import GradCAM, generate_heatmap_overlay
        import torchvision.transforms.v2 as transforms

        img, metadata = preprocess_to_pil(image_bytes, image_format)

        # Generate heatmap
        gradcam = GradCAM(model_engine.model)
        try:
            padded_img, scale, dx, dy = model_engine._letterbox_image(img, model_engine.train_sz)
            input_t = transforms.Compose([
                transforms.ToImage(),
                transforms.ToDtype(torch.float32, scale=True)
            ])(padded_img)[None].to(model_engine.device)

            heatmap = gradcam.generate(input_t)
            overlay = generate_heatmap_overlay(img, heatmap)

            # Encode to base64
            buffer = io.BytesIO()
            overlay.save(buffer, format="PNG")
            heatmap_b64 = base64.b64encode(buffer.getvalue()).decode()

            return {"heatmap_base64": heatmap_b64, "status": "success"}
        finally:
            gradcam.cleanup()

    except Exception as e:
        logger.error(f"Heatmap generation failed: {e}", exc_info=True)
        return {"error": str(e), "status": "failed"}
