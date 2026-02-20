---
name: 🚨 Reliability Incident
about: Report a live reliability incident or P1 regression in Conch
title: "[INCIDENT] "
labels: ["P1", "incident", "reliability"]
assignees: jlgrimes
---

## Incident Summary

<!-- One sentence: what broke, when, and what the impact is. -->

## Affected Component

- [ ] `conch-core` (memory store, recall, decay, embeddings)
- [ ] `conch-cli` (CLI commands)
- [ ] `conch-mcp` (MCP server / tool handlers)
- [ ] Multiple components

## Severity

- [ ] **Critical** — Data loss or corruption; memories unrecoverable
- [ ] **High** — Recall completely broken; MCP crashes on valid calls
- [ ] **Medium** — Partial recall failure; degraded results

## Timeline

| Time (UTC) | Event |
|------------|-------|
| `YYYY-MM-DDTHH:MM:SSZ` | Incident first observed |
| `YYYY-MM-DDTHH:MM:SSZ` | Reported here |

## Reproduction Steps

```
# Minimal steps to reproduce:
# 1.
# 2.
# 3.
```

**Expected:** what should happen  
**Actual:** what happens instead

## Blast Radius

- Estimated % of operations affected: ___
- Affected `conch` version / commit: ___
- DB state (`conch stats` output):

```
# paste output here
```

## Initial Hypothesis

<!-- What do you think caused this? Even a guess helps. -->

## Mitigation Checklist

- [ ] Root cause identified (< 4h from open)
- [ ] Workaround documented below (< 24h from open)
- [ ] Fix in draft PR (< 24h)
- [ ] Fix merged (< 48h)
- [ ] Regression test added
- [ ] CHANGELOG updated
- [ ] Incident post-mortem written (see [runbook](docs/reliability/incident-runbook.md#post-mortem))

## Workaround

<!-- If a temporary workaround exists, document it here so others can apply it immediately. -->

## Fix PR

<!-- Link the PR that resolves this incident: Fixes #(issue) -->

## Post-Mortem (after resolution)

<!-- Fill in after fix is merged. See runbook for template. -->

**Root cause:**  
**Fix summary:**  
**Prevention:**
