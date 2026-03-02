import io
from PIL import Image, ImageDraw, ImageFont

def render_annotated_image(image_bytes: bytes, predictions: list[dict]) -> bytes:
    """
    Takes original image bytes and draws bounding boxes/labels for AI findings.
    """
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode != 'RGB':
        img = img.convert('RGB')
        
    draw = ImageDraw.Draw(img)
    
    # Optional: Load a better font if available, fallback to default
    try:
        font = ImageFont.truetype("arial.ttf", size=24)
    except IOError:
        font = ImageFont.load_default()

    box_colors = {
        "Pneumonia": "red",
        "Tuberculosis": "yellow",
        "Lung_Tumor": "orange"
    }

    for pred in predictions:
        class_name = pred.get("disease_class", "Unknown")
        conf = pred.get("confidence_score", 0.0) * 100
        box = pred.get("bounding_box", {})
        
        x, y = box.get("x", 0), box.get("y", 0)
        w, h = box.get("w", 0), box.get("h", 0)
        
        # Draw Rectangle (Left, Top, Right, Bottom)
        color = box_colors.get(class_name, "red")
        draw.rectangle([x, y, x + w, y + h], outline=color, width=4)
        
        # Draw Label text above box
        label = f"{class_name} {conf:.1f}%"
        
        # Get text bounding box for background
        text_bbox = draw.textbbox((x, y - 30), label, font=font)
        draw.rectangle(text_bbox, fill=color)
        draw.text((x, y - 30), label, fill="black", font=font)

    # Export back to bytes
    output = io.BytesIO()
    img.save(output, format="PNG")
    return output.getvalue()
