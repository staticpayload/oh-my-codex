---
name: review
description: "Review changed work against the plan, test coverage, and durable state before landing."
---

# Review

## Focus

- bugs and regressions first
- missing verification second
- stale `.omx/` state third

## Checklist

1. Read the changed code and the active `.omx/plans/*.md`.
2. Confirm verify steps exist and were actually run.
3. Check `omx hud` and team/task state for mismatches.
4. Call out missing tests, missing docs, and review-state drift.
