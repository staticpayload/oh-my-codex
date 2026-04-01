import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { defaultCodexHome, ensureMcpServer, readCodexConfig, removeMcpServer, writeCodexConfig } from "./codex.js";
import { installAgentCatalog } from "./agents.js";

export interface SetupPlan {
  configPath: string;
  skillsSource: string;
  skillsTarget: string;
  agentsTarget: string;
  serverEntry: string;
}

export function buildSetupPlan(repoRoot: string, codexHome = defaultCodexHome()): SetupPlan {
  return {
    configPath: join(codexHome, "config.toml"),
    skillsSource: join(repoRoot, "skills"),
    skillsTarget: join(codexHome, "skills"),
    agentsTarget: join(codexHome, "AGENTS.md"),
    serverEntry: join(repoRoot, "packages", "mcp-server", "dist", "index.js"),
  };
}

export function applySetup(repoRoot: string, codexHome = defaultCodexHome()): SetupPlan {
  const plan = buildSetupPlan(repoRoot, codexHome);
  mkdirSync(codexHome, { recursive: true });
  mkdirSync(plan.skillsTarget, { recursive: true });

  for (const entry of readdirSync(plan.skillsSource)) {
    cpSync(join(plan.skillsSource, entry), join(plan.skillsTarget, entry), { recursive: true, force: true });
  }
  cpSync(join(repoRoot, "AGENTS.template.md"), plan.agentsTarget, { force: true });
  installAgentCatalog(repoRoot, codexHome);

  const config = readCodexConfig(codexHome);
  ensureMcpServer(config, "omx", {
    command: "node",
    args: [plan.serverEntry],
    startup_timeout_sec: 20,
    tool_timeout_sec: 120,
  });
  writeCodexConfig(codexHome, config);

  return plan;
}

export function uninstallSetup(repoRoot: string, codexHome = defaultCodexHome()): SetupPlan {
  const plan = buildSetupPlan(repoRoot, codexHome);
  if (existsSync(plan.skillsTarget)) {
    for (const entry of readdirSync(join(repoRoot, "skills"))) {
      rmSync(join(plan.skillsTarget, entry), { recursive: true, force: true });
    }
  }
  rmSync(join(codexHome, "agents", "omx"), { recursive: true, force: true });

  const config = readCodexConfig(codexHome);
  removeMcpServer(config, "omx");
  writeCodexConfig(codexHome, config);
  return plan;
}

export function migrateFromV1(repoRoot: string, codexHome = defaultCodexHome()): string[] {
  const removed: string[] = [];
  for (const skill of ["claude-code-mcp", "omx-analyze", "omx-autopilot", "omx-code-review", "omx-help", "omx-plan", "omx-research", "omx-tdd"]) {
    const target = join(codexHome, "skills", skill);
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true });
      removed.push(target);
    }
  }
  appendFileSync(join(repoRoot, ".omx-migrate.log"), `${new Date().toISOString()} removed ${removed.length} legacy skill directories\n`, "utf8");
  return removed;
}
