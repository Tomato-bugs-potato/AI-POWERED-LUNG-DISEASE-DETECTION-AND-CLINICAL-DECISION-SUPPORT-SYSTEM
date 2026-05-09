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
from ai_service.model.inference import LungAIEnsembleEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_service")

INTERNAL_API_KEY = os.getenv("AI_INTERNAL_API_KEY", "replace_this_with_a_random_internal_api_key")

app = FastAPI(title="Lung Disease AI Inference Service")

@app.get("/")
async def health_check():
    return {
        "status": "online",
        "service": "Lung Disease AI Inference",
        "models_initialized": ensemble_engine is not None and lung_inferer is not None,
        "device": str(device)
    }

# Initialize models at startup
try:
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Initializing AI Models on {device}...")

    # Detection Weights
    det_weights = "ai_service/model/weights/best.pt"
    if not os.path.exists(det_weights):
        det_weights = "ai_service/model/weights/yolo12m.pt"

    # Classification Weights
    cls_weights = "ai_service/model/weights/cls_efficientnet_b0.pt"
    if not os.path.exists(cls_weights):
        # Allow fallback or log error
        logger.error(f"Classifier weights not found at {cls_weights}")
        cls_weights = None

    # Lung Segmentation Model (lungmask). The real LMInferer signature
    # uses force_cpu / tqdm_disable / volume_postprocessing — `device`,
    # `tqdm`, and `fill_holes` were never real parameters. Hole-filling
    # is handled internally by `volume_postprocessing` (on by default).
    from lungmask import mask
    from lungmask import LMInferer
    lung_inferer = LMInferer(
        modelname='R231',
        force_cpu=(str(device).lower() == 'cpu'),
        tqdm_disable=True,
    )
    logger.info("Lung Segmentation Model Initialized.")

    if det_weights and cls_weights:
        ensemble_engine = LungAIEnsembleEngine(det_weights, cls_weights, device=device)
        logger.info("Ensemble Inference Engine Initialized successfully!")
    else:
        ensemble_engine = None
        logger.error("Failed to initialize Ensemble Engine due to missing weights.")

except Exception as e:
    logger.error(f"Initialization failed: {e}")
    ensemble_engine = None
    lung_inferer = None

class PredictRequest(BaseModel):
    inference_id: uuid_pkg.UUID
    image_base64: str = None
    image_url: str = None
    image_format: str

MODEL_VERSION = "ensembled-v3.0.0"

def download_image(url: str) -> bytes:
    headers = {"ngrok-skip-browser-warning": "true", "User-Agent": "LungAI-Inference/1.0"}
    response = requests.get(url, timeout=15, headers=headers)
    response.raise_for_status()
    return response.content

@app.post("/predict")
async def predict(request: PredictRequest, x_internal_api_key: str = Header(None)):
    if x_internal_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API Key")
        
    if ensemble_engine is None:
        raise HTTPException(status_code=500, detail="Insemble engine is not initialized.")
        
    start_time = time.time()
    logger.info(f"Starting ensembled inference {request.inference_id}")
    
    try:
        if request.image_base64:
            image_bytes = base64.b64decode(request.image_base64)
        elif request.image_url:
            image_bytes = download_image(request.image_url)
        else:
            raise HTTPException(status_code=400, detail="Image data required")
        
        # 1. Preprocess: Lung Cropping + CLAHE + Percentile
        pil_img, metadata = preprocess_to_pil(image_bytes, request.image_format, lung_inferer)
        
        # 2. Run Ensemble Inference
        predictions, cls_probs = ensemble_engine.run_inference(pil_img, metadata)
        
        processing_time = time.time() - start_time
        logger.info(f"Done. {len(predictions)} dets. Time: {processing_time:.2f}s")
        
        return {
            "inference_id": str(request.inference_id),
            "predictions": predictions,
            "classification_probs": cls_probs,
            "metadata": metadata,
            "processing_time_sec": processing_time,
            "model_version": MODEL_VERSION
        }
        
    except Exception as e:
        logger.error(f"Inference failed: {e}", exc_info=True)
        return {"error": True, "message": str(e), "inference_id": str(request.inference_id)}

@app.get("/model/info")
async def model_info():
    return {
        "model_variant": "yolo12m+efficientnet_b0",
        "ensemble": True,
        "classes": ["tumor_xray", "tuberculosis", "pneumonia"],
        "version": MODEL_VERSION,
        "lung_segmentation": True
    }

@app.post("/heatmap")
async def generate_heatmap(request: Request):
    """Grad-CAM heatmap legacy support."""
    try:
        body = await request.json()
        image_url = body["image_url"]
        image_format = body.get("image_format", "PNG")

        async with httpx.AsyncClient() as client:
            resp = await client.get(image_url)
            resp.raise_for_status()
            image_bytes = resp.content

        from ai_service.model.gradcam import GradCAM, generate_heatmap_overlay
        img, metadata = preprocess_to_pil(image_bytes, image_format, lung_inferer)

        torch_model = ensemble_engine.det_model.model
        gradcam = GradCAM(torch_model)
        try:
            from ai_service.model.inference import NORM_STATS
            import torchvision.transforms.v2 as transforms
            
            input_t = transforms.Compose([
                transforms.Resize((ensemble_engine.img_size_det, ensemble_engine.img_size_det)),
                transforms.ToImage(),
                transforms.ToDtype(dtype=torch.float32, scale=True),
            ])(img)[None].to(ensemble_engine.device)

            heatmap = gradcam.generate(input_t)
            overlay = generate_heatmap_overlay(img, heatmap)

            buffer = io.BytesIO()
            overlay.save(buffer, format="PNG")
            heatmap_b64 = base64.b64encode(buffer.getvalue()).decode()

            return {"heatmap_base64": heatmap_b64, "status": "success"}
        finally:
            gradcam.cleanup()
    except Exception as e:
        logger.error(f"Heatmap failed: {e}")
        return {"error": str(e), "status": "failed"}
