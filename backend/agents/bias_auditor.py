import numpy as np
import pandas as pd
from nameparser import HumanName


PRESTIGIOUS_UNIVERSITIES = {
    "american university in cairo", "auc",
    "german university in cairo", "guc",
    "nile university",
    "british university in egypt", "bue",
    "mit", "stanford", "oxford", "cambridge", "harvard",
    "imperial college", "eth zurich", "caltech",
    "princeton", "yale", "columbia", "uc berkeley",
    "university of toronto", "university of tokyo",
    "national university of singapore", "nus",
    "tsinghua", "peking university",
}

NON_PRESTIGIOUS_UNIVERSITIES = {
    "cairo university", "ain shams", "alexandria university",
    "helwan university", "mansoura", "zagazig",
    "benha university", "suez canal",
    "tanta university", "assiut university",
    "south valley university", "fayoum university",
    "minia university", "sohag university",
    "damanhour university", "kafrelsheikh university",
}

ARABIC_MIDDLE_EASTERN_NAME_INDICATORS = {
    "ahmed", "mohamed", "muhammad", "fatima", "omar", "ali", "hassan",
    "hussein", "ibrahim", "khaled", "layla", "nour", "sara", "mona",
    "mahmoud", "youssef", "amr", "rania", "dina", "heba", "mariam",
    "amir", "karim", "tariq", "walid", "nadia", "eman", "samira",
    "mustafa", "abdallah", "abdullah", "abdulrahman", "zainab", "hana",
    "ayman", "adel", "tamer", "sherif", "hesham", "ashraf", "bassem",
    "tarek", "wael", "hatem", "osama", "samir", "sami", "yasser",
    "abdelrahman", "salma", "noha", "yasmin", "reem", "lina", "ghada",
}

SOUTH_ASIAN_NAME_INDICATORS = {
    "priya", "rahul", "amit", "ananya", "arjun", "deepa", "vikram",
    "sanjay", "neha", "ravi", "sunita", "arun", "kavitha", "raj",
    "suresh", "pooja", "vijay", "lakshmi", "krishna", "meera",
    "harish", "divya", "ganesh", "padma", "venkat", "srinivas",
}

EAST_ASIAN_NAME_INDICATORS = {
    "wei", "jing", "li", "chen", "wang", "zhang", "liu", "yang",
    "huang", "zhao", "ming", "xiao", "yuki", "kenji", "sakura",
    "takeshi", "haruto", "hinata", "soo", "min", "jun", "hyun",
}

WESTERN_NAME_INDICATORS = {
    "james", "john", "robert", "michael", "william", "david", "richard",
    "joseph", "thomas", "charles", "christopher", "daniel", "matthew",
    "anthony", "mark", "steven", "paul", "andrew", "joshua", "brian",
    "mary", "patricia", "jennifer", "linda", "elizabeth", "barbara",
    "susan", "jessica", "sarah", "emily", "emma", "olivia", "sophia",
    "isabella", "ava", "mia", "charlotte", "amelia", "harper",
    "ashley", "amanda", "lisa", "anna", "alice", "grace", "lucy",
}

FEMALE_INDICATORS = {
    "fatima", "layla", "nour", "sara", "mona", "rania", "dina",
    "heba", "mariam", "nadia", "eman", "samira", "sarah", "emily",
    "jessica", "ashley", "amanda", "jennifer", "lisa", "mary",
    "anna", "emma", "olivia", "sophia", "isabella", "ava",
    "priya", "ananya", "deepa", "neha", "sunita", "kavitha",
    "pooja", "lakshmi", "meera", "divya", "padma",
    "yuki", "sakura", "hinata", "jing",
    "salma", "noha", "yasmin", "reem", "lina", "ghada", "zainab", "hana",
    "patricia", "linda", "elizabeth", "barbara", "susan",
    "mia", "charlotte", "amelia", "harper", "alice", "grace", "lucy",
}


def infer_gender(name: str) -> str:
    first = HumanName(name).first.lower() if name else ""
    if first in FEMALE_INDICATORS:
        return "female"
    return "male"


def infer_name_origin(name: str) -> str:
    first = HumanName(name).first.lower() if name else ""
    if first in ARABIC_MIDDLE_EASTERN_NAME_INDICATORS:
        return "arabic_middle_eastern"
    if first in SOUTH_ASIAN_NAME_INDICATORS:
        return "south_asian"
    if first in EAST_ASIAN_NAME_INDICATORS:
        return "east_asian"
    if first in WESTERN_NAME_INDICATORS:
        return "western"
    return "other"


def get_university_tier(cv_text: str) -> int:
    text_lower = (cv_text or "").lower()
    for uni in PRESTIGIOUS_UNIVERSITIES:
        if uni in text_lower:
            return 1
    for uni in NON_PRESTIGIOUS_UNIVERSITIES:
        if uni in text_lower:
            return 2
    return 0


def calculate_dir(scores: list, labels: list, threshold: float = 60.0) -> float:
    """Disparate Impact Ratio: minimum pairwise ratio of selection rates across groups.
    Uses the 4/5ths rule — a DIR >= 0.8 indicates no adverse impact."""
    if len(scores) < 2 or len(set(labels)) < 2:
        return 1.0
    df = pd.DataFrame({"score": scores, "group": labels})
    group_rates = df.groupby("group").apply(lambda g: (g["score"] >= threshold).mean())
    rates = [r for r in group_rates.values if not np.isnan(r)]
    if len(rates) < 2:
        return 1.0
    majority_rate = max(rates)
    if majority_rate == 0:
        return 1.0
    minority_rate = min(rates)
    return round(float(minority_rate / majority_rate), 3)


def calculate_mean_score_dir(scores: list, labels: list) -> float:
    """Ratio of mean scores between the lowest and highest scoring groups.
    Captures systematic score gaps even when selection rates look similar."""
    if len(scores) < 2 or len(set(labels)) < 2:
        return 1.0
    df = pd.DataFrame({"score": scores, "group": labels})
    group_means = df.groupby("group")["score"].mean()
    means = [m for m in group_means.values if not np.isnan(m)]
    if len(means) < 2 or max(means) == 0:
        return 1.0
    return round(float(min(means) / max(means)), 3)


async def run_bias_auditor(candidates_data: list, generate_adjustments: bool = True) -> dict:
    """
    candidates_data: list of {candidate_id, name, cv_text, total_score, score_breakdown}
    """
    if not candidates_data:
        return _empty_report()

    scores = []
    genders = []
    origins = []
    uni_tiers = []
    candidate_ids = []
    flagged = []

    for c in candidates_data:
        name = c.get("name", "") or ""
        cv_text = c.get("cv_text", "") or ""
        score = float(c.get("total_score", 0))

        scores.append(score)
        genders.append(infer_gender(name))
        origins.append(infer_name_origin(name))
        uni_tiers.append(get_university_tier(cv_text))
        candidate_ids.append(c.get("candidate_id"))

    gender_dir = calculate_dir(scores, genders)
    gender_mean_dir = calculate_mean_score_dir(scores, genders)
    origin_dir = calculate_dir(scores, origins)
    origin_mean_dir = calculate_mean_score_dir(scores, origins)

    uni_df = pd.DataFrame({"score": scores, "tier": uni_tiers})
    known_tiers = uni_df[uni_df["tier"] > 0]
    if len(known_tiers) >= 2 and known_tiers["tier"].nunique() >= 2:
        tier1_avg = known_tiers[known_tiers["tier"] == 1]["score"].mean() if (known_tiers["tier"] == 1).any() else 0
        tier2_avg = known_tiers[known_tiers["tier"] == 2]["score"].mean() if (known_tiers["tier"] == 2).any() else 0
        university_bias_detected = bool(abs(tier1_avg - tier2_avg) > 10)
    else:
        tier1_avg = 0
        tier2_avg = 0
        university_bias_detected = False

    candidate_adjustments = {}
    adjustment_reasons = {}
    if generate_adjustments:
        candidate_adjustments, adjustment_reasons = _build_candidate_adjustments(
            candidate_ids,
            scores,
            genders,
            origins,
            uni_tiers,
        )

    for i, c in enumerate(candidates_data):
        reasons = []
        cid = c.get("candidate_id")
        if gender_dir < 0.8 and genders[i] == "female":
            reasons.append("gender bias detected in batch (selection rate DIR < 0.8)")
        if gender_mean_dir < 0.85 and genders[i] == "female":
            reasons.append("gender score gap detected (mean score DIR < 0.85)")
        if origin_dir < 0.8:
            origin_group = origins[i]
            df_check = pd.DataFrame({"score": scores, "group": origins})
            group_means = df_check.groupby("group")["score"].mean()
            if len(group_means) > 1 and origin_group in group_means.index:
                if float(group_means[origin_group]) < float(group_means.max()):
                    reasons.append(f"name-origin bias detected for group '{origin_group}' (DIR < 0.8)")
        if cid in adjustment_reasons:
            reasons.extend(adjustment_reasons[cid])
        if reasons:
            flagged.append({"candidate_id": cid, "reasons": reasons})

    shap_features = _compute_feature_importance(candidates_data)

    recommendations = []
    if gender_dir < 0.8:
        recommendations.append(
            f"Gender selection rate DIR is {gender_dir:.3f} (below 0.8 threshold) — "
            "review screening criteria for gender-neutral language and requirements."
        )
    if gender_mean_dir < 0.85:
        recommendations.append(
            f"Gender mean score ratio is {gender_mean_dir:.3f} — "
            "systematic score gap detected between genders."
        )
    if origin_dir < 0.8:
        recommendations.append(
            f"Name-origin selection rate DIR is {origin_dir:.3f} (below 0.8 threshold) — "
            "ensure CV screening uses fully anonymized/redacted CVs."
        )
    if origin_mean_dir < 0.85:
        recommendations.append(
            f"Name-origin mean score ratio is {origin_mean_dir:.3f} — "
            "systematic score gap detected across name-origin groups."
        )
    if university_bias_detected:
        recommendations.append(
            "University prestige appears to influence scores significantly — "
            "consider removing university names and scoring only degree level and field relevance."
        )
    if not recommendations:
        recommendations.append(
            "All fairness metrics passed: gender DIR, name-origin DIR, and university prestige "
            "checks show no significant bias. No group-level correction needed."
        )
    elif candidate_adjustments:
        recommendations.append("Automatic fairness calibration has been applied to reduce measured group-level gaps before ranking.")

    gender_penalty = max(0, 0.8 - gender_dir) / 0.8 * 25
    gender_mean_penalty = max(0, 0.85 - gender_mean_dir) / 0.85 * 10
    origin_penalty = max(0, 0.8 - origin_dir) / 0.8 * 25
    origin_mean_penalty = max(0, 0.85 - origin_mean_dir) / 0.85 * 10
    uni_penalty = 15 if university_bias_detected else 0
    bias_score = round(gender_penalty + gender_mean_penalty + origin_penalty + origin_mean_penalty + uni_penalty, 1)

    return {
        "gender_dir": gender_dir,
        "gender_mean_dir": gender_mean_dir,
        "name_origin_dir": origin_dir,
        "name_origin_mean_dir": origin_mean_dir,
        "university_bias_detected": university_bias_detected,
        "shap_top_features": shap_features,
        "flagged_candidates": [f["candidate_id"] for f in flagged],
        "flagged_details": flagged,
        "candidate_adjustments": candidate_adjustments,
        "fairness_mitigation_applied": bool(candidate_adjustments),
        "overall_bias_score": min(bias_score, 100),
        "recommendations": recommendations,
    }


def _build_candidate_adjustments(
    candidate_ids: list,
    scores: list,
    genders: list,
    origins: list,
    uni_tiers: list,
) -> tuple[dict, dict]:
    """Create score adjustments that remove measured group-level score gaps."""
    adjustments: dict[str, float] = {}
    reasons: dict[str, list[str]] = {}

    def apply_group_gap(labels: list, label_name: str, min_gap: float = 0.5):
        if len(scores) < 2 or len(set(labels)) < 2:
            return
        df = pd.DataFrame({"candidate_id": candidate_ids, "score": scores, "group": labels})
        group_means = df.groupby("group")["score"].mean()
        target_mean = float(group_means.max())
        for group, mean in group_means.items():
            gap = round(target_mean - float(mean), 2)
            if gap < min_gap:
                continue
            for cid, score in df[df["group"] == group][["candidate_id", "score"]].values:
                if not cid:
                    continue
                bounded_gap = round(min(gap, max(0.0, 100.0 - float(score))), 2)
                if bounded_gap <= 0:
                    continue
                adjustments[cid] = max(adjustments.get(cid, 0.0), bounded_gap)
                reasons.setdefault(cid, []).append(f"{label_name} calibration +{bounded_gap}")

    apply_group_gap(genders, "gender")
    apply_group_gap(origins, "name-origin")
    apply_group_gap(uni_tiers, "education-proxy")

    return adjustments, reasons


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
        "gender_mean_dir": 1.0,
        "name_origin_dir": 1.0,
        "name_origin_mean_dir": 1.0,
        "university_bias_detected": False,
        "shap_top_features": [],
        "flagged_candidates": [],
        "flagged_details": [],
        "candidate_adjustments": {},
        "fairness_mitigation_applied": False,
        "overall_bias_score": 0,
        "recommendations": ["No candidates to analyze."],
    }
