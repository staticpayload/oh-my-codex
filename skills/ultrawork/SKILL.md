---
name: ultrawork
description: "Default OMX v2 flow. Use when the user wants the work shipped end to end with planning, execution, and verification."
---

# Ultrawork

Use this as the default Codex-native path.

## Flow

1. Start or resume the session with `omx session start`.
2. If the request is ambiguous, risky, or product-heavy, switch to `$deep-interview` first.
3. Create durable planning artifacts with `omx autoresearch init <phase>` when discovery or broad planning is needed.
4. Persist execution slices with `omx_task_*` tools or `omx team queue`.
5. Use `omx hud` to keep the state honest while the work is moving.
6. Finish with explicit verification recorded in `.omx/plans/*-verification.md` or task notes.

## Rules

- Prefer real `.omx/` artifacts over transient scratch text.
- Use team mode only when parallel durable work is actually worth it.
- Keep going until the task is in `completed` or `review`.
