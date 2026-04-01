---
name: doctor
description: "Inspect whether OMX is installed, wired, and healthy in the current repo."
---

# Doctor

Run `omx doctor` when setup or runtime behavior feels wrong.

## What to verify

- Node version
- Codex CLI presence
- git and ripgrep
- tmux and cargo availability
- `.omx/` initialization state

Prefer `omx doctor --json` when another tool or agent needs to consume the result.
