# Runtime Guide

## Session

```bash
omx session start
omx hud
```

## Team mode

```bash
omx team init
omx team spawn executor
omx team queue "build plugin doctor"
omx team claim <taskId> executor
omx team complete <taskId> executor "done"
omx team review <taskId> reviewer approved "verified"
```

## Degraded mode

If tmux is missing, the runtime keeps the same durable state model but runs in mock mode. That is good enough for persistence and testing, not for a real detached worker fleet.

## HUD

`omx hud` reads:

- tasks
- states
- inbox
- reviews
- team runtime
- notes and memory
