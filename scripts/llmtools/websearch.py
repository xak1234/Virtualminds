from __future__ import annotations

import html
import json
import re
from typing import Any, Dict, List, Optional, Tuple

import requests
from bs4 import BeautifulSoup
from openai import OpenAI


# ---------------- LM Studio connection ----------------
def lm_client() -> OpenAI:
    return OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")


def pick_model(client: OpenAI, contains: str) -> str:
    for m in client.models.list().data:
        if contains.lower() in m.id.lower():
            return m.id
    raise RuntimeError("Target model not loaded. Load your llama-3.2-8x4b-moe-v2-dark-champion-instruct-uncensored-abliterated-21b model in LM Studio.")


# ---------------- Yandex search tool ----------------
_YANDEX_URL = "https://yandex.com/search/"

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/121.0.0.0 Safari/537.36"
)


def _normalize_url(url: str) -> str:
    # Strip Yandex tracking params and decode HTML entities.
    url = html.unescape(url.strip())
    # Remove Yandex's `lr`, `clid`, `rq`, etc.
    url = re.sub(r"[?&](?:lr|clid|rq|gclid|utm_[^=]+)=[^&#]+", "", url)
    # Remove trailing ? or &
    url = re.sub(r"[?&]+$", "", url)
    return url


def _extract_results(doc: BeautifulSoup, limit: int) -> List[Dict[str, str]]:
    """
    Parse common Yandex SERP structures. Yandex may change HTML; this uses conservative selectors.
    """
    results: List[Dict[str, str]] = []

    # Primary: organic items often have h2 > a
    for h2 in doc.select("h2 a[href]"):
        title = h2.get_text(" ", strip=True)
        href = _normalize_url(h2["href"])
        if not href.startswith("http"):
            continue
        # Snippet frequently near the header
        block = h2.find_parent()
        snippet = ""
        if block:
            # Look for nearby snippet containers
            sn = block.find_next(string=True)
            snippet = (sn or "").strip()[:240]
        results.append({"title": title, "url": href, "snippet": snippet})

    # Fallback: generic result cards
    if len(results) < limit:
        for a in doc.select("a[href]"):
            href = a["href"]
            if not href.startswith("http"):
                continue
            title = a.get_text(" ", strip=True)
            if not title or len(title) < 4:
                continue
            candidate = {"title": title, "url": _normalize_url(href), "snippet": ""}
            # Avoid duplicates by URL
            if all(r["url"] != candidate["url"] for r in results):
                results.append(candidate)

    # De-duplicate and trim
    uniq: List[Dict[str, str]] = []
    seen: set[str] = set()
    for r in results:
        if r["url"] in seen:
            continue
        seen.add(r["url"])
        uniq.append(r)
        if len(uniq) >= limit:
            break
    return uniq


def yandex_search(query: str, num_results: int = 5, lang: str = "en") -> Dict[str, Any]:
    """
    Perform a simple Yandex web search and return top results.
    NOTE: HTML scraping can break if Yandex changes markup. Keep num_results small.
    """
    params = {"text": query, "lr": "213", "lang": lang}
    headers = {"User-Agent": _UA, "Accept-Language": "en-US,en;q=0.9"}
    resp = requests.get(_YANDEX_URL, params=params, headers=headers, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    items = _extract_results(soup, max(1, min(10, int(num_results))))
    return {"engine": "yandex", "query": query, "results": items}


# ---------------- Tool schema and loop ----------------
TOOLS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "yandex_search",
            "description": "Search the web via yandex.com and return top results.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "num_results": {"type": "integer", "minimum": 1, "maximum": 10, "default": 5},
                    "lang": {"type": "string", "default": "en"},
                },
                "required": ["query"],
                "additionalProperties": False,
            },
        },
    }
]

FUNCTIONS = {"yandex_search": yandex_search}


def chat_with_tools(
    client: OpenAI,
    model: str,
    messages: List[Dict[str, Any]],
    tools: Optional[List[Dict[str, Any]]] = None,
) -> str:
    resp = client.chat.completions.create(model=model, messages=messages, tools=tools or [])
    msg = resp.choices[0].message
    if not msg.tool_calls:
        return msg.content or ""

    messages.append(
        {
            "role": "assistant",
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in msg.tool_calls
            ],
        }
    )

    for tc in msg.tool_calls:
        name = tc.function.name
        args = json.loads(tc.function.arguments or "{}")
        if name not in FUNCTIONS:
            raise RuntimeError(f"Unknown tool: {name}")
        result = FUNCTIONS[name](**args)
        messages.append({"role": "tool", "tool_call_id": tc.id, "content": json.dumps(result)})

    final = client.chat.completions.create(model=model, messages=messages)
    return final.choices[0].message.content or ""


def demo() -> str:
    client = lm_client()
    model = pick_model(client, "llama-3.2-8x4b-moe-v2-dark-champion-instruct-uncensored-abliterated-21b")
    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": "Be concise. If needed, call yandex_search and cite URLs."},
        {"role": "user", "content": "Find two reliable pages explaining SIMD in C++."},
    ]
    return chat_with_tools(client, model, messages, TOOLS)


if __name__ == "__main__":
    print(demo())
