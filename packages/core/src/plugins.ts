import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { ensureDir, readJson, writeJson } from "./json.js";
import {
  CodexConfig,
  isPluginEnabled,
  readCodexConfig,
  setPluginEnabled,
  writeCodexConfig,
} from "./codex.js";

export interface OmxPluginManifest {
  name: string;
  version: string;
  description: string;
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  skills?: string;
  mcpServers?: string;
  apps?: string;
  interface?: {
    displayName?: string;
    shortDescription?: string;
    longDescription?: string;
    developerName?: string;
    category?: string;
    capabilities?: string[];
    websiteURL?: string;
    privacyPolicyURL?: string;
    termsOfServiceURL?: string;
    composerIcon?: string;
    logo?: string;
    screenshots?: string[];
  };
}

export interface OmxPluginMarketplaceEntry {
  name: string;
  source: {
    source: "local";
    path: string;
  };
  policy: {
    installation: "NOT_AVAILABLE" | "AVAILABLE" | "INSTALLED_BY_DEFAULT";
    authentication: "ON_INSTALL" | "ON_USE";
  };
  category: string;
}

export interface OmxPluginMarketplace {
  name: string;
  interface?: {
    displayName?: string;
  };
  plugins: OmxPluginMarketplaceEntry[];
}

export interface PluginValidationReport {
  ok: boolean;
  manifest: OmxPluginManifest | null;
  errors: string[];
  warnings: string[];
}

export interface PluginDoctorReport {
  configPlugins: string[];
  marketplacePlugins: string[];
  installedPlugins: string[];
  warnings: string[];
}

export function normalizePluginName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export function pluginRoot(repoRoot: string, name: string): string {
  return join(repoRoot, "plugins", normalizePluginName(name));
}

export function pluginManifestPath(pathToPlugin: string): string {
  return join(pathToPlugin, ".codex-plugin", "plugin.json");
}

export function repoMarketplacePath(root: string): string {
  return join(root, ".agents", "plugins", "marketplace.json");
}

export function personalMarketplacePath(home = homedir()): string {
  return join(home, ".agents", "plugins", "marketplace.json");
}

export function loadPluginManifest(pathToPlugin: string): OmxPluginManifest | null {
  return readJson<OmxPluginManifest | null>(pluginManifestPath(pathToPlugin), null);
}

export function validatePlugin(pathToPlugin: string): PluginValidationReport {
  const manifest = loadPluginManifest(pathToPlugin);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!manifest) {
    errors.push("missing .codex-plugin/plugin.json");
    return { ok: false, manifest: null, errors, warnings };
  }

  const normalized = normalizePluginName(manifest.name);
  if (manifest.name !== normalized) {
    errors.push(`plugin name must be normalized kebab-case, expected ${normalized}`);
  }
  if (!manifest.version) {
    errors.push("missing version");
  }
  if (!manifest.description) {
    errors.push("missing description");
  }
  if (!manifest.interface?.displayName) {
    warnings.push("missing interface.displayName");
  }
  if (manifest.skills && !existsSync(resolve(pathToPlugin, manifest.skills))) {
    errors.push(`skills path does not exist: ${manifest.skills}`);
  }
  if (manifest.mcpServers && !existsSync(resolve(pathToPlugin, manifest.mcpServers))) {
    errors.push(`mcpServers path does not exist: ${manifest.mcpServers}`);
  }
  if (manifest.apps && !existsSync(resolve(pathToPlugin, manifest.apps))) {
    errors.push(`apps path does not exist: ${manifest.apps}`);
  }

  return {
    ok: errors.length === 0,
    manifest,
    errors,
    warnings,
  };
}

export function loadMarketplace(root: string): OmxPluginMarketplace {
  return readJson<OmxPluginMarketplace>(repoMarketplacePath(root), {
    name: "local-repo",
    interface: {
      displayName: "Local OMX Plugins",
    },
    plugins: [],
  });
}

export function writeMarketplace(root: string, marketplace: OmxPluginMarketplace): string {
  const path = repoMarketplacePath(root);
  writeJson(path, marketplace);
  return path;
}

export function upsertMarketplaceEntry(
  root: string,
  entry: OmxPluginMarketplaceEntry,
  marketplaceName = "local-repo",
  displayName = "Local OMX Plugins",
): OmxPluginMarketplace {
  const current = loadMarketplace(root);
  const plugins = current.plugins.filter((plugin) => plugin.name !== entry.name);
  plugins.push(entry);
  const next: OmxPluginMarketplace = {
    name: current.name || marketplaceName,
    interface: {
      displayName: current.interface?.displayName || displayName,
    },
    plugins,
  };
  writeMarketplace(root, next);
  return next;
}

export function scaffoldPlugin(
  repoRootPath: string,
  name: string,
  options: {
    withSkills?: boolean;
    withMcp?: boolean;
    withApps?: boolean;
    withAssets?: boolean;
    withMarketplace?: boolean;
    category?: string;
  } = {},
): { pluginPath: string; marketplacePath?: string } {
  const normalized = normalizePluginName(name);
  const target = pluginRoot(repoRootPath, normalized);
  mkdirSync(join(target, ".codex-plugin"), { recursive: true });
  if (options.withSkills ?? true) {
    mkdirSync(join(target, "skills", normalized), { recursive: true });
    writeFileSync(
      join(target, "skills", normalized, "SKILL.md"),
      `---\nname: ${normalized}\ndescription: TODO: describe when this plugin skill should be used.\n---\n\n# ${normalized}\n\nReplace this scaffold with a real skill workflow.\n`,
      "utf8",
    );
  }
  if (options.withAssets) {
    mkdirSync(join(target, "assets"), { recursive: true });
  }
  if (options.withMcp) {
    writeJson(join(target, ".mcp.json"), {
      servers: [],
    });
  }
  if (options.withApps) {
    writeJson(join(target, ".app.json"), {
      apps: [],
    });
  }

  writeJson(pluginManifestPath(target), {
    name: normalized,
    version: "0.1.0",
    description: "TODO: describe the plugin",
    license: "MIT",
    skills: "./skills/",
    ...(options.withMcp ? { mcpServers: "./.mcp.json" } : {}),
    ...(options.withApps ? { apps: "./.app.json" } : {}),
    interface: {
      displayName: normalized
        .split("-")
        .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
        .join(" "),
      shortDescription: "TODO: short description",
      category: options.category ?? "Productivity",
    },
  } satisfies OmxPluginManifest);

  let marketplacePath: string | undefined;
  if (options.withMarketplace) {
    upsertMarketplaceEntry(repoRootPath, {
      name: normalized,
      source: {
        source: "local",
        path: `./plugins/${normalized}`,
      },
      policy: {
        installation: "AVAILABLE",
        authentication: "ON_INSTALL",
      },
      category: options.category ?? "Productivity",
    });
    marketplacePath = repoMarketplacePath(repoRootPath);
  }

  return { pluginPath: target, marketplacePath };
}

export function listMarketplacePlugins(root: string): OmxPluginMarketplaceEntry[] {
  return loadMarketplace(root).plugins;
}

export function packPlugin(pathToPlugin: string, outputDir: string): string {
  const manifest = loadPluginManifest(pathToPlugin);
  if (!manifest) {
    throw new Error("plugin manifest missing");
  }

  ensureDir(outputDir);
  const archivePath = join(outputDir, `${manifest.name}-${manifest.version}.tgz`);
  execFileSync("tar", ["-czf", archivePath, "-C", dirname(pathToPlugin), basename(pathToPlugin)], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  return archivePath;
}

export function installLocalPlugin(
  pathToPlugin: string,
  codexHome: string,
  options: { enable?: boolean; homeDir?: string } = {},
): { targetPath: string; marketplacePath: string } {
  const manifest = loadPluginManifest(pathToPlugin);
  if (!manifest) {
    throw new Error("plugin manifest missing");
  }

  const targetPath = join(codexHome, "plugins", manifest.name);
  mkdirSync(join(codexHome, "plugins"), { recursive: true });
  cpSync(pathToPlugin, targetPath, { recursive: true, force: true });

  const home = options.homeDir ?? homedir();
  const marketplacePath = personalMarketplacePath(home);
  const marketplace = readJson<OmxPluginMarketplace>(marketplacePath, {
    name: "local-personal",
    interface: {
      displayName: "Personal Plugins",
    },
    plugins: [],
  });
  const nextEntries = marketplace.plugins.filter((plugin) => plugin.name !== manifest.name);
  nextEntries.push({
    name: manifest.name,
    source: {
      source: "local",
      path: `./.codex/plugins/${manifest.name}`,
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL",
    },
    category: manifest.interface?.category ?? "Productivity",
  });
  writeJson(marketplacePath, { ...marketplace, plugins: nextEntries });

  const config = readCodexConfig(codexHome);
  if (options.enable ?? true) {
    setPluginEnabled(config, manifest.name, true);
    writeCodexConfig(codexHome, config);
  }

  return { targetPath, marketplacePath };
}

export function removeInstalledPlugin(
  codexHome: string,
  pluginName: string,
  options: { homeDir?: string } = {},
): { targetPath: string; marketplacePath: string } {
  const targetPath = join(codexHome, "plugins", pluginName);
  rmSync(targetPath, { recursive: true, force: true });

  const marketplacePath = personalMarketplacePath(options.homeDir ?? homedir());
  const marketplace = readJson<OmxPluginMarketplace>(marketplacePath, {
    name: "local-personal",
    interface: {
      displayName: "Personal Plugins",
    },
    plugins: [],
  });
  writeJson(marketplacePath, {
    ...marketplace,
    plugins: marketplace.plugins.filter((plugin) => plugin.name !== pluginName),
  });

  const config = readCodexConfig(codexHome);
  if (config.plugins && typeof config.plugins === "object" && !Array.isArray(config.plugins)) {
    delete (config.plugins as Record<string, unknown>)[pluginName];
    writeCodexConfig(codexHome, config);
  }

  return { targetPath, marketplacePath };
}

export function setInstalledPluginState(codexHome: string, pluginName: string, enabled: boolean): CodexConfig {
  const config = readCodexConfig(codexHome);
  setPluginEnabled(config, pluginName, enabled);
  writeCodexConfig(codexHome, config);
  return config;
}

export function listInstalledPlugins(codexHome: string): string[] {
  const pluginDir = join(codexHome, "plugins");
  if (!existsSync(pluginDir)) {
    return [];
  }
  return readdirSync(pluginDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export function pluginStatus(codexHome: string, pluginName: string): { enabled: boolean } {
  const config = readCodexConfig(codexHome);
  return {
    enabled: isPluginEnabled(config, pluginName),
  };
}

export function runPluginsDoctor(repoRootPath: string, codexHome: string): PluginDoctorReport {
  const config = readCodexConfig(codexHome);
  const installedDir = join(codexHome, "plugins");
  const installedPlugins = existsSync(installedDir)
    ? execFileSync("sh", ["-lc", `find "${installedDir}" -maxdepth 1 -mindepth 1 -type d -print | xargs -n1 basename 2>/dev/null`], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      })
        .split("\n")
        .filter(Boolean)
    : [];
  const marketplacePlugins = listMarketplacePlugins(repoRootPath).map((plugin) => plugin.name);
  const warnings: string[] = [];

  for (const plugin of marketplacePlugins) {
    if (!isPluginEnabled(config, plugin)) {
      warnings.push(`${plugin} is present in marketplace but disabled in ~/.codex/config.toml`);
    }
  }

  return {
    configPlugins: Object.keys((config.plugins as Record<string, unknown> | undefined) ?? {}).sort(),
    marketplacePlugins,
    installedPlugins,
    warnings,
  };
}
