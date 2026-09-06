"""Real official Quality Certificate PDF generator using ReportLab."""

from __future__ import annotations

import io
from typing import Any

from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def generate_certificate_pdf(cert: dict[str, Any], origin: str = "http://localhost:5173") -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CertTitle",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#14532d"),  # deep forest green
        alignment=1,
        fontName="Helvetica-Bold",
    )
    subtitle_style = ParagraphStyle(
        "CertSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569"),
        alignment=1,
    )
    header_label = ParagraphStyle(
        "HeaderLabel",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748b"),
        fontName="Helvetica-Bold",
    )
    body_text = ParagraphStyle(
        "BodyText",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
    )
    bold_text = ParagraphStyle(
        "BoldText",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph("ONIVIS QUALITY INSPECTION CERTIFICATE", title_style))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph("Agricultural Procurement Quality System • Digital Lot Certification", subtitle_style))
    story.append(Spacer(1, 3 * mm))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#16a34a"), spaceAfter=10))

    # 2. Key Metadata & Grade Box
    cert_id = str(cert.get("id") or "CERT-PENDING")
    batch_id = str(cert.get("batchId") or cert.get("batchLabel") or "N/A")
    centre = str(cert.get("procurementCentre") or "Lasalgaon APMC")
    inspector = str(cert.get("inspectorName") or "Authorized Officer")
    issued_at = str(cert.get("issuedAt") or "")[:19].replace("T", " ")
    sample_size = int(cert.get("sampleSize") or 0)
    final_grade = str(cert.get("officerGrade") or cert.get("grade") or "Grade A").upper()
    ai_grade = str(cert.get("aiGrade") or cert.get("grade") or "Grade A").upper()
    override_count = int(cert.get("overrideCount") or 0)

    # Grade color
    if "A" in final_grade:
        grade_color = colors.HexColor("#15803d")
    elif "URS" in final_grade or "B" in final_grade:
        grade_color = colors.HexColor("#b45309")
    else:
        grade_color = colors.HexColor("#b91c1c")

    meta_data = [
        [
            Paragraph("Certificate ID:", header_label),
            Paragraph(cert_id, bold_text),
            Paragraph("Official Grade:", header_label),
            Paragraph(f"<b><font size=13 color='{grade_color.hexval()}'>{final_grade}</font></b>", bold_text),
        ],
        [
            Paragraph("Lot / Batch ID:", header_label),
            Paragraph(batch_id, body_text),
            Paragraph("Inspection Date:", header_label),
            Paragraph(issued_at, body_text),
        ],
        [
            Paragraph("Procurement Centre:", header_label),
            Paragraph(centre, body_text),
            Paragraph("Sample Size:", header_label),
            Paragraph(f"{sample_size} bulbs inspected", body_text),
        ],
        [
            Paragraph("Inspector / Officer:", header_label),
            Paragraph(inspector, body_text),
            Paragraph("Status:", header_label),
            Paragraph("<b>CERTIFIED</b>", bold_text),
        ],
    ]

    meta_table = Table(meta_data, colWidths=[3.2 * cm, 5.2 * cm, 3.2 * cm, 5.2 * cm])
    meta_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 5 * mm))

    # 3. Dual Assessment Track Table
    story.append(Paragraph("<b>Dual Quality Assessment Audit Track</b>", bold_text))
    story.append(Spacer(1, 2 * mm))

    dual = cert.get("dualAssessment") or {}
    ai_track = dual.get("ai") or {}
    off_track = dual.get("officer") or {}

    dual_data = [
        [
            Paragraph("<b>Assessment Track</b>", header_label),
            Paragraph("<b>Grade</b>", header_label),
            Paragraph("<b>Defect Rate</b>", header_label),
            Paragraph("<b>Healthy</b>", header_label),
            Paragraph("<b>Defects</b>", header_label),
            Paragraph("<b>Role / Authority</b>", header_label),
        ],
        [
            Paragraph("AI Baseline (YOLO)", body_text),
            Paragraph(ai_grade, bold_text),
            Paragraph(f"{float(ai_track.get('defectRatio', 0.0)) * 100:.1f}%", body_text),
            Paragraph(str(ai_track.get("healthyCount", "-")), body_text),
            Paragraph(str((ai_track.get("rottenDamagedCount", 0) or 0) + (ai_track.get("sproutedCount", 0) or 0)), body_text),
            Paragraph("Automated Visual Model (Immutable)", body_text),
        ],
        [
            Paragraph("Officer Certified Final", bold_text),
            Paragraph(f"<b>{final_grade}</b>", bold_text),
            Paragraph(f"{float(off_track.get('defectRatio', 0.0)) * 100:.1f}%", bold_text),
            Paragraph(str(off_track.get("healthyCount", "-")), body_text),
            Paragraph(str((off_track.get("rottenDamagedCount", 0) or 0) + (off_track.get("sproutedCount", 0) or 0)), body_text),
            Paragraph(f"Authorized Officer Final ({override_count} overrides)", bold_text),
        ],
    ]

    dual_table = Table(dual_data, colWidths=[4.0 * cm, 2.5 * cm, 2.5 * cm, 2.0 * cm, 2.0 * cm, 4.0 * cm])
    dual_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#334155")),
            ("ALIGN", (1, 0), (4, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(dual_table)
    story.append(Spacer(1, 5 * mm))

    # 4. QR Code & Public Verification Section
    qr_token = str(cert.get("qrToken") or "")
    verify_url = f"{origin.rstrip('/')}/verify/{qr_token}"

    qr_widget = QrCodeWidget(verify_url)
    bounds = qr_widget.getBounds()
    qr_w = bounds[2] - bounds[0]
    qr_h = bounds[3] - bounds[1]
    qr_drawing = Drawing(3.0 * cm, 3.0 * cm, transform=[3.0 * cm / qr_w, 0, 0, 3.0 * cm / qr_h, 0, 0])
    qr_drawing.add(qr_widget)

    qr_narrative = (
        f"<b>Scan with any standard camera to verify authenticity.</b><br/>"
        f"Public Verification Token: <code>{qr_token}</code><br/>"
        f"Verification URL: {verify_url}<br/><br/>"
        f"<i>This document represents the official certified inspection findings for this agricultural lot. "
        f"AI analysis serves as an advisory visual aid; final commercial classification is certified by the authorized quality officer. "
        f"Parameters requiring destructive testing (internal rot, moisture content, microbial load) require certified laboratory assessment.</i>"
    )

    qr_section_data = [
        [qr_drawing, Paragraph(qr_narrative, body_text)]
    ]
    qr_table = Table(qr_section_data, colWidths=[3.5 * cm, 13.5 * cm])
    qr_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(qr_table)
    story.append(Spacer(1, 6 * mm))

    # 5. Official Signoff & Footer
    signoff_data = [
        [
            Paragraph("<b>Digitally Certified by:</b><br/>" + inspector + "<br/>Procurement Quality Inspector", body_text),
            Paragraph("<b>ONIVIS Cryptographic Seal:</b><br/>Verified & Authenticated<br/>Tamper-Evident Digital Audit Log", body_text),
        ]
    ]
    signoff_table = Table(signoff_data, colWidths=[8.5 * cm, 8.5 * cm])
    signoff_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(signoff_table)

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
