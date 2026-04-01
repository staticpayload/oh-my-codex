---
name: team
description: "Durable multi-worker orchestration with queueing, claims, inbox, review gates, and tmux-aware lifecycle control."
---

# Team

## Purpose

`$team` is the durable execution mode. Use it when you need a shared queue, worker leases, review handoffs, and a runtime that survives beyond one reasoning burst.

## Team vs Native Fanout

- Use native subagents for small, in-session parallelism.
- Use `$team` when the work needs durable state, tmux workers, inbox coordination, resumability, or explicit review gates.

## Use When

- the work splits into parallel slices
- one operator needs durable coordination and review history
- tasks need claims, heartbeats, inbox messages, and resumable state

## Do Not Use When

- the task is sequential and small
- there is no meaningful slice boundary
- the cost of queueing and review would exceed the value of parallelism

## Preconditions

Before launching team mode:

1. the current task has a clear objective
2. the first slices are identifiable
3. the likely file areas are known
4. there is a verify path

If those are missing, run `$deep-interview`, `$trace`, or `$plan` first.

## Runtime Contract

- initialize with `omx team init`
- spawn or attach workers with `omx team spawn <workerId>`
- queue work with `omx team queue`
- claim with worker ids
- complete into review, never straight to done
- use inbox and logs to monitor real progress
- shut down only after terminal state or explicit abort

## Lifecycle

1. Launch the runtime and inspect backend health.
2. Queue explicit slices, not vague goals.
3. Ensure every task claim maps to a real worker id.
4. Keep heartbeats and logs current.
5. Move completions into review with a concrete handoff note.
6. Monitor:
   - `omx team status`
   - `omx team inbox`
   - `omx team logs <workerId>`
   - `omx hud`
7. Shutdown only when active work is terminal or the user wants an abort.

## Degraded Mode

If tmux is missing, the runtime may fall back to mock mode. That is acceptable for state flow and testing, not as proof of real detached-worker behavior.

## Rules

- no silent completions
- no review without a readable result note
- no shutdown while work is still active unless aborting
- prefer runtime/state commands over ad-hoc pane hacking
