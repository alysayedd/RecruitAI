import asyncio
from typing import AsyncGenerator

from agents.bias_auditor import run_bias_auditor
from agents.cv_screener import run_cv_screener
from agents.explainer import run_explainer
from agents.jd_parser import run_jd_parser
from agents.ranker import run_ranker


async def run_pipeline(
    job_id: str,
    jd_text: str,
    candidates: list,  # [{candidate_id, name, filename, cv_text}]
) -> AsyncGenerator[dict, None]:
    """
    Full screening pipeline. Yields status events as SSE-compatible dicts.
    Returns final results in the last event.
    """

    async def emit(step: str, message: str, data: dict = None):
        return {"step": step, "message": message, "data": data or {}}

    results = {}

    yield await emit("jd_parser", "Parsing job description...", {})
    try:
        parsed_jd = await run_jd_parser(jd_text)
        results["parsed_jd"] = parsed_jd
        yield await emit("jd_parser", f"JD parsed - found {len(parsed_jd.get('required_skills', []))} required skills", {"parsed_jd": parsed_jd})
    except Exception as e:
        parsed_jd = {
            "title": "Job",
            "required_skills": [],
            "preferred_skills": [],
            "min_experience_years": 0,
            "education_level": "Bachelor's",
            "responsibilities": [],
            "bias_flags": [],
        }
        results["parsed_jd"] = parsed_jd
        yield await emit("jd_parser", f"JD parsing error: {e} - using defaults", {})

    yield await emit("cv_screener", f"Screening {len(candidates)} anonymized CVs...", {})

    async def screen_one(c):
        try:
            score_result = await run_cv_screener(c["cv_text"] or "", parsed_jd, c.get("name", ""))
            if "error" in score_result:
                return {**c, "total_score": 0, "score_breakdown": score_result}
            return {**c, "total_score": score_result["total_score"], "score_breakdown": score_result}
        except Exception as e:
            return {**c, "total_score": 0, "score_breakdown": {"error": str(e)}}

    screened = await asyncio.gather(*[screen_one(c) for c in candidates])
    results["screened"] = screened
    avg_score = sum(c["total_score"] for c in screened) / max(len(screened), 1)
    yield await emit("cv_screener", f"All CVs screened - average score: {avg_score:.1f}/100", {})

    yield await emit("bias_auditor", "Running fairness audit and calibration...", {})
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
        yield await emit("bias_auditor", f"Fairness audit complete - raw measured bias: {bias_score}/100, {flagged} candidates calibrated", {"bias_report": bias_report})
    except Exception as e:
        bias_report = {
            "gender_dir": 1.0,
            "gender_mean_dir": 1.0,
            "name_origin_dir": 1.0,
            "name_origin_mean_dir": 1.0,
            "university_bias_detected": False,
            "shap_top_features": [],
            "flagged_candidates": [],
            "candidate_adjustments": {},
            "fairness_mitigation_applied": False,
            "overall_bias_score": 0,
            "recommendations": [],
        }
        results["bias_report"] = bias_report
        yield await emit("bias_auditor", f"Fairness audit error: {e}", {})

    yield await emit("ranker", "Generating calibrated final rankings...", {})
    try:
        rankings = await run_ranker(screened, bias_report)
        results["rankings"] = rankings
        shortlisted = sum(1 for r in rankings if r["shortlisted"])
        yield await emit("ranker", f"Ranked {len(rankings)} candidates - {shortlisted} shortlisted", {"rankings": rankings})
    except Exception as e:
        rankings = []
        results["rankings"] = rankings
        yield await emit("ranker", f"Ranking error: {e}", {})

    if rankings:
        try:
            adjusted_audit_input = [
                {
                    "candidate_id": r["candidate_id"],
                    "name": next((c.get("name", "") for c in screened if c["candidate_id"] == r["candidate_id"]), ""),
                    "cv_text": next((c.get("cv_text", "") for c in screened if c["candidate_id"] == r["candidate_id"]), ""),
                    "total_score": r["adjusted_score"],
                    "score_breakdown": next((c.get("score_breakdown", {}) for c in screened if c["candidate_id"] == r["candidate_id"]), {}),
                }
                for r in rankings
            ]
            residual_report = await run_bias_auditor(adjusted_audit_input, generate_adjustments=False)
            residual_report["pre_mitigation_bias_score"] = bias_report.get("overall_bias_score", 0)
            residual_report["candidate_adjustments"] = bias_report.get("candidate_adjustments", {})
            residual_report["fairness_mitigation_applied"] = bias_report.get("fairness_mitigation_applied", False)
            if residual_report["fairness_mitigation_applied"] and residual_report.get("overall_bias_score", 0) == 0:
                residual_report["recommendations"] = ["Fairness calibration applied; residual measured bias is 0/100 for audited groups."]
            results["bias_report"] = residual_report
            bias_report = residual_report
            yield await emit("bias_auditor", f"Residual measured bias after calibration: {bias_report.get('overall_bias_score', 0)}/100", {"bias_report": bias_report})
        except Exception as e:
            yield await emit("bias_auditor", f"Residual fairness check error: {e}", {})

    yield await emit("explainer", "Generating explanations and report...", {})
    try:
        explanations = await run_explainer(results.get("rankings", []), bias_report, parsed_jd)
        results["explanations"] = explanations
        yield await emit("explainer", "Explanations generated", {"explanations": explanations})
    except Exception as e:
        results["explanations"] = {"candidate_explanations": {}, "batch_summary": "", "bias_narrative": ""}
        yield await emit("explainer", f"Explainer error: {e}", {})

    yield await emit("done", "Pipeline complete", {"results": results})
