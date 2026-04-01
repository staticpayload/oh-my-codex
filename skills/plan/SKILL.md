---
name: plan
description: "Write executable plan slices backed by .omx artifacts before implementation starts."
---

# Plan

## Responsibilities

- map the current codebase shape
- write durable plan slices in `.omx/plans/`
- include concrete verify steps for each slice

## Workflow

1. Inspect the repo.
2. Update `.omx/plans/brownfield-map.md`.
3. Write or refine the active phase file under `.omx/plans/`.
4. Create a matching verification file if one does not exist.
5. Keep tasks small enough for one focused execution pass.
