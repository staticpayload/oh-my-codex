---
name: plan
description: "Execution-plan mode that turns intent into small, verifiable slices backed by durable .omx artifacts."
---

# Plan

## Purpose

Use `$plan` to create execution-ready slices. The output is not a strategy memo. It is the prompt-quality plan that downstream execution can follow without improvising core behavior.

## Use When

- the work is bigger than a one-shot edit
- the request is clear enough to plan but not yet safe to execute
- verification, dependencies, or sequencing need to be locked in

## Do Not Use When

- the task is still ambiguous enough for `$deep-interview`
- the change is a trivial single-file fix
- the user explicitly wants direct execution and the risk is low

## Execution Policy

- Gather repo facts before asking the user about internals.
- Plans are prompts for execution, not prose for humans only.
- Every slice must fit in one focused context window.
- Every slice must have explicit verification.
- Prefer a small number of high-quality slices over a long TODO dump.

## Plan Anatomy

Each slice should answer:

- what files are likely to change
- what the slice must do
- how to verify it
- what counts as done
- what it depends on

## Workflow

1. Read current intent artifacts:
   - `.omx/plans/*-requirements.md`
   - `.omx/plans/brownfield-map.md`
   - `.omx/research/summary.md`
2. Derive the must-haves from the goal backward:
   - what must be true when this is done?
   - what artifacts and connections are required for those truths?
3. Split the work into waves and slices:
   - interface/contracts first
   - implementation second
   - verification/wiring last
4. Write or refine:
   - active phase plan
   - verification map
   - any required task queue items
5. Keep every slice explicit about files, verification, and exit conditions.

## Quality Bar

- no vague acceptance criteria
- no “make it work” tasks
- no giant slice that hides three subsystems
- no verify step that depends on hope

## Deliverables

- `.omx/plans/<phase>.md`
- `.omx/plans/<phase>-verification.md`
- updated brownfield map or research summary when needed
