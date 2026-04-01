# OMX v1 -> v2 Migration

OMX v2 is a hard reset.

## What changed

- the old Claude bridge is gone
- Codex is the first-party executor
- `.omx/` is the durable state contract
- team mode is tmux-aware and durable
- plugins and hooks are first-class product areas
- the public CLI now includes `plugins` and `hooks`

## Old -> new

- old: `claude_code*` tool family
  new: `omx_task_*`, `omx_state_*`, `omx_memory_*`, `omx_note_*`, `omx_explore_*`, `omx_team_*`, `omx_plugin_*`, `omx_hook_*`, `omx_agent_*`

- old: Codex plans, Claude executes
  new: Codex plans and executes

- old: transient scratch workflows
  new: durable `.omx/` artifacts, inbox, reviews, ledger

## Migration steps

1. Build v2
2. Run `omx setup migrate-v1`
3. Run `omx setup apply`
4. Run `omx doctor`
5. Optionally install the hook pack with `omx hooks install`
6. Optionally install the first-party plugin bundle with `omx plugins install-local`

## Important note

There is no compatibility shim for the old Claude-specific runtime in this release.
