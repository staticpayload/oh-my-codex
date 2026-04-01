---
name: research
description: "Evidence-first research mode for current patterns, implementation risks, and decision support."
---

# Research

## Purpose

Use `$research` when the correct implementation depends on facts you do not yet have, either from the repo or from current external sources.

## Execution Policy

- Start with brownfield evidence from the repo.
- Use primary sources for technical questions.
- End with a decision-ready recommendation, not a wall of notes.
- Persist findings so the next pass does not repeat the work.

## Workflow

1. Identify the actual unknowns.
2. Separate:
   - repo truth
   - external truth
   - assumptions
3. Gather only the evidence needed to decide.
4. Write the result into `.omx/research/summary.md`.
5. Update memory facts that execution should keep in view.

## Deliverables

- current pattern or contract summary
- risk list
- recommendation with concrete tradeoffs
- open questions that still block planning or execution
