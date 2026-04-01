# Hook Guide

Codex hooks are experimental as of April 1, 2026.

## Presets

- `workspace-context`
- `memory`
- `safety`
- `review`
- `telemetry`

## Install repo-local hooks

```bash
omx hooks install --presets=workspace-context,memory,safety,review
```

This writes `<repo>/.codex/hooks.json` and installs handler scripts under `<repo>/.codex/hooks/omx/`.

## Install personal hooks

```bash
omx hooks install --personal --presets=workspace-context,memory
```

## Check status

```bash
omx hooks status
omx hooks explain safety
```

## Current limits

- `codex_hooks` may be disabled in local Codex features
- `PreToolUse` and `PostToolUse` are Bash-focused today
- Windows is out of scope for this runtime
