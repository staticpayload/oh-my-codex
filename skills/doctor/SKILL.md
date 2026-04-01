---
name: doctor
description: "Health-check mode for OMX install, repo state, plugin wiring, hook status, and runtime degradation."
---

# Doctor

## Purpose

Use `$doctor` when setup, runtime behavior, hooks, or plugins feel wrong. This skill is for diagnosis plus the shortest correct remediation path.

## Workflow

1. Run `omx doctor`.
2. If the problem is plugin-related, run `omx plugins doctor`.
3. If the problem is hook-related, run `omx hooks status`.
4. If the problem is team-runtime-related, run:
   - `omx explore tmux`
   - `omx team status`
5. Turn findings into concrete fixes, not generic advice.

## What to Check

- Node and Codex availability
- MCP server configured in `~/.codex/config.toml`
- `.omx/` initialized in the current repo
- tmux availability vs degraded mock mode
- plugin marketplace drift
- hook installation state vs feature availability

## Output Standard

- what is healthy
- what is degraded
- what is broken
- the exact command or file change to fix each issue
