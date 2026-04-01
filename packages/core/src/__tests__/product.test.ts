import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildHooksConfig,
  createTeam,
  hookStatus,
  installRepoHooks,
  OMX_HOOK_PRESETS,
  queueTeamTask,
  readTeamInbox,
  runPluginsDoctor,
  scaffoldPlugin,
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

test("plugins doctor reports marketplace plugins", () => {
  const report = runPluginsDoctor(repoRoot, join(tmpdir(), "fake-codex-home"));
  assert.ok(report.marketplacePlugins.includes("omx-product"));
});

test("shipped hook preset catalog stays non-empty", () => {
  assert.ok(OMX_HOOK_PRESETS.length >= 5);
});
