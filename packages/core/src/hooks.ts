import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";
import { codexFeatureEnabled, readCodexFeatures } from "./codex.js";
import { hooksStateFile, repoCodexDir } from "./contract.js";
import { readJson, writeJson, ensureDir } from "./json.js";

export type HookScope = "repo" | "personal";
export type HookPresetId = "memory" | "safety" | "review" | "telemetry" | "workspace-context";
export type HookEventName = "SessionStart" | "PreToolUse" | "PostToolUse" | "UserPromptSubmit" | "Stop";

export interface OmxHookPreset {
  id: HookPresetId;
  description: string;
  handlers: Array<{
    event: HookEventName;
    matcher?: string;
    script: string;
    statusMessage?: string;
    timeout?: number;
  }>;
}

export interface InstalledHooksState {
  repoPresets: HookPresetId[];
  personalPresets: HookPresetId[];
  updatedAt: string;
}

export interface HookStatusReport {
  codexHooksEnabled: boolean;
  platformSupported: boolean;
  repoInstalled: boolean;
  personalInstalled: boolean;
  state: InstalledHooksState;
}

function now(): string {
  return new Date().toISOString();
}

export const OMX_HOOK_PRESETS: OmxHookPreset[] = [
  {
    id: "workspace-context",
    description: "Loads repo notes and current planning context when a session starts.",
    handlers: [
      {
        event: "SessionStart",
        matcher: "startup|resume",
        script: "session-start.mjs",
        statusMessage: "Loading OMX workspace context",
      },
      {
        event: "UserPromptSubmit",
        script: "user-prompt-submit.mjs",
      },
    ],
  },
  {
    id: "memory",
    description: "Writes prompt and stop summaries into the durable .omx memory files.",
    handlers: [
      {
        event: "UserPromptSubmit",
        script: "user-prompt-submit.mjs",
      },
      {
        event: "Stop",
        script: "stop.mjs",
        timeout: 30,
      },
    ],
  },
  {
    id: "safety",
    description: "Denies obviously destructive Bash commands before they run.",
    handlers: [
      {
        event: "PreToolUse",
        matcher: "Bash",
        script: "pre-tool-use.mjs",
        statusMessage: "Checking OMX Bash safety policy",
      },
    ],
  },
  {
    id: "review",
    description: "Records Bash output review signals and stop-time continuation context.",
    handlers: [
      {
        event: "PostToolUse",
        matcher: "Bash",
        script: "post-tool-use.mjs",
        statusMessage: "Reviewing OMX Bash output",
      },
      {
        event: "Stop",
        script: "stop.mjs",
        timeout: 30,
      },
    ],
  },
  {
    id: "telemetry",
    description: "Writes lightweight local runtime telemetry into .omx logs.",
    handlers: [
      {
        event: "SessionStart",
        matcher: "startup|resume",
        script: "session-start.mjs",
      },
      {
        event: "PostToolUse",
        matcher: "Bash",
        script: "post-tool-use.mjs",
      },
      {
        event: "Stop",
        script: "stop.mjs",
        timeout: 30,
      },
    ],
  },
];

function readInstalledHooksState(root: string): InstalledHooksState {
  return readJson<InstalledHooksState>(hooksStateFile(root), {
    repoPresets: [],
    personalPresets: [],
    updatedAt: now(),
  });
}

function writeInstalledHooksState(root: string, state: InstalledHooksState): InstalledHooksState {
  writeJson(hooksStateFile(root), { ...state, updatedAt: now() });
  return { ...state, updatedAt: now() };
}

function handlerPath(targetCodexDir: string, scriptName: string): string {
  return join(targetCodexDir, "hooks", "omx", scriptName);
}

function hookConfigPath(targetCodexDir: string): string {
  return join(targetCodexDir, "hooks.json");
}

function selectedPresets(ids: HookPresetId[]): OmxHookPreset[] {
  const lookup = new Set(ids);
  return OMX_HOOK_PRESETS.filter((preset) => lookup.has(preset.id));
}

export function buildHooksConfig(targetCodexDir: string, presetIds: HookPresetId[]): Record<string, unknown> {
  const hooks: Record<string, Array<Record<string, unknown>>> = {};

  for (const preset of selectedPresets(presetIds)) {
    for (const handler of preset.handlers) {
      const group = {
        ...(handler.matcher ? { matcher: handler.matcher } : {}),
        hooks: [
          {
            type: "command",
            command: `node "${handlerPath(targetCodexDir, handler.script)}"`,
            ...(handler.statusMessage ? { statusMessage: handler.statusMessage } : {}),
            ...(handler.timeout ? { timeout: handler.timeout } : {}),
          },
        ],
      };
      hooks[handler.event] ??= [];
      const key = JSON.stringify(group);
      if (!hooks[handler.event]!.some((entry) => JSON.stringify(entry) === key)) {
        hooks[handler.event]!.push(group);
      }
    }
  }

  return { hooks };
}

export function installHookPack(
  repoRoot: string,
  targetCodexDir: string,
  presetIds: HookPresetId[],
): { configPath: string; installedHandlers: string[] } {
  const sourceHandlers = join(repoRoot, "hooks", "handlers");
  const targetHandlers = join(targetCodexDir, "hooks", "omx");
  ensureDir(targetHandlers);

  const installedHandlers: string[] = [];
  for (const preset of selectedPresets(presetIds)) {
    for (const handler of preset.handlers) {
      const source = join(sourceHandlers, handler.script);
      const target = handlerPath(targetCodexDir, handler.script);
      if (existsSync(source)) {
        cpSync(source, target, { force: true });
        installedHandlers.push(target);
      }
    }
  }

  const config = buildHooksConfig(targetCodexDir, presetIds);
  const configPath = hookConfigPath(targetCodexDir);
  writeJson(configPath, config);
  return { configPath, installedHandlers: [...new Set(installedHandlers)] };
}

export function installRepoHooks(repoRoot: string, presetIds: HookPresetId[]): { configPath: string } {
  const target = repoCodexDir(repoRoot);
  ensureDir(target);
  const result = installHookPack(repoRoot, target, presetIds);
  const state = readInstalledHooksState(repoRoot);
  writeInstalledHooksState(repoRoot, {
    ...state,
    repoPresets: presetIds,
  });
  return { configPath: result.configPath };
}

export function installPersonalHooks(
  repoRoot: string,
  codexHome: string,
  presetIds: HookPresetId[],
): { configPath: string } {
  const result = installHookPack(repoRoot, codexHome, presetIds);
  const state = readInstalledHooksState(repoRoot);
  writeInstalledHooksState(repoRoot, {
    ...state,
    personalPresets: presetIds,
  });
  return { configPath: result.configPath };
}

export function explainHookPreset(presetId: HookPresetId): OmxHookPreset | null {
  return OMX_HOOK_PRESETS.find((preset) => preset.id === presetId) ?? null;
}

export function hookStatus(repoRoot: string, codexHome: string): HookStatusReport {
  const features = readCodexFeatures();
  return {
    codexHooksEnabled: codexFeatureEnabled(features, "codex_hooks"),
    platformSupported: process.platform !== "win32",
    repoInstalled: existsSync(hookConfigPath(repoCodexDir(repoRoot))),
    personalInstalled: existsSync(hookConfigPath(codexHome)),
    state: readInstalledHooksState(repoRoot),
  };
}

export function updateHookPresetState(
  repoRoot: string,
  scope: HookScope,
  presetId: HookPresetId,
  enabled: boolean,
): InstalledHooksState {
  const current = readInstalledHooksState(repoRoot);
  const key = scope === "repo" ? "repoPresets" : "personalPresets";
  const presets = new Set(current[key]);
  if (enabled) {
    presets.add(presetId);
  } else {
    presets.delete(presetId);
  }
  return writeInstalledHooksState(repoRoot, {
    ...current,
    [key]: [...presets].sort(),
  });
}
