import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import * as TOML from "@iarna/toml";
import { ensureDir } from "./json.js";

export interface CodexFeatureStatus {
  name: string;
  maturity: string;
  enabled: boolean;
}

export type CodexConfig = Record<string, unknown>;

export function defaultCodexHome(env: NodeJS.ProcessEnv = process.env): string {
  return env.CODEX_HOME || join(homedir(), ".codex");
}

export function readCodexConfig(codexHome: string): CodexConfig {
  const path = join(codexHome, "config.toml");
  if (!existsSync(path)) {
    return {};
  }

  try {
    return TOML.parse(readFileSync(path, "utf8")) as unknown as CodexConfig;
  } catch {
    return {};
  }
}

export function writeCodexConfig(codexHome: string, config: CodexConfig): string {
  ensureDir(codexHome);
  const path = join(codexHome, "config.toml");
  writeFileSync(path, TOML.stringify(config as never), "utf8");
  return path;
}

export function readCodexFeatures(): CodexFeatureStatus[] {
  try {
    const output = execFileSync("codex", ["features", "list"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\S+)\s+(.+?)\s+(true|false)$/);
        if (!match) {
          return null;
        }
        return {
          name: match[1],
          maturity: match[2].trim(),
          enabled: match[3] === "true",
        } satisfies CodexFeatureStatus;
      })
      .filter((feature): feature is CodexFeatureStatus => Boolean(feature));
  } catch {
    return [];
  }
}

function objectValue(parent: CodexConfig, key: string): Record<string, unknown> {
  const existing = parent[key];
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    return existing as Record<string, unknown>;
  }
  const created: Record<string, unknown> = {};
  parent[key] = created;
  return created;
}

export function ensureMcpServer(
  config: CodexConfig,
  name: string,
  server: {
    command: string;
    args: string[];
    startup_timeout_sec?: number;
    tool_timeout_sec?: number;
  },
): CodexConfig {
  const root = objectValue(config, "mcp_servers");
  root[name] = {
    command: server.command,
    args: server.args,
    startup_timeout_sec: server.startup_timeout_sec ?? 20,
    tool_timeout_sec: server.tool_timeout_sec ?? 120,
  };
  return config;
}

export function removeMcpServer(config: CodexConfig, name: string): CodexConfig {
  const root = objectValue(config, "mcp_servers");
  delete root[name];
  return config;
}

export function setPluginEnabled(config: CodexConfig, name: string, enabled: boolean): CodexConfig {
  const plugins = objectValue(config, "plugins");
  const entry =
    plugins[name] && typeof plugins[name] === "object" && !Array.isArray(plugins[name])
      ? (plugins[name] as Record<string, unknown>)
      : {};
  entry.enabled = enabled;
  plugins[name] = entry;
  return config;
}

export function isPluginEnabled(config: CodexConfig, name: string): boolean {
  const plugins = config.plugins;
  if (!plugins || typeof plugins !== "object" || Array.isArray(plugins)) {
    return false;
  }
  const entry = (plugins as Record<string, unknown>)[name];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return false;
  }
  return Boolean((entry as Record<string, unknown>).enabled);
}

export function listConfiguredPlugins(config: CodexConfig): string[] {
  const plugins = config.plugins;
  if (!plugins || typeof plugins !== "object" || Array.isArray(plugins)) {
    return [];
  }
  return Object.keys(plugins as Record<string, unknown>).sort();
}

export function codexFeatureEnabled(features: CodexFeatureStatus[], name: string): boolean {
  return features.find((feature) => feature.name === name)?.enabled ?? false;
}
