---
name: deep-interview
description: "Intent-first clarification loop for vague, risky, or product-heavy work before planning or execution."
---

# Deep Interview

## Purpose

Use `$deep-interview` to turn a fuzzy request into an execution-ready spec. This is not generic brainstorming. It is a focused clarification loop that removes ambiguity before planning or coding.

## Use When

- the request describes outcomes, not behavior
- the user is still discovering what they want
- scope, non-goals, or decision boundaries are unclear
- a wrong assumption would create expensive rework

## Do Not Use When

- the request already names files, symbols, and acceptance criteria
- the user explicitly wants immediate execution and the risk is low
- the only missing work is architectural decomposition, not intent clarity

## Execution Policy

- Ask one question at a time.
- Ask only the highest-leverage unresolved question.
- Use repo facts before asking the user about codebase internals.
- Force clarity on non-goals and decision boundaries before handing off.
- Keep the interview moving toward a written artifact, not an endless conversation.

## Question Order

1. Why does this need to exist?
2. What should be true when it is done?
3. How far should it go?
4. What should explicitly stay out?
5. What may OMX decide without checking again?
6. What constraints or preferences are hard?

## Workflow

1. Read current `.omx/` artifacts and inspect the repo if this is brownfield work.
2. Capture the current hypothesis in `.omx/plans/<phase>-requirements.md`.
3. Run a one-question loop until these are explicit:
   - goal
   - in-scope
   - out-of-scope
   - acceptance criteria
   - decision boundaries
4. Update:
   - `.omx/plans/<phase>-requirements.md`
   - `.omx/research/summary.md`
   - `.omx/state/planning-state.json`
5. Hand off to `$plan` when the spec is concrete.

## Output Standard

The finished interview should leave behind:

- clear goal
- explicit non-goals
- decision boundaries
- testable acceptance criteria
- constraints that downstream execution must honor

## Stop Conditions

Do not hand off while either of these is missing:

- non-goals
- decision boundaries
