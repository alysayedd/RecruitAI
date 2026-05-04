import asyncio
import uuid
from typing import AsyncGenerator
from agents.jd_parser import run_jd_parser
from agents.cv_screener import run_cv_screener
from agents.bias_auditor import run_bias_auditor
from agents.ranker import run_ranker
from agents.explainer import run_explainer


async def run_pipeline(
    job_id: str,
    jd_text: str,
    candidates: list,  # [{candidate_id, name, filename, cv_text}]
) -> AsyncGenerator[dict, None]:
    """
    Full 5-agent pipeline. Yields status events as SSE-compatible dicts.
    Returns final results in the last event.
    """

    async def emit(step: str, message: str, data: dict = None):
        return {"step": step, "message": message, "data": data or {}}

    results = {}

    # ── Agent 1: Parse JD ────────────────────────────────────────────────────
    yield await emit("jd_parser", "Parsing job description...", {})
    try:
        parsed_jd = await run_jd_parser(jd_text)
        results["parsed_jd"] = parsed_jd
        yield await emit("jd_parser", f"✓ JD parsed — found {len(parsed_jd.get('required_skills', []))} required skills", {"parsed_jd": parsed_jd})
    except Exception as e:
        parsed_jd = {"title": "Job", "required_skills": [], "preferred_skills": [], "min_experience_years": 0, "education_level": "Bachelor's", "responsibilities": [], "bias_flags": []}
        results["parsed_jd"] = parsed_jd
        yield await emit("jd_parser", f"⚠ JD parsing error: {e} — using defaults", {})

    # ── Agent 2: Screen CVs (concurrent) ─────────────────────────────────────
    yield await emit("cv_screener", f"Screening {len(candidates)} CVs concurrently...", {})

    async def screen_one(c):
        try:
            score_result = await run_cv_screener(c["cv_text"] or "", parsed_jd)
            return {**c, "total_score": score_result["total_score"], "score_breakdown": score_result}
        except Exception as e:
            return {**c, "total_score": 0, "score_breakdown": {"error": str(e)}}

    screened = await asyncio.gather(*[screen_one(c) for c in candidates])
    results["screened"] = screened
    avg_score = sum(c["total_score"] for c in screened) / max(len(screened), 1)
    yield await emit("cv_screener", f"✓ All CVs screened — average score: {avg_score:.1f}/100", {})

    # ── Agent 3: Bias Audit ───────────────────────────────────────────────────
    yield await emit("bias_auditor", "Running bias analysis...", {})
    try:
        bias_input = [
            {
                "candidate_id": c["candidate_id"],
                "name": c.get("name", ""),
                "cv_text": c.get("cv_text", ""),
                "total_score": c["total_score"],
                "score_breakdown": c.get("score_breakdown", {}),
            }
            for c in screened
        ]
        bias_report = await run_bias_auditor(bias_input)
        results["bias_report"] = bias_report
        flagged = len(bias_report.get("flagged_candidates", []))
        bias_score = bias_report.get("overall_bias_score", 0)
        yield await emit("bias_auditor", f"✓ Bias analysis complete — score: {bias_score}/100, {flagged} candidates flagged", {"bias_report": bias_report})
    except Exception as e:
        bias_report = {"gender_dir": 1.0, "name_origin_dir": 1.0, "university_bias_detected": False, "shap_top_features": [], "flagged_candidates": [], "overall_bias_score": 0, "recommendations": []}
        results["bias_report"] = bias_report
        yield await emit("bias_auditor", f"⚠ Bias audit error: {e}", {})

    # ── Agent 4: Rank ─────────────────────────────────────────────────────────
    yield await emit("ranker", "Generating final rankings...", {})
    try:
        rankings = await run_ranker(screened, bias_report)
        results["rankings"] = rankings
        shortlisted = sum(1 for r in rankings if r["shortlisted"])
        yield await emit("ranker", f"✓ Ranked {len(rankings)} candidates — {shortlisted} shortlisted", {"rankings": rankings})
    except Exception as e:
        results["rankings"] = []
        yield await emit("ranker", f"⚠ Ranking error: {e}", {})

    # ── Agent 5: Explain ──────────────────────────────────────────────────────
    yield await emit("explainer", "Generating explanations and report...", {})
    try:
        explanations = await run_explainer(results.get("rankings", []), bias_report, parsed_jd)
        results["explanations"] = explanations
        yield await emit("explainer", "✓ Explanations generated", {"explanations": explanations})
    except Exception as e:
        results["explanations"] = {"candidate_explanations": {}, "batch_summary": "", "bias_narrative": ""}
        yield await emit("explainer", f"⚠ Explainer error: {e}", {})

    # ── Done ──────────────────────────────────────────────────────────────────
    yield await emit("done", "✓ Pipeline complete", {"results": results})
