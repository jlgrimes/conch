#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import sqlite3
from pathlib import Path


def iso(ts):
    if ts is None:
        return dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    try:
        return dt.datetime.fromtimestamp(float(ts), dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    except Exception:
        return dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def extract_messages(conv):
    mapping = conv.get("mapping", {}) or {}
    out = []
    for node in mapping.values():
        msg = (node or {}).get("message") or {}
        if not msg:
            continue
        author = ((msg.get("author") or {}).get("role") or "unknown").strip()
        content = msg.get("content") or {}
        parts = content.get("parts") or []
        text_parts = []
        for p in parts:
            if isinstance(p, str) and p.strip():
                text_parts.append(p.strip())
            elif isinstance(p, dict):
                t = p.get("text")
                if isinstance(t, str) and t.strip():
                    text_parts.append(t.strip())
        if not text_parts:
            continue
        text = "\n".join(text_parts).strip()
        ts = msg.get("create_time")
        out.append((author, text, ts))
    return out


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
    conn.execute("CREATE INDEX IF NOT EXISTS idx_memories_subject ON memories(subject)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_memories_kind ON memories(kind)")


def main():
    ap = argparse.ArgumentParser(description="Import OpenClaw/ChatGPT-style conversations.json into Conch as episodes")
    ap.add_argument("--input", required=True, help="Path to conversations.json")
    ap.add_argument("--db", default=str(Path.home() / ".conch" / "default.db"), help="Conch sqlite path")
    ap.add_argument("--max-conversations", type=int, default=0, help="0 = all")
    ap.add_argument("--include-assistant", action="store_true", help="Include assistant messages (default: user only)")
    ap.add_argument("--prefix-title", action="store_true", help="Prefix episodes with conversation title")
    args = ap.parse_args()

    with open(args.input, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise SystemExit("Expected top-level JSON array of conversations")

    convs = data if args.max_conversations <= 0 else data[: args.max_conversations]

    db_path = Path(args.db).expanduser()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    ensure_schema(conn)

    inserted = 0
    roles = {"user"}
    if args.include_assistant:
        roles.add("assistant")

    with conn:
        for conv in convs:
            title = (conv.get("title") or "untitled").strip()
            for author, text, ts in extract_messages(conv):
                if author not in roles:
                    continue
                body = text
                if args.prefix_title:
                    body = f"[{title}] [{author}] {text}"
                created = iso(ts or conv.get("create_time"))
                conn.execute(
                    """
                    INSERT INTO memories (kind, episode_text, strength, embedding, created_at, last_accessed_at, access_count)
                    VALUES ('episode', ?, 1.0, NULL, ?, ?, 0)
                    """,
                    (body, created, created),
                )
                inserted += 1

    conn.close()
    print(f"Imported {inserted} episodes into {db_path}")
    print("Next: run `conch embed` to generate embeddings for imported memories.")


if __name__ == "__main__":
    main()
