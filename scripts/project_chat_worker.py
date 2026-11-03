#!/usr/bin/env python3
"""Verwerkt Growth OS-projectgesprekken via lokale Hermes-profielen."""

from __future__ import annotations

import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request

BASE_URL = os.environ.get("GROWTH_OS_URL", "https://elite-fit-growth-os.vercel.app").rstrip("/")
WORKDIR = os.environ.get("GROWTH_OS_WORKDIR", "/Users/sven/Documents/Cowork OS")
ALLOWED_PROFILES = {"default", "marketing", "sales", "coaching", "operations"}
MEMORY_RE = re.compile(r"\s*<project_memory>(.*?)</project_memory>\s*", re.DOTALL)


def load_secret() -> str:
    value = os.environ.get("PROJECT_CHAT_SECRET", "").strip()
    if value:
        return value
    for path in [Path.home() / ".hermes/.env", Path.home() / ".hermes/profiles/operations/.env"]:
        if not path.exists():
            continue
        for line in path.read_text(errors="ignore").splitlines():
            if line.startswith("PROJECT_CHAT_SECRET="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("PROJECT_CHAT_SECRET ontbreekt")


def request_json(method: str, path: str, secret: str, payload: dict | None = None) -> dict:
    body = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=body,
        method=method,
        headers={
            "Authorization": f"Bearer {secret}",
            "Content-Type": "application/json",
            "User-Agent": "elite-fit-project-chat-worker/1.0",
        },
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.loads(response.read().decode())


def relation(value):
    if isinstance(value, list):
        return value[0] if value else {}
    return value or {}


def run_hermes(message: dict) -> tuple[str, list[dict]]:
    project = relation(message.get("projects"))
    thread = relation(message.get("project_threads"))
    profile = thread.get("bot_profile") or "default"
    if profile not in ALLOWED_PROFILES:
        profile = "default"

    prompt = f"""Je antwoordt binnen het Growth OS-projectgeheugen van Elite Fit.

Project: {project.get('name', '')}
Projectomschrijving: {project.get('description') or 'Niet ingevuld'}
Projectsoort: {project.get('kind', '')}
Projectstatus: {project.get('status', '')}
Onderwerp van dit gesprek: {thread.get('title', '')}
Type onderwerp: {thread.get('topic_type', 'algemeen')}

Bericht van Sven:
{message.get('content', '')}

Antwoord in het Nederlands, kort, nuchter en direct. Gebruik de normale bronnen, regels en gereedschappen van jouw profiel wanneer dat nodig is. Publiceer of verstuur niets extern zonder Svens expliciete akkoord. Behandel dit als een doorlopend projectgesprek: gebruik de eerdere sessiecontext en houd het antwoord bij dit project en onderwerp.

Als dit bericht een blijvend projectidee, besluit, open vraag, voortgangspunt of bron bevat, voeg dan na je normale antwoord exact één blok toe in dit formaat:
<project_memory>{{"items":[{{"type":"idee|besluit|vraag|voortgang|bron","title":"korte titel","content":"korte feitelijke toelichting"}}]}}</project_memory>
Laat het blok volledig weg als er niets blijvends is. Zet nooit klantgegevens, gezondheidsinformatie, bedragen, tokens of wachtwoorden in dit blok.
"""

    session_name = thread.get("hermes_session_name") or f"growth-os-{message['project_id']}-{message['thread_id']}"
    with tempfile.NamedTemporaryFile("w", suffix=".txt", encoding="utf-8", delete=False) as handle:
        handle.write(prompt)
        prompt_path = handle.name

    try:
        command = [
            "hermes",
            "-p",
            profile,
            "chat",
            "--query-file",
            prompt_path,
            "--format",
            "stream-json",
            "--continue",
            session_name,
            "--create-if-missing",
            "--source",
            "tool",
            "--in",
            WORKDIR,
        ]
        result = subprocess.run(command, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            detail = (result.stderr or result.stdout or "Hermes-run mislukt").strip()
            raise RuntimeError(detail[-1500:])

        answer = ""
        for line in result.stdout.splitlines():
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event.get("type") == "result":
                answer = str(event.get("text") or "").strip()
        if not answer:
            raise RuntimeError("Hermes gaf geen eindantwoord terug")

        memory_items: list[dict] = []
        match = MEMORY_RE.search(answer)
        if match:
            try:
                parsed = json.loads(match.group(1))
                values = parsed.get("items", []) if isinstance(parsed, dict) else []
                if isinstance(values, list):
                    memory_items = [item for item in values if isinstance(item, dict)]
            except json.JSONDecodeError:
                memory_items = []
            answer = MEMORY_RE.sub("", answer).strip()
        return answer, memory_items
    finally:
        Path(prompt_path).unlink(missing_ok=True)


def save_memory(secret: str, message: dict, profile: str, items: list[dict]) -> None:
    allowed = {"idee", "besluit", "vraag", "voortgang", "bron"}
    for index, item in enumerate(items[:8]):
        item_type = item.get("type") if item.get("type") in allowed else "voortgang"
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        request_json(
            "POST",
            "/api/projecten/capture",
            secret,
            {
                "project_id": message["project_id"],
                "item_type": item_type,
                "title": title[:180],
                "content": str(item.get("content") or "").strip()[:4000] or None,
                "source": "project_chat",
                "source_ref": f"project-chat:{message['id']}:{index}",
                "created_by_profile": profile,
            },
        )


def main() -> int:
    try:
        secret = load_secret()
        queue = request_json("GET", "/api/project-chat/queue", secret)
        messages = queue.get("messages", []) if queue.get("ok") else []
        processed = 0
        failed = 0
        for message in messages:
            thread = relation(message.get("project_threads"))
            profile = thread.get("bot_profile") or "default"
            try:
                answer, memory_items = run_hermes(message)
                request_json(
                    "POST",
                    "/api/project-chat/queue",
                    secret,
                    {"message_id": message["id"], "response": answer},
                )
                save_memory(secret, message, profile, memory_items)
                processed += 1
            except Exception as exc:
                failed += 1
                try:
                    request_json(
                        "POST",
                        "/api/project-chat/queue",
                        secret,
                        {"message_id": message.get("id"), "error": str(exc)[:1000]},
                    )
                except Exception:
                    pass
        if processed or failed:
            print(f"Projectgesprekken verwerkt: {processed}; mislukt: {failed}")
        return 0 if failed == 0 else 1
    except urllib.error.HTTPError as exc:
        print(f"Growth OS API-fout: {exc.code}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Projectgesprekken-worker: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
