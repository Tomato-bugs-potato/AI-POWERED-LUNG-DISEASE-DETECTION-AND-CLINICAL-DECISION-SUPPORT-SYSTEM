import logging
import torch
import torchvision
import torchvision.transforms.v2 as transforms
from PIL import Image
from cjm_yolox_pytorch.model import build_model
from cjm_pil_utils.core import resize_img
from cjm_yolox_pytorch.inference import YOLOXInferenceWrapper

logger = logging.getLogger(__name__)

DISEASE_CLASSES = {
    0: "tumor" # You can expand this mapping if the model has more classes
}

class YOLOxInferenceEngine:
    def __init__(self, weights_path: str, device: str = "cpu"):
        self.device = device
        self.weights_path = weights_path
        self.train_sz = 256
        # The checkpoint was trained with 1 class (tumor)
        self.num_classes = 1
        self.class_names = ["tumor"]
        self.norm_stats = ([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        self.model, self.wrapped_model = self._load_model()
        
    def _load_model(self):
        logger.info(f"Loading YOLOx weights from {self.weights_path} onto {self.device}")
        
        # Load state dict first to dynamically determine num_classes
        state_dict = torch.load(self.weights_path, map_location=self.device)
        
        # Look for the last classification layer's bias to see how many classes there are
        # The key is usually something like 'bbox_head.multi_level_conv_cls.0.bias'
        detected_classes = self.num_classes
        try:
            for k in state_dict.keys():
                if "multi_level_conv_cls.0.bias" in k:
                    detected_classes = state_dict[k].shape[0]
                    break
        except Exception as e:
            logger.warning(f"Could not dynamically determine num_classes from checkpoint: {e}")
            
        if detected_classes != self.num_classes:
            logger.warning(f"Checkpoint has {detected_classes} classes, but {self.num_classes} were expected. Building model with {detected_classes} classes to prevent crash.")
            if detected_classes == 80:
                logger.warning("WARNING: This appears to be the generic COCO pretrained model! It will NOT accurately detect lung tumors. Please replace this with your fine-tuned 'best_model.pth' checkpoint.")
            self.num_classes = detected_classes
            
        # Build model with the dynamically detected number of classes
        model = build_model('yolox_tiny', self.num_classes, pretrained=False)
        model.load_state_dict(state_dict, strict=False)
        model.to(self.device)
        model.eval()
        
        # Create Inference Wrapper
        mean_t = torch.tensor(self.norm_stats[0]).view(1, 3, 1, 1).to(self.device)
        std_t = torch.tensor(self.norm_stats[1]).view(1, 3, 1, 1).to(self.device)
        wrapped_model = YOLOXInferenceWrapper(model, mean_t, std_t)
        
        return model, wrapped_model

    def _letterbox_image(self, img: Image.Image, expected_size: int):
        pw, ph = img.size
        scale = min(expected_size / pw, expected_size / ph)
        nw = int(pw * scale)
        nh = int(ph * scale)

        img_resized = img.resize((nw, nh), Image.Resampling.BILINEAR)
        # Pad with gray (114, 114, 114)
        new_img = Image.new('RGB', (expected_size, expected_size), (114, 114, 114))
        
        # Center the image
        dx = (expected_size - nw) // 2
        dy = (expected_size - nh) // 2
        new_img.paste(img_resized, (dx, dy))
        
        return new_img, scale, dx, dy

    def run_inference(self, img: Image.Image, metadata: dict) -> list[dict]:
        """
        Runs the forward pass on the image and returns mapped bounding boxes.
        """
        try:
            # 1. Letterbox resize to exact train size (256x256)
            padded_img, scale, dx, dy = self._letterbox_image(img, self.train_sz)
            
            # Prepare tensor [1, 3, 256, 256]
            input_t = transforms.Compose([
                transforms.ToImage(), 
                transforms.ToDtype(torch.float32, scale=True)
            ])(padded_img)[None].to(self.device)
            
            # Forward Pass. Output is already decoded by YOLOXInferenceWrapper
            # Shape: [1, num_boxes, 6] -> x0, y0, w, h, labels, max_probs
            with torch.no_grad():
                output = self.wrapped_model(input_t).cpu()
            
            # Filter by confidence
            conf_thresh = 0.3
            probs = output[0, :, 5]
            mask = probs > conf_thresh
            
            proposals = output[0, mask]
            
            predictions = []
            if len(proposals) > 0:
                # proposals are in xywh (x0, y0, w, h). Conversion to xyxy for NMS
                boxes = torchvision.ops.box_convert(proposals[:, :4], 'xywh', 'xyxy')
                proposal_scores = proposals[:, 5]
                
                # Apply Non-Maximum Suppression (NMS) to filter overlapping boxes
                nms_thresh = 0.45
                keep_indices = torchvision.ops.nms(boxes, proposal_scores, nms_thresh)
                
                for idx in keep_indices:
                    box = proposals[idx].numpy()
                    score = float(proposal_scores[idx].item())
                    
                    # x0, y0, w, h
                    px, py, pw, ph = box[0], box[1], box[2], box[3]
                    
                    # Reverse letterbox padding and scaling
                    x0 = (px - dx) / scale
                    y0 = (py - dy) / scale
                    w = pw / scale
                    h = ph / scale
                    
                    # Constrain x,y within original image bounds
                    orig_w, orig_h = metadata["orig_width"], metadata["orig_height"]
                    x1 = max(0, min(x0, orig_w))
                    y1 = max(0, min(y0, orig_h))
                    x2 = max(0, min(x0 + w, orig_w))
                    y2 = max(0, min(y0 + h, orig_h))
                    
                    final_w = x2 - x1
                    final_h = y2 - y1
                    
                    # Only add if it's a valid box
                    if final_w > 0 and final_h > 0:
                        predictions.append({
                            "disease_class": "Lung Tumor", # Model fine-tuned for tumor detection
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
