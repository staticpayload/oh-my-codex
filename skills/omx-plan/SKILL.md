---
name: omx-plan
description: "Strategic planning for complex tasks. Use when the user says 'plan this', 'plan the', 'how should we', or when a task is too complex to start coding immediately. Produces a structured plan before any implementation."
---

# Planning Mode

Structured planning: analyze → design → document → get approval.

## Workflow

### Phase 1: Gather Context
1. Explore the codebase if one exists: file structure, tech stack, patterns
2. Identify constraints and requirements
3. Save context: `omx_state_write(mode: "plan", data: { phase: "gathering" })`

### Phase 2: Analyze
1. Break the problem into components
2. Identify dependencies between components
3. Assess complexity and risks
4. If needed, delegate deep analysis to Claude Code for codebase-specific insights

### Phase 3: Design
1. Propose an approach with clear rationale
2. List alternatives considered and why they were rejected
3. Define the implementation order (what depends on what)
4. Estimate scope: files to create/modify, approximate size of changes

### Phase 4: Document
Present the plan as:

```markdown
## Goal
<what we're building>

## Approach
<how we'll build it and why>

## Steps
1. <step> — <files affected>
2. <step> — <files affected>
...

## Risks
- <risk and mitigation>

## Verification
- <how we'll know it works>
```

### Phase 5: Approval
1. Present the plan to the user
2. Wait for approval or feedback
3. If approved, offer to execute via autopilot: "Want me to execute this plan?"

## Rules

- **Plans are for the user**, not for you. Write clearly and concisely.
- **Don't implement** during planning. Plan only.
- **Consider alternatives.** Always mention at least one alternative approach.
- **Be specific.** Name exact files, functions, and patterns.
- **Save the plan** to state so it persists: `omx_state_write(mode: "plan", data: { plan: "..." })`
