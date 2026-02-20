---
name: 🐛 P1 Reliability Bug
about: File a P1 (critical) reliability regression in Conch
title: "[P1] "
labels: ["P1", "bug", "reliability"]
assignees: jlgrimes
---

## Summary

<!-- One sentence describing the failure. -->

## Affected Component

- [ ] `conch-core`
- [ ] `conch-cli`
- [ ] `conch-mcp`

## P1 Qualification (check all that apply)

- [ ] Memory loss or unrecoverable deletion outside normal decay
- [ ] Data corruption (content mutated, embedding malformed)
- [ ] `conch recall` false negative (known memory not returned)
- [ ] `conch-mcp` panics on a valid tool call
- [ ] `forget` deletes more than intended
- [ ] `decay` deletes >50% of memories unexpectedly
- [ ] `export`/`import` produces invalid or rejected data

## Reproduction Steps

```
1.
2.
3.
```

**Expected:**  
**Actual:**

## DB State

```
# conch stats output:
```

## Blast Radius

- Affected operations: ___
- Affected version/commit: ___
- Estimated % of calls impacted: ___

## Initial Hypothesis

<!-- Optional but helpful. -->

---

*SLA: 48h from open to merged fix. See [P1 rubric](docs/reliability/p1-rubric.md).*
