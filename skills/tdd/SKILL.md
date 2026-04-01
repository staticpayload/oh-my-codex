---
name: tdd
description: "Red-green-refactor mode for behavior with clear inputs, outputs, and regression value."
---

# TDD

## Purpose

Use `$tdd` when behavior can be specified before implementation. TDD is for design pressure and regression safety, not for ritual.

## Good TDD Candidates

- business rules
- API contracts
- parsing/formatting/validation
- state transitions
- algorithms and utility behavior

## Skip TDD For

- pure layout and styling work
- config-only changes
- trivial glue code
- exploratory prototypes where the behavior is not yet known

## Iron Law

No production code without a failing test first.

## Cycle

1. **Red**
   - write the smallest failing test for the next behavior
   - run it and prove it fails for the right reason
2. **Green**
   - write the minimum code to make it pass
   - rerun the test and the relevant suite
3. **Refactor**
   - clean up only after green
   - keep the suite green after every change

## Rules

- one behavior per cycle
- do not batch multiple features into one red-green pass
- prefer regression tests for changed behavior
- record the verify command in the plan or task notes

## Output Standard

- what behavior the test locked in
- the failing signal
- the minimal implementation
- the final verification command
