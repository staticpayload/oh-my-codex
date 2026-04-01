import {
  OMX_HOOK_PRESETS,
  explainHookPreset,
  hookStatus,
  installPersonalHooks,
  installRepoHooks,
  type HookPresetId,
  updateHookPresetState,
} from "@oh-my-codex/core";
import type { CliContext } from "../context.js";

function parsePresets(args: string[]): HookPresetId[] {
  const raw = args.find((arg) => arg.startsWith("--presets="));
  if (!raw) {
    return ["workspace-context", "memory", "safety", "review"];
  }
  return raw
    .replace("--presets=", "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean) as HookPresetId[];
}

function scopeFromArgs(args: string[]): "repo" | "personal" {
  return args.includes("--personal") ? "personal" : "repo";
}

export function runHooksCommand(
  context: CliContext,
  args: string[],
  write: (line: string) => void,
): number {
  const subcommand = args[0] ?? "status";
  const scope = scopeFromArgs(args);

  if (subcommand === "install") {
    const presets = parsePresets(args);
    const result =
      scope === "personal"
        ? installPersonalHooks(context.cwd, context.codexHome, presets)
        : installRepoHooks(context.cwd, presets);
    write(JSON.stringify({ scope, presets, ...result }, null, 2));
    return 0;
  }

  if (subcommand === "status" || subcommand === "doctor") {
    write(JSON.stringify(hookStatus(context.cwd, context.codexHome), null, 2));
    return 0;
  }

  if (subcommand === "explain") {
    const preset = (args[1] ?? "") as HookPresetId;
    if (preset) {
      write(JSON.stringify(explainHookPreset(preset), null, 2));
      return 0;
    }
    write(JSON.stringify(OMX_HOOK_PRESETS, null, 2));
    return 0;
  }

  if (subcommand === "enable" || subcommand === "disable") {
    const preset = args[1] as HookPresetId | undefined;
    if (!preset) {
      write(`usage: omx hooks ${subcommand} <preset> [--personal]`);
      return 1;
    }
    const state = updateHookPresetState(context.cwd, scope, preset, subcommand === "enable");
    const presets = scope === "personal" ? state.personalPresets : state.repoPresets;
    if (scope === "personal") {
      installPersonalHooks(context.cwd, context.codexHome, presets);
    } else {
      installRepoHooks(context.cwd, presets);
    }
    write(JSON.stringify(state, null, 2));
    return 0;
  }

  write(`unknown hooks subcommand: ${subcommand}`);
  return 1;
}
