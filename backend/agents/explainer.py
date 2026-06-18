import asyncio
from agents.common import call_llm_text

SYSTEM = (
    "You are a fair, transparent HR assistant. Explain recruitment decisions clearly and objectively. "
    "NEVER reference candidate names, gender, ethnicity, nationality, religion, age, university prestige, "
    "or any demographic/proxy attribute in your reasoning. "
    "Focus ONLY on job-relevant qualifications: skills, experience, education level/field, and achievements."
)

async def run_explainer(rankings: list, bias_report: dict, parsed_jd: dict) -> dict:
    """Generate plain-English explanations for each candidate and a batch summary."""
    sem = asyncio.Semaphore(2)  # Groq free tier rate-limit safe

    async def explain_one(r):
        sb = r.get("score_breakdown", {})
        # Note: we intentionally do NOT pass the shortlist decision or rank into the
        # prompt — otherwise the LLM produces circular justifications like
        # "should be considered further because shortlisted = true". The model must
        # reason from the score breakdown alone.
        prompt = f"""Evaluate this candidate from their score breakdown.

Score breakdown (sub-scores out of category max):
- Skills: {sb.get('skills_score', 0)}/40 — matched: {sb.get('matched_skills', [])}, missing: {sb.get('missing_skills', [])}
- Experience: {sb.get('experience_score', 0)}/30
- Education: {sb.get('education_score', 0)}/20
- Extras: {sb.get('extras_score', 0)}/10
- Total adjusted score: {r['adjusted_score']}/100

Write exactly 3 sentences, each grounded in the numbers above:
(1) The candidate's strongest evidence for this role, citing a specific matched skill from the matched list or a sub-score.
(2) The most material gap, citing ONLY a skill from the missing list above or a low sub-score. Do NOT invent skills that are not in that missing list (no Flask, Django, Spring Boot, CI/CD, REST API frameworks, etc. unless they explicitly appear above).
(3) A go/no-go recommendation justified by the sub-scores — do NOT reference a shortlist status or rank, and do NOT use the words "shortlisted" or "ranked".

Do not mention names, demographics, universities, or geography."""
        async with sem:
            text = await call_llm_text(prompt, SYSTEM)
            await asyncio.sleep(0.8)
        return r["candidate_id"], text.strip()

    top = rankings[:10]  # Explain top 10 to save LLM calls
    results = await asyncio.gather(*[explain_one(r) for r in top], return_exceptions=True)
    explanations = {
        cid: text for item in results if not isinstance(item, Exception)
        for cid, text in [item]
    }

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
