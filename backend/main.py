"""CodeXa API — FastAPI + Hugging Face Inference."""

import os
import subprocess
import tempfile
import time
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from hf_client import LLMQuotaExceeded, generate_chat, generate_review

load_dotenv()

app = FastAPI(title="CodeXa API", version="1.0.0")

# ---------------------------------------------------------------------------
# In-memory file store  { filename: content }
# ---------------------------------------------------------------------------
_files: dict[str, str] = {
    "main.py": 'def divide(a, b):\n    return a / b\n\ndef main():\n    print(divide(10, 0))\n\nif __name__ == "__main__":\n    main()\n',
    "utils.py": '# Utility helpers\n\ndef greet(name: str) -> str:\n    return f"Hello, {name}!"\n',
}

_origins = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ReviewRequest(BaseModel):
    code: str
    language: str = Field(..., description="c | cpp | python | java")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    code: str
    language: str
    messages: list[ChatMessage] = Field(default_factory=list)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/review-code")
async def review_code(body: ReviewRequest) -> dict[str, Any]:
    if not body.code.strip():
        raise HTTPException(400, "code is empty")
    try:
        result = await generate_review(body.language, body.code)
    except LLMQuotaExceeded as e:
        raise HTTPException(429, str(e)) from e
    except RuntimeError as e:
        raise HTTPException(503, str(e)) from e
    except Exception as e:
        msg = str(e)
        if len(msg) > 400:
            msg = msg[:400] + "…"
        raise HTTPException(502, f"Review failed: {msg}") from e
    return result


@app.post("/chat")
async def chat(body: ChatRequest) -> dict[str, Any]:
    try:
        hist = [{"role": m.role, "content": m.content} for m in body.messages]
        result = await generate_chat(body.language, body.code, hist)
    except LLMQuotaExceeded as e:
        raise HTTPException(429, str(e)) from e
    except RuntimeError as e:
        raise HTTPException(503, str(e)) from e
    except Exception as e:
        msg = str(e)
        if len(msg) > 400:
            msg = msg[:400] + "…"
        raise HTTPException(502, f"Chat failed: {msg}") from e
    return result


@app.get("/metrics")
def metrics(user_id: Optional[str] = None) -> dict[str, Any]:
    """Aggregate metrics placeholder — frontend charts; Firestore sync in app."""
    return {
        "score_history": [
            {"date": "2026-03-20", "score": 72},
            {"date": "2026-03-22", "score": 78},
            {"date": "2026-03-24", "score": 85},
            {"date": "2026-03-26", "score": 88},
            {"date": "2026-03-28", "score": 91},
        ],
        "issue_trends": [
            {"name": "bug", "count": 4},
            {"name": "performance", "count": 2},
            {"name": "security", "count": 1},
            {"name": "style", "count": 6},
        ],
        "user_id": user_id,
    }


# ---------------------------------------------------------------------------
# File Management Endpoints
# ---------------------------------------------------------------------------

class CreateFileRequest(BaseModel):
    name: str
    content: str = ""


class SaveFileRequest(BaseModel):
    name: str
    content: str


class RenameFileRequest(BaseModel):
    old_name: str
    new_name: str


@app.get("/files")
def list_files() -> dict[str, Any]:
    """Return list of all files with metadata."""
    return {
        "files": [
            {"name": name, "size": len(content)}
            for name, content in _files.items()
        ]
    }


@app.post("/create-file")
def create_file(body: CreateFileRequest) -> dict[str, Any]:
    """Create a new file. Fails if already exists."""
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "File name is required")
    if name in _files:
        raise HTTPException(409, f"File '{name}' already exists")
    _files[name] = body.content
    return {"name": name, "created": True}


@app.get("/file/{name}")
def get_file(name: str) -> dict[str, Any]:
    """Read a single file's content."""
    if name not in _files:
        raise HTTPException(404, f"File '{name}' not found")
    return {"name": name, "content": _files[name]}


@app.put("/save-file")
def save_file(body: SaveFileRequest) -> dict[str, Any]:
    """Upsert a file's content (creates if missing)."""
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "File name is required")
    _files[name] = body.content
    return {"name": name, "saved": True}


@app.put("/rename-file")
def rename_file(body: RenameFileRequest) -> dict[str, Any]:
    """Rename a file."""
    old, new = body.old_name.strip(), body.new_name.strip()
    if not old or not new:
        raise HTTPException(400, "Both old and new names are required")
    if old not in _files:
        raise HTTPException(404, f"File '{old}' not found")
    if new in _files:
        raise HTTPException(409, f"File '{new}' already exists")
    _files[new] = _files.pop(old)
    return {"old_name": old, "new_name": new, "renamed": True}


@app.delete("/file/{name}")
def delete_file(name: str) -> dict[str, Any]:
    """Delete a file."""
    if name not in _files:
        raise HTTPException(404, f"File '{name}' not found")
    del _files[name]
    return {"name": name, "deleted": True}


# ---------------------------------------------------------------------------
# Code Execution Endpoint  (local subprocess — no external API needed)
# ---------------------------------------------------------------------------

class ExecuteRequest(BaseModel):
    code: str
    language: str  # python | c | cpp | java


# Maximum execution time in seconds
_TIMEOUT = 10


@app.post("/execute")
def execute_code(body: ExecuteRequest) -> dict[str, Any]:
    """Run code locally using subprocess and return stdout/stderr."""
    lang = body.language.lower().strip()
    code = body.code

    if not code.strip():
        raise HTTPException(400, "code is empty")

    start = time.perf_counter()

    try:
        if lang == "python":
            result = _run_python(code)
        elif lang == "c":
            result = _run_c(code)
        elif lang in ("cpp", "c++"):
            result = _run_cpp(code)
        elif lang == "java":
            result = _run_java(code)
        else:
            raise HTTPException(400, f"Unsupported language: {lang}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e)) from e

    elapsed = round(time.perf_counter() - start, 3)
    result["time"] = str(elapsed)
    return result


# ── Language runners ─────────────────────────────────────────────────────────

def _proc(cmd: list[str], stdin: str = "") -> dict[str, Any]:
    """Run a command, capture output, enforce timeout."""
    try:
        proc = subprocess.run(
            cmd,
            input=stdin,
            capture_output=True,
            text=True,
            timeout=_TIMEOUT,
        )
        return {
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "exit_code": proc.returncode,
        }
    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": f"⏱ Time limit exceeded ({_TIMEOUT}s)",
            "exit_code": 1,
        }


def _run_python(code: str) -> dict[str, Any]:
    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
        f.write(code)
        fname = f.name
    try:
        return _proc(["python", "-u", fname])
    finally:
        os.unlink(fname)


def _run_c(code: str) -> dict[str, Any]:
    with tempfile.NamedTemporaryFile(suffix=".c", mode="w", delete=False) as f:
        f.write(code)
        src = f.name
    out = src.replace(".c", "")
    try:
        comp = _proc(["gcc", src, "-o", out, "-lm"])
        if comp["exit_code"] != 0:
            return {"stdout": "", "stderr": comp["stderr"], "exit_code": comp["exit_code"]}
        return _proc([out])
    finally:
        os.unlink(src)
        if os.path.exists(out):
            os.unlink(out)


def _run_cpp(code: str) -> dict[str, Any]:
    with tempfile.NamedTemporaryFile(suffix=".cpp", mode="w", delete=False) as f:
        f.write(code)
        src = f.name
    out = src.replace(".cpp", "")
    try:
        comp = _proc(["g++", src, "-o", out, "-std=c++17"])
        if comp["exit_code"] != 0:
            return {"stdout": "", "stderr": comp["stderr"], "exit_code": comp["exit_code"]}
        return _proc([out])
    finally:
        os.unlink(src)
        if os.path.exists(out):
            os.unlink(out)


def _run_java(code: str) -> dict[str, Any]:
    # Java requires filename == public class name
    import re
    match = re.search(r"public\s+class\s+(\w+)", code)
    class_name = match.group(1) if match else "Main"

    tmp_dir = tempfile.mkdtemp()
    src = os.path.join(tmp_dir, f"{class_name}.java")
    try:
        with open(src, "w") as f:
            f.write(code)
        comp = _proc(["javac", src])
        if comp["exit_code"] != 0:
            return {"stdout": "", "stderr": comp["stderr"], "exit_code": comp["exit_code"]}
        return _proc(["java", "-cp", tmp_dir, class_name])
    finally:
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)
