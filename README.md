# oh-my-codex (omx)

Orchestration layer for [OpenAI Codex CLI](https://github.com/openai/codex) — gives Codex superpowers through async [Claude Code](https://github.com/anthropics/claude-code) delegation, structured workflows, and persistent memory.

## What it does

**The problem:** Codex CLI is great at planning but limited in execution. Claude Code is great at execution but needs direction. MCP tool calls timeout on long tasks.

**The solution:** omx bridges them with an async job system that never times out, plus structured workflows (autopilot, TDD, code review, etc.) that teach Codex how to delegate effectively.

```
You (idea) → Codex (planning + orchestration) → Claude Code (autonomous execution)
                                                      ↓
                                               reads, writes, edits files
                                               runs tests, fixes failures
                                               git commits, branch management
                                               ...all without timeout limits
```

## Features

### Async Claude Code Delegation
No more timeouts. The MCP server uses a **long-polling job pattern**:

1. `claude_code(prompt)` — starts task, returns job ID in <1 second
2. `claude_code_status(jobId)` — long-polls up to 25s, returns results or "still running"
3. Repeat until done — works for tasks that take minutes or hours

### 7 Workflow Skills

| Skill | Trigger | What it does |
|-------|---------|-------------|
| **omx-autopilot** | "build me", "create a" | Plan → Implement → Verify → Done |
| **omx-plan** | "plan this" | Structured planning before implementation |
| **omx-research** | "research", "compare" | Multi-source research with citations |
| **omx-code-review** | "review code" | Comprehensive code review via Claude Code |
| **omx-tdd** | "tdd", "test first" | Red → Green → Refactor cycle |
| **omx-analyze** | "debug", "investigate" | Deep debugging and root cause analysis |
| **omx-help** | "help" | Shows all capabilities |

### Persistent State & Memory

| Tool | Purpose |
|------|---------|
| `omx_state_*` | Track workflow progress (survives conversation turns) |
| `omx_note_*` | Session notepad with priority/working/manual sections |
| `omx_memory_*` | Per-project memory that persists across sessions |

## Requirements

- [Node.js](https://nodejs.org) v20+
- [Codex CLI](https://github.com/openai/codex) (`npm install -g @openai/codex`)
- [Claude Code](https://github.com/anthropics/claude-code) (`npm install -g @anthropic-ai/claude-code`)
- Claude Code must have `--dangerously-skip-permissions` accepted (run `claude --dangerously-skip-permissions` once to accept)

## Install

```bash
git clone https://github.com/staticpayload/oh-my-codex.git
cd oh-my-codex
bash install.sh
```

The installer:
1. Copies the MCP server to `~/.codex/mcp-servers/omx/`
2. Installs npm dependencies
3. Copies 8 skills to `~/.codex/skills/`
4. Installs `AGENTS.md` to `~/.codex/` (backs up existing)
5. Adds the omx MCP server entry to `~/.codex/config.toml`
6. Verifies the server starts correctly

## Usage

Start Codex and just talk naturally:

```bash
codex
```

### Autopilot
> "Build me a REST API with user authentication using Express and JWT"

Codex plans the implementation, delegates each step to Claude Code, verifies tests pass, and delivers working code.

### Planning
> "Plan the migration from our monolith to microservices"

Produces a structured plan with steps, risks, and verification criteria before any code changes.

### Code Review
> "Review the code in src/auth/"

Claude Code reads every file, analyzes for bugs, security issues, performance problems, and returns severity-rated findings.

### TDD
> "Use TDD to add email validation to the signup form"

Writes failing tests first, then minimal implementation, then refactors — the classic Red-Green-Refactor cycle.

### Research
> "Research the best state management options for React in 2025"

Searches multiple sources (Perplexity, Exa, Tavily), cross-references findings, produces a synthesized report.

### Debug
> "Investigate why the payment webhook fails on retry"

Claude Code traces the execution path, identifies the root cause, and recommends a fix.

## Architecture

```
~/.codex/
├── config.toml                    # MCP server registration
├── AGENTS.md                      # Global orchestration instructions
├── mcp-servers/
│   └── omx/
│       ├── server.mjs             # The MCP server (12 tools)
│       └── package.json
├── skills/
│   ├── omx-autopilot/             # Autonomous execution
│   ├── omx-plan/                  # Strategic planning
│   ├── omx-research/              # Multi-source research
│   ├── omx-code-review/           # Code quality review
│   ├── omx-tdd/                   # Test-driven development
│   ├── omx-analyze/               # Debugging & analysis
│   ├── omx-help/                  # Usage guide
│   └── claude-code-mcp/           # Claude Code delegation guide
└── .omx/
    ├── state/                     # Workflow state files
    └── notepad.json               # Session memory
```

### MCP Tools (12 total)

| Tool | Category | Description |
|------|----------|-------------|
| `claude_code` | Delegation | Start async Claude Code task |
| `claude_code_status` | Delegation | Long-poll for results (25s) |
| `claude_code_cancel` | Delegation | Cancel running job |
| `claude_code_list` | Delegation | List all jobs |
| `omx_state_read` | State | Read workflow state |
| `omx_state_write` | State | Write/update workflow state |
| `omx_state_clear` | State | Clear workflow state |
| `omx_state_list` | State | List active workflows |
| `omx_note_read` | Notepad | Read session notes |
| `omx_note_write` | Notepad | Write session notes |
| `omx_memory_read` | Memory | Read project memory |
| `omx_memory_write` | Memory | Write project memory |

## How the async pattern works

The original [`@steipete/claude-code-mcp`](https://github.com/steipete/claude-code-mcp) server blocks until Claude Code finishes. If the task takes longer than Codex's `tool_timeout_sec`, it dies.

omx fixes this with a **long-polling job pattern**:

```
Codex                           omx MCP Server              Claude CLI
  │                                │                            │
  ├─ claude_code(prompt) ─────────►│── spawn claude ───────────►│
  │◄── jobId (instant, <1s) ──────┤                            │ (working...)
  │                                │                            │
  ├─ claude_code_status(id) ──────►│── wait up to 25s ────────►│ (still working)
  │◄── "running" + output tail ───┤                            │
  │                                │                            │
  ├─ claude_code_status(id) ──────►│── wait up to 25s... ─────►│ (done!)
  │◄── "completed" + full output ─┤                            │
```

Every tool call returns in <25 seconds. Claude Code itself runs with no time limit.

## Configuration

The installer handles everything. To manually configure, add to `~/.codex/config.toml`:

```toml
[mcp_servers.omx]
command = "node"
args = ["/path/to/.codex/mcp-servers/omx/server.mjs"]
startup_timeout_sec = 15
tool_timeout_sec = 30
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `MCP_OMX_DEBUG` | Set `true` for verbose logging to stderr |
| `CLAUDE_CLI_NAME` | Override Claude binary path |

## Uninstall

```bash
# Remove MCP server
rm -rf ~/.codex/mcp-servers/omx

# Remove skills
rm -rf ~/.codex/skills/omx-* ~/.codex/skills/claude-code-mcp

# Remove config entry (edit manually)
# Remove the [mcp_servers.omx] block from ~/.codex/config.toml

# Restore AGENTS.md backup if desired
mv ~/.codex/AGENTS.md.bak ~/.codex/AGENTS.md
```

## Inspired by

- [oh-my-claudecode](https://github.com/anthropics/claude-code) — Multi-agent orchestration for Claude Code CLI
- [claude-code-mcp](https://github.com/steipete/claude-code-mcp) — The original Claude Code MCP server

## License

MIT
