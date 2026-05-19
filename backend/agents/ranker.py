from config import settings

async def run_ranker(candidates_data: list, bias_report: dict) -> list:
    """
    candidates_data: list of {candidate_id, name, filename, total_score, score_breakdown}
    bias_report: output from bias_auditor
    Returns sorted ranking list.
    """
    flagged_ids = set(bias_report.get("flagged_candidates", []))
    candidate_adjustments = bias_report.get("candidate_adjustments", {}) or {}
    fallback_bonus = settings.BIAS_CORRECTION_BONUS
    threshold = settings.SHORTLIST_THRESHOLD

    ranked = []
    for c in candidates_data:
        cid = c["candidate_id"]
        raw_score = float(c.get("total_score", 0))
        fairness_adjustment = float(candidate_adjustments.get(cid, 0))
        if fairness_adjustment <= 0 and cid in flagged_ids:
            fairness_adjustment = fallback_bonus
        bias_corrected = fairness_adjustment > 0
        adjusted_score = min(raw_score + fairness_adjustment, 100)

        ranked.append({
            "candidate_id": cid,
            "name": c.get("name", "Unknown"),
            "filename": c.get("filename", ""),
            "raw_score": round(raw_score, 2),
            "adjusted_score": round(adjusted_score, 2),
            "bias_corrected": bias_corrected,
            "fairness_adjustment": round(fairness_adjustment, 2),
            "score_breakdown": c.get("score_breakdown", {}),
        })

    # Sort by adjusted score descending
    ranked.sort(key=lambda x: x["adjusted_score"], reverse=True)

    # Assign ranks and shortlist top threshold%
    n = len(ranked)
    shortlist_count = max(1, int(n * threshold)) if n > 0 else 0

    result = []
    for i, r in enumerate(ranked):
        result.append({
            **r,
            "rank": i + 1,
            "shortlisted": i < shortlist_count,
        })

    return result
