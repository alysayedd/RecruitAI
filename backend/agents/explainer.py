from agents.common import call_llm_text

SYSTEM = (
    "You are a fair, transparent HR assistant. Explain recruitment decisions clearly and objectively. "
    "NEVER reference candidate names, gender, ethnicity, nationality, religion, age, university prestige, "
    "or any demographic/proxy attribute in your reasoning. "
    "Focus ONLY on job-relevant qualifications: skills, experience, education level/field, and achievements."
)

async def run_explainer(rankings: list, bias_report: dict, parsed_jd: dict) -> dict:
    """Generate plain-English explanations for each candidate and a batch summary."""
    explanations = {}

    for r in rankings[:10]:  # Explain top 10 to save LLM calls
        cid = r["candidate_id"]
        sb = r.get("score_breakdown", {})
        prompt = f"""A candidate was ranked #{r['rank']} with a score of {r['adjusted_score']}/100.

Score breakdown:
- Skills match: {sb.get('skills_score', 0)}/40 — matched: {sb.get('matched_skills', [])}, missing: {sb.get('missing_skills', [])}
- Experience: {sb.get('experience_score', 0)}/30
- Education: {sb.get('education_score', 0)}/20
- Extras: {sb.get('extras_score', 0)}/10
- Shortlisted: {r['shortlisted']}
- Bias correction applied: {r['bias_corrected']}

Write exactly 3 sentences: (1) what makes this candidate strong for the role, (2) where they fall short, (3) whether they should be considered further. Be specific. Do not mention names or demographics."""

        text = await call_llm_text(prompt, SYSTEM)
        explanations[cid] = text.strip()

    # Batch summary
    total = len(rankings)
    shortlisted = sum(1 for r in rankings if r["shortlisted"])
    bias_score = bias_report.get("overall_bias_score", 0)
    flagged_count = len(bias_report.get("flagged_candidates", []))
    gender_dir = bias_report.get("gender_dir", 1.0)
    origin_dir = bias_report.get("name_origin_dir", 1.0)

    summary_prompt = f"""Summarize these recruitment screening results in 3 sentences for an HR manager:
- Total candidates screened: {total}
- Shortlisted: {shortlisted}
- Overall bias score: {bias_score}/100
- Candidates flagged for bias review: {flagged_count}
- Gender Disparate Impact Ratio: {gender_dir} (1.0 = fair, <0.8 = biased)
- Name-origin Disparate Impact Ratio: {origin_dir}

Write a professional, factual summary."""

    batch_summary = await call_llm_text(summary_prompt, SYSTEM)

    bias_narrative = ""
    if bias_score > 20:
        recs = bias_report.get("recommendations", [])
        bias_narrative = "Bias Alert: " + " ".join(recs)
    else:
        bias_narrative = "The screening process showed acceptable fairness levels across demographic groups."

    return {
        "candidate_explanations": explanations,
        "batch_summary": batch_summary.strip(),
        "bias_narrative": bias_narrative,
    }
