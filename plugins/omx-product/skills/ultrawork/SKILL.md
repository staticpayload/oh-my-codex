---
name: omx-product-ultrawork
description: OMX product plugin default for routing intent through interview, planning, execution, team escalation, and verification.
---

# OMX Product Ultrawork

## Purpose

Use this skill when the OMX plugin bundle is installed and you want the product-default operating mode. It is the packaged entrypoint for "figure out the right path, then finish the work."

## Routing Rules

- vague or risky request -> clarify with `$deep-interview`
- clear but broad request -> build a real execution prompt with `$plan`
- one bounded slice -> run with `$executor`
- parallel durable work -> escalate to `$team`
- missing repo understanding -> use `$trace` or `$research`

## Workflow

1. Start or resume the repo session with `omx session start` or `omx session resume`.
2. Inspect live state with `omx hud`.
3. Decide whether the request needs clarification, planning, direct execution, or team escalation.
4. Refresh durable artifacts under `.omx/` before changing code:
   - plans
   - research
   - tasks
   - review state
5. Execute through the smallest mode that can actually finish the job.
6. End with explicit verification and a recorded verdict.

## Rules

- do not jump into editing when the objective is still ambiguous
- do not escalate to team mode if direct execution is cheaper
- do not claim completion without tests, checks, or other evidence
- keep `.omx/` state aligned with reality throughout the run

## Final Check

- the next action is explicit
- the chosen mode matches the task size
- verification exists
- runtime state is not lying about progress
