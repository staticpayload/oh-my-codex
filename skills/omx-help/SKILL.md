---
name: omx-help
description: "Guide on using oh-my-codex (omx). Use when the user asks 'help', 'what can you do', 'how do I use omx', 'what skills', or wants to understand the available workflows and tools."
---

# oh-my-codex (omx) Help

## What is omx?

omx is an orchestration layer for Codex CLI that gives you:
- **Async Claude Code delegation** — hand off complex coding tasks without timeouts
- **Structured workflows** — autopilot, planning, TDD, code review, research, analysis
- **Persistent state** — track workflow progress across conversation turns
- **Session memory** — notepad that survives context compaction
- **Project memory** — per-project info that persists across sessions

## Available Skills

| Skill | Trigger Phrases | What It Does |
|-------|----------------|--------------|
| **omx-autopilot** | "build me", "create", "autopilot" | Full autonomous execution: plan → implement → verify |
| **omx-plan** | "plan this", "plan the", "how should we" | Structured planning before implementation |
| **omx-research** | "research", "compare", "analyze options" | Multi-source research with citations |
| **omx-code-review** | "review code", "check my code" | Comprehensive code review via Claude Code |
| **omx-tdd** | "tdd", "test first", "red green" | Test-driven development: Red → Green → Refactor |
| **omx-analyze** | "analyze", "debug", "investigate" | Deep analysis, debugging, architecture review |
| **omx-help** | "help", "what can you do" | This guide |

## MCP Tools

### Claude Code Delegation
| Tool | Purpose |
|------|---------|
| `claude_code` | Start an async Claude Code task (returns job ID) |
| `claude_code_status` | Wait for results (long-polling, up to 25s) |
| `claude_code_cancel` | Cancel a running job |
| `claude_code_list` | List all jobs |

### State Management
| Tool | Purpose |
|------|---------|
| `omx_state_read` | Read workflow state |
| `omx_state_write` | Save workflow progress |
| `omx_state_clear` | Clear completed workflow |
| `omx_state_list` | See all active workflows |

### Session Notepad
| Tool | Purpose |
|------|---------|
| `omx_note_read` | Read session notes |
| `omx_note_write` | Save notes (priority/working/manual) |

### Project Memory
| Tool | Purpose |
|------|---------|
| `omx_memory_read` | Read project info |
| `omx_memory_write` | Save project info |

## Quick Examples

### Build something
> "Build me a REST API for user management with auth"
→ Triggers autopilot → plans → implements → verifies

### Plan first
> "Plan the migration from Express to Fastify"
→ Triggers planning → produces structured plan → asks for approval

### Research
> "Research the best state management options for React in 2025"
→ Triggers research → searches multiple sources → synthesized report

### Code review
> "Review the code in src/auth/"
→ Triggers code review → Claude Code analyzes → severity-rated findings

### Debug
> "Investigate why the login flow fails after token refresh"
→ Triggers analysis → Claude Code traces the issue → root cause report
