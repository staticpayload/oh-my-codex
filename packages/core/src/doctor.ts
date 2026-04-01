import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  codexFeatureEnabled,
  listConfiguredPlugins,
  readCodexConfig,
  readCodexFeatures,
} from "./codex.js";
import { omxDir, repoCodexDir } from "./contract.js";
import { runPluginsDoctor } from "./plugins.js";
import { hookStatus } from "./hooks.js";

export interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
  level: "pass" | "warn" | "fail";
}

export interface DoctorReport {
  summary: {
    passed: number;
    warnings: number;
    failed: number;
  };
  checks: DoctorCheck[];
}

function hasCommand(command: string): boolean {
  try {
    execFileSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function nodeVersionOk(): boolean {
  const major = Number(process.versions.node.split(".")[0] ?? "0");
  return major >= 20;
}

export function runDoctor(root: string, codexHome = join(process.env.HOME || "", ".codex")): DoctorReport {
  const features = readCodexFeatures();
  const config = readCodexConfig(codexHome);
  const pluginsDoctor = runPluginsDoctor(root, codexHome);
  const hooks = hookStatus(root, codexHome);
  const repoMarketplacePresent = existsSync(join(root, ".agents", "plugins", "marketplace.json"));
  const personalOmxPluginInstalled = pluginsDoctor.installedPlugins.includes("omx-product");

  const checks: DoctorCheck[] = [
    {
      name: "node",
      ok: nodeVersionOk(),
      detail: `Node ${process.versions.node}`,
      level: nodeVersionOk() ? "pass" : "fail",
    },
    {
      name: "codex",
      ok: hasCommand("codex"),
      detail: hasCommand("codex") ? "Codex CLI found" : "Codex CLI missing",
      level: hasCommand("codex") ? "pass" : "warn",
    },
    {
      name: "git",
      ok: hasCommand("git"),
      detail: hasCommand("git") ? "git found" : "git missing",
      level: hasCommand("git") ? "pass" : "fail",
    },
    {
      name: "rg",
      ok: hasCommand("rg"),
      detail: hasCommand("rg") ? "ripgrep found" : "ripgrep missing",
      level: hasCommand("rg") ? "pass" : "warn",
    },
    {
      name: "tmux",
      ok: hasCommand("tmux"),
      detail: hasCommand("tmux") ? "tmux found" : "tmux found missing, team runtime will degrade to mock mode",
      level: hasCommand("tmux") ? "pass" : "warn",
    },
    {
      name: "cargo",
      ok: hasCommand("cargo"),
      detail: hasCommand("cargo") ? "cargo found" : "cargo missing, native explore helpers unavailable",
      level: hasCommand("cargo") ? "pass" : "warn",
    },
    {
      name: "omx-layout",
      ok: existsSync(omxDir(root)),
      detail: existsSync(omxDir(root)) ? ".omx layout present" : ".omx layout not initialized yet",
      level: existsSync(omxDir(root)) ? "pass" : "warn",
    },
    {
      name: "mcp-config",
      ok: Boolean((config.mcp_servers as Record<string, unknown> | undefined)?.omx),
      detail: Boolean((config.mcp_servers as Record<string, unknown> | undefined)?.omx)
        ? "omx MCP server configured"
        : "omx MCP server missing from ~/.codex/config.toml",
      level: Boolean((config.mcp_servers as Record<string, unknown> | undefined)?.omx) ? "pass" : "warn",
    },
    {
      name: "codex-plugins",
      ok: codexFeatureEnabled(features, "plugins"),
      detail: codexFeatureEnabled(features, "plugins")
        ? `plugins enabled, configured: ${listConfiguredPlugins(config).join(", ") || "none"}`
        : "plugins feature disabled",
      level: codexFeatureEnabled(features, "plugins") ? "pass" : "warn",
    },
    {
      name: "hook-feature",
      ok: hooks.codexHooksEnabled && hooks.platformSupported,
      detail: hooks.platformSupported
        ? hooks.codexHooksEnabled
          ? "codex_hooks feature enabled"
          : "codex_hooks feature disabled, hook pack will install but stay inactive"
        : "hooks unsupported on Windows",
      level: hooks.codexHooksEnabled && hooks.platformSupported ? "pass" : "warn",
    },
    {
      name: "repo-hooks",
      ok: hooks.repoInstalled || hooks.personalInstalled,
      detail: hooks.repoInstalled
        ? "repo-local hooks.json present"
        : hooks.personalInstalled
          ? "personal hooks.json present"
          : "no OMX hook pack installed",
      level: hooks.repoInstalled || hooks.personalInstalled ? "pass" : "warn",
    },
    {
      name: "repo-marketplace",
      ok: repoMarketplacePresent || personalOmxPluginInstalled,
      detail: repoMarketplacePresent
        ? "repo marketplace present"
        : personalOmxPluginInstalled
          ? "personal omx-product plugin installed"
          : "repo marketplace missing",
      level: repoMarketplacePresent || personalOmxPluginInstalled ? "pass" : "warn",
    },
    {
      name: "plugin-doctor",
      ok: pluginsDoctor.warnings.length === 0,
      detail:
        pluginsDoctor.warnings.length === 0
          ? `marketplace plugins: ${pluginsDoctor.marketplacePlugins.join(", ") || "none"}`
          : pluginsDoctor.warnings.join("; "),
      level: pluginsDoctor.warnings.length === 0 ? "pass" : "warn",
    },
    {
      name: "repo-codex-dir",
      ok: existsSync(repoCodexDir(root)),
      detail: existsSync(repoCodexDir(root)) ? "repo .codex directory present" : "repo .codex directory absent",
      level: existsSync(repoCodexDir(root)) ? "pass" : "warn",
    },
  ];

  return {
    summary: {
      passed: checks.filter((check) => check.level === "pass").length,
      warnings: checks.filter((check) => check.level === "warn").length,
      failed: checks.filter((check) => check.level === "fail").length,
    },
    checks,
  };
}
