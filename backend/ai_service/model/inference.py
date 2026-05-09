import logging
import cv2
import torch
import numpy as np
import timm
from PIL import Image
from ultralytics import YOLO
import albumentations as A
from albumentations.pytorch import ToTensorV2

# Grad-CAM heatmap thresholding for injection localization.
# 0.70 quantile = take the top 30% of activation magnitudes — focal enough
# to give a meaningful bbox without slicing off the diffuse edges of a lesion.
GRADCAM_QUANTILE = 0.70

logger = logging.getLogger(__name__)

# FR-09: Three disease classes
DISEASE_CLASSES = {
    0: "tumor_xray",
    1: "tuberculosis",
    2: "pneumonia",
}
CLASS_NAMES = [DISEASE_CLASSES[i] for i in range(len(DISEASE_CLASSES))]

# Aggressive Fusion Parameters (Notebook V3)
# Centered-gain fusion: fused = s_det * (1 + CLS_GAIN * (p_cls - 0.5)), clipped.
# p_cls = 0.5 → no change. p_cls = 1.0 → score multiplied by (1 + 0.5*CLS_GAIN).
# p_cls = 0.0 → score zeroed. Lets a confident classifier lift bbox scores
# instead of merely attenuating them.
CLS_GAIN = 2.0
SUPPRESSION_THRESHOLD = 0.20      # Kill a YOLO box if classifier gives that class < 20%
INJECTION_THRESHOLD = 0.90        # Hard injection (cls * 0.85)
SOFT_INJECTION_THRESHOLD = 0.50   # Soft injection (cls * 0.60) — shows moderate classifier signals

NORM_STATS = {"mean": [0.54, 0.54, 0.54], "std": [0.2738, 0.2738, 0.2738]}

PER_CLASS = {
    "tumor_xray":   {"conf_thr": 0.25},
    "tuberculosis": {"conf_thr": 0.20},
    "pneumonia":    {"conf_thr": 0.15},
}

class LungAIEnsembleEngine:
    """
    Ensembled inference engine (Notebook V4 logic).
    YOLOv12m for detection + EfficientNet-B0 for classification refinement.
    """

    def __init__(self, det_weights: str, cls_weights: str, device: str = "cpu"):
        self.device = device
        self.det_weights = det_weights
        self.cls_weights = cls_weights
        self.img_size_det = 640
        self.img_size_cls = 384
        
        self.det_model = self._load_yolo()
        self.cls_model = self._load_classifier()

        # Grad-CAM target: last MBConv block of EfficientNet-B0.
        self.gradcam_target_layer = self.cls_model.blocks[-1]

        self.cls_tfm = A.Compose([
            A.Resize(self.img_size_cls, self.img_size_cls),
            A.Normalize(mean=NORM_STATS["mean"], std=NORM_STATS["std"]),
            ToTensorV2(),
        ])

    def _load_yolo(self) -> YOLO:
        logger.info(f"Loading YOLOv12m from {self.det_weights}")
        model = YOLO(self.det_weights)
        model.to(self.device)
        return model

    def _load_classifier(self):
        logger.info(f"Loading EfficientNet-B0 from {self.cls_weights}")
        model = timm.create_model("efficientnet_b0", pretrained=False, num_classes=len(DISEASE_CLASSES))

        # Checkpoint is a training-time wrapper dict (keys: "model",
        # "backbone", "class_names", "norm_stats", "auc"), not a raw
        # state_dict. Unwrap to the real weights.
        checkpoint = torch.load(self.cls_weights, map_location=self.device)
        if isinstance(checkpoint, dict):
            # Training-time wrappers often nest the weights under "model" or "state_dict"
            state_dict = (
                checkpoint.get("state_dict")
                or checkpoint.get("model")
                or checkpoint.get("backbone")
                or checkpoint
            )
        else:
            state_dict = checkpoint

        # Deep Unwrapping: If the inner dict still has metadata keys but not weights, it might be double-wrapped
        if isinstance(state_dict, dict) and "model" in state_dict and "conv_stem.weight" not in state_dict:
             logger.info("Double-wrapping detected in state_dict, unwrapping inner 'model' key")
             state_dict = state_dict["model"]

        if isinstance(state_dict, dict) and state_dict:
            sample_key = next(iter(state_dict))
            # Handle DistributedDataParallel or similar prefixes
            for prefix in ("module.", "model."):
                if sample_key.startswith(prefix):
                    state_dict = {k[len(prefix):]: v for k, v in state_dict.items()}
                    break

        missing, unexpected = model.load_state_dict(state_dict, strict=False)
        if missing:
            logger.warning(f"EfficientNet missing keys: {len(missing)} (first: {missing[:3]})")
        if unexpected:
            logger.warning(f"EfficientNet unexpected keys: {len(unexpected)} (first: {unexpected[:3]})")

        model.to(self.device)
        model.eval()
        return model

    def run_inference(self, pil_img: Image.Image, metadata: dict) -> tuple[list[dict], dict]:
        """
        Run ensembled inference:
        1. EfficientNet image-level classification.
        2. YOLOv12m detection.
        3. Aggressive fusion & hard filtering.
        """
        try:
            img_np = np.array(pil_img)
            
            # --- 1. Image-Level Classification ---
            cls_input = self.cls_tfm(image=img_np)["image"].unsqueeze(0).to(self.device)
            with torch.no_grad():
                logits = self.cls_model(cls_input)
                probs = torch.sigmoid(logits)[0].cpu().numpy().tolist()
            
            cls_probs = {CLASS_NAMES[i]: float(p) for i, p in enumerate(probs)}
            
            # --- 2. YOLO Detection ---
            results = self.det_model.predict(
                source=pil_img,
                imgsz=self.img_size_det,
                conf=0.1, # Fusion threshold
                iou=0.45,
                device=self.device,
                verbose=False
            )
            r = results[0]
            
            det_boxes = []
            det_scores = []
            det_labels = []
            
            if r.boxes is not None and len(r.boxes) > 0:
                det_boxes = r.boxes.xyxy.cpu().numpy()
                det_scores = r.boxes.conf.cpu().numpy()
                det_labels = r.boxes.cls.cpu().numpy().astype(int)
            
            # --- 3. Aggressive Fusion ---
            final_predictions = []
            keep_classes = set()
            
            for i in range(len(det_boxes)):
                cls_idx = det_labels[i]
                cn = CLASS_NAMES[cls_idx]
                p_cls = cls_probs[cn]
                s_det = det_scores[i]
                
                # Fusion score
                fused_score = float(np.clip(s_det * (1.0 + CLS_GAIN * (p_cls - 0.5)), 0.0, 1.0))
                
                logger.info(f"[ENSEMBLE] {cn}: yolo={s_det:.3f}, cls={p_cls:.3f}, fused={fused_score:.3f}")

                # Hard suppression: classifier says < 5%
                if p_cls < SUPPRESSION_THRESHOLD:
                    logger.warning(f"[SUPPRESSION] Rejecting {cn} due to low classifier confidence ({p_cls:.3f})")
                    continue
                    
                # Per-class threshold
                curr_thr = PER_CLASS.get(cn, {"conf_thr": 0.2})["conf_thr"]
                if fused_score >= curr_thr:
                    final_predictions.append(self._format_box(det_boxes[i], fused_score, cn, metadata))
                    keep_classes.add(cls_idx)
                else:
                    logger.info(f"[THRESHOLD] {cn} fused score {fused_score:.3f} below threshold {curr_thr}")
            
            # --- 4. Hard Injection ---
            # Hard injection at cls > 0.90 (score = cls * 0.85)
            # Soft injection at cls in [0.50, 0.90] (score = cls * 0.60) — surfaces
            # moderate classifier confidence the radiologist would otherwise miss
            # since YOLO never localized it.
            for ci, cn in enumerate(CLASS_NAMES):
                if ci in keep_classes:
                    continue
                p_cls = cls_probs[cn]
                if p_cls > INJECTION_THRESHOLD:
                    tier, gain = "hard", 0.85
                elif p_cls > SOFT_INJECTION_THRESHOLD:
                    tier, gain = "soft", 0.60
                else:
                    continue

                logger.info(f"{tier.capitalize()} injection triggered for {cn} (p={p_cls:.2f})")

                img_h, img_w = img_np.shape[:2]
                bbox, polygon = self._gradcam_bbox(cls_input, ci, img_h, img_w)

                if bbox is None:
                    logger.info(f"[GRADCAM] {cn}: degenerate heatmap, using lung-area fallback")
                    bbox = [img_w*0.05, img_h*0.05, img_w*0.95, img_h*0.95]
                    polygon = None
                else:
                    logger.info(f"[GRADCAM] {cn}: localized to bbox {bbox}")

                fallback_score = p_cls * gain
                final_predictions.append(self._format_box(bbox, fallback_score, cn, metadata, polygon))

            return final_predictions, cls_probs

        except Exception as e:
            logger.error(f"Ensemble inference error: {e}", exc_info=True)
            raise e

    def _format_box(self, box, score, label, metadata, mask=None):
        """Map detection coordinates (and optional polygon) from crop back to original image."""
        x1, y1, x2, y2 = box
        crop = metadata.get("crop", {})
        dx = float(crop["xmin"]) if crop.get("cropped") else 0.0
        dy = float(crop["ymin"]) if crop.get("cropped") else 0.0
        x1 += dx
        y1 += dy
        x2 += dx
        y2 += dy

        orig_w = metadata["orig_width"]
        orig_h = metadata["orig_height"]
        x1 = max(0.0, min(x1, orig_w))
        y1 = max(0.0, min(y1, orig_h))
        x2 = max(0.0, min(x2, orig_w))
        y2 = max(0.0, min(y2, orig_h))

        formatted = {
            "disease_class": label,
            "confidence_score": round(float(score), 3),
            "bounding_box": {
                "x": round(float(x1), 2),
                "y": round(float(y1), 2),
                "w": round(float(x2 - x1), 2),
                "h": round(float(y2 - y1), 2),
            }
        }

        if mask:
            mapped_mask = []
            for pt in mask:
                mx, my = float(pt[0]) + dx, float(pt[1]) + dy
                mx = max(0.0, min(mx, orig_w))
                my = max(0.0, min(my, orig_h))
                mapped_mask.append([round(mx, 2), round(my, 2)])
            formatted["segmentation"] = mapped_mask

        return formatted

    def _gradcam_bbox(self, cls_input: torch.Tensor, target_class_idx: int, img_h: int, img_w: int):
        """
        Localize the classifier's attention for target_class_idx using Grad-CAM.
        Returns (bbox [x1,y1,x2,y2], polygon [[x,y],...]) in pil_img coords,
        or (None, None) if the heatmap is degenerate (caller falls back to full lung).
        """
        activations = {}
        gradients = {}

        def fwd_hook(_module, _inp, out):
            activations["v"] = out

        def bwd_hook(_module, _grad_input, grad_output):
            gradients["v"] = grad_output[0]

        h1 = self.gradcam_target_layer.register_forward_hook(fwd_hook)
        h2 = self.gradcam_target_layer.register_full_backward_hook(bwd_hook)

        try:
            cls_input_g = cls_input.detach().clone().requires_grad_(True)
            self.cls_model.zero_grad(set_to_none=True)
            logits = self.cls_model(cls_input_g)
            score = torch.sigmoid(logits[0, target_class_idx])
            score.backward()

            acts = activations["v"][0]
            grads = gradients["v"][0]
            weights = grads.mean(dim=(1, 2))
            cam = (weights[:, None, None] * acts).sum(dim=0)
            cam = torch.relu(cam).detach().cpu().numpy()

            if cam.size == 0 or not np.isfinite(cam).all() or cam.max() <= 0:
                return None, None
            cam = cam / cam.max()

            cam_resized = cv2.resize(cam, (img_w, img_h), interpolation=cv2.INTER_LINEAR)
            threshold = float(np.quantile(cam_resized, GRADCAM_QUANTILE))
            mask = (cam_resized > threshold).astype(np.uint8)
            if mask.sum() < 100:
                return None, None

            num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
            if num_labels <= 1:
                return None, None
            largest_idx = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
            x, y, w, h, _ = stats[largest_idx]
            bbox = [float(x), float(y), float(x + w), float(y + h)]

            comp_mask = (labels == largest_idx).astype(np.uint8) * 255
            contours, _ = cv2.findContours(comp_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            polygon = None
            if contours:
                biggest = max(contours, key=cv2.contourArea)
                polygon = [[float(pt[0][0]), float(pt[0][1])] for pt in biggest]

            return bbox, polygon
        except Exception as e:
            logger.warning(f"[GRADCAM] localization failed for class {target_class_idx}: {e}")
            return None, None
        finally:
            h1.remove()
            h2.remove()
