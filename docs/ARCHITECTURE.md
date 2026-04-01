# OMX v2 Architecture

OMX v2 is a Codex-native product built around one durable contract: `.omx/`.

## Layers

### `packages/core`

Shared runtime code:

- `.omx/` directory contract
- task graph, inbox, review queue, and execution ledger
- session state, HUD data, memory, notes, planning artifacts
- tmux-aware team runtime
- plugin bridge and hook management
- Codex config and feature detection

### `packages/cli`

Human operator surface:

- setup, repair, uninstall, migrate-v1
- doctor and HUD
- team runtime controls
- explore and diagnostics
- plugin and hook management
- agent install and validation

### `packages/mcp-server`

Codex MCP surface:

- task, state, memory, note, explore, and team families
- plugin, hook, and agent families
- durable orchestration primitives instead of a Claude bridge

### `crates/omx-explore`

Native helpers:

- repo indexing
- file listing
- symbol anchors
- git diff summary
- tmux probing

### Product assets

- first-party plugin bundle: [plugins/omx-product](/Users/staticpayload/Mainframe/oh-my-codex/plugins/omx-product)
- hook handlers: [hooks/handlers](/Users/staticpayload/Mainframe/oh-my-codex/hooks/handlers)
- agent prompts: [templates/agents](/Users/staticpayload/Mainframe/oh-my-codex/templates/agents)

## Durable state

`.omx/` is the product truth:

```text
.omx/
├── hud-config.json
├── logs/
├── memory/
├── plans/
├── research/
├── sessions/
├── state/
└── team/
```

Inside that:

- `state/tasks.json`: task graph
- `state/reviews.json`: review queue
- `state/inbox.json`: inbox
- `state/hooks.json`: installed hook preset state
- `state/plugins.json`: plugin state extensions when needed
- `team/team.json`: worker/runtime state
- `team/logs/*.log`: worker logs
- `logs/ledger.json`: execution ledger

## Runtime shape

### Session

Tracks branch, cwd, last command, and whether the operator session is active.

### Task graph

Tasks move through `pending`, `queued`, `in_progress`, `review`, `completed`, `blocked`, or `failed`.

### Team runtime

The runtime is tmux-first on macOS/Linux. When tmux is missing, OMX degrades to a mock backend but keeps the same durable state model.

### Hooks

Hooks are repo-local or personal installs. Handler scripts are standalone Node programs so they remain usable without importing the workspace at runtime.

### Plugins

The repo marketplace is the source of truth for repo-local bundles. Local installs into `~/.codex/plugins` keep the product close to Codex’s plugin model instead of inventing a parallel one.
