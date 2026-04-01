import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createTask,
  gatherHudContext,
  renderHud,
  startSession,
  writeNotes,
  writeState,
} from "../index.js";

test("hud rendering summarizes active runtime state", () => {
  const root = mkdtempSync(join(tmpdir(), "omx-hud-"));
  startSession(root, "feat/v2");
  createTask(root, { title: "Build MCP server" });
  writeState(root, "planning", { active: true, phase: "phase-1" });
  writeNotes(root, { priority: "Keep the CLI stable" });

  const rendered = renderHud(gatherHudContext(root));

  assert.match(rendered, /Tasks: 1 queued/);
  assert.match(rendered, /Modes: planning/);
  assert.match(rendered, /Keep the CLI stable/);
});
