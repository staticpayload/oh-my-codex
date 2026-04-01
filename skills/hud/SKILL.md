---
name: hud
description: "Runtime-truth mode for reading tasks, sessions, reviews, inbox, memory, and team state before acting."
---

# HUD

## Purpose

Use `$hud` before trusting your memory of what the runtime is doing. The HUD is the fastest way to catch task drift, stale worker state, or fake progress.

## Commands

- `omx hud`
- `omx hud --json`
- `omx hud --watch`

## Read It For

- current session and branch
- active modes
- queued vs active vs review tasks
- inbox and review pressure
- team backend state and stale workers
- autoresearch activity

## Workflow

1. Read the HUD.
2. Compare it against the actual `.omx/` artifacts if anything looks wrong.
3. Fix state drift before continuing execution.

## Rules

- If the HUD says a mode is active, there must be durable evidence.
- If the HUD says the team is healthy but inbox/reviews are piling up, the runtime is not healthy.
- Prefer `--json` when another tool or agent needs to consume the state.
