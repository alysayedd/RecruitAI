from agents.common import call_llm_text

SYSTEM = (
    "You are a professional HR assistant. Draft clear, empathetic recruitment emails. "
    "Never include discriminatory language. Maintain a professional and respectful tone. "
    "Always include a subject line on the first line starting with 'Subject: '."
)


async def draft_email(
    candidate_name: str,
    job_title: str,
    email_type: str,
    score: float,
    explanation: str,
    matched_skills: list[str],
    missing_skills: list[str],
    hr_name: str,
    company_name: str,
    interview_time: str | None = None,
) -> dict:
    if email_type == "rejection":
        prompt = f"""Draft a professional rejection email for a candidate.

Candidate: {candidate_name}
Position: {job_title}
HR sender: {hr_name}
Company: {company_name}
Score: {score}/100
Strengths: {', '.join(matched_skills) if matched_skills else 'N/A'}
Areas to improve: {', '.join(missing_skills) if missing_skills else 'N/A'}
Assessment: {explanation}

Requirements:
- Start with 'Subject: ' on the first line
- Be empathetic and encouraging
- Thank them for applying
- Mention 1-2 specific strengths from their application
- Briefly suggest areas for growth without being harsh
- Encourage them to apply for future roles
- Sign off using the HR sender name and company
- Keep it under 200 words
- Do NOT mention their numerical score"""
    else:
        prompt = f"""Draft a professional next-step / interview invitation email for a candidate.

Candidate: {candidate_name}
Position: {job_title}
HR sender: {hr_name}
Company: {company_name}
Interview time: {interview_time or 'Not provided'}
Score: {score}/100
Key strengths: {', '.join(matched_skills) if matched_skills else 'N/A'}
Assessment: {explanation}

Requirements:
- Start with 'Subject: ' on the first line
- Congratulate them on being shortlisted
- Mention 1-2 specific strengths that stood out
- Explain the next step and include the exact interview time
- Ask them to confirm the interview time
- Sign off using the HR sender name and company
- Keep it professional and warm
- Keep it under 200 words
- Do NOT mention their numerical score"""

    text = await call_llm_text(prompt, SYSTEM)

    lines = text.strip().split("\n", 1)
    subject = ""
    body = text.strip()

    if lines[0].lower().startswith("subject:"):
        subject = lines[0].split(":", 1)[1].strip()
        body = lines[1].strip() if len(lines) > 1 else ""

    if not subject:
        if email_type == "rejection":
            subject = f"Your Application for {job_title}"
        else:
            subject = f"Next Steps - {job_title} Position"

    return {"subject": subject, "body": body, "email_type": email_type}
