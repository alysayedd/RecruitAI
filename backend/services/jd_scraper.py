import re
from html.parser import HTMLParser
import httpx


JD_KEYWORDS = [
    "responsibilities", "requirements", "qualifications", "about the role",
    "what you'll do", "what we're looking for", "job description",
    "preferred", "required skills", "experience", "education",
    "about this role", "key responsibilities", "must have", "nice to have",
]

STRIP_TAGS = {"script", "style", "nav", "header", "footer", "noscript", "svg", "iframe"}


class _TextExtractor(HTMLParser):

    def __init__(self):
        super().__init__()
        self._pieces: list[str] = []
        self._skip_depth = 0
        self._title = ""
        self._in_title = False

    def handle_starttag(self, tag: str, attrs):
        if tag in STRIP_TAGS:
            self._skip_depth += 1
        if tag == "title":
            self._in_title = True
        if tag in ("br", "p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6", "tr"):
            self._pieces.append("\n")

    def handle_endtag(self, tag: str):
        if tag in STRIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1
        if tag == "title":
            self._in_title = False

    def handle_data(self, data: str):
        if self._in_title:
            self._title += data
        if self._skip_depth == 0:
            self._pieces.append(data)

    def get_text(self) -> str:
        raw = "".join(self._pieces)
        raw = re.sub(r"[ \t]+", " ", raw)
        raw = re.sub(r"\n{3,}", "\n\n", raw)
        return raw.strip()

    def get_title(self) -> str:
        return self._title.strip()


def _find_jd_section(text: str) -> str:
    lines = text.split("\n")
    best_start = 0
    best_score = 0
    window = 30

    for i in range(len(lines)):
        chunk = "\n".join(lines[i : i + window]).lower()
        score = sum(1 for kw in JD_KEYWORDS if kw in chunk)
        if score > best_score:
            best_score = score
            best_start = i

    if best_score >= 2:
        end = min(best_start + 80, len(lines))
        return "\n".join(lines[best_start:end]).strip()

    return text[:5000]


async def scrape_jd_from_url(url: str) -> dict:
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=30.0,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9",
            },
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()

            content_type = resp.headers.get("content-type", "")
            if "html" not in content_type and "text" not in content_type:
                return {"url": url, "extracted_text": "", "title": "", "success": False,
                        "error": f"Unexpected content type: {content_type}"}

            html = resp.text
            parser = _TextExtractor()
            parser.feed(html)
            full_text = parser.get_text()
            title = parser.get_title()

            if len(full_text) < 50:
                return {"url": url, "extracted_text": "", "title": title, "success": False,
                        "error": "Page returned very little text. It may require JavaScript to render."}

            extracted = _find_jd_section(full_text)

            return {"url": url, "extracted_text": extracted, "title": title, "success": True, "error": ""}

    except httpx.TimeoutException:
        return {"url": url, "extracted_text": "", "title": "", "success": False,
                "error": "Request timed out. The site may be slow or blocking automated requests."}
    except httpx.HTTPStatusError as e:
        return {"url": url, "extracted_text": "", "title": "", "success": False,
                "error": f"HTTP {e.response.status_code} error."}
    except Exception as e:
        return {"url": url, "extracted_text": "", "title": "", "success": False,
                "error": str(e)[:200]}
