"""Hugging Face Inference (Router) — OpenAI-compatible chat completions."""

import asyncio
import json
import os
import re
from typing import Any

import httpx

from prompts import CHAT_SYSTEM, CHAT_USER_TEMPLATE, REVIEW_SYSTEM, REVIEW_USER_TEMPLATE

ROUTER_CHAT_URL = "https://router.huggingface.co/v1/chat/completions"

QUOTA_HELP = (
    "Hugging Face rate limit or quota exceeded. Wait and retry or check your plan. "
    "Docs: https://huggingface.co/docs/inference-providers/en/index"
)

PROVIDER_HELP = (
    "If you already enabled Inference Providers, this model id may still be unavailable: "
    "many repos (including deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct) are not served on the HF Router. "
    "Set HF_MODEL_ID to a model that works in https://huggingface.co/playground — e.g. "
    "Qwen/Qwen2.5-Coder-7B-Instruct:fastest. "
    "For DeepSeek’s own API, use https://platform.deepseek.com/ (different from HF)."
)


class LLMQuotaExceeded(Exception):
    """Raised when HF returns 429 / rate limits."""


def _token() -> str:
    t = os.environ.get("HF_TOKEN", "").strip() or os.environ.get("HUGGINGFACE_HUB_TOKEN", "").strip()
    if not t:
        raise RuntimeError("HF_TOKEN (or HUGGINGFACE_HUB_TOKEN) is not set")
    return t


def _model_id() -> str:
    raw = os.environ.get("HF_MODEL_ID", "").strip()
    # Common .env typo: HF_MODEL_ID=HF_MODEL_ID=org/model
    if raw.startswith("HF_MODEL_ID="):
        raw = raw.removeprefix("HF_MODEL_ID=").strip()
    # Default: code instruct model that resolves on the HF Router (DeepSeek-Coder-V2-Lite-Instruct often does not).
    return raw or "Qwen/Qwen2.5-Coder-7B-Instruct:fastest"


def _strip_json_fence(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*", "", t)
        t = re.sub(r"\s*```$", "", t)
    return t.strip()


def _error_message(resp: httpx.Response) -> str:
    try:
        data = resp.json()
        err = data.get("error")
        if isinstance(err, dict):
            return str(err.get("message", data))
        if isinstance(err, str):
            return err
    except Exception:
        pass
    return resp.text or resp.reason_phrase


async def _chat_complete(
    messages: list[dict[str, str]],
    temperature: float,
    max_tokens: int,
) -> str:
    token = _token()
    model = _model_id()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    delays = (0, 2, 5, 10)
    last_exc: BaseException | None = None

    for i, delay in enumerate(delays):
        if delay:
            await asyncio.sleep(delay)
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
                r = await client.post(ROUTER_CHAT_URL, json=payload, headers=headers)
        except httpx.RequestError as e:
            last_exc = e
            if i < len(delays) - 1:
                continue
            raise RuntimeError(f"Hugging Face request failed: {e!s}") from e

        if r.status_code == 429:
            raise LLMQuotaExceeded(QUOTA_HELP)

        if r.status_code == 400:
            msg = _error_message(r)
            if "not supported by any provider" in msg.lower() or "model_not_supported" in r.text:
                raise RuntimeError(f"{msg} {PROVIDER_HELP}") from None
            raise RuntimeError(f"Hugging Face rejected the request: {msg}") from None

        if r.status_code == 401:
            raise RuntimeError(
                "Hugging Face API authentication failed. Check HF_TOKEN and that the token has inference access."
            ) from None

        if r.status_code == 503 and i < len(delays) - 1:
            continue

        if not r.is_success:
            raise RuntimeError(f"Hugging Face inference failed ({r.status_code}): {_error_message(r)}") from None

        try:
            data = r.json()
            choice = (data.get("choices") or [{}])[0]
            msg = choice.get("message") or {}
            content = msg.get("content", "")
            if isinstance(content, str):
                return content.strip()
            if isinstance(content, list):
                # Some APIs return content parts
                parts = []
                for p in content:
                    if isinstance(p, dict) and "text" in p:
                        parts.append(p["text"])
                    elif isinstance(p, str):
                        parts.append(p)
                return "".join(parts).strip()
            return str(content).strip()
        except (KeyError, IndexError, TypeError) as e:
            raise RuntimeError(f"Unexpected Hugging Face response shape: {r.text[:500]}") from e

    raise RuntimeError("Hugging Face inference failed after retries.")


async def generate_review(language: str, code: str) -> dict[str, Any]:
    lines = code.splitlines()
    numbered = "\n".join(f"{i + 1}| {line}" for i, line in enumerate(lines))
    user = REVIEW_USER_TEMPLATE.format(language=language, numbered_code=numbered)
    messages = [
        {"role": "system", "content": REVIEW_SYSTEM},
        {"role": "user", "content": user},
    ]
    raw = await _chat_complete(messages, 0.2, 4096)
    data = json.loads(_strip_json_fence(raw))
    return data


async def generate_chat(
    language: str,
    code: str,
    history: list[dict[str, str]],
) -> dict[str, Any]:
    hist_lines = []
    for m in history[-24:]:
        role = m.get("role", "user")
        content = m.get("content", "")
        hist_lines.append(f"{role}: {content}")
    history_text = "\n".join(hist_lines) if hist_lines else "(no prior messages)"

    user = CHAT_USER_TEMPLATE.format(
        language=language,
        code=code,
        history=history_text,
    )
    messages = [
        {"role": "system", "content": CHAT_SYSTEM},
        {"role": "user", "content": user},
    ]
    raw = await _chat_complete(messages, 0.4, 4096)
    data = json.loads(_strip_json_fence(raw))
    return data
