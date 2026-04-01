---
name: executor
description: "Focused implementation mode for one planned slice with explicit verification and handoff."
---

# Executor

## Purpose

Use `$executor` to implement one narrow slice of already-planned work. This mode is about disciplined delivery, not exploration.

## Required Input

- the active plan slice
- exact or likely file targets
- verify commands
- constraints or decision boundaries from the interview/plan

## Execution Policy

- Read the relevant plan, task, and files before editing.
- Keep scope narrow. One slice, one handoff.
- Update durable task state as the slice moves.
- Record what you verified, not what you intended to verify.

## Deviation Rules

Auto-fix without asking when the issue is:

- a bug directly caused by the slice
- missing critical correctness or safety logic
- a blocking import/type/config issue needed to finish the slice

Stop and ask when the fix requires:

- a schema or storage redesign
- a new public API contract
- a major dependency or architecture change
- widening the feature beyond the approved slice

## Workflow

1. Read the active task and matching plan section.
2. Confirm the target files and verify steps.
3. Implement the smallest complete version of the slice.
4. Run the verify commands.
5. Update task notes or queue state with:
   - what changed
   - what was verified
   - what still needs review
6. Hand off to `$reviewer` or `omx team review`.

## Analysis Guard

If you are still reading after several passes and have not started the edit, stop and say what missing fact is blocking code. Do not hide indecision behind more searching.
