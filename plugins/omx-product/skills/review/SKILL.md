---
name: omx-product-review
description: OMX product plugin entry for findings-first verification across code, plans, checks, and durable runtime state.
---

# OMX Product Review

## Purpose

Use this skill when the OMX plugin bundle is installed and a slice, branch, or task is asking for approval. Review should answer "is this ready?" with evidence, not vibes.

## Review Order

1. Read the changed code and the task or plan it was supposed to satisfy.
2. Check the verification evidence:
   - tests
   - typechecks
   - smoke checks
   - docs updates
3. Inspect `.omx/` truth:
   - task state
   - review queue
   - inbox messages
   - notes or ledger entries
4. Record a verdict with `omx team review`.

## Mandatory Findings

- missing verification for changed paths
- stale docs or setup instructions
- task marked done while review evidence is missing
- runtime state claiming health while inbox or review queues still show unresolved work

## Output Standard

- findings first
- severity and file references where relevant
- final verdict: approved, changes requested, or blocked
- next action is explicit
