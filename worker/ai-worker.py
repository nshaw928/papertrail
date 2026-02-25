#!/usr/bin/env python3
"""
Papertrail AI Worker — polls Supabase ai_jobs queue, generates summaries via Ollama.
Runs on homelab K8s alongside Ollama. Uses service role key to bypass RLS.
"""

import ipaddress
import json
import logging
import os
import socket
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import pymupdf  # PyMuPDF
import requests
import yaml
from supabase import create_client, Client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("ai-worker")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1:8b")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "15"))
BATCH_ENABLED = os.environ.get("BATCH_ENABLED", "true").lower() == "true"
MAX_TEXT_CHARS = int(os.environ.get("MAX_TEXT_CHARS", "30000"))

# Load prompts
PROMPTS_PATH = os.environ.get("PROMPTS_PATH", str(Path(__file__).parent / "prompts.yaml"))
with open(PROMPTS_PATH) as f:
    PROMPTS = yaml.safe_load(f)

# ---------------------------------------------------------------------------
# Supabase client (service role — bypasses RLS)
# ---------------------------------------------------------------------------

db: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------


def _is_safe_url(url: str) -> bool:
    """Block requests to private/internal networks (SSRF protection)."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        # Resolve hostname and check all IPs
        for info in socket.getaddrinfo(hostname, parsed.port or 443):
            addr = info[4][0]
            ip = ipaddress.ip_address(addr)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return False
        return True
    except Exception:
        return False


def download_pdf_text(url: str) -> str | None:
    """Download a PDF from url and extract text with PyMuPDF."""
    if not _is_safe_url(url):
        log.warning("Blocked unsafe URL: %s", url)
        return None

    try:
        resp = requests.get(
            url,
            timeout=60,
            headers={"User-Agent": "Papertrail-AI-Worker/1.0"},
            allow_redirects=False,
        )
        # If redirect, validate the target too
        if resp.is_redirect and resp.headers.get("Location"):
            redirect_url = resp.headers["Location"]
            if not _is_safe_url(redirect_url):
                log.warning("Blocked redirect to unsafe URL: %s", redirect_url)
                return None
            resp = requests.get(
                redirect_url,
                timeout=60,
                headers={"User-Agent": "Papertrail-AI-Worker/1.0"},
                allow_redirects=False,
            )
        resp.raise_for_status()
        # Limit download size to 50 MB to prevent memory exhaustion
        if len(resp.content) > 50 * 1024 * 1024:
            log.warning("PDF too large (%d bytes): %s", len(resp.content), url)
            return None
    except Exception as e:
        log.warning("Failed to download PDF from %s: %s", url, e)
        return None

    try:
        doc = pymupdf.open(stream=resp.content, filetype="pdf")
        text_parts = []
        for page in doc:
            text_parts.append(page.get_text())
        text = "\n".join(text_parts)
        return text[:MAX_TEXT_CHARS] if text.strip() else None
    except Exception as e:
        log.warning("Failed to extract text from PDF: %s", e)
        return None


def get_text_for_work(work_id: str, source_url: str | None) -> str | None:
    """Get text from PDF or fallback to abstract."""
    # Try PDF first
    if source_url:
        text = download_pdf_text(source_url)
        if text:
            return text

    # Fallback: abstract from DB
    result = db.table("works").select("abstract").eq("id", work_id).single().execute()
    abstract = result.data.get("abstract") if result.data else None
    return abstract if abstract else None


# ---------------------------------------------------------------------------
# Ollama
# ---------------------------------------------------------------------------


def call_ollama(text: str) -> dict:
    """Call Ollama with the summary prompt. Returns {"summary": ..., "tags": [...]}."""
    prompt_config = PROMPTS["summary"]
    user_prompt = prompt_config["user"].replace("{text}", text)

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": prompt_config["system"]},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
    }

    resp = requests.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload, timeout=300)
    resp.raise_for_status()

    content = resp.json()["message"]["content"]
    return parse_llm_response(content)


def parse_llm_response(content: str) -> dict:
    """Parse the LLM response to extract summary and tags."""
    summary = ""
    tags = []

    # Split on TAGS: marker
    if "TAGS:" in content:
        parts = content.split("TAGS:", 1)
        summary_part = parts[0]
        tags_part = parts[1].strip()

        # Remove SUMMARY: prefix if present
        if "SUMMARY:" in summary_part:
            summary_part = summary_part.split("SUMMARY:", 1)[1]
        summary = summary_part.strip()

        # Parse JSON array from tags section
        try:
            # Find the JSON array in the tags section
            bracket_start = tags_part.index("[")
            bracket_end = tags_part.index("]") + 1
            tags = json.loads(tags_part[bracket_start:bracket_end])
        except (ValueError, json.JSONDecodeError):
            log.warning("Failed to parse tags JSON, attempting line-by-line")
            tags = [line.strip().strip("-").strip() for line in tags_part.splitlines() if line.strip()]
    else:
        # No TAGS marker — treat entire content as summary
        if "SUMMARY:" in content:
            content = content.split("SUMMARY:", 1)[1]
        summary = content.strip()

    # Ensure tags are strings and reasonable
    tags = [str(t).strip() for t in tags if isinstance(t, str) and t.strip()][:8]

    return {"summary": summary, "tags": tags}


# ---------------------------------------------------------------------------
# Job processing
# ---------------------------------------------------------------------------


def claim_job() -> dict | None:
    """Claim the highest-priority pending job atomically."""
    # Select next pending job
    result = (
        db.table("ai_jobs")
        .select("*")
        .eq("status", "pending")
        .order("priority", desc=True)
        .order("created_at")
        .limit(1)
        .execute()
    )

    if not result.data:
        return None

    job = result.data[0]

    # Atomic claim: only update if still pending
    update_result = (
        db.table("ai_jobs")
        .update({"status": "processing", "started_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", job["id"])
        .eq("status", "pending")
        .execute()
    )

    # If no rows updated, another worker claimed it
    if not update_result.data:
        return None

    return job


def process_job(job: dict) -> None:
    """Process a single AI job."""
    work_id = job["work_id"]
    job_id = job["id"]
    source_url = job.get("source_url")

    log.info("Processing job %s for work %s", job_id, work_id)

    try:
        text = get_text_for_work(work_id, source_url)
        if not text:
            raise ValueError("No text available for summarization")

        result = call_ollama(text)

        # Update works table
        db.table("works").update({
            "summary": result["summary"],
            "ai_tags": result["tags"],
            "summary_generated": True,
        }).eq("id", work_id).execute()

        # Mark job completed
        db.table("ai_jobs").update({
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", job_id).execute()

        log.info("Completed job %s — summary: %d chars, tags: %s",
                 job_id, len(result["summary"]), result["tags"])

    except Exception as e:
        log.error("Job %s failed: %s", job_id, e)
        db.table("ai_jobs").update({
            "status": "failed",
            "error": str(e)[:500],
        }).eq("id", job_id).execute()


# ---------------------------------------------------------------------------
# Background batch: enqueue works with no summary and no existing job
# ---------------------------------------------------------------------------


def enqueue_batch_jobs() -> int:
    """Find works without summaries or existing jobs and enqueue at low priority."""
    # Get works with no summary (limit batch size)
    result = (
        db.table("works")
        .select("id, open_access_url")
        .is_("summary", "null")
        .is_("summary_generated", "null")
        .not_.is_("abstract", "null")
        .limit(10)
        .execute()
    )

    if not result.data:
        return 0

    count = 0
    for work in result.data:
        # Check if job already exists
        existing = (
            db.table("ai_jobs")
            .select("id")
            .eq("work_id", work["id"])
            .in_("status", ["pending", "processing"])
            .limit(1)
            .execute()
        )

        if existing.data:
            continue

        db.table("ai_jobs").insert({
            "work_id": work["id"],
            "priority": 0,
            "source_url": work.get("open_access_url"),
        }).execute()
        count += 1

    return count


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------


def main() -> None:
    log.info("Papertrail AI Worker starting")
    log.info("Ollama: %s (model: %s)", OLLAMA_BASE_URL, OLLAMA_MODEL)
    log.info("Poll interval: %ds, Batch: %s", POLL_INTERVAL, BATCH_ENABLED)

    batch_counter = 0

    while True:
        try:
            job = claim_job()
            if job:
                process_job(job)
                continue  # Check for more jobs immediately

            # No pending jobs — optionally enqueue batch
            batch_counter += 1
            if BATCH_ENABLED and batch_counter >= 4:  # Every ~60s at 15s interval
                enqueued = enqueue_batch_jobs()
                if enqueued:
                    log.info("Enqueued %d batch jobs", enqueued)
                batch_counter = 0

        except KeyboardInterrupt:
            log.info("Shutting down")
            sys.exit(0)
        except Exception as e:
            log.error("Unexpected error in main loop: %s", e)

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
