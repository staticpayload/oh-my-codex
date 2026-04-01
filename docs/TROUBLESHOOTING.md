# Troubleshooting

## `tmux` missing

OMX falls back to mock team mode. Install tmux for real detached workers.

## `codex_hooks` disabled

The hook pack can still install, but Codex will not execute it until the feature is enabled upstream.

## MCP server missing

Run:

```bash
npm run build
omx setup repair
```

## Plugin not showing up

Check both:

```bash
omx plugins doctor
omx doctor
```
