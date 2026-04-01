import {
  installLocalPlugin,
  listMarketplacePlugins,
  loadPluginManifest,
  packPlugin,
  pluginRoot,
  runPluginsDoctor,
  scaffoldPlugin,
  setInstalledPluginState,
  validatePlugin,
} from "@oh-my-codex/core";
import { join } from "node:path";
import type { CliContext } from "../context.js";

function defaultPluginPath(context: CliContext): string {
  return pluginRoot(context.repoRoot, "omx-product");
}

export function runPluginsCommand(
  context: CliContext,
  args: string[],
  write: (line: string) => void,
): number {
  const subcommand = args[0] ?? "list";

  if (subcommand === "init") {
    const name = args[1];
    if (!name) {
      write("usage: omx plugins init <name> [--with-mcp] [--with-apps] [--with-assets]");
      return 1;
    }
    write(
      JSON.stringify(
        scaffoldPlugin(context.cwd, name, {
          withMarketplace: true,
          withSkills: true,
          withMcp: args.includes("--with-mcp"),
          withApps: args.includes("--with-apps"),
          withAssets: args.includes("--with-assets"),
        }),
        null,
        2,
      ),
    );
    return 0;
  }

  if (subcommand === "validate") {
    const path = args[1] ?? defaultPluginPath(context);
    const report = validatePlugin(path);
    write(JSON.stringify(report, null, 2));
    return report.ok ? 0 : 1;
  }

  if (subcommand === "pack") {
    const path = args[1] ?? defaultPluginPath(context);
    const outputDir = args[2] ?? join(context.repoRoot, "dist", "plugins");
    write(JSON.stringify({ archive: packPlugin(path, outputDir) }, null, 2));
    return 0;
  }

  if (subcommand === "install-local") {
    const path = args[1] ?? defaultPluginPath(context);
    write(JSON.stringify(installLocalPlugin(path, context.codexHome, { enable: !args.includes("--disable") }), null, 2));
    return 0;
  }

  if (subcommand === "list") {
    const entries = listMarketplacePlugins(context.cwd).map((entry) => ({
      ...entry,
      manifest: loadPluginManifest(join(context.cwd, entry.source.path.replace(/^\.\//, ""))),
    }));
    write(JSON.stringify(entries, null, 2));
    return 0;
  }

  if (subcommand === "enable" || subcommand === "disable") {
    const pluginName = args[1];
    if (!pluginName) {
      write(`usage: omx plugins ${subcommand} <pluginName>`);
      return 1;
    }
    write(JSON.stringify(setInstalledPluginState(context.codexHome, pluginName, subcommand === "enable"), null, 2));
    return 0;
  }

  if (subcommand === "doctor") {
    write(JSON.stringify(runPluginsDoctor(context.cwd, context.codexHome), null, 2));
    return 0;
  }

  write(`unknown plugins subcommand: ${subcommand}`);
  return 1;
}
