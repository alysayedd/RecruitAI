from agents.common import call_llm

SYSTEM = (
    "You are a fair, unbiased HR analyst. Extract structured information from job descriptions. "
    "Always respond with valid JSON only. No explanation outside the JSON."
)

BIAS_PHRASES = [
    "young", "energetic team", "recent graduate preferred", "native speaker",
    "rockstar", "ninja", "guru", "digital native", "culture fit", "clean-cut",
]

async def run_jd_parser(jd_text: str) -> dict:
    prompt = f"""Extract the following from this job description and return ONLY a JSON object:
{{
  "title": "job title",
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill1"],
  "min_experience_years": 0,
  "education_level": "Bachelor's / Master's / etc",
  "responsibilities": ["responsibility1"],
  "bias_flags": ["any biased language found with reason"]
}}

Job Description:
{jd_text[:3000]}
"""
    result = await call_llm(prompt, SYSTEM)

    # Fallback defaults
    result.setdefault("title", "Job Position")
    result.setdefault("required_skills", [])
    result.setdefault("preferred_skills", [])
    result.setdefault("min_experience_years", 0)
    result.setdefault("education_level", "Bachelor's")
    result.setdefault("responsibilities", [])
    result.setdefault("bias_flags", [])

    # Local bias phrase detection
    jd_lower = jd_text.lower()
    for phrase in BIAS_PHRASES:
        if phrase in jd_lower and phrase not in str(result["bias_flags"]):
            result["bias_flags"].append(f"Potentially biased language: '{phrase}'")

    return result
