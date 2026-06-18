from agents.common import call_llm
from pydantic import BaseModel, Field

class JobDescriptionResult(BaseModel):
    title: str = Field(description="Job title")
    required_skills: list[str] = Field(description="List of required skills")
    preferred_skills: list[str] = Field(description="List of preferred skills")
    min_experience_years: int = Field(description="Minimum years of experience required")
    education_level: str = Field(description="Required education level e.g., Bachelor's")
    responsibilities: list[str] = Field(description="List of job responsibilities")
    bias_flags: list[str] = Field(description="Any biased language found with reason")


SYSTEM = (
    "You are a fair, unbiased HR analyst. Extract structured information from job descriptions. "
    "Always respond with valid JSON only. No explanation outside the JSON."
)

BIAS_PHRASES = [
    "young", "youthful", "energetic team", "recent graduate preferred",
    "native speaker", "native english", "mother tongue",
    "rockstar", "ninja", "guru", "digital native", "culture fit", "clean-cut",
    "fresh graduate only", "must be under", "must be over",
    "manpower", "manning", "gentleman", "lady",
    "he/she", "his/her",
    "top-tier university", "prestigious university", "ivy league",
    "local candidates only", "must be", "no relocation",
    "strong man", "attractive", "presentable",
    "boys", "girls",
]

# Skill synonym groups — if a JD asks for a generic skill on the left, any of the
# right-hand items in a CV should count as a match. Lowercased on use.
SKILL_SYNONYMS: dict[str, list[str]] = {
    "rest api": ["rest apis", "restful", "fastapi", "flask", "django", "django rest framework", "drf", "express", "expressjs", "express.js", "spring boot", "ktor", "gin", "fiber"],
    "rest apis": ["rest api", "restful", "fastapi", "flask", "django", "django rest framework", "drf", "express", "expressjs", "express.js", "spring boot", "ktor", "gin", "fiber"],
    "restful": ["rest api", "rest apis", "fastapi", "flask", "django", "express", "spring boot"],
    "ci/cd": ["github actions", "gitlab ci", "circleci", "jenkins", "travis", "azure pipelines", "argocd"],
    "cloud": ["aws", "azure", "gcp", "google cloud"],
    "containerization": ["docker", "podman", "containerd"],
    "orchestration": ["kubernetes", "k8s", "nomad", "ecs"],
    "frontend framework": ["react", "vue", "angular", "svelte", "next.js", "nuxt"],
    "sql": ["postgresql", "postgres", "mysql", "sqlite", "mssql", "oracle", "mariadb"],
    "version control": ["git", "github", "gitlab", "bitbucket"],
}


def _expand_skill_synonyms(skills: list[str]) -> list[str]:
    """Append known synonyms so the screener prompt sees the full equivalent set.
    Preserves the original skill name first so the JD context stays readable."""
    seen: set[str] = set()
    expanded: list[str] = []
    for skill in skills:
        key = skill.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        expanded.append(skill)
        for syn in SKILL_SYNONYMS.get(key, []):
            if syn not in seen:
                seen.add(syn)
                expanded.append(syn)
    return expanded


async def run_jd_parser(jd_text: str) -> dict:
    prompt = f"""Extract the following from this job description:
- title
- required_skills
- preferred_skills
- min_experience_years
- education_level
- responsibilities
- bias_flags

Job Description:
{jd_text[:3000]}
"""
    result = await call_llm(prompt, SYSTEM, response_schema=JobDescriptionResult)

    if "error" in result:
        result["bias_flags"] = []

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

    # Expand skill synonyms so the screener correctly credits framework-level skills
    # (e.g. FastAPI/Flask/Django when "REST APIs" is required).
    result["required_skills"] = _expand_skill_synonyms(result.get("required_skills", []))
    result["preferred_skills"] = _expand_skill_synonyms(result.get("preferred_skills", []))

    return result
