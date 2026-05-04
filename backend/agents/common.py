import ollama
import json
import asyncio
import re
from config import settings


def _extract_json(text: str) -> dict:
    """Extract JSON from LLM response text robustly."""
    # Try direct parse first
    try:
        return json.loads(text.strip())
    except Exception:
        pass
    # Try to find JSON block in markdown
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    # Find first { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return {}


async def call_llm(prompt: str, system: str = "", max_retries: int = 3) -> dict:
    """Call Ollama LLM with retry/backoff. Returns parsed JSON dict."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    for attempt in range(max_retries):
        try:
            response = await asyncio.to_thread(
                ollama.chat,
                model=settings.OLLAMA_MODEL,
                messages=messages,
                options={"temperature": 0.1, "num_predict": 1500},
            )
            text = response["message"]["content"]
            result = _extract_json(text)
            if result:
                return result
            # If no JSON, return raw text under "raw" key
            return {"raw": text}
        except Exception as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
            else:
                return {"error": str(e)}
    return {}


async def call_llm_text(prompt: str, system: str = "", max_retries: int = 3) -> str:
    """Call Ollama LLM and return raw text response."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    for attempt in range(max_retries):
        try:
            response = await asyncio.to_thread(
                ollama.chat,
                model=settings.OLLAMA_MODEL,
                messages=messages,
                options={"temperature": 0.2, "num_predict": 800},
            )
            return response["message"]["content"]
        except Exception as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
            else:
                return f"Error: {str(e)}"
    return ""
