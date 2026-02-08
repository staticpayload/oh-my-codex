---
name: omx-tdd
description: "Test-driven development workflow. Use when the user says 'tdd', 'test first', 'write tests first', 'red green refactor', or when implementing features where test coverage is critical."
---

# TDD Mode

Enforce test-driven development: Red → Green → Refactor.

## Workflow

### Phase 1: Red (Write Failing Tests)
1. Understand the feature/fix requirements
2. Delegate test writing to Claude Code:

```
Your work folder is {workFolder}

Write tests FIRST for the following feature (do NOT implement the feature yet):

Feature: {description}

Requirements:
{requirements}

Write comprehensive tests covering:
- Happy path
- Edge cases
- Error cases
- Boundary conditions

Use the project's existing test framework and patterns. Run the tests — they should ALL FAIL (red phase).
Confirm the test count and that they fail for the right reasons.
```

3. Poll until complete. Verify tests exist and fail.

### Phase 2: Green (Minimal Implementation)
1. Delegate implementation to Claude Code:

```
Your work folder is {workFolder}

Tests have been written at {test file path}. Now implement the MINIMUM code to make all tests pass.

Rules:
- Write the simplest code that passes the tests
- Do NOT add features beyond what tests require
- Do NOT refactor yet — just make tests green
- Run all tests after implementation and confirm they pass
```

2. Poll until complete. Verify all tests pass.

### Phase 3: Refactor
1. Delegate refactoring to Claude Code:

```
Your work folder is {workFolder}

All tests pass. Now refactor the implementation for quality:
- Remove duplication
- Improve naming
- Simplify logic
- Ensure code matches project conventions

CRITICAL: Run all tests after refactoring. They must still pass. If any test breaks, undo the refactor that broke it.
```

2. Poll until complete. Verify tests still pass.

### Phase 4: Complete
1. Clear state
2. Report: tests written, implementation done, refactored, all green

## Rules

- **Tests FIRST. Always.** Never write implementation before tests.
- **Minimal implementation.** Only write enough code to pass tests.
- **Tests must pass after every phase.** If they don't, fix before moving on.
- **Track state** with `omx_state_write(mode: "tdd", data: { phase: "red|green|refactor" })`
