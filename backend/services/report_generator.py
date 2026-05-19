from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from datetime import datetime, timezone
import io


def generate_report(job_title: str, rankings: list, bias_report: dict, explanations: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)

    styles = getSampleStyleSheet()
    story = []

    # Title styles
    title_style = ParagraphStyle("Title", parent=styles["Heading1"],
                                  fontSize=20, spaceAfter=6, textColor=colors.HexColor("#1a1a2e"))
    heading_style = ParagraphStyle("Heading", parent=styles["Heading2"],
                                    fontSize=13, spaceAfter=4, textColor=colors.HexColor("#16213e"))
    body_style = ParagraphStyle("Body", parent=styles["Normal"],
                                 fontSize=10, spaceAfter=4, leading=14)
    small_style = ParagraphStyle("Small", parent=styles["Normal"],
                                  fontSize=8, textColor=colors.grey)

    # ── Cover ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph("AI Recruitment Screening Report", title_style))
    story.append(Paragraph(f"Position: <b>{job_title}</b>", body_style))
    story.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", small_style))
    story.append(Paragraph(f"Total Candidates: {len(rankings)}", body_style))
    story.append(Paragraph(f"Shortlisted: {sum(1 for r in rankings if r.get('shortlisted'))}", body_style))
    story.append(Paragraph(f"Overall Bias Score: {bias_report.get('overall_bias_score', 0)}/100", body_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e0e0e0"), spaceAfter=12))

    # ── Executive Summary ────────────────────────────────────────────────────
    story.append(Paragraph("Executive Summary", heading_style))
    summary = explanations.get("batch_summary", "No summary available.")
    story.append(Paragraph(summary, body_style))
    bias_narrative = explanations.get("bias_narrative", "")
    if bias_narrative:
        story.append(Paragraph(bias_narrative, body_style))
    story.append(Spacer(1, 0.5*cm))

    # ── Rankings Table ───────────────────────────────────────────────────────
    story.append(Paragraph("Candidate Rankings (Top 10)", heading_style))
    table_data = [["Rank", "Candidate", "Raw Score", "Adj. Score", "Shortlisted", "Bias Corrected"]]
    for r in rankings[:10]:
        table_data.append([
            str(r.get("rank", "")),
            r.get("filename", r.get("candidate_id", ""))[:30],
            f"{r.get('raw_score', 0):.1f}",
            f"{r.get('adjusted_score', 0):.1f}",
            "✓" if r.get("shortlisted") else "✗",
            "✓" if r.get("bias_corrected") else "✗",
        ])

    t = Table(table_data, colWidths=[1.2*cm, 6*cm, 2*cm, 2*cm, 2.2*cm, 2.5*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f8f8")]),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#dddddd")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("ALIGN", (1, 0), (1, -1), "LEFT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.5*cm))

    # ── Bias Analysis ────────────────────────────────────────────────────────
    story.append(Paragraph("Bias Analysis", heading_style))
    bias_data = [
        ["Metric", "Value", "Status"],
        ["Gender Selection Rate DIR", f"{bias_report.get('gender_dir', 1.0):.3f}", "✓ Fair" if bias_report.get('gender_dir', 1.0) >= 0.8 else "⚠ Biased"],
        ["Gender Mean Score Ratio", f"{bias_report.get('gender_mean_dir', 1.0):.3f}", "✓ Fair" if bias_report.get('gender_mean_dir', 1.0) >= 0.85 else "⚠ Gap"],
        ["Name-Origin Selection Rate DIR", f"{bias_report.get('name_origin_dir', 1.0):.3f}", "✓ Fair" if bias_report.get('name_origin_dir', 1.0) >= 0.8 else "⚠ Biased"],
        ["Name-Origin Mean Score Ratio", f"{bias_report.get('name_origin_mean_dir', 1.0):.3f}", "✓ Fair" if bias_report.get('name_origin_mean_dir', 1.0) >= 0.85 else "⚠ Gap"],
        ["University Prestige Bias", "", "⚠ Detected" if bias_report.get('university_bias_detected') else "✓ Not Detected"],
        ["Overall Bias Score", f"{bias_report.get('overall_bias_score', 0)}/100", ""],
    ]
    bt = Table(bias_data, colWidths=[8*cm, 4*cm, 4*cm])
    bt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#16213e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#dddddd")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f8f8")]),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(bt)
    story.append(Spacer(1, 0.3*cm))

    # Recommendations
    recs = bias_report.get("recommendations", [])
    if recs:
        story.append(Paragraph("Recommendations:", ParagraphStyle("bold", parent=body_style, fontName="Helvetica-Bold")))
        for rec in recs:
            story.append(Paragraph(f"• {rec}", body_style))

    story.append(Spacer(1, 0.5*cm))

    # ── Per-candidate explanations ───────────────────────────────────────────
    story.append(Paragraph("Candidate Explanations", heading_style))
    cand_explanations = explanations.get("candidate_explanations", {})
    for r in rankings[:10]:
        cid = r["candidate_id"]
        exp = cand_explanations.get(cid, "No explanation available.")
        story.append(Paragraph(f"<b>Rank #{r['rank']} — Score {r.get('adjusted_score', 0):.1f}/100</b>", body_style))
        story.append(Paragraph(exp, body_style))
        story.append(Spacer(1, 0.2*cm))

    doc.build(story)
    return buffer.getvalue()
