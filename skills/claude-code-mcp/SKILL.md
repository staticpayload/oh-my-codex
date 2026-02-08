---
name: claude-code-mcp
description: "Delegate complex coding tasks to Claude Code CLI via async MCP tools. Use when you need expert-level file editing, multi-file refactoring, git operations, deep codebase analysis, or any task requiring persistent tool access across many files. Claude Code runs autonomously with no timeout — start a job, poll for results, continue other work while it runs."
---

# Claude Code MCP (Async)

Delegate coding tasks to Claude Code CLI through an async job-based MCP server. Jobs start instantly (no timeout risk) and you poll for results, so even hour-long tasks work reliably.

## Tools

| Tool | Returns | Purpose |
|------|---------|---------|
| `claude_code` | Job ID (instant) | Start a task — spawns Claude Code in background |
| `claude_code_status` | Status + output | Poll a running job (call every 10-30s) |
| `claude_code_cancel` | Confirmation | Kill a running job |
| `claude_code_list` | All jobs | See all tracked jobs and their states |

## Workflow

### 1. Start a job

```json
{
  "tool": "claude_code",
  "arguments": {
    "prompt": "Your work folder is /Users/staticpayload/Mainframe/my-project\n\nRefactor all class components to functional components with hooks.",
    "workFolder": "/Users/staticpayload/Mainframe/my-project"
  }
}
```

Returns immediately:
```json
{
  "jobId": "a1b2c3d4",
  "status": "running",
  "message": "Job started. Poll with claude_code_status(jobId: \"a1b2c3d4\")."
}
```

### 2. Poll for results

```json
{
  "tool": "claude_code_status",
  "arguments": { "jobId": "a1b2c3d4" }
}
```

While running — shows tail of output:
```json
{
  "jobId": "a1b2c3d4",
  "status": "running",
  "elapsedSeconds": 45,
  "outputTail": "Refactoring src/components/Header.tsx..."
}
```

When done:
```json
{
  "jobId": "a1b2c3d4",
  "status": "completed",
  "elapsedSeconds": 120,
  "exitCode": 0,
  "output": "Successfully refactored 12 components..."
}
```

### 3. Continue working while Claude Code runs

This is the key advantage — you can do other work between polls:

1. Call `claude_code` — get job ID instantly
2. Do your own analysis, answer questions, run other tools
3. Call `claude_code_status` every 15-30 seconds
4. When `status` is `completed` or `failed`, read the output

## When to Use

**Delegate to Claude Code when:**
- Multi-file refactoring or renaming across a codebase
- Complex file editing requiring understanding of surrounding context
- Git operations (commits, branch management, rebasing, conflict resolution)
- Running test suites and iteratively fixing failures
- Scaffolding new projects or features with many files
- Tasks needing back-and-forth tool use (read, analyze, edit, verify)
- Deep codebase exploration and analysis
- Any task where you'd need 5+ sequential tool calls

**Do NOT delegate when:**
- Simple single-file reads or edits you can do directly
- Quick shell commands
- Tasks requiring user interaction mid-execution

## Prompt Engineering

### Always include working directory

Claude Code does not inherit your CWD. **Always specify it in both the prompt AND the workFolder parameter:**

```
Your work folder is /Users/staticpayload/Mainframe/my-project

<task instructions here>
```

### Be specific and self-contained

Each job is stateless — no memory of previous calls. Include all context:

```
Your work folder is /Users/staticpayload/Mainframe/my-project

Fix the failing tests in src/__tests__/auth.test.ts. After fixing, run
the full test suite with `npm test` and confirm all tests pass. If new
failures appear, fix those too.
```

### Request verification

Claude Code can run tests, linters, type checkers. Ask it to verify:

```
Your work folder is /Users/staticpayload/Mainframe/my-project

Rename UserService to AuthService across the entire codebase. Update all
imports, references, and file names. Run `tsc --noEmit` to verify no
type errors were introduced.
```

## Examples

### Multi-file refactoring

```
Your work folder is /Users/staticpayload/Mainframe/my-project

Replace all uses of moment.js with date-fns across the codebase:
1. Find all files importing moment
2. Replace each import with the equivalent date-fns functions
3. Update all moment() calls to date-fns equivalents
4. Remove moment from package.json, add date-fns
5. Run npm install then npm test to verify
```

### Git operations

```
Your work folder is /Users/staticpayload/Mainframe/my-project

Create clean atomic commits for the current changes:
1. Run git status and git diff
2. Group related changes into logical commits
3. Write conventional commit messages (feat:, fix:, refactor:)
4. Do NOT push — just create the local commits
```

### Read-only analysis

```
Your work folder is /Users/staticpayload/Mainframe/my-project

Analyze the dependency graph of src/services/. For each service:
- List its imports (internal and external)
- Identify circular dependencies
- Suggest extraction candidates for shared utilities
Output a markdown report.
```

### Parallel jobs

You can run multiple Claude Code jobs simultaneously:

```
Job 1: "Your work folder is .../frontend — Refactor all components to use new design tokens"
Job 2: "Your work folder is .../backend — Add input validation to all API endpoints"
```

Poll both with `claude_code_status` and they execute in parallel.

## Configuration

Server location: `~/.codex/mcp-servers/omx/server.mjs` (part of the omx orchestration server)

Config in `~/.codex/config.toml`:
```toml
[mcp_servers.omx]
command = "node"
args = ["/Users/staticpayload/.codex/mcp-servers/omx/server.mjs"]
startup_timeout_sec = 15
tool_timeout_sec = 30
```

`tool_timeout_sec = 30` is fine because every tool call returns instantly — the actual Claude Code work runs in the background.

### Debug mode

```bash
MCP_OMX_DEBUG=true node ~/.codex/mcp-servers/omx/server.mjs
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `CLAUDE_CLI_NAME` | Override Claude binary name or path |
| `MCP_OMX_DEBUG` | Set `true` for verbose stderr logging |

## Important Notes

- **Stateless jobs**: Each `claude_code` call is independent. No memory between calls.
- **Permissions**: Claude Code runs with `--dangerously-skip-permissions` — full filesystem access.
- **No timeouts**: Jobs run until completion (minutes or hours). Poll with `claude_code_status`.
- **Parallel safe**: Run multiple jobs simultaneously — each gets its own process.
- **Auto-cleanup**: Completed jobs are pruned after 50 accumulate.
