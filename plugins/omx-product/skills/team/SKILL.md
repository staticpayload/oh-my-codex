---
name: omx-product-team
description: OMX product plugin entry for durable tmux-aware multi-worker execution with review gates and resumable state.
---

# OMX Product Team

## Purpose

Use this skill when the OMX plugin bundle is installed and the work needs durable orchestration rather than one-shot fanout. It is for queueing slices, assigning workers, collecting handoffs, and holding review state across sessions.

## Use When

- the work splits cleanly into multiple slices
- workers need claims, leases, inbox messages, or review handoffs
- the runtime must survive longer than one local reasoning burst

## Do Not Use When

- the task is serial and small
- there is no real slice boundary
- the review overhead would exceed the value of parallelism

## Workflow

1. Initialize runtime state with `omx team init`.
2. Spawn or attach workers with `omx team spawn <workerId>`.
3. Queue explicit slices with concrete outcomes.
4. Claim tasks through worker ids, not ad-hoc ownership.
5. Move finished work into review with a readable handoff note.
6. Monitor health and drift:
   - `omx team status`
   - `omx team inbox`
   - `omx team logs <workerId>`
   - `omx hud`
7. Resume or shut down intentionally with `omx team resume` or `omx team shutdown`.

## Rules

- no silent completions
- no task goes straight from active to done without review
- no shutdown while live work is still in progress unless aborting
- if tmux is unavailable, treat degraded mode as a functional fallback, not proof of detached-worker behavior
