---
name: ultrawork
description: "Default OMX flow for intent -> plan -> execute -> verify, with team escalation only when durable parallelism is justified."
---

# Ultrawork

## Purpose

`$ultrawork` is the default OMX operating mode. It is the wrapper that decides whether to clarify, plan, execute directly, or escalate to durable team mode. It exists to finish the job end to end without losing state.

## Use When

- the user wants the work shipped, not just discussed
- the task is larger than a one-shot edit
- you need one sane default path instead of choosing skills manually

## Routing Rules

- ambiguous intent → `$deep-interview`
- clear but broad work → `$plan`
- one focused slice with known files → `$executor`
- parallel durable work → `$team`
- uncertain implementation pattern → `$research` or `$trace`

## Execution Policy

- start from the repo and `.omx/` truth, not chat memory
- prefer the smallest mode that can finish the job
- keep the runtime current as you go
- do not stop at a partial handoff unless the next owner is explicit

## Workflow

1. Start or resume the session with `omx session start` or `omx session resume`.
2. Read current state with `omx hud`.
3. Run the ambiguity gate:
   - if intent is fuzzy, use `$deep-interview`
   - if intent is clear, continue
4. Build or refresh the durable plan:
   - `omx autoresearch init <phase>` when discovery is needed
   - update `.omx/plans/` and `.omx/research/`
5. Choose execution mode:
   - direct slice → `$executor`
   - durable parallel slices → `$team`
6. Keep task, inbox, and review state current during execution.
7. Finish with explicit verification and a recorded verdict.

## State Contract

Ultrawork should leave behind:

- a current session
- a live or intentionally cleared planning state
- durable tasks with real status
- verification evidence in task notes or plan artifacts

## Final Check

- the next action is explicit
- no fake “done” state exists
- verification is recorded
- the work is either completed, in review, or intentionally blocked
