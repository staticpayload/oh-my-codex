---
name: autoresearch
description: "Durable research-mission mode for long-running discovery, optimization, and evidence gathering under .omx/."
---

# Autoresearch

## Purpose

Use `$autoresearch` when the work is not ready for direct implementation and needs a mission loop with durable artifacts, logs, and a launch boundary.

## Use When

- you need to investigate patterns before committing to an implementation
- you want a durable optimization or discovery pass
- there is a clear mission, evaluator, or keep policy to refine

## Execution Policy

- Define the mission in plain language before launching anything.
- Treat launch readiness as a gate, not a vibe.
- Keep the log useful: phase changes, findings, blockers, next decision.
- Write artifacts the next pass can consume without rereading the whole chat.

## Workflow

1. Clarify the mission:
   - topic
   - why it matters
   - what counts as a good result
   - what should be kept or discarded
2. If intent is still fuzzy, route through `$deep-interview` first.
3. Initialize the mission:
   - `omx autoresearch init <mission>`
4. Record the canonical artifacts:
   - `.omx/research/summary.md`
   - `.omx/plans/<mission>-requirements.md`
   - `.omx/logs/autoresearch.log`
5. Log every real state transition with `omx autoresearch log`.
6. Hand off to `$plan`, `$team`, or direct execution only when the mission is decision-ready.

## Deliverables

- a clear mission statement
- research summary with findings and open questions
- explicit launch / refine-further decision

## Final Check

- the mission is concrete
- the logs are current
- the next decision is obvious
