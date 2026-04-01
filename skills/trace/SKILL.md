---
name: trace
description: "Execution-path mapping for entry points, data flow, side effects, and blast radius before risky work."
---

# Trace

## Purpose

Use `$trace` before a risky edit or review when you need to know what code path actually runs, what it touches, and what could break downstream.

## Workflow

1. Find the entry points.
2. Follow data flow through the changed or targeted path.
3. Map side effects:
   - storage writes
   - network calls
   - UI state changes
   - background work
4. Identify risky branches and missing guards.
5. Name the concrete files the next pass should touch.

## Suggested Tools

- `omx explore search`
- `omx explore symbols`
- `omx explore refs`
- `omx explore diff`

## Output Standard

- entry points
- downstream side effects
- risky branches
- likely blast radius
- recommended edit boundary
