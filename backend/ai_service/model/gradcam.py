"""
Grad-CAM heatmap generation for YOLOX model explainability (TECH-02).
Generates class activation maps to visualize which image regions influenced the model's predictions.
"""
import logging
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image, ImageFilter

logger = logging.getLogger(__name__)


class GradCAM:
    """Grad-CAM implementation for YOLOX backbone feature visualization."""

    def __init__(self, model, target_layer=None):
        self.model = model
        self.gradients = None
        self.activations = None
        self.hooks = []

        # Default: target the last layer of the backbone
        if target_layer is None:
            target_layer = self._find_last_conv_layer(model)

        if target_layer is not None:
            self.hooks.append(
                target_layer.register_forward_hook(self._save_activation)
            )
            self.hooks.append(
                target_layer.register_full_backward_hook(self._save_gradient)
            )
            logger.info(f"Grad-CAM attached to layer: {target_layer.__class__.__name__}")
        else:
            logger.warning("Could not find a convolutional layer for Grad-CAM")

    def _find_last_conv_layer(self, model):
        """Walk the model tree and return the last Conv2d layer."""
        last_conv = None
        for module in model.modules():
            if isinstance(module, torch.nn.Conv2d):
                last_conv = module
        return last_conv

    def _save_activation(self, module, input, output):
        self.activations = output.detach()

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate(self, input_tensor: torch.Tensor, class_idx: int = None) -> np.ndarray:
        """
        Generate a Grad-CAM heatmap.

        Args:
            input_tensor: Preprocessed image tensor [1, 3, H, W]
            class_idx: Target class index. If None, uses the predicted class.

        Returns:
            Heatmap as numpy array [H, W] with values in [0, 1]
        """
        self.model.eval()
        input_tensor.requires_grad_(True)

        # Forward pass
        output = self.model(input_tensor)

        if class_idx is None:
            # Use the highest confidence prediction
            if output.dim() == 3:
                scores = output[0, :, 5] if output.shape[-1] > 5 else output[0, :, -1]
                class_idx = 0
            else:
                class_idx = 0

        # Create a target for backward pass
        self.model.zero_grad()

        if output.dim() == 3 and output.shape[-1] > 5:
            target = output[0, :, 5].max()
        else:
            target = output.sum()

        target.backward(retain_graph=True)

        if self.gradients is None or self.activations is None:
            logger.warning("Grad-CAM: No gradients or activations captured")
            return np.zeros((input_tensor.shape[2], input_tensor.shape[3]))

        # Compute weights by global average pooling the gradients
        weights = torch.mean(self.gradients, dim=[2, 3], keepdim=True)

        # Weighted combination of activation maps
        cam = torch.sum(weights * self.activations, dim=1, keepdim=True)
        cam = F.relu(cam)

        # Normalize
        cam = cam.squeeze().cpu().numpy()
        if cam.max() > 0:
            cam = cam / cam.max()

        # Resize to input dimensions
        cam_resized = np.array(
            Image.fromarray((cam * 255).astype(np.uint8)).resize(
                (input_tensor.shape[3], input_tensor.shape[2]),
                Image.Resampling.BILINEAR
            )
        ).astype(np.float32) / 255.0

        return cam_resized

    def cleanup(self):
        """Remove hooks."""
        for hook in self.hooks:
            hook.remove()
        self.hooks = []


def generate_heatmap_overlay(
    original_img: Image.Image,
    heatmap: np.ndarray,
    alpha: float = 0.4,
    colormap: str = "jet",
) -> Image.Image:
    """
    Overlay a Grad-CAM heatmap on the original image.

    Args:
        original_img: Original PIL Image (RGB)
        heatmap: Numpy array [H, W] in [0, 1]
        alpha: Overlay transparency
        colormap: Matplotlib-style colormap name

    Returns:
        PIL Image with heatmap overlay
    """
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.cm as cm

    # Resize heatmap to match original image
    heatmap_resized = np.array(
        Image.fromarray((heatmap * 255).astype(np.uint8)).resize(
            original_img.size, Image.Resampling.BILINEAR
        )
    ).astype(np.float32) / 255.0

    # Apply colormap
    cmap = cm.get_cmap(colormap)
    heatmap_colored = cmap(heatmap_resized)[:, :, :3]  # Drop alpha channel
    heatmap_colored = (heatmap_colored * 255).astype(np.uint8)

    heatmap_img = Image.fromarray(heatmap_colored)

    # Blend
    overlay = Image.blend(original_img.convert('RGB'), heatmap_img, alpha=alpha)
    return overlay
