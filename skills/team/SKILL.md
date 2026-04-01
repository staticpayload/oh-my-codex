---
name: team
description: "Durable multi-agent orchestration with a task queue, worker claims, inbox messages, and review gates."
---

# Team

## When to use it

- the work splits cleanly into parallel slices
- the operator needs a persistent queue and review trail
- tmux-backed execution is worth the overhead

## Runtime contract

- initialize with `omx team init`
- queue slices with `omx team queue`
- claim them with worker ids
- move completed work into review
- record review decisions

## Rules

- every task claim must map to a real worker id
- no silent completions, record the result or review note
- use `omx team status` and `omx hud` to monitor the live state
