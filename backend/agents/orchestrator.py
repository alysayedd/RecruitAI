import asyncio
from difflib import SequenceMatcher
from typing import AsyncGenerator

from agents.bias_auditor import run_bias_auditor
from agents.cv_screener import redact_cv, run_cv_screener
from agents.explainer import run_explainer
from agents.jd_parser import run_jd_parser
from agents.ranker import run_ranker


def _build_cv_clusters(candidates: list, similarity_threshold: float = 0.9) -> dict[str, str]:
    """Group near-identical CVs and return {candidate_id -> cluster_id}.

    Cluster IDs are the candidate_id of the cluster's first member, used as a
    stable key. Singletons get a cluster of one (themselves).
    """
    redacted_cache: dict[str, str] = {}
    for c in candidates:
        cid = c["candidate_id"]
        redacted_cache[cid] = redact_cv(c.get("cv_text", "") or "", c.get("name", ""))

    cluster_of: dict[str, str] = {}
    ordered = list(candidates)
    for i, ci in enumerate(ordered):
        cid_i = ci["candidate_id"]
        if cid_i in cluster_of:
            continue
        cluster_of[cid_i] = cid_i  # self is the seed
        text_i = redacted_cache[cid_i]
        for cj in ordered[i + 1:]:
            cid_j = cj["candidate_id"]
            if cid_j in cluster_of:
                continue
            ratio = SequenceMatcher(None, text_i, redacted_cache[cid_j]).ratio()
            if ratio >= similarity_threshold:
                cluster_of[cid_j] = cid_i
    return cluster_of


def _collapse_to_cluster_max(items: list, cluster_of: dict[str, str], score_field: str,
                              copy_fields: tuple[str, ...] = ()) -> int:
    """For each cluster, find the item with the highest `score_field` and copy that
    value (plus any `copy_fields`) onto every other member. Returns count of items collapsed.
    Mutates `items` in place. Each item must have a `candidate_id`.
    """
    if len(items) < 2 or not cluster_of:
        return 0
    by_cluster: dict[str, list[int]] = {}
    for idx, it in enumerate(items):
        cid = it.get("candidate_id")
        cluster = cluster_of.get(cid, cid)
        by_cluster.setdefault(cluster, []).append(idx)

    collapsed = 0
    for members in by_cluster.values():
        if len(members) < 2:
            continue
        top_idx = max(members, key=lambda k: items[k].get(score_field, 0))
        top_val = items[top_idx][score_field]
        top_copies = {f: items[top_idx].get(f) for f in copy_fields}
        for k in members:
            if k == top_idx:
                continue
            items[k][score_field] = top_val
            for f, v in top_copies.items():
                if v is not None:
                    items[k][f] = v
            items[k]["normalized_identical"] = True
        items[top_idx]["normalized_identical"] = True
        collapsed += len(members)
    return collapsed


def _normalize_identical_cvs(screened: list, cluster_of: dict[str, str] | None = None,
                              similarity_threshold: float = 0.9) -> list:
    """Force candidates with near-identical CV text to receive the same total_score.

    This is the structural fix for LLM scoring nondeterminism — two CVs with the
    same qualifications must produce the same score regardless of name/origin.
    When a near-duplicate cluster is found, every member gets the cluster MAX
    score (so nobody is penalized) and inherits the matched/missing skill lists
    from that top scorer. Score breakdowns are aligned too so downstream
    consumers stay consistent.
    """
    if len(screened) < 2:
        return screened
    if cluster_of is None:
        cluster_of = _build_cv_clusters(screened, similarity_threshold)

    # Need score_breakdown propagated too — handle manually instead of copy_fields
    # because dict copy must be deep-ish.
    by_cluster: dict[str, list[int]] = {}
    for idx, c in enumerate(screened):
        cid = c["candidate_id"]
        by_cluster.setdefault(cluster_of.get(cid, cid), []).append(idx)

    for members in by_cluster.values():
        if len(members) < 2:
            continue
        top_idx = max(members, key=lambda k: screened[k].get("total_score", 0))
        top_score = screened[top_idx]["total_score"]
        top_breakdown = screened[top_idx].get("score_breakdown", {})
        for k in members:
            screened[k]["total_score"] = top_score
            screened[k]["score_breakdown"] = {**top_breakdown}
            screened[k]["normalized_identical"] = True
    return screened


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
        if parsed_jd.get("error") or (not parsed_jd.get("title") and not parsed_jd.get("required_skills")):
            err = parsed_jd.get("error", "LLM returned empty result")
            results["parsed_jd"] = {**parsed_jd, "llm_failed": True}
            yield await emit("jd_parser", f"LLM error while parsing JD: {err}", {"error": err, "llm_failed": True})
            return
        results["parsed_jd"] = parsed_jd
        yield await emit("jd_parser", f"JD parsed - found {len(parsed_jd.get('required_skills', []))} required skills", {"parsed_jd": parsed_jd})
    except Exception as e:
        results["parsed_jd"] = {"llm_failed": True, "error": str(e)}
        yield await emit("jd_parser", f"JD parsing failed: {e}", {"error": str(e), "llm_failed": True})
        return

    yield await emit("cv_screener", f"Screening {len(candidates)} anonymized CVs...", {})

    sem = asyncio.Semaphore(2)  # Cerebras rate-limit safe

    async def screen_one(c):
        async with sem:
            try:
                score_result = await run_cv_screener(c["cv_text"] or "", parsed_jd, c.get("name", ""))
                # Small post-call delay to spread TPM usage over time and avoid 429s.
                await asyncio.sleep(0.8)
                if "error" in score_result:
                    return {**c, "total_score": 0, "score_breakdown": score_result}
                return {**c, "total_score": score_result["total_score"], "score_breakdown": score_result}
            except Exception as e:
                return {**c, "total_score": 0, "score_breakdown": {"error": str(e)}}

    screened = await asyncio.gather(*[screen_one(c) for c in candidates])
    # Build clusters once from the original CV texts. Reuse them after calibration
    # so identical CVs get the same FINAL adjusted score, not just the same raw score.
    cv_clusters = _build_cv_clusters(candidates)
    screened = _normalize_identical_cvs(screened, cluster_of=cv_clusters)
    normalized = sum(1 for c in screened if c.get("normalized_identical"))
    results["screened"] = screened
    avg_score = sum(c["total_score"] for c in screened) / max(len(screened), 1)
    msg = f"All CVs screened - average score: {avg_score:.1f}/100"
    if normalized:
        msg += f" ({normalized} near-duplicate CVs normalized to identical scores)"
    yield await emit("cv_screener", msg, {})

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
        # CRITICAL pairwise guarantee: the bias-correction layer can add per-group
        # bonuses that diverge identical CVs. Re-collapse clusters on the FINAL
        # adjusted_score (and copy the cluster top's bias-correction metadata)
        # so two byte-identical CVs always end with the same number and same
        # bias_corrected flag. Without this step group-DIR can be 1.0 while the
        # pairwise rule is silently violated.
        collapsed = _collapse_to_cluster_max(
            rankings,
            cv_clusters,
            score_field="adjusted_score",
            copy_fields=("bias_corrected", "fairness_adjustment", "raw_score", "score_breakdown"),
        )
        # Resort + reassign ranks after collapse
        rankings.sort(key=lambda x: x["adjusted_score"], reverse=True)
        threshold_n = max(1, int(len(rankings) * 0.3)) if rankings else 0
        for i, r in enumerate(rankings):
            r["rank"] = i + 1
            r["shortlisted"] = i < threshold_n
        results["rankings"] = rankings
        shortlisted = sum(1 for r in rankings if r["shortlisted"])
        extra = f" ({collapsed} identical-CV scores re-collapsed after calibration)" if collapsed else ""
        yield await emit("ranker", f"Ranked {len(rankings)} candidates - {shortlisted} shortlisted{extra}", {"rankings": rankings})
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
