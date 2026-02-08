---
name: omx-code-review
description: "Comprehensive code review via Claude Code delegation. Use when the user asks for 'code review', 'review this', 'check my code', or wants quality/security/performance analysis of their code."
---

# Code Review Mode

Delegate a thorough code review to Claude Code, which has full filesystem access to read and analyze the codebase.

## Workflow

### Phase 1: Scope
1. Determine what to review:
   - Specific files or directories
   - Recent git changes (`git diff`, `git log`)
   - Entire project

### Phase 2: Delegate Review
Send a comprehensive review prompt to Claude Code:

```
Your work folder is {workFolder}

Perform a thorough code review of {scope}. Analyze:

1. **Correctness**: Logic errors, edge cases, off-by-one errors
2. **Security**: Injection vulnerabilities, auth issues, data exposure (OWASP Top 10)
3. **Performance**: N+1 queries, unnecessary re-renders, memory leaks, O(n²) loops
4. **Maintainability**: Code clarity, naming, duplication, complexity
5. **Type Safety**: Missing types, unsafe casts, any types
6. **Error Handling**: Unhandled errors, missing try/catch, error swallowing
7. **Testing**: Missing test coverage, untested edge cases

For each issue found, provide:
- Severity: CRITICAL / HIGH / MEDIUM / LOW
- File and line number
- Description of the issue
- Suggested fix (code snippet)

Sort issues by severity (critical first).
End with a summary: total issues by severity, overall code quality assessment.
```

### Phase 3: Present
1. Wait for Claude Code to complete the review
2. Present the findings to the user organized by severity
3. Offer to fix critical/high issues: "Want me to fix the critical issues?"

## Rules

- **Always delegate the actual review** to Claude Code — it can read all the files.
- **Focus on actionable findings.** Don't nitpick formatting if a linter handles it.
- **Prioritize security and correctness** over style.
- **Offer to fix.** After review, offer to auto-fix issues via Claude Code.
