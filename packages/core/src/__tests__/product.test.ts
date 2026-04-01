import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildHooksConfig,
  createTeam,
  hookStatus,
  installRepoHooks,
  OMX_HOOK_PRESETS,
  OMX_SKILL_CATALOG,
  queueTeamTask,
  readTeamInbox,
  runPluginsDoctor,
  scaffoldPlugin,
  OMX_AGENT_CATALOG,
  validateAgentCatalog,
  validatePlugin,
} from "../index.js";

const repoRoot = join(process.cwd(), "..", "..");

test("plugin scaffold creates a valid repo-local plugin", () => {
  const root = mkdtempSync(join(tmpdir(), "omx-plugin-"));
  const result = scaffoldPlugin(root, "demo-plugin", { withMarketplace: true, withMcp: true, withApps: true });
  const report = validatePlugin(result.pluginPath);

  assert.equal(report.ok, true);
});

test("hook config groups installed presets by event", () => {
  const root = mkdtempSync(join(tmpdir(), "omx-hook-"));
  const config = buildHooksConfig(join(root, ".codex"), ["workspace-context", "safety"]);
  const hooks = config.hooks as Record<string, unknown>;

  assert.ok(Array.isArray(hooks.SessionStart));
  assert.ok(Array.isArray(hooks.PreToolUse));
});

test("repo hook install writes state that doctor can see", () => {
  const root = mkdtempSync(join(tmpdir(), "omx-hook-install-"));
  installRepoHooks(root, ["workspace-context", "memory"]);
  const status = hookStatus(root, join(tmpdir(), "fake-codex-home"));

  assert.equal(status.repoInstalled, true);
});

test("team inbox receives queued task messages", () => {
  const root = mkdtempSync(join(tmpdir(), "omx-team-"));
  createTeam(root, "demo", [{ id: "executor", role: "builder", agentId: "executor" }]);
  queueTeamTask(root, "implement plugin doctor");
  const inbox = readTeamInbox(root);

  assert.ok(inbox.length >= 2);
  assert.ok(inbox.some((item) => /Task queued/.test(item.subject)));
});

test("agent catalog stays aligned with committed templates", () => {
  const report = validateAgentCatalog(repoRoot);
  assert.equal(report.ok, true);
});

test("shipped skill catalog stays substantive", () => {
  for (const skillId of OMX_SKILL_CATALOG) {
    const content = readFileSync(join(repoRoot, "skills", skillId, "SKILL.md"), "utf8");
    const lines = content.trim().split("\n");
    assert.ok(lines.length >= 25, `${skillId} skill should not regress to placeholder length`);
    assert.match(content, /## /, `${skillId} skill should include structured sections`);
  }
});

test("shipped plugin skills stay substantive", () => {
  for (const skillId of ["ultrawork", "team", "review"]) {
    const content = readFileSync(
      join(repoRoot, "plugins", "omx-product", "skills", skillId, "SKILL.md"),
      "utf8",
    );
    const lines = content.trim().split("\n");
    assert.ok(lines.length >= 20, `${skillId} plugin skill should not regress to placeholder length`);
    assert.match(content, /## /, `${skillId} plugin skill should include structured sections`);
  }
});

test("agent prompt templates stay substantive", () => {
  for (const agent of OMX_AGENT_CATALOG) {
    const content = readFileSync(join(repoRoot, "templates", "agents", agent.promptTemplate), "utf8");
    const lines = content.trim().split("\n");
    assert.ok(lines.length >= 18, `${agent.id} template should not regress to placeholder length`);
    assert.match(content, /## Purpose/, `${agent.id} template should define a purpose section`);
  }
});

test("plugins doctor reports marketplace plugins", () => {
  const report = runPluginsDoctor(repoRoot, join(tmpdir(), "fake-codex-home"));
  assert.ok(report.marketplacePlugins.includes("omx-product"));
});

test("shipped hook preset catalog stays non-empty", () => {
  assert.ok(OMX_HOOK_PRESETS.length >= 5);
});
