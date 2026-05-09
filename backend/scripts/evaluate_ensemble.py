import os
import time
import torch
import numpy as np
from PIL import Image
from ai_service.model.inference import LungAIEnsembleEngine
from ai_service.model.preprocessor import preprocess_to_pil
from lungmask import mask, LMInferer

def run_benchmarking(image_dir, det_weights, cls_weights, device="cuda" if torch.cuda.is_available() else "cpu"):
    print("="*60)
    print(" LUNG-AI ENSEMBLE CLINICAL EVALUATION ")
    print("="*60)
    
    # 1. Initialize models
    print(f"[*] Initializing models on {device}...")
    lung_inferer = LMInferer(modelname='resunet', fill_holes=True, device=device, tqdm=False)
    engine = LungAIEnsembleEngine(det_weights, cls_weights, device=device)
    
    image_files = [f for f in os.listdir(image_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    if not image_files:
        print("[!] No images found in directory.")
        return

    print(f"[*] Found {len(image_files)} test images. Starting pipeline...")
    
    results = []
    
    for img_name in image_files:
        img_path = os.path.join(image_dir, img_name)
        with open(img_path, "rb") as f:
            image_bytes = f.read()
            
        start_time = time.time()
        
        # Preprocess (Segmentation + CLAHE + Percentile)
        pil_img, metadata = preprocess_to_pil(image_bytes, "JPG", lung_inferer)
        
        # Inference
        predictions, cls_probs = engine.run_inference(pil_img, metadata)
        
        latency = time.time() - start_time
        results.append({
            "name": img_name,
            "detections": len(predictions),
            "top_probs": cls_probs,
            "latency": latency,
            "cropped": metadata["crop"]["cropped"]
        })
        
        print(f" -> {img_name}: {len(predictions)} dets, Cropped: {metadata['crop']['cropped']}, Time: {latency:.2f}s")

    # Summary Statistics
    avg_latency = np.mean([r['latency'] for r in results])
    total_dets = sum([r['detections'] for r in results])
    
    print("\n" + "="*60)
    print(" EVALUATION SUMMARY ")
    print("="*60)
    print(f" Total Images Processed: {len(results)}")
    print(f" Average Latency: {avg_latency:.2f}s")
    print(f" Total Pathological Detections: {total_dets}")
    print(f" Clinical Segmentation Success Rate: {sum(r['cropped'] for r in results)/len(results)*100:.1f}%")
    print("="*60)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--image_dir", default="backend/tests/samples", help="Path to test images")
    parser.add_argument("--det_weights", default="backend/ai_service/model/weights/yolo12m.pt")
    parser.add_argument("--cls_weights", default="backend/ai_service/model/weights/cls_efficientnet_b0.pt")
    args = parser.parse_args()
    
    if not os.path.exists(args.image_dir):
        os.makedirs(args.image_dir, exist_ok=True)
        print(f"Created {args.image_dir}. Please place test X-rays there.")
    else:
        run_benchmarking(args.image_dir, args.det_weights, args.cls_weights)
