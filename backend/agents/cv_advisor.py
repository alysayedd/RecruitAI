from agents.common import call_llm

SYSTEM = (
    "You are an expert career advisor. Provide specific, actionable CV improvement advice. "
    "Focus on concrete steps the student can take. Respond with valid JSON only."
)


async def generate_cv_advice(
    cv_text: str,
    parsed_jd: dict,
    screening_result: dict,
) -> list[dict]:
    missing = screening_result.get("missing_skills", [])
    matched = screening_result.get("matched_skills", [])
    scores = {
        "skills": screening_result.get("skills_score", 0),
        "experience": screening_result.get("experience_score", 0),
        "education": screening_result.get("education_score", 0),
        "extras": screening_result.get("extras_score", 0),
    }

    cv_snippet = cv_text[:2000]

    prompt = f"""Analyze this student's CV against a job posting and provide detailed improvement advice.

Job Title: {parsed_jd.get('title', 'Unknown')}
Required Skills: {', '.join(parsed_jd.get('required_skills', []))}
Preferred Skills: {', '.join(parsed_jd.get('preferred_skills', []))}
Min Experience: {parsed_jd.get('min_experience_years', 0)} years
Education: {parsed_jd.get('education_level', 'Not specified')}

Student's matched skills: {', '.join(matched)}
Student's missing skills: {', '.join(missing)}
Score breakdown: Skills {scores['skills']}/40, Experience {scores['experience']}/30, Education {scores['education']}/20, Extras {scores['extras']}/10

CV excerpt:
{cv_snippet}

Return a JSON array with one entry per gap area. Each entry must have:
- "skill": the skill or area name
- "priority": "high", "medium", or "low"
- "current_level": brief assessment of where they stand now
- "action_steps": array of 2-3 specific actions they can take
- "resources": array of 1-2 free learning resources (course names, platforms, or project ideas)
- "estimated_time": realistic time to improve (e.g. "2-4 weeks")

Cover missing skills first (high priority), then weak score areas. Return 3-6 entries total.
Return ONLY the JSON array, no other text."""

    result = await call_llm(prompt, SYSTEM)

    if isinstance(result, dict):
        for key in ("advice", "improvements", "suggestions", "items", "data"):
            if key in result and isinstance(result[key], list):
                result = result[key]
                break
        else:
            result = [result]

    if not isinstance(result, list):
        return []

    validated = []
    for item in result:
        if not isinstance(item, dict):
            continue
        validated.append({
            "skill": str(item.get("skill", "General")),
            "priority": str(item.get("priority", "medium")).lower(),
            "current_level": str(item.get("current_level", "Not assessed")),
            "action_steps": [str(s) for s in item.get("action_steps", [])][:3],
            "resources": [str(r) for r in item.get("resources", [])][:2],
            "estimated_time": str(item.get("estimated_time", "2-4 weeks")),
        })

    return validated[:6]
