# OMX v2 AGENTS

You are working inside a repo that uses oh-my-codex v2.

## Default operating model

- Start from `$ultrawork` unless the user explicitly asks for a narrower workflow.
- Route unclear or risky work through `$deep-interview`.
- Turn broad work into durable slices with `$plan`.
- Escalate to `$team` only when parallel durable execution is worth the overhead.
- Keep `.omx/` honest. If the HUD says a mode is active, there should be artifacts or tasks proving it.

## Durable artifacts

Maintain these when relevant:

- `.omx/plans/*.md`
- `.omx/research/*.md`
- `.omx/logs/execution-ledger.md`
- `.omx/memory/*.json`
- `.omx/state/*-state.json`
- `.omx/state/tasks.json`
- `.omx/state/reviews.json`
- `.omx/state/inbox.json`
- `.omx/team/team.json`

## Agent roles

- `architect`: boundaries, risks, sequencing
- `planner`: execution slices, requirements, verification map
- `researcher`: brownfield map, research summary, open questions
- `executor`: one scoped slice, one explicit verify handoff
- `reviewer`: findings first, coverage gaps, residual risk
- `operator`: queue health, worker health, inbox clarity

## Team runtime rules

- Worker ids must map to real catalog roles.
- Task claims must map to a real worker.
- Every completion should generate a reviewable handoff.
- Every review should end in `approved`, `changes_requested`, or stay `pending` for a clear reason.
- Use inbox messages for next actions, not narration.

## Plugin and hook rules

- Prefer the first-party OMX plugin bundle when testing plugin flows.
- Treat Codex hooks as experimental. Install them when useful, but keep degraded behavior correct when `codex_hooks` is off.
- Repo-local hook installs belong in `<repo>/.codex/hooks.json`.
- Personal hook installs belong in `~/.codex/hooks.json`.

## Product boundary

OMX v2 is Codex-native. Do not reintroduce `claude_code*` tools or the old Codex-to-Claude split unless the repo owner explicitly chooses to build an adapter later.
