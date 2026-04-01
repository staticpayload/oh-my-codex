---
name: deep-interview
description: "Intent-first mode for ambiguous or risky work. Use before implementation when the user goal is still fuzzy."
---

# Deep Interview

## Use this when

- the user describes outcomes, not behavior
- scope is drifting
- product tradeoffs matter more than code shape

## Flow

1. Read the repo and the current `.omx/` artifacts first.
2. Ask the smallest set of clarifying questions needed to lock intent.
3. Write the resulting constraints into `.omx/state/planning-state.json` and `.omx/research/summary.md`.
4. Hand off to `$plan` once the success criteria are concrete.

## Output standard

- clear goal
- in-scope vs out-of-scope
- acceptance criteria
- constraints that future executor passes must honor
