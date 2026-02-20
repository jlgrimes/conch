# Conch P1 Reliability Bug Rubric

A **P1** (Priority 1) bug is a critical reliability regression that must be triaged and resolved within **48 hours** of discovery. This document defines what qualifies as P1, how to classify issues, and the enforcement checklist.

---

## P1 Definition

A bug is P1 if **any** of the following are true:

| Category | Condition |
|----------|-----------|
| **Data loss** | Memories are deleted, silently truncated, or made unrecoverable outside of normal decay |
| **Corruption** | Stored fact/episode content is mutated, embedding blobs are malformed, or the SQLite schema is invalid |
| **Recall failure** | `conch recall` returns no results for a known-stored memory (false negative rate > 0) |
| **MCP crash** | `conch-mcp` panics or exits unexpectedly on a valid tool call |
| **Negative `forget`** | `forget --older-than` or any forget command deletes more than intended (e.g., wipes memories unexpectedly) |
| **SLA-violating decay** | A single `conch decay` run deletes > 50% of memories when no memories are near the 0.01 strength floor |
| **Import/export breakage** | `conch export` produces invalid JSON or `conch import` rejects valid exports |

---

## P2 / Not P1 (for reference)

These are serious but **not** P1:

- Recall returns suboptimal rankings (lower relevance, not false negatives)
- BM25/vector score imbalance
- CLI flag ergonomics or error message quality
- Performance regression (>2x slower, but not broken)
- Feature gaps or improvements

---

## 48-Hour SLA

When a P1 bug is identified:

| Hour | Action |
|------|--------|
| **0h** | Issue created with `P1` label + `blocked` removed; on-call (Claw) notified |
| **4h** | Root cause hypothesis written in issue comments |
| **24h** | Fix in draft PR or workaround shipped to mitigate impact |
| **48h** | Fix merged, regression test added, issue closed |

If 48h deadline is at risk, escalate to Jared immediately.

---

## P1 Issue Checklist

When creating a P1 bug report, the following fields are **required** before the issue is valid:

```
- [ ] Affected component: (conch-core / conch-cli / conch-mcp)
- [ ] Reproduction steps (minimal, ideally a failing test)
- [ ] Impact: which operations are broken
- [ ] Blast radius: estimated % of users/calls affected
- [ ] Database state at failure (output of `conch stats`)
- [ ] First known occurrence (timestamp or version)
- [ ] Linked incident (if spawned from a live failure)
```

---

## SLA Automation

A GitHub Actions workflow (`.github/workflows/p1-sla.yml`) enforces the 48h SLA:

- **Trigger**: Any issue with the `P1` label is opened or labeled
- **Action**: Adds a comment with the SLA deadline timestamp
- **Stale check**: Runs daily; if a `P1` issue is open > 48h without a linked PR, posts a warning comment

See also: [incident-runbook.md](./incident-runbook.md)
