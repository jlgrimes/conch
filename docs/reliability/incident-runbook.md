# Conch Reliability Incident Runbook

This runbook covers rapid diagnosis, mitigation, and post-mortem for Conch reliability incidents. Use it alongside the [P1 rubric](./p1-rubric.md) to triage and respond to issues within the 48h SLA.

---

## 1. Immediate Response (0–4h)

### 1a. Create an Incident Issue

Use the [🚨 Reliability Incident](../../.github/ISSUE_TEMPLATE/incident.md) template on GitHub. Fill in at minimum:

- One-line summary
- Affected component
- Reproduction steps

The `P1` label triggers the SLA automation, which will post a deadline comment.

### 1b. Collect State

Run the following immediately to capture the DB state before any decay/mutation:

```bash
# Snapshot stats
conch stats

# Export full DB (safe, read-only)
conch export > /tmp/conch-incident-$(date +%Y%m%d-%H%M%S).json

# Check MCP logs if incident involves MCP
journalctl -u conch-mcp --since "1 hour ago" 2>/dev/null || cat ~/.conch/mcp.log 2>/dev/null
```

Paste the `conch stats` output into the incident issue.

### 1c. Protect the Database

If data is at risk (corruption, runaway deletion), **stop any running decay or import jobs immediately** and back up the raw SQLite file:

```bash
cp ~/.conch/default.db /tmp/conch-backup-$(date +%Y%m%d-%H%M%S).db
```

---

## 2. Diagnosis Playbook

### Memory Loss / Unexpected Deletion

**Suspects:**
- `forget --older-than` called with a negative or miscalculated duration ([issue #8](https://github.com/jlgrimes/conch/issues/8))
- `decay` running with extreme parameters
- Manual `DELETE` in SQLite

**Check:**
```bash
# How many memories remain?
conch stats

# Look for recent decay output
conch decay --dry-run 2>/dev/null || echo "no dry-run support"

# Check SQLite directly
sqlite3 ~/.conch/default.db "SELECT COUNT(*), kind FROM memories GROUP BY kind;"
sqlite3 ~/.conch/default.db "SELECT id, kind, strength, created_at, last_accessed_at FROM memories ORDER BY created_at DESC LIMIT 20;"
```

---

### Recall Returns No Results

**Suspects:**
- Embedding blobs corrupted or missing
- BM25 index out of sync
- Vector similarity threshold too aggressive (`> 0.3`)

**Check:**
```bash
# Does recall work at all?
conch recall "test query" --limit 10

# Re-generate embeddings (non-destructive)
conch embed

# Verify a specific memory exists
sqlite3 ~/.conch/default.db "SELECT id, kind, strength, length(embedding) as emb_len FROM memories LIMIT 10;"
```

If `emb_len` is 0 or NULL for most records, embeddings are missing — run `conch embed`.

---

### MCP Server Crash / Panic

**Suspects:**
- Poisoned mutex (fixed in post-issue #3 builds)
- Synchronous DB call blocking async runtime (fixed post-issue #6)
- Empty or invalid namespace (fixed post-issue #7)

**Check:**
```bash
# Run MCP manually to capture panic output
RUST_BACKTRACE=1 conch-mcp 2>&1 | head -50

# Verify version is post-fix
conch --version
```

If version is old, rebuild:
```bash
cd ~/projects/conch
cargo build --release
cargo install --path crates/conch-cli
```

---

### Import/Export Failure

**Check:**
```bash
# Verify export produces valid JSON
conch export | python3 -m json.tool > /dev/null && echo "✅ valid JSON" || echo "❌ invalid JSON"

# Test round-trip on a temp DB
conch export > /tmp/test-export.json
conch import --db /tmp/test.db < /tmp/test-export.json
conch recall "test" --db /tmp/test.db
```

---

## 3. Mitigation Patterns

### Restore from Backup

```bash
# Stop any running conch processes
pkill -f conch-mcp || true

# Restore
cp /tmp/conch-backup-YYYYMMDD-HHMMSS.db ~/.conch/default.db

# Verify
conch stats
conch recall "test query"
```

### Re-embed After Corruption

```bash
# Safe to run on live DB — only generates missing embeddings
conch embed
```

### Downgrade to Last Known Good

```bash
cd ~/projects/conch
git log --oneline -10       # find last good commit
git checkout <commit>
cargo install --path crates/conch-cli
```

---

## 4. Regression Test Protocol

Every P1 fix **must** ship with a regression test. The test should:

1. Reproduce the exact failure condition
2. Assert the correct behavior after the fix
3. Live in `crates/conch-core/src/` or `crates/conch-cli/src/` as a `#[test]`

Example skeleton:
```rust
#[test]
fn regression_p1_descriptive_name() {
    // Setup: create the condition that caused the bug
    // ...

    // Assert: the bug does not regress
    // ...
}
```

Run before merging:
```bash
cargo test
cargo clippy -- -D warnings
```

---

## 5. Post-Mortem Template

After the incident is resolved, fill in the post-mortem section of the incident issue:

```
## Post-Mortem

**Date resolved:** YYYY-MM-DD
**Time to resolve:** Xh from open to merge

### Root cause
<!-- What exactly caused the failure? Be specific. -->

### Fix summary
<!-- What was changed? Link the PR. -->

### Detection
<!-- How was this found? Could it have been caught earlier by a test or alert? -->

### Prevention
<!-- What will prevent this class of bug from recurring? -->
<!-- Checklist:
  - [ ] Regression test added
  - [ ] Related edge cases tested
  - [ ] Runbook updated if new failure mode discovered
  - [ ] CHANGELOG entry added
-->
```

---

## 6. Quick Reference

| Command | Purpose |
|---------|---------|
| `conch stats` | Check memory count + health |
| `conch export > backup.json` | Safe read-only DB dump |
| `conch embed` | Re-generate missing embeddings |
| `conch decay` | Run temporal decay pass |
| `sqlite3 ~/.conch/default.db ".schema"` | Verify schema integrity |
| `RUST_BACKTRACE=1 conch-mcp` | Capture MCP panic trace |

See also: [P1 rubric](./p1-rubric.md) · [GitHub incident template](../../.github/ISSUE_TEMPLATE/incident.md)
