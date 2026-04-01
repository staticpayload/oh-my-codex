import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { invokeTool, toolDefinitions } from "../index.js";

test("mcp server exposes the v2 tool families", () => {
  const names = toolDefinitions.map((tool) => tool.name);

  assert.ok(names.includes("omx_task_create"));
  assert.ok(names.includes("omx_state_write"));
  assert.ok(names.includes("omx_memory_write"));
  assert.ok(names.includes("omx_note_write"));
  assert.ok(names.includes("omx_explore_search"));
  assert.ok(names.includes("omx_team_status"));
  assert.ok(names.includes("omx_plugin_validate"));
  assert.ok(names.includes("omx_hook_status"));
  assert.ok(names.includes("omx_agent_list"));
});

test("task tool calls operate on durable .omx state", async () => {
  const root = mkdtempSync(join(tmpdir(), "omx-mcp-"));
  const created = JSON.parse(
    (await invokeTool("omx_task_create", { root, title: "Implement planner" })).content[0]!.text,
  ) as { id: string };
  const fetched = JSON.parse(
    (await invokeTool("omx_task_get", { root, taskId: created.id })).content[0]!.text,
  ) as { title: string };

  assert.equal(fetched.title, "Implement planner");
});
