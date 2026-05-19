import json
import asyncio
import re
import httpx
from google import genai
from config import settings

OLLAMA_URL = f"{settings.OLLAMA_BASE_URL}/api/generate"
GOOGLE_API_KEY = settings.GOOGLE_API_KEY


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


async def _ollama_request(
    prompt: str,
    system: str = "",
    options: dict | None = None,
    max_retries: int = 3,
) -> str:
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": options or {},
    }
    if system:
        payload["system"] = system

    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(OLLAMA_URL, json=payload)
                resp.raise_for_status()
                data = resp.json()
                if "error" in data:
                    raise RuntimeError(data["error"])
                return data.get("response", "")
        except Exception as e:
            err = str(e)
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
            else:
                raise RuntimeError(f"Ollama request failed after {max_retries} retries: {err}")
    raise RuntimeError("Ollama request failed")


async def _gemini_request(prompt: str, system: str = "", temperature: float = 0.1) -> str:
    client = genai.Client(api_key=GOOGLE_API_KEY)
    full_prompt = f"{system}\n\n{prompt}" if system else prompt
    response = client.models.generate_content(
        model=settings.GOOGLE_MODEL,
        contents=full_prompt,
        config={"temperature": temperature},
    )
    return response.text


async def call_llm(prompt: str, system: str = "", max_retries: int = 3) -> dict:
    provider = settings.LLM_PROVIDER
    for attempt in range(max_retries):
        try:
            if provider == "google":
                text = await _gemini_request(prompt, system, 0.1)
            else:
                text = await _ollama_request(prompt, system, {"temperature": 0.1, "num_predict": 1500}, max_retries=1)
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
    provider = settings.LLM_PROVIDER
    for attempt in range(max_retries):
        try:
            if provider == "google":
                return await _gemini_request(prompt, system, 0.2)
            else:
                return await _ollama_request(prompt, system, {"temperature": 0.2, "num_predict": 800}, max_retries=1)
        except Exception as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
            else:
                return f"Error: {e}"
    return ""
