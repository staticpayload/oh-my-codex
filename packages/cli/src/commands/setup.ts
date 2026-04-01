import { buildSetupPlan, applySetup, migrateFromV1, uninstallSetup } from "@oh-my-codex/core";
import type { CliContext } from "../context.js";

export function runSetup(
  context: CliContext,
  args: string[],
  write: (line: string) => void,
): number {
  const dryRun = args.includes("--dry-run");
  const action = args.find((arg) => !arg.startsWith("-")) ?? "apply";
  const plan = buildSetupPlan(context.repoRoot, context.codexHome);

  write(`omx setup ${action}${dryRun ? " (dry-run)" : ""}`);
  write(`Codex home: ${context.codexHome}`);
  write(`Server entry: ${plan.serverEntry}`);

  if (dryRun) {
    write(`would copy skills: ${plan.skillsSource} -> ${plan.skillsTarget}`);
    write(`would copy AGENTS template -> ${plan.agentsTarget}`);
    write(`would configure MCP server in ${plan.configPath}`);
    if (action === "migrate-v1") {
      write("would remove legacy v1 skill directories from Codex home");
    }
    if (action === "uninstall") {
      write("would remove OMX skills, agent prompts, and the OMX MCP config");
    }
    return 0;
  }

  if (action === "apply" || action === "repair") {
    applySetup(context.repoRoot, context.codexHome);
    write(action === "repair" ? "repair complete" : "setup complete");
    return 0;
  }

  if (action === "uninstall") {
    uninstallSetup(context.repoRoot, context.codexHome);
    write("uninstall complete");
    return 0;
  }

  if (action === "migrate-v1") {
    const removed = migrateFromV1(context.repoRoot, context.codexHome);
    write(JSON.stringify({ removed }, null, 2));
    return 0;
  }

  write(`unknown setup action: ${action}`);
  return 1;
}
