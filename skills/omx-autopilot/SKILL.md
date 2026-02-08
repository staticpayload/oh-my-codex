---
name: omx-autopilot
description: "Full autonomous execution from idea to working code. Use when the user wants something built end-to-end without hand-holding. Activates on phrases like 'build me', 'create a', 'I want a', 'autopilot', or any request that implies complete implementation."
---

# Autopilot Mode

Autonomous execution: analyze → plan → implement → verify → done.

## Workflow

### Phase 1: Understand
1. Read the request carefully
2. If the project exists, explore it: read key files, understand structure, tech stack
3. If anything is ambiguous, ask ONE round of clarifying questions — then proceed

### Phase 2: Plan
1. Break the task into concrete steps (max 10)
2. Write the plan to state: `omx_state_write(mode: "autopilot", data: { phase: "planning", steps: [...], currentStep: 0 })`
3. List what files will be created/modified

### Phase 3: Implement
For each step:
1. Update state: `omx_state_write(mode: "autopilot", data: { phase: "implementing", currentStep: N })`
2. Delegate to Claude Code: `claude_code(prompt: "Your work folder is /path\n\n<step details>", workFolder: "/path")`
3. Poll with `claude_code_status` until complete
4. Verify the step worked before moving to the next

### Phase 4: Verify
1. Delegate verification to Claude Code: run tests, type check, lint
2. If failures, delegate fixes to Claude Code
3. Loop until clean

### Phase 5: Complete
1. Clear state: `omx_state_clear(mode: "autopilot")`
2. Summarize what was built, what files were changed, how to run it

## Rules

- **Never stop mid-task.** If a step fails, fix it and continue.
- **Always verify.** Run tests/typecheck after implementation.
- **Delegate all code changes** to Claude Code via `claude_code` tool.
- **Track progress** with `omx_state_write` so state survives context loss.
- **Be autonomous.** Don't ask for permission on implementation details — just build it.

## State Schema

```json
{
  "phase": "planning | implementing | verifying | complete",
  "steps": ["step 1 description", "step 2 description"],
  "currentStep": 0,
  "completedSteps": [],
  "errors": [],
  "active": true
}
```

## Delegation Prompt Template

```
Your work folder is {workFolder}

CONTEXT: {what has been done so far}

TASK: {current step description}

VERIFICATION: After completing, run {test/typecheck command} and confirm it passes.
```
