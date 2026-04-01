# Plugin Guide

OMX ships two plugin stories.

## 1. OMX plugin SDK

Create a repo-local plugin:

```bash
omx plugins init my-plugin --with-mcp --with-apps
```

That creates:

- `plugins/my-plugin/.codex-plugin/plugin.json`
- optional `skills/`, `.mcp.json`, `.app.json`, and assets
- a repo marketplace entry in `.agents/plugins/marketplace.json`

## 2. Codex plugin bridge

Install a local bundle into Codex:

```bash
omx plugins install-local plugins/omx-product
omx plugins enable omx-product
```

Check drift:

```bash
omx plugins doctor
```

Pack for distribution:

```bash
omx plugins pack plugins/omx-product
```
