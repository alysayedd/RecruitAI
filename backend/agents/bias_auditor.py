import pandas as pd
import numpy as np
from nameparser import HumanName
from config import settings

# University tier lookup (Egyptian + international)
UNIVERSITY_TIERS = {
    # Tier 1 - Elite
    "cairo university": 2, "ain shams": 2, "alexandria university": 2,
    "american university in cairo": 1, "auc": 1,
    "german university in cairo": 1, "guc": 1,
    "nile university": 1, "british university in egypt": 1, "bue": 1,
    "mit": 1, "stanford": 1, "oxford": 1, "cambridge": 1, "harvard": 1,
    "imperial college": 1, "eth zurich": 1,
    # Tier 2 - Good
    "helwan university": 2, "mansoura": 2, "zagazig": 2,
    "benha university": 2, "suez canal": 2,
    # Default
}

ARABIC_NAME_INDICATORS = [
    "ahmed", "mohamed", "muhammad", "fatima", "omar", "ali", "hassan",
    "hussein", "ibrahim", "khaled", "layla", "nour", "sara", "mona",
    "mahmoud", "youssef", "amr", "rania", "dina", "heba", "mariam",
    "amir", "karim", "tariq", "walid", "nadia", "eman", "samira",
]

def infer_gender(name: str) -> str:
    female_indicators = [
        "fatima", "layla", "nour", "sara", "mona", "rania", "dina",
        "heba", "mariam", "nadia", "eman", "samira", "sarah", "emily",
        "jessica", "ashley", "amanda", "jennifer", "lisa", "mary",
        "anna", "emma", "olivia", "sophia", "isabella", "ava",
    ]
    first = HumanName(name).first.lower() if name else ""
    return "female" if first in female_indicators else "male"

def infer_name_origin(name: str) -> str:
    first = HumanName(name).first.lower() if name else ""
    return "arabic" if first in ARABIC_NAME_INDICATORS else "western"

def get_university_tier(cv_text: str) -> int:
    text_lower = (cv_text or "").lower()
    for uni, tier in UNIVERSITY_TIERS.items():
        if uni in text_lower:
            return tier
    return 2  # default mid-tier

def calculate_dir(scores: list, labels: list, threshold: float = 60.0) -> float:
    """Disparate Impact Ratio between two groups."""
    if len(scores) < 2 or len(set(labels)) < 2:
        return 1.0
    df = pd.DataFrame({"score": scores, "group": labels})
    group_rates = df.groupby("group").apply(lambda g: (g["score"] >= threshold).mean())
    if len(group_rates) < 2:
        return 1.0
    rates = group_rates.values
    minority_rate = min(rates)
    majority_rate = max(rates)
    if majority_rate == 0:
        return 1.0
    return round(float(minority_rate / majority_rate), 3)

async def run_bias_auditor(candidates_data: list) -> dict:
    """
    candidates_data: list of {candidate_id, name, cv_text, total_score, score_breakdown}
    """
    if not candidates_data:
        return _empty_report()

    scores = []
    genders = []
    origins = []
    uni_tiers = []
    flagged = []

    for c in candidates_data:
        name = c.get("name", "") or ""
        cv_text = c.get("cv_text", "") or ""
        score = float(c.get("total_score", 0))

        gender = infer_gender(name)
        origin = infer_name_origin(name)
        tier = get_university_tier(cv_text)

        scores.append(score)
        genders.append(gender)
        origins.append(origin)
        uni_tiers.append(tier)

    # Calculate DIRs
    gender_dir = calculate_dir(scores, genders)
    origin_dir = calculate_dir(scores, origins)

    # University bias: check if tier-1 candidates systematically score higher
    uni_df = pd.DataFrame({"score": scores, "tier": uni_tiers})
    tier1_avg = uni_df[uni_df["tier"] == 1]["score"].mean() if (uni_df["tier"] == 1).any() else 0
    tier2_avg = uni_df[uni_df["tier"] == 2]["score"].mean() if (uni_df["tier"] == 2).any() else 0
    university_bias_detected = bool(tier1_avg - tier2_avg > 15)

    # Flag candidates in minority group scoring below threshold
    for i, c in enumerate(candidates_data):
        reasons = []
        if gender_dir < 0.8 and genders[i] == "female":
            reasons.append("gender bias detected in batch (DIR < 0.8)")
        if origin_dir < 0.8 and origins[i] == "arabic":
            reasons.append("name-origin bias detected in batch (DIR < 0.8)")
        if reasons:
            flagged.append({"candidate_id": c["candidate_id"], "reasons": reasons})

    # SHAP-lite: feature importance from score breakdown
    shap_features = _compute_feature_importance(candidates_data)

    # Recommendations
    recommendations = []
    if gender_dir < 0.8:
        recommendations.append("Gender DIR is below 0.8 — review screening criteria for gender neutrality.")
    if origin_dir < 0.8:
        recommendations.append("Name-origin DIR is below 0.8 — consider anonymizing candidate names before screening.")
    if university_bias_detected:
        recommendations.append("University prestige appears to be a strong score driver — consider skill-based weighting instead.")
    if not recommendations:
        recommendations.append("No significant bias detected in this batch.")

    # Overall bias score (0=no bias, 100=severe bias)
    bias_score = round((
        (max(0, 0.8 - gender_dir) / 0.8 * 40) +
        (max(0, 0.8 - origin_dir) / 0.8 * 40) +
        (20 if university_bias_detected else 0)
    ), 1)

    return {
        "gender_dir": gender_dir,
        "name_origin_dir": origin_dir,
        "university_bias_detected": university_bias_detected,
        "shap_top_features": shap_features,
        "flagged_candidates": [f["candidate_id"] for f in flagged],
        "flagged_details": flagged,
        "overall_bias_score": min(bias_score, 100),
        "recommendations": recommendations,
    }

def _compute_feature_importance(candidates_data: list) -> list:
    """Simple feature importance from score breakdowns."""
    features = {"skills_score": [], "experience_score": [], "education_score": [], "extras_score": []}
    for c in candidates_data:
        sb = c.get("score_breakdown", {}) or {}
        for k in features:
            features[k].append(float(sb.get(k, 0)))
    result = []
    for feat, vals in features.items():
        if vals:
            result.append({"feature": feat, "importance": round(float(np.std(vals)), 2)})
    result.sort(key=lambda x: x["importance"], reverse=True)
    return result

def _empty_report() -> dict:
    return {
        "gender_dir": 1.0,
        "name_origin_dir": 1.0,
        "university_bias_detected": False,
        "shap_top_features": [],
        "flagged_candidates": [],
        "flagged_details": [],
        "overall_bias_score": 0,
        "recommendations": ["No candidates to analyze."],
    }
