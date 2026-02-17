#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import re
import sqlite3
from pathlib import Path

IMPORTANT_PATTERNS = [
    r"\bremember\b",
    r"\bprefer(?:s|ence)?\b",
    r"\bmy name is\b",
    r"\bI (?:work|live|use|have|want|need|hate|love)\b",
    r"\bdecision\b|\bdecided\b|\bagreed\b",
    r"\btodo\b|\bremind\b|\bdeadline\b|\bdue\b",
    r"\bbug\b|\bissue\b|\bbroken\b|\bfailed\b|\bfix\b",
    r"\bproject\b|\bstartup\b|\broadmap\b",
]
PAT = re.compile("|".join(f"(?:{p})" for p in IMPORTANT_PATTERNS), re.IGNORECASE)


def to_iso(ts):
    if ts is None:
        return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    try:
        return dt.datetime.fromtimestamp(float(ts), dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    except Exception:
        return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def extract_text_parts(msg):
    content = (msg or {}).get("content") or {}
    parts = content.get("parts") or []
    out = []
    for p in parts:
        if isinstance(p, str):
            t = p.strip()
            if t:
                out.append(t)
        elif isinstance(p, dict):
            t = p.get("text")
            if isinstance(t, str) and t.strip():
                out.append(t.strip())
    return "\n".join(out).strip()


def score_importance(text: str) -> int:
    s = 0
    if len(text) >= 40:
        s += 1
    if len(text) >= 140:
        s += 1
    if PAT.search(text):
        s += 2
    # high signal punctuation / structure
    if ":" in text or "- " in text or "\n" in text:
        s += 1
    return s


def ensure_schema(conn):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS memories (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            kind            TEXT NOT NULL CHECK(kind IN ('fact', 'episode')),
            subject         TEXT,
            relation        TEXT,
            object          TEXT,
            episode_text    TEXT,
            strength        REAL NOT NULL DEFAULT 1.0,
            embedding       BLOB,
            created_at      TEXT NOT NULL,
            last_accessed_at TEXT NOT NULL,
            access_count    INTEGER NOT NULL DEFAULT 0
        )
        """
    )


def import_file(input_path: Path, db_path: Path, min_score: int, include_assistant: bool, max_conversations: int):
    data = json.loads(input_path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise SystemExit("Expected conversations JSON array")

    convs = data if max_conversations <= 0 else data[:max_conversations]

    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    ensure_schema(conn)

    roles = {"user"}
    if include_assistant:
        roles.add("assistant")

    seen = set()
    scanned = kept = 0

    with conn:
        for conv in convs:
            title = (conv.get("title") or "untitled").strip()
            mapping = conv.get("mapping") or {}
            for node in mapping.values():
                msg = (node or {}).get("message") or {}
                author = ((msg.get("author") or {}).get("role") or "").strip()
                if author not in roles:
                    continue

                text = extract_text_parts(msg)
                if not text:
                    continue
                scanned += 1

                # de-dupe exact text
                key = text[:4000]
                if key in seen:
                    continue
                seen.add(key)

                if score_importance(text) < min_score:
                    continue

                ts = msg.get("create_time") or conv.get("create_time")
                created = to_iso(ts)
                body = f"[{title}] [{author}] {text}"

                conn.execute(
                    """
                    INSERT INTO memories (kind, episode_text, strength, embedding, created_at, last_accessed_at, access_count)
                    VALUES ('episode', ?, 1.0, NULL, ?, ?, 0)
                    """,
                    (body, created, created),
                )
                kept += 1

    conn.close()
    return scanned, kept


def main():
    ap = argparse.ArgumentParser(description="Import important items from OpenClaw/ChatGPT conversations.json into Conch")
    ap.add_argument("--input", required=True, help="Path to conversations.json")
    ap.add_argument("--db", default=str(Path.home() / ".conch" / "default.db"), help="Conch DB path")
    ap.add_argument("--min-score", type=int, default=3, help="Importance threshold (default: 3)")
    ap.add_argument("--include-assistant", action="store_true", help="Include assistant messages")
    ap.add_argument("--max-conversations", type=int, default=0, help="0 = all")
    args = ap.parse_args()

    scanned, kept = import_file(Path(args.input).expanduser(), Path(args.db).expanduser(), args.min_score, args.include_assistant, args.max_conversations)
    print(f"Scanned {scanned} messages, imported {kept} important episodes.")
    print("Next: run `conch embed` to generate embeddings.")


if __name__ == "__main__":
    main()
