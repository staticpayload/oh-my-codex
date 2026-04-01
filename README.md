# oh-my-codex (OMX) v2

Codex-native orchestration for builders who want one default path from a vague prompt to a durable multi-worker runtime.

OMX v2 is not the old Codex-to-Claude bridge. It is a full Codex product built around:

- durable `.omx/` state
- tmux-aware team execution
- a real agent catalog
- a plugin SDK plus Codex plugin bridge
- a first-party hook pack for Codex hooks
- CLI, MCP, docs, demos, and packaged assets in one repo

## What ships

### CLI

```bash
omx setup
omx doctor
omx hud
omx team
omx explore
omx session
omx autoresearch
omx agents
omx plugins
omx hooks
omx version
```

### Skills

- `$ultrawork`
- `$deep-interview`
- `$plan`
- `$research`
- `$team`
- `$review`
- `$tdd`
- `$doctor`
- `$hud`
- `$trace`
- `$autoresearch`
- `$architect`
- `$executor`
- `$reviewer`

### MCP families

- `omx_task_*`
- `omx_state_*`
- `omx_memory_*`
- `omx_note_*`
- `omx_explore_*`
- `omx_team_*`
- `omx_plugin_*`
- `omx_hook_*`
- `omx_agent_*`

### Durable contract

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

## Product areas

### Runtime

- durable task graph, review queue, inbox, and execution ledger
- tmux-first worker runtime on macOS/Linux, degraded mock mode when tmux is missing
- resumable sessions and persistent team state

### Agents

- committed machine-readable catalog for architect, planner, researcher, executor, reviewer, operator
- prompt templates under [templates/agents](/Users/staticpayload/Mainframe/oh-my-codex/templates/agents)
- `omx agents list|show|install|validate`

### Plugins

- local plugin SDK using `.codex-plugin/plugin.json`
- repo marketplace generation under [.agents/plugins/marketplace.json](/Users/staticpayload/Mainframe/oh-my-codex/.agents/plugins/marketplace.json)
- first-party bundle at [plugins/omx-product](/Users/staticpayload/Mainframe/oh-my-codex/plugins/omx-product)
- `omx plugins init|pack|validate|install-local|list|enable|disable|doctor`

### Hooks

- repo-local install to `<repo>/.codex/hooks.json`
- optional personal install to `~/.codex/hooks.json`
- shipped handlers for `SessionStart`, `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, and `Stop`
- presets: `memory`, `safety`, `review`, `telemetry`, `workspace-context`

## Quick start

### 1. Ask your agent - Paste this to your agent

```bash
Install this to .codex - https://github.com/staticpayload/oh-my-codex/
```

That does the full local onboarding flow:

- installs workspace dependencies when needed
- builds OMX
- links the `omx` CLI globally with `npm link`
- runs `omx setup`
- runs `omx doctor`

### 2. Use OMX in any project

Once `omx` is linked, move into the project you actually want to work on and run:

```bash
omx setup
```

If you want the old manual path, it still works:

```bash
npm install
npm run build
cd packages/cli && npm link
node packages/cli/dist/bin.js setup apply
```

### 3. Check the environment

```bash
omx doctor
omx hud
```

### 4. Work through the default path

```text
$ultrawork "ship the feature end to end"
```

## Command map

### Setup

```bash
omx setup
omx setup --force
omx setup --dry-run
omx setup repair
omx setup uninstall
omx setup migrate-v1
omx setup --no-plugin --no-hooks
```

### Team runtime

```bash
omx team init
omx team spawn executor
omx team queue "implement hook doctor"
omx team claim <taskId> executor
omx team complete <taskId> executor "implemented and verified"
omx team review <taskId> reviewer approved "looks good"
omx team inbox
omx team logs executor
omx team shutdown
```

### Plugins

```bash
omx plugins validate
omx plugins pack
omx plugins install-local
omx plugins doctor
```

### Hooks

```bash
omx hooks install --presets=workspace-context,memory,safety,review
omx hooks status
omx hooks explain safety
```

### Explore

```bash
omx explore index
omx explore refs renderHud
omx explore rename-preview oldName newName
omx explore diagnostics
omx explore tmux
```

## Repo layout

```text
packages/
├── cli/
├── core/
└── mcp-server/

crates/
└── omx-explore/

plugins/
└── omx-product/

hooks/
└── handlers/

templates/
└── agents/
```

## Docs

- [Install guide](/Users/staticpayload/Mainframe/oh-my-codex/docs/INSTALL.md)
- [Runtime guide](/Users/staticpayload/Mainframe/oh-my-codex/docs/RUNTIME.md)
- [Plugin guide](/Users/staticpayload/Mainframe/oh-my-codex/docs/PLUGINS.md)
- [Hook guide](/Users/staticpayload/Mainframe/oh-my-codex/docs/HOOKS.md)
- [Agent guide](/Users/staticpayload/Mainframe/oh-my-codex/docs/AGENTS.md)
- [Architecture](/Users/staticpayload/Mainframe/oh-my-codex/docs/ARCHITECTURE.md)
- [Migration](/Users/staticpayload/Mainframe/oh-my-codex/docs/MIGRATION.md)
- [Troubleshooting](/Users/staticpayload/Mainframe/oh-my-codex/docs/TROUBLESHOOTING.md)
- [FAQ](/Users/staticpayload/Mainframe/oh-my-codex/docs/FAQ.md)
- [Security notes](/Users/staticpayload/Mainframe/oh-my-codex/docs/SECURITY.md)

## Demos

- [Plugin authoring demo](/Users/staticpayload/Mainframe/oh-my-codex/demos/plugin-authoring/README.md)
- [Repo marketplace demo](/Users/staticpayload/Mainframe/oh-my-codex/demos/repo-marketplace/README.md)
- [Hook pack demo](/Users/staticpayload/Mainframe/oh-my-codex/demos/hook-pack/README.md)
- [Team runtime demo](/Users/staticpayload/Mainframe/oh-my-codex/demos/team-runtime/README.md)
- [Ultrawork demo](/Users/staticpayload/Mainframe/oh-my-codex/demos/ultrawork/README.md)

## Development

```bash
npm run build
npm run test
cargo test -p omx-explore
```

Codex is the first-party executor in v2. There is no Claude bridge in this release.
