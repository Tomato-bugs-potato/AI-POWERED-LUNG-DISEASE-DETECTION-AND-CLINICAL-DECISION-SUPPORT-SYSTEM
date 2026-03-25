import logging
import torch
import torchvision
import torchvision.transforms.v2 as transforms
from PIL import Image
from cjm_yolox_pytorch.model import build_model
from cjm_pil_utils.core import resize_img
from cjm_yolox_pytorch.inference import YOLOXInferenceWrapper

logger = logging.getLogger(__name__)

# FR-09: Three disease classes
DISEASE_CLASSES = {
    0: "Pneumonia",
    1: "Tuberculosis",
    2: "Lung Tumor",
}


class YOLOxInferenceEngine:
    def __init__(self, weights_path: str, device: str = "cpu"):
        self.device = device
        self.weights_path = weights_path
        self.train_sz = 640  # FR-08: YOLOx standard input resolution
        self.num_classes = 3  # FR-09: Pneumonia, TB, Lung Tumor
        self.class_names = ["Pneumonia", "Tuberculosis", "Lung Tumor"]
        self.norm_stats = ([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        self.model, self.wrapped_model = self._load_model()

    def _load_model(self):
        logger.info(f"Loading YOLOx weights from {self.weights_path} onto {self.device}")

        state_dict = torch.load(self.weights_path, map_location=self.device)

        # Dynamically determine num_classes from checkpoint
        detected_classes = self.num_classes
        try:
            for k in state_dict.keys():
                if "multi_level_conv_cls.0.bias" in k:
                    detected_classes = state_dict[k].shape[0]
                    break
        except Exception as e:
            logger.warning(f"Could not dynamically determine num_classes from checkpoint: {e}")

        if detected_classes != self.num_classes:
            logger.warning(
                f"Checkpoint has {detected_classes} classes, but {self.num_classes} were expected. "
                f"Building model with {detected_classes} classes to prevent crash."
            )
            if detected_classes == 80:
                logger.warning(
                    "WARNING: This appears to be the generic COCO pretrained model! "
                    "It will NOT accurately detect lung diseases. "
                    "Please replace with your fine-tuned 3-class checkpoint."
                )
            self.num_classes = detected_classes

        # Build model — use yolox_tiny as fallback until YOLOx-M weights are available
        # TODO: Switch to 'yolox_m' once retrained model weights are available (TECH-02)
        model_variant = 'yolox_tiny'  # Will be 'yolox_m' after retraining
        model = build_model(model_variant, self.num_classes, pretrained=False)
        model.load_state_dict(state_dict, strict=False)
        model.to(self.device)
        model.eval()

        mean_t = torch.tensor(self.norm_stats[0]).view(1, 3, 1, 1).to(self.device)
        std_t = torch.tensor(self.norm_stats[1]).view(1, 3, 1, 1).to(self.device)
        wrapped_model = YOLOXInferenceWrapper(model, mean_t, std_t)

        logger.info(f"Model loaded: variant={model_variant}, classes={self.num_classes}, input_size={self.train_sz}")
        return model, wrapped_model

    def _letterbox_image(self, img: Image.Image, expected_size: int):
        pw, ph = img.size
        scale = min(expected_size / pw, expected_size / ph)
        nw = int(pw * scale)
        nh = int(ph * scale)

        img_resized = img.resize((nw, nh), Image.Resampling.BILINEAR)
        new_img = Image.new('RGB', (expected_size, expected_size), (114, 114, 114))

        dx = (expected_size - nw) // 2
        dy = (expected_size - nh) // 2
        new_img.paste(img_resized, (dx, dy))

        return new_img, scale, dx, dy

    def run_inference(self, img: Image.Image, metadata: dict) -> list[dict]:
        """Runs the forward pass on the image and returns mapped bounding boxes."""
        try:
            # 1. Letterbox resize to train size (640x640)
            padded_img, scale, dx, dy = self._letterbox_image(img, self.train_sz)

            # Prepare tensor [1, 3, 640, 640]
            input_t = transforms.Compose([
                transforms.ToImage(),
                transforms.ToDtype(torch.float32, scale=True)
            ])(padded_img)[None].to(self.device)

            # Forward pass
            with torch.no_grad():
                output = self.wrapped_model(input_t).cpu()

            # Filter by confidence — use low threshold to store all predictions
            # Frontend confidence slider (FR-15, default 50%) handles display filtering
            conf_thresh = 0.1
            probs = output[0, :, 5]
            mask = probs > conf_thresh

            proposals = output[0, mask]

            predictions = []
            if len(proposals) > 0:
                boxes = torchvision.ops.box_convert(proposals[:, :4], 'xywh', 'xyxy')
                proposal_scores = proposals[:, 5]

                # Non-Maximum Suppression
                nms_thresh = 0.45
                keep_indices = torchvision.ops.nms(boxes, proposal_scores, nms_thresh)

                for idx in keep_indices:
                    box = proposals[idx].numpy()
                    score = float(proposal_scores[idx].item())

                    px, py, pw, ph = box[0], box[1], box[2], box[3]

                    # Reverse letterbox padding and scaling
                    x0 = (px - dx) / scale
                    y0 = (py - dy) / scale
                    w = pw / scale
                    h = ph / scale

                    orig_w, orig_h = metadata["orig_width"], metadata["orig_height"]
                    x1 = max(0, min(x0, orig_w))
                    y1 = max(0, min(y0, orig_h))
                    x2 = max(0, min(x0 + w, orig_w))
                    y2 = max(0, min(y0 + h, orig_h))

                    final_w = x2 - x1
                    final_h = y2 - y1

                    if final_w > 0 and final_h > 0:
                        # FR-09: Dynamic class lookup from model output
                        class_idx = int(box[4]) if len(box) > 4 else 0
                        disease_class = DISEASE_CLASSES.get(class_idx, "Unknown")

                        predictions.append({
                            "disease_class": disease_class,
                            "confidence_score": round(score, 3),
                            "bounding_box": {
                                "x": round(float(x1), 2),
                                "y": round(float(y1), 2),
                                "w": round(float(final_w), 2),
                                "h": round(float(final_h), 2)
                            }
                        })

            return predictions

        except Exception as e:
            logger.error(f"Inference error: {e}", exc_info=True)
            raise e
