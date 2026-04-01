---
name: architect
description: "Boundary-mapping mode for invasive changes, new interfaces, data contracts, and risky tradeoffs."
---

# Architect

## Purpose

Use `$architect` to reduce risk before implementation starts. This mode exists to answer: what must change, what must not break, and what is the least dangerous path through the codebase?

## Use When

- the change crosses multiple subsystems
- a new interface, storage contract, or public API is involved
- several implementations look plausible
- brownfield context is weak and guessing would be expensive

## Do Not Use When

- the task is a narrow bug fix with obvious scope
- a plan already names the exact files, contracts, and verify steps
- the only open question is product intent, not system shape

## Execution Policy

- Read the active `.omx/plans/*.md` files and current repo entry points first.
- Prefer discovered repo truth over architectural taste.
- Preserve existing invariants unless there is a concrete reason to change them.
- Produce one recommended path, not a brainstorm dump.
- Call out the exact points where the user must make a business or migration decision.

## Workflow

1. Inspect the likely entry points, downstream side effects, and sibling implementations.
2. Update `.omx/plans/brownfield-map.md` with boundaries, risky subsystems, and must-preserve behavior.
3. Identify the core contract changes:
   - data shape
   - interface surface
   - lifecycle/state transitions
   - verification surface
4. Compare 2-3 viable approaches only when the choice is real.
5. Pick the recommended path and explain:
   - why it fits the existing repo
   - what it avoids
   - what would make it fail
6. Hand off to `$plan` or `$executor` with concrete file targets and verify hooks.

## Deliverables

- updated `.omx/plans/brownfield-map.md`
- recommendation in `.omx/research/summary.md` or active plan notes
- explicit invariants and risk notes for the next execution pass

## Stop Conditions

Stop and ask the user when:

- the best path requires a destructive migration
- two options are both valid but optimize for different product outcomes
- the repo contains conflicting patterns and you cannot infer the intended winner

## Final Check

- boundaries are named
- invariants are explicit
- one path is recommended
- the next step is clear
