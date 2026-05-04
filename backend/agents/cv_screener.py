import re
from agents.common import call_llm

SYSTEM = (
    "You are a fair, unbiased recruitment screener. "
    "Score CVs objectively based only on skills, experience, and education. "
    "Never let names, gender, or demographics affect your assessment. "
    "Respond with valid JSON only."
)

def redact_cv(cv_text: str) -> str:
    """Strip PII before sending to LLM."""
    # Remove emails
    cv_text = re.sub(r'\b[\w.+-]+@[\w-]+\.\w+\b', '[EMAIL]', cv_text)
    # Remove phone numbers
    cv_text = re.sub(r'(\+?\d[\d\s\-().]{7,}\d)', '[PHONE]', cv_text)
    # Remove graduation years (standalone 4-digit years 1970-2024)
    cv_text = re.sub(r'\b(19[7-9]\d|20[0-2]\d)\b', 'YEAR_REDACTED', cv_text)
    # Remove URLs
    cv_text = re.sub(r'https?://\S+', '[URL]', cv_text)
    # Truncate to ~4000 chars
    return cv_text[:4000]


async def run_cv_screener(cv_text: str, parsed_jd: dict) -> dict:
    redacted = redact_cv(cv_text)
    required_skills = parsed_jd.get("required_skills", [])
    preferred_skills = parsed_jd.get("preferred_skills", [])
    min_exp = parsed_jd.get("min_experience_years", 0)
    edu_level = parsed_jd.get("education_level", "Bachelor's")

    prompt = f"""Score this CV against the job requirements. Think step by step, then respond with ONLY a JSON object.

Job Requirements:
- Required skills: {required_skills}
- Preferred skills: {preferred_skills}
- Min experience: {min_exp} years
- Education: {edu_level}

Scoring weights:
- skills_score: 0-40 (how many required skills matched)
- experience_score: 0-30 (years and relevance of experience)
- education_score: 0-20 (education level match)
- extras_score: 0-10 (certifications, projects, extras)

CV Text (PII redacted):
{redacted}

Respond ONLY with this JSON:
{{
  "total_score": <sum of all scores>,
  "skills_score": <0-40>,
  "experience_score": <0-30>,
  "education_score": <0-20>,
  "extras_score": <0-10>,
  "matched_skills": ["skill1", "skill2"],
  "missing_skills": ["skill1"],
  "reasoning": "2-3 sentence explanation of the score"
}}
"""
    result = await call_llm(prompt, SYSTEM)

    # Ensure all fields exist with defaults
    result.setdefault("skills_score", 0)
    result.setdefault("experience_score", 0)
    result.setdefault("education_score", 0)
    result.setdefault("extras_score", 0)
    result.setdefault("matched_skills", [])
    result.setdefault("missing_skills", [])
    result.setdefault("reasoning", "Score generated automatically.")

    # Recalculate total for safety
    total = (
        float(result.get("skills_score", 0)) +
        float(result.get("experience_score", 0)) +
        float(result.get("education_score", 0)) +
        float(result.get("extras_score", 0))
    )
    result["total_score"] = round(min(total, 100), 2)

    return result
