---
name: omx-analyze
description: "Deep analysis and debugging via Claude Code. Use when the user says 'analyze', 'debug', 'investigate', 'why is this', 'what's causing', or needs deep understanding of code behavior, bugs, or architecture."
---

# Analyze Mode

Deep investigation: reproduce → trace → diagnose → recommend.

## Workflow

### For Bug Investigation

1. **Reproduce**: Delegate to Claude Code to reproduce the issue:
```
Your work folder is {workFolder}

Investigate this issue: {description}

1. Read the relevant code files
2. Try to reproduce the issue by running tests or the affected code path
3. Trace the execution flow that leads to the bug
4. Identify the root cause
5. Explain WHY it happens, not just WHERE
```

2. **Diagnose**: Review Claude Code's findings
3. **Recommend**: Present root cause + fix options to the user

### For Architecture Analysis

1. **Map**: Delegate codebase mapping to Claude Code:
```
Your work folder is {workFolder}

Analyze the architecture of {scope}:

1. Map the dependency graph (what imports what)
2. Identify the core abstractions and their responsibilities
3. Find architectural issues:
   - Circular dependencies
   - God objects/modules
   - Leaky abstractions
   - Tight coupling between layers
4. Output a structured report with a dependency diagram (ASCII) and recommendations
```

2. **Synthesize**: Present findings with actionable recommendations

### For Performance Analysis

Delegate to Claude Code:
```
Your work folder is {workFolder}

Analyze performance of {scope}:

1. Identify hot paths and potential bottlenecks
2. Look for: N+1 queries, unnecessary re-renders, O(n²) loops, memory leaks, blocking I/O
3. Check bundle sizes if frontend
4. Recommend specific optimizations with expected impact
```

## Rules

- **Delegate the heavy lifting** to Claude Code — it can read and run code.
- **Focus on root causes**, not symptoms.
- **Provide actionable recommendations**, not just observations.
- **Ask before fixing.** Analysis mode is for understanding, not changing.
