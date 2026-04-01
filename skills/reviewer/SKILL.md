---
name: reviewer
description: "Dedicated verification lane that applies the review protocol and records a durable approval or change request."
---

# Reviewer

## Purpose

Use `$reviewer` after `$executor` or `$team` when a dedicated verification pass should issue the verdict.

## Workflow

1. Apply the `$review` protocol.
2. Record the decision in the durable runtime:
   - `omx team review <taskId> <reviewer> approved|changes_requested <notes>`
3. Make the next action explicit:
   - land
   - fix
   - investigate

## Focus

- plan completion
- test and verification evidence
- docs and runtime state drift
- remaining risk worth blocking on
