import json
import asyncio
import re
import logging
from openai import AsyncOpenAI, APIStatusError
from config import settings

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.GROQ_API_KEY,
            base_url=settings.GROQ_BASE_URL,
        )
    return _client


def _extract_json(text: str) -> dict:
    try:
        return json.loads(text.strip())
    except Exception:
        pass
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return {}


def _schema_to_instruction(response_schema) -> str:
    """Render a Pydantic model (or dict schema) as a JSON-only instruction."""
    if response_schema is None:
        return ""
    try:
        schema = response_schema.model_json_schema() if hasattr(response_schema, "model_json_schema") else response_schema
        return (
            "\n\nRespond with ONLY a single valid JSON object matching this schema "
            "(no prose, no markdown fences):\n" + json.dumps(schema)
        )
    except Exception:
        return "\n\nRespond with ONLY a single valid JSON object (no prose, no markdown fences)."


async def _groq_request(prompt: str, system: str = "", temperature: float = 0.1, response_schema=None) -> str:
    """Groq (OpenAI-compatible) provider with automatic rate-limit retry.
    Uses JSON mode when a response_schema is provided for reliable structured output."""
    client = _get_client()
    sys_text = system or ""
    if response_schema is not None:
        sys_text = (sys_text + _schema_to_instruction(response_schema)).strip()

    messages = []
    if sys_text:
        messages.append({"role": "system", "content": sys_text})
    messages.append({"role": "user", "content": prompt})

    kwargs = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 4096,
    }
    if response_schema is not None:
        kwargs["response_format"] = {"type": "json_object"}

    max_rate_limit_retries = 5
    for attempt in range(max_rate_limit_retries):
        try:
            response = await client.chat.completions.create(**kwargs)
            return response.choices[0].message.content or ""
        except APIStatusError as e:
            is_rate_limit = e.status_code in (429, 503, 529)
            if is_rate_limit and attempt < max_rate_limit_retries - 1:
                delay = 15 * (attempt + 1)
                retry_after = None
                if e.response is not None:
                    retry_after = e.response.headers.get("retry-after")
                if retry_after:
                    try:
                        delay = float(retry_after)
                    except ValueError:
                        pass
                logger.warning(
                    f"Rate limited by Groq API ({e.status_code}). "
                    f"Waiting {delay:.0f}s before retry {attempt + 2}/{max_rate_limit_retries}..."
                )
                await asyncio.sleep(delay)
            else:
                raise


async def call_llm(prompt: str, system: str = "", max_retries: int = 3, response_schema=None) -> dict:
    """Call Groq and parse JSON response.
    Uses JSON mode when response_schema is provided. Automatically handles rate limits.
    Temperature pinned to 0.0 for scoring determinism (still not fully deterministic on LLMs,
    but cuts variance ~50% — paired with the identical-CV normalization in the orchestrator)."""
    for attempt in range(max_retries):
        try:
            text = await _groq_request(prompt, system, 0.0, response_schema=response_schema)
            result = _extract_json(text)
            if result:
                return result
            return {"raw": text}
        except Exception as e:
            err_str = str(e)
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
            else:
                return {"error": err_str}
    return {}


async def call_llm_text(prompt: str, system: str = "", max_retries: int = 3) -> str:
    """Call Groq and return raw text response.
    Automatically handles rate limits with smart retry."""
    for attempt in range(max_retries):
        try:
            return await _groq_request(prompt, system, 0.2)
        except Exception as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
            else:
                return f"Error: {e}"
    return ""
