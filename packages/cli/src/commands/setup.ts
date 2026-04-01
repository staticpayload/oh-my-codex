import { applySetup, buildSetupPlan, migrateFromV1, uninstallSetup, type HookPresetId } from "@oh-my-codex/core";
import type { CliContext } from "../context.js";

function parseHookPresets(args: string[]): HookPresetId[] | undefined {
  const raw = args.find((arg) => arg.startsWith("--presets="));
  if (!raw) {
    return undefined;
  }
  return raw
    .replace("--presets=", "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean) as HookPresetId[];
}

export function runSetup(
  context: CliContext,
  args: string[],
  write: (line: string) => void,
): number {
  const dryRun = args.includes("--dry-run");
  const action = args.find((arg) => !arg.startsWith("-")) ?? "apply";
  const force = args.includes("--force");
  const installPlugin = !args.includes("--no-plugin");
  const installHooks = !args.includes("--no-hooks");
  const installProjectAgents = !args.includes("--no-project-agents");
  const ensureLayout = !args.includes("--no-layout");
  const hookPresets = parseHookPresets(args);
  const plan = buildSetupPlan(context.repoRoot, context.cwd, context.codexHome, {
    force,
    installPlugin,
    installHooks,
    installProjectAgents,
    ensureLayout,
    hookPresets,
    homeDir: context.homeDir,
  });

  write("oh-my-codex setup");
  write("=================");
  if (dryRun) {
    write("dry-run mode: no files will be changed");
  }

  if (action === "apply" || action === "repair") {
    write("");
    write("[1/7] Creating project runtime...");
    write(
      dryRun
        ? `  Would initialize ${plan.ensureLayout ? ".omx layout and HUD config" : "nothing (layout disabled)"}`
        : `  ${plan.ensureLayout ? "Project runtime will be initialized." : "Project runtime disabled by flag."}`,
    );
    write("");
    write("[2/7] Installing agent prompts...");
    write(`  ${dryRun ? "Would install" : "Installing"} prompts from ${plan.agentsSource} -> ${plan.agentsTarget}`);
    write("");
    write("[3/7] Installing skills...");
    write(`  ${dryRun ? "Would install" : "Installing"} ${plan.skillCount} skills into ${plan.skillsTarget}`);
    write("");
    write("[4/7] Updating config.toml...");
    write(`  ${dryRun ? "Would configure" : "Configuring"} MCP server entry: ${plan.serverEntry}`);
    write("");
    write(`[5/7] ${plan.installPlugin ? "Installing first-party plugin..." : "Skipping first-party plugin..."}`);
    write(
      plan.installPlugin
        ? `  ${dryRun ? "Would install" : "Installing"} ${plan.pluginName} from ${plan.productPluginPath}`
        : "  Disabled by --no-plugin",
    );
    write("");
    write(`[6/7] ${plan.installHooks ? "Installing repo hook pack..." : "Skipping repo hook pack..."}`);
    write(
      plan.installHooks
        ? `  ${dryRun ? "Would install" : "Installing"} presets: ${plan.hookPresets.join(", ")} -> ${plan.repoHooksTarget}`
        : "  Disabled by --no-hooks",
    );
    write("");
    write("[7/7] Generating AGENTS.md...");
    write(
      plan.installProjectAgents
        ? `  ${dryRun ? "Would write" : "Writing"} ${plan.projectAgentsTarget}${force ? " (force enabled)" : ""}`
        : "  Disabled by --no-project-agents",
    );
  }

  if (dryRun) {
    if (action === "migrate-v1") {
      write("");
      write("would remove legacy v1 skill directories from Codex home");
    }
    if (action === "uninstall") {
      write("");
      write("would remove OMX skills, agent prompts, MCP config, first-party plugin, and repo hook pack");
    }
    return 0;
  }

  if (action === "apply" || action === "repair") {
    const result = applySetup(context.repoRoot, context.cwd, context.codexHome, {
      force,
      installPlugin,
      installHooks,
      installProjectAgents,
      ensureLayout,
      hookPresets,
      homeDir: context.homeDir,
    });
    write("");
    write(
      `Setup complete: ${result.skillsInstalled} skills, ${result.agentsInstalled} agent prompts, plugin ${result.pluginInstalled ? "installed" : "skipped"}, hooks ${result.hooksInstalled ? "installed" : "skipped"}.`,
    );
    write(`Project AGENTS.md: ${result.projectAgentsStatus} (${result.projectAgentsTarget})`);
    write(`Codex AGENTS.md: ${result.codexAgentsStatus} (${result.codexAgentsTemplateTarget})`);
    return 0;
  }

  if (action === "uninstall") {
    uninstallSetup(context.repoRoot, context.cwd, context.codexHome, { homeDir: context.homeDir });
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
