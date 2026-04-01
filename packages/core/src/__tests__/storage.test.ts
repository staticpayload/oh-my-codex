import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  bootstrapPlanning,
  createTask,
  ensureOmxLayout,
  readMemory,
  readNotes,
  readState,
  updateTask,
  writeMemory,
  writeNotes,
  writeState,
} from "../index.js";

test("omx layout writes state, notes, and memory documents", () => {
  const root = mkdtempSync(join(tmpdir(), "omx-core-"));
  ensureOmxLayout(root);

  writeState(root, "ultrawork", { active: true, phase: "execute" });
  writeNotes(root, { priority: "Ship the planner first" });
  writeMemory(root, "project", { summary: "Codex-native runtime" });

  assert.equal(readState(root, "ultrawork")?.phase, "execute");
  assert.equal(readNotes(root).priority, "Ship the planner first");
  assert.equal(readMemory(root).summary, "Codex-native runtime");
});

test("task updates keep the task record current", () => {
  const root = mkdtempSync(join(tmpdir(), "omx-task-"));
  const task = createTask(root, { title: "Implement HUD", verify: ["npm test"] });
  const updated = updateTask(root, task.id, { status: "review", owner: "worker-1" });

  assert.equal(updated?.status, "review");
  assert.equal(updated?.owner, "worker-1");
});

test("planning bootstrap creates the durable v2 artifacts", () => {
  const root = mkdtempSync(join(tmpdir(), "omx-plan-"));
  const created = bootstrapPlanning(root, { goal: "Build OMX v2", phase: "phase-1" });

  assert.ok(created.length >= 4);
  assert.equal(readMemory(root).summary, "Build OMX v2");
});
