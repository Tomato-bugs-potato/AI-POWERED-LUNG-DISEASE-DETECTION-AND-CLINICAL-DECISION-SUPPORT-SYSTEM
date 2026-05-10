import io
import re
import uuid
import datetime
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML
import base64


_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def _strip_html(value: str | None) -> str:
    """Convert rich-text HTML notes to plain text for the PDF.

    The rich-text editor stores notes as HTML (<p>, <strong>, lists). Jinja
    autoescape would otherwise render those tags as literal text in the PDF.
    """
    if not value:
        return ""
    text = _TAG_RE.sub(" ", value)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&")
    text = text.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"')
    return _WS_RE.sub(" ", text).strip()

def generate_pdf_report(
    case_data: dict, 
    patient_data: dict, 
    original_img_bytes: bytes,
    annotated_img_bytes: bytes,
    ai_results: dict,
    review_data: dict,
    diagnosis_data: dict,
    hospital_data: dict
) -> bytes:
    """
    Generates a PDF using Jinja2 HTML templating and WeasyPrint according to spec 6.3.
    """
    # 1. Base64 encode images for embedding in HTML
    orig_b64 = base64.b64encode(original_img_bytes).decode('utf-8')
    anno_b64 = base64.b64encode(annotated_img_bytes).decode('utf-8')
    
    # 2. Single-page A4 template. Sized for clinic-default A4; sections use
    # tight typography so a normal case (≤6 predictions, short notes) fits
    # without overflow. Page-break-avoidance is set on every section.
    template_str = """
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @page {
                size: A4;
                margin: 10mm 12mm;
            }
            html, body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 8.5pt;
                line-height: 1.25;
                color: #1f2937;
                margin: 0;
                padding: 0;
            }
            .section { margin-bottom: 6px; page-break-inside: avoid; }
            h1 { font-size: 13pt; margin: 0 0 1px 0; color: #111827; }
            h2 {
                font-size: 8.5pt;
                margin: 0 0 3px 0;
                color: #2c3e50;
                border-bottom: 1px solid #d1d5db;
                padding-bottom: 1px;
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }
            h3 { font-size: 7.5pt; margin: 0 0 2px 0; color: #374151; font-weight: 600; }
            p { margin: 1px 0; }
            .header { text-align: center; margin-bottom: 7px; padding-bottom: 5px; border-bottom: 1.5px solid #2c3e50; }
            .header .sub { font-size: 7.5pt; color: #6b7280; margin-top: 1px; }
            .meta-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 4px 12px;
                margin-bottom: 6px;
            }
            .meta-cell { font-size: 8pt; }
            .meta-cell .label { color: #6b7280; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.04em; }
            .images { display: flex; gap: 8px; margin: 4px 0; }
            .img-container { flex: 1; text-align: center; }
            .img-container img {
                max-width: 100%;
                max-height: 230px;
                height: auto;
                object-fit: contain;
                border: 1px solid #d1d5db;
            }
            table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
            th, td { border: 1px solid #d1d5db; padding: 2px 5px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: 600; }
            .critical { color: #dc2626; font-weight: 700; }
            .two-col {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }
            .notes-body {
                font-size: 8pt;
                white-space: pre-wrap;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 6;
                -webkit-box-orient: vertical;
            }
            .footer {
                position: fixed;
                bottom: 4mm;
                left: 12mm;
                right: 12mm;
                text-align: center;
                font-size: 6.5pt;
                color: #9ca3af;
                border-top: 1px solid #e5e7eb;
                padding-top: 2px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>{{ hospital.name }}</h1>
            <div class="sub">Clinical Diagnostic Report &middot; {{ generated_at }} &middot; Report ID: {{ report_id[:8] }}</div>
        </div>

        <div class="meta-grid">
            <div class="meta-cell">
                <span class="label">Patient</span>
                <div>ID {{ patient.id }} &middot; Age {{ patient.age }} &middot; Sex {{ patient.sex }} &middot; Consent: {% if patient.consent %}Recorded{% else %}Not Recorded{% endif %}</div>
            </div>
            <div class="meta-cell">
                <span class="label">Case</span>
                <div>ID {{ case.id[:13] }} &middot; Visit {{ case.visit_date }} &middot; Urgency: <span class="{% if diagnosis.urgency == 'Critical' %}critical{% endif %}">{{ diagnosis.urgency }}</span></div>
            </div>
        </div>

        <div class="section images">
            <div class="img-container">
                <h3>Original Radiograph</h3>
                <img src="data:image/png;base64,{{ orig_img }}" alt="Original">
            </div>
            <div class="img-container">
                <h3>AI Findings (Annotated)</h3>
                <img src="data:image/png;base64,{{ anno_img }}" alt="Annotated">
            </div>
        </div>

        <div class="section">
            <h2>AI Model Findings &middot; v{{ ai.model_version }}</h2>
            <table>
                <tr>
                    <th style="width: 35%;">Disease Class</th>
                    <th style="width: 20%;">Confidence</th>
                    <th>Location (x, y, w, h)</th>
                </tr>
                {% for pred in ai.predictions[:6] %}
                <tr>
                    <td>{{ pred.disease_class if pred.disease_class else 'Unknown' }}</td>
                    <td>{{ "%.1f"|format((pred.confidence_score or 0) * 100) }}%</td>
                    <td>
                        {% if pred.bounding_box %}
                        ({{ "%.0f"|format(pred.bounding_box.x or 0) }}, {{ "%.0f"|format(pred.bounding_box.y or 0) }}, {{ "%.0f"|format(pred.bounding_box.w or 0) }}, {{ "%.0f"|format(pred.bounding_box.h or 0) }})
                        {% else %}
                        N/A
                        {% endif %}
                    </td>
                </tr>
                {% else %}
                <tr><td colspan="3">No findings reported by AI.</td></tr>
                {% endfor %}
                {% if ai.predictions|length > 6 %}
                <tr><td colspan="3" style="font-style: italic; color: #6b7280;">+ {{ ai.predictions|length - 6 }} additional findings omitted for brevity</td></tr>
                {% endif %}
            </table>
        </div>

        <div class="section two-col">
            <div>
                <h2>Radiologist Review</h2>
                <p><strong>By:</strong> {{ review.radiologist_name }}</p>
                <div class="notes-body">{{ review.notes|striphtml or 'None' }}</div>
            </div>
            <div>
                <h2>Final Diagnosis</h2>
                <p><strong>By:</strong> Dr. {{ diagnosis.doctor_name }}</p>
                <p><strong>Primary:</strong> {{ diagnosis.primary }}</p>
                <div class="notes-body">{{ diagnosis.notes|striphtml or 'No notes.' }}</div>
            </div>
        </div>

        <div class="section">
            <h2>Treatment Recommendations</h2>
            <div class="notes-body">{{ diagnosis.treatment|striphtml or 'N/A' }}</div>
        </div>

        <div class="footer">
            Auto-generated by the Clinical Decision Support System &middot; Confidential medical record &middot; Do not distribute
        </div>
    </body>
    </html>
    """

    env = Environment(autoescape=select_autoescape(['html', 'xml']))
    env.filters["striphtml"] = _strip_html
    template = env.from_string(template_str)
    
    html_content = template.render(
        generated_at=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        report_id=str(uuid.uuid4()),
        hospital=hospital_data,
        patient=patient_data,
        case=case_data,
        ai=ai_results,
        review=review_data,
        diagnosis=diagnosis_data,
        orig_img=orig_b64,
        anno_img=anno_b64
    )

    # 3. Compile HTML to PDF Bytes using WeasyPrint
    pdf_bytes = HTML(string=html_content).write_pdf()
    return pdf_bytes
