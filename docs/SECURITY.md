# Security Notes

- OMX does not auto-enable destructive Bash. The shipped safety hook blocks a small set of obviously destructive commands.
- Hook handlers write only local repo state under `.omx/`.
- Plugin enablement is explicit in `~/.codex/config.toml`.
- Review every generated hook or plugin manifest before publishing it outside your machine.
