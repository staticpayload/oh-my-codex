# Install Guide

## Prerequisites

- Node.js `>= 20`
- Codex CLI installed
- `tmux` if you want real detached team mode

## Fast path

From the OMX repo checkout:

```bash
bash install.sh
```

That bootstraps the workspace, links `omx` globally, runs `omx setup`, and finishes with `omx doctor`.

Useful variants:

```bash
bash install.sh --dry-run
bash install.sh --force
bash install.sh repair
bash install.sh doctor
```

## Per-project onboarding

After `omx` is linked globally, run setup in the project you want to use OMX with:

```bash
cd /path/to/your/project
omx setup
```

By default that installs the first-party stack:

- skill catalog into `~/.codex/skills`
- agent prompts into `~/.codex/agents/omx`
- the OMX MCP server entry into `~/.codex/config.toml`
- the first-party `omx-product` plugin into `~/.codex/plugins`
- repo-local hook pack into `<repo>/.codex/hooks.json`
- `.omx/` runtime layout and HUD config
- project `AGENTS.md` if one does not already exist

Common options:

```bash
omx setup --dry-run
omx setup --force
omx setup --no-plugin
omx setup --no-hooks
omx setup --no-project-agents
omx setup --presets=workspace-context,memory,safety,review
```

## Manual path

If you want the source-first flow explicitly:

```bash
npm install
npm run build
cd packages/cli && npm link
omx setup
```

## Verify

```bash
omx doctor
omx hud
```
