import re
from agents.common import call_llm
from pydantic import BaseModel, Field

class CVScreeningResult(BaseModel):
    reasoning: str = Field(description="3-4 sentences explaining the score using ONLY job-relevant evidence. What the candidate excels at, where gaps exist, and why the score is justified. THINK STEP BY STEP.")
    skills_score: float = Field(description="0-40")
    experience_score: float = Field(description="0-30")
    education_score: float = Field(description="0-20")
    extras_score: float = Field(description="0-10")
    matched_skills: list[str] = Field(description="Skills from the job's required/preferred lists that ARE present in the CV. Do not include skills outside those lists.")
    missing_skills: list[str] = Field(description="Skills from the job's required/preferred lists that are NOT present in the CV. NEVER invent skills (no Flask/Django/Spring/CI-CD/etc) that the job did not list.")
    total_score: float = Field(description="Sum of all scores, max 100")

SYSTEM = (
    "You are a strictly fair and unbiased recruitment screener. "
    "Score CVs using ONLY job-relevant evidence: technical skills, relevant work experience, "
    "education level and field relevance, projects, certifications, and measurable achievements. "
    "You MUST ignore and never factor in: names, gender, age, nationality, ethnicity, race, "
    "religion, marital status, address, photos, university prestige or ranking, "
    "country of education, language of name, hobbies unrelated to the job, "
    "and any other protected or demographic-proxy attribute. "
    "Two candidates with identical qualifications MUST receive identical scores regardless of "
    "any non-job-relevant differences. "
    "\n\nEXAMPLE OF GOOD REASONING:\n"
    "\"The candidate demonstrates strong potential through a perfect education score and key technical proficiencies in Python and SQL. However, they fall short in professional experience, scoring only 6 out of 30, and lack familiarity with REST APIs and CI/CD.\""
)

PROXY_PATTERNS = [
    r"\b(male|female|man|woman|boy|girl|married|single|divorced|widowed)\b",
    r"\b(egyptian|arabic|arab|american|british|french|german|indian|pakistani|african|asian|european|"
    r"chinese|japanese|korean|vietnamese|thai|filipino|mexican|brazilian|nigerian|kenyan|"
    r"south\s+african|turkish|iranian|iraqi|saudi|emirati|lebanese|jordanian|palestinian|"
    r"moroccan|tunisian|algerian|sudanese|libyan|bahraini|kuwaiti|omani|qatari|yemeni)\b",
    r"\b(muslim|christian|jewish|hindu|buddhist|sikh|atheist|agnostic)\b",
    r"\b(mosque|church|temple|synagogue|religious)\b",
    r"\b\d{1,4}\s+[A-Za-z0-9 .'-]+\s+(street|st\.|road|rd\.|avenue|ave\.|city|governorate|district|"
    r"blvd|boulevard|lane|drive|dr\.|way|place|court|ct\.)\b",
    r"\b(age|born|date\s+of\s+birth|dob|nationality|citizenship|visa\s+status|"
    r"marital\s+status|number\s+of\s+(?:children|dependents))\s*[:]\s*\S+",
    r"\bphoto\b",
]

def redact_cv(cv_text: str, candidate_name: str = "") -> str:
    """Strip PII and protected/proxy attributes before sending to the LLM."""
    if candidate_name:
        for variant in [candidate_name, candidate_name.lower(), candidate_name.upper(), candidate_name.title()]:
            cv_text = cv_text.replace(variant, "[CANDIDATE]")
        name_parts = candidate_name.split()
        for part in name_parts:
            if len(part) > 2:
                cv_text = re.sub(r'\b' + re.escape(part) + r'\b', '[CANDIDATE]', cv_text, flags=re.IGNORECASE)
    lines = cv_text.split("\n", 1)
    if len(lines) > 1 and lines[0].strip() and len(lines[0].strip().split()) <= 4:
        cv_text = "[CANDIDATE]\n" + lines[1]
    cv_text = re.sub(r'\b[\w.+-]+@[\w-]+\.\w+\b', '[EMAIL]', cv_text)
    cv_text = re.sub(r'(\+?\d[\d\s\-().]{7,}\d)', '[PHONE]', cv_text)
    cv_text = re.sub(r'\b(19[7-9]\d|20[0-2]\d)\b', 'YEAR_REDACTED', cv_text)
    cv_text = re.sub(r'https?://\S+', '[URL]', cv_text)
    cv_text = re.sub(r'\b(linkedin|github|twitter|facebook|instagram)\b[^\n]*', '[SOCIAL]', cv_text, flags=re.IGNORECASE)
    for pattern in PROXY_PATTERNS:
        cv_text = re.sub(pattern, '[REDACTED]', cv_text, flags=re.IGNORECASE)
    return cv_text[:4000]


async def run_cv_screener(cv_text: str, parsed_jd: dict, candidate_name: str = "") -> dict:
    redacted = redact_cv(cv_text, candidate_name)
    required_skills = parsed_jd.get("required_skills", [])
    preferred_skills = parsed_jd.get("preferred_skills", [])
    min_exp = parsed_jd.get("min_experience_years", 0)
    edu_level = parsed_jd.get("education_level", "Bachelor's")

    prompt = f"""Score this CV against the job requirements. Be thorough, precise, and completely objective.

Job Requirements:
- Required skills: {required_skills}
- Preferred skills: {preferred_skills}
- Min experience: {min_exp} years
- Education: {edu_level}

Scoring weights — apply consistently to every candidate:
- skills_score: 0-40. Award points ONLY for skills explicitly demonstrated in the CV text WITH EVIDENCE OF DEPTH. A skill listed once with no project/role/years backing it is NOT a match. Required skill matched with strong evidence (multi-year use, shipped projects, leadership) = 8 pts. Required skill matched but only briefly mentioned (bootcamp / single short project / "familiar with") = 3-4 pts. Preferred skill matched with evidence = 3-4 pts; brief mention = 1-2 pts. 0 for missing required skills. A candidate who lists 5 required skill names but has only 6 months total experience cannot earn 40/40.
- experience_score: 0-30. Years of relevant experience (up to 15), demonstrated impact/leadership (up to 10), tech stack alignment (up to 5). Count only documented experience. A career-changer with <1 year coding experience caps at 5-8 here regardless of other factors.
- education_score: 0-20. Degree level match (up to 12), field relevance (up to 8). Score the degree level and field ONLY — never award or deduct points based on which university, its ranking, prestige, or country.
- extras_score: 0-10. Relevant certifications (up to 4), relevant projects (up to 4), measurable awards/achievements (up to 2).

Skill list rules — these are HARD constraints:
- matched_skills MUST be a subset of the union of Required + Preferred skills above. Do not list skills outside those lists.
- missing_skills MUST be a subset of Required + Preferred skills NOT present in the CV. Never invent additional skills (Flask, Django, Spring Boot, CI/CD, REST API frameworks, etc.) that this job did not request.

STRICT FAIRNESS RULES — violation of any rule invalidates the scoring:
1. NEVER infer, use, or reference any protected attribute (name, gender, age, race, ethnicity, nationality, religion, disability, marital status).
2. NEVER use proxy attributes (university prestige, country of education, name origin, address, language).
3. If information is [REDACTED] or missing, score ONLY what is explicitly present. Do not penalize or reward redacted information.
4. Your reasoning must reference ONLY job-relevant qualifications. Any mention of demographics or proxies is a violation.
5. Two CVs with identical qualifications MUST receive identical scores.

CV Text (PII redacted):
{redacted}
"""
    result = await call_llm(prompt, SYSTEM, response_schema=CVScreeningResult)

    # Propagate LLM errors so callers can handle them
    if "error" in result:
        return result

    # Ensure all fields exist with defaults
    result.setdefault("skills_score", 0)
    result.setdefault("experience_score", 0)
    result.setdefault("education_score", 0)
    result.setdefault("extras_score", 0)
    result.setdefault("matched_skills", [])
    result.setdefault("missing_skills", [])
    result.setdefault("reasoning", "Score generated automatically.")

    # Safety net: hard-filter the skill lists so anything outside the JD is dropped.
    # Prevents the explainer from hallucinating "missing Flask/Django/Spring Boot"
    # when the JD never listed them.
    jd_skills_lower = {s.strip().lower() for s in (required_skills + preferred_skills) if s and s.strip()}
    if jd_skills_lower:
        result["matched_skills"] = [s for s in result["matched_skills"]
                                    if isinstance(s, str) and s.strip().lower() in jd_skills_lower]
        result["missing_skills"] = [s for s in result["missing_skills"]
                                    if isinstance(s, str) and s.strip().lower() in jd_skills_lower]

    # Recalculate total for safety
    total = (
        float(result.get("skills_score", 0)) +
        float(result.get("experience_score", 0)) +
        float(result.get("education_score", 0)) +
        float(result.get("extras_score", 0))
    )
    result["total_score"] = round(min(total, 100), 2)

    return result
