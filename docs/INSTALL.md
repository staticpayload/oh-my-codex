# Install Guide

## Build

```bash
npm install
npm run build
```

## Install into Codex

```bash
omx setup apply
```

That installs:

- skill catalog into `~/.codex/skills`
- agent prompts into `~/.codex/agents/omx`
- the OMX MCP server entry into `~/.codex/config.toml`

## Optional installs

### First-party plugin bundle

```bash
omx plugins install-local
```

### Hook pack

```bash
omx hooks install --presets=workspace-context,memory,safety,review
```

## Verify

```bash
omx doctor
omx hud
```
