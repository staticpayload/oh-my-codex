import { appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { installAgentCatalog } from "./agents.js";
import { ensureOmxLayout, hooksStateFile, repoCodexDir } from "./contract.js";
import { defaultCodexHome, ensureMcpServer, readCodexConfig, removeMcpServer, writeCodexConfig } from "./codex.js";
import { type HookPresetId, installRepoHooks } from "./hooks.js";
import { installLocalPlugin, normalizePluginName, removeInstalledPlugin } from "./plugins.js";

export interface SetupOptions {
  force?: boolean;
  installPlugin?: boolean;
  installHooks?: boolean;
  installProjectAgents?: boolean;
  ensureLayout?: boolean;
  hookPresets?: HookPresetId[];
  homeDir?: string;
}

export interface SetupPlan {
  configPath: string;
  productRoot: string;
  projectRoot: string;
  skillsSource: string;
  skillsTarget: string;
  skillCount: number;
  agentsSource: string;
  agentsTarget: string;
  codexAgentsTemplateTarget: string;
  projectAgentsTarget: string;
  serverEntry: string;
  productPluginPath: string;
  pluginName: string;
  repoHooksTarget: string;
  hookPresets: HookPresetId[];
  installPlugin: boolean;
  installHooks: boolean;
  installProjectAgents: boolean;
  ensureLayout: boolean;
}

export interface SetupResult extends SetupPlan {
  skillsInstalled: number;
  agentsInstalled: number;
  layoutPath: string | null;
  projectAgentsStatus: "written" | "overwritten" | "skipped" | "disabled";
  codexAgentsStatus: "written" | "overwritten" | "skipped";
  pluginInstalled: boolean;
  pluginTargetPath: string | null;
  hooksInstalled: boolean;
  hooksConfigPath: string | null;
}

const DEFAULT_HOOK_PRESETS: HookPresetId[] = ["workspace-context", "memory", "safety", "review"];

function resolvedOptions(options: SetupOptions = {}): Required<SetupOptions> {
  return {
    force: options.force ?? false,
    installPlugin: options.installPlugin ?? true,
    installHooks: options.installHooks ?? true,
    installProjectAgents: options.installProjectAgents ?? true,
    ensureLayout: options.ensureLayout ?? true,
    hookPresets: options.hookPresets ?? DEFAULT_HOOK_PRESETS,
    homeDir: options.homeDir ?? "",
  };
}

function writeTemplateFile(
  source: string,
  target: string,
  force: boolean,
): "written" | "overwritten" | "skipped" {
  if (existsSync(target) && !force) {
    return "skipped";
  }

  const existed = existsSync(target);
  cpSync(source, target, { force: true });
  return existed ? "overwritten" : "written";
}

export function buildSetupPlan(
  productRoot: string,
  projectRoot: string,
  codexHome = defaultCodexHome(),
  options: SetupOptions = {},
): SetupPlan {
  const resolved = resolvedOptions(options);
  const skillsSource = join(productRoot, "skills");
  const skillCount = existsSync(skillsSource)
    ? readdirSync(skillsSource, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length
    : 0;

  return {
    configPath: join(codexHome, "config.toml"),
    productRoot,
    projectRoot,
    skillsSource,
    skillsTarget: join(codexHome, "skills"),
    skillCount,
    agentsSource: join(productRoot, "templates", "agents"),
    agentsTarget: join(codexHome, "agents", "omx"),
    codexAgentsTemplateTarget: join(codexHome, "AGENTS.md"),
    projectAgentsTarget: join(projectRoot, "AGENTS.md"),
    serverEntry: join(productRoot, "packages", "mcp-server", "dist", "index.js"),
    productPluginPath: join(productRoot, "plugins", "omx-product"),
    pluginName: normalizePluginName("omx-product"),
    repoHooksTarget: join(repoCodexDir(projectRoot), "hooks.json"),
    hookPresets: resolved.hookPresets,
    installPlugin: resolved.installPlugin,
    installHooks: resolved.installHooks,
    installProjectAgents: resolved.installProjectAgents,
    ensureLayout: resolved.ensureLayout,
  };
}

export function applySetup(
  productRoot: string,
  projectRoot: string,
  codexHome = defaultCodexHome(),
  options: SetupOptions = {},
): SetupResult {
  const resolved = resolvedOptions(options);
  const plan = buildSetupPlan(productRoot, projectRoot, codexHome, resolved);
  mkdirSync(codexHome, { recursive: true });
  mkdirSync(plan.skillsTarget, { recursive: true });

  let skillsInstalled = 0;
  for (const entry of readdirSync(plan.skillsSource, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    cpSync(join(plan.skillsSource, entry.name), join(plan.skillsTarget, entry.name), {
      recursive: true,
      force: true,
    });
    skillsInstalled += 1;
  }

  const templatePath = join(productRoot, "AGENTS.template.md");
  const codexAgentsStatus = writeTemplateFile(templatePath, plan.codexAgentsTemplateTarget, resolved.force);
  const projectAgentsStatus = resolved.installProjectAgents
    ? writeTemplateFile(templatePath, plan.projectAgentsTarget, resolved.force)
    : "disabled";
  const agents = installAgentCatalog(productRoot, codexHome);

  const config = readCodexConfig(codexHome);
  ensureMcpServer(config, "omx", {
    command: "node",
    args: [plan.serverEntry],
    startup_timeout_sec: 20,
    tool_timeout_sec: 120,
  });
  writeCodexConfig(codexHome, config);

  const layoutPath = resolved.ensureLayout ? ensureOmxLayout(projectRoot) : null;

  let pluginInstalled = false;
  let pluginTargetPath: string | null = null;
  if (resolved.installPlugin && existsSync(plan.productPluginPath)) {
    const result = installLocalPlugin(plan.productPluginPath, codexHome, {
      enable: true,
      homeDir: resolved.homeDir || undefined,
    });
    pluginInstalled = true;
    pluginTargetPath = result.targetPath;
  }

  let hooksInstalled = false;
  let hooksConfigPath: string | null = null;
  if (resolved.installHooks) {
    const result = installRepoHooks(projectRoot, resolved.hookPresets);
    hooksInstalled = true;
    hooksConfigPath = result.configPath;
  }

  return {
    ...plan,
    skillsInstalled,
    agentsInstalled: agents.installed.length,
    layoutPath,
    projectAgentsStatus,
    codexAgentsStatus,
    pluginInstalled,
    pluginTargetPath,
    hooksInstalled,
    hooksConfigPath,
  };
}

export function uninstallSetup(
  productRoot: string,
  projectRoot: string,
  codexHome = defaultCodexHome(),
  options: Pick<SetupOptions, "homeDir"> = {},
): SetupPlan {
  const plan = buildSetupPlan(productRoot, projectRoot, codexHome);
  if (existsSync(plan.skillsTarget)) {
    for (const entry of readdirSync(join(productRoot, "skills"))) {
      rmSync(join(plan.skillsTarget, entry), { recursive: true, force: true });
    }
  }
  rmSync(join(codexHome, "agents", "omx"), { recursive: true, force: true });
  rmSync(plan.codexAgentsTemplateTarget, { force: true });

  const config = readCodexConfig(codexHome);
  removeMcpServer(config, "omx");
  writeCodexConfig(codexHome, config);

  if (existsSync(plan.productPluginPath)) {
    removeInstalledPlugin(codexHome, plan.pluginName, {
      homeDir: options.homeDir,
    });
  }

  rmSync(plan.repoHooksTarget, { force: true });
  rmSync(join(repoCodexDir(projectRoot), "hooks", "omx"), { recursive: true, force: true });
  rmSync(hooksStateFile(projectRoot), { force: true });

  return plan;
}

export function migrateFromV1(productRoot: string, codexHome = defaultCodexHome()): string[] {
  const removed: string[] = [];
  for (const skill of [
    "claude-code-mcp",
    "omx-analyze",
    "omx-autopilot",
    "omx-code-review",
    "omx-help",
    "omx-plan",
    "omx-research",
    "omx-tdd",
  ]) {
    const target = join(codexHome, "skills", skill);
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true });
      removed.push(target);
    }
  }
  appendFileSync(
    join(productRoot, ".omx-migrate.log"),
    `${new Date().toISOString()} removed ${removed.length} legacy skill directories\n`,
    "utf8",
  );
  return removed;
}
