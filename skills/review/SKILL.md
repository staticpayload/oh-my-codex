---
name: review
description: "Findings-first pre-landing review against code, plan completion, verification evidence, and durable runtime state."
---

# Review

## Purpose

Use `$review` to answer one question: is this actually ready to land? Review is not a summary pass. It is a bug, regression, coverage, and state-integrity pass.

## Execution Policy

- Findings first, summary second.
- Prefer evidence over author claims.
- Check the code, the tests, the plan, and the runtime artifacts.
- If the current context authored the change, prefer a separate reviewer role for approval.

## Review Order

1. Read the changed code.
2. Read the active plan and verification map.
3. Check what was supposed to happen vs what actually landed.
4. Verify:
   - tests and typechecks
   - docs drift
   - `.omx/` state drift
   - task/review/inbox accuracy
5. Produce a verdict:
   - approved
   - changes requested
   - blocked

## Mandatory Checks

- missing or fake verification
- uncovered changed paths
- stale docs or setup instructions
- task marked done but still pending review evidence
- team runtime claiming health while inbox or review queue says otherwise

## Output Standard

- findings ordered by severity
- file references and why they matter
- residual risk
- final verdict and next action
