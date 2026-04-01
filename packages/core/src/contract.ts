import { existsSync } from "node:fs";
import { join } from "node:path";
import { ensureDir, writeJson } from "./json.js";

export const OMX_LAYOUT_DIRS = [
  "state",
  "sessions",
  "plans",
  "research",
  "team",
  "logs",
  "memory",
] as const;

export type OmxDirName = (typeof OMX_LAYOUT_DIRS)[number];

export function omxDir(root: string): string {
  return join(root, ".omx");
}

export function repoCodexDir(root: string): string {
  return join(root, ".codex");
}

export function omxPath(root: string, ...segments: string[]): string {
  return join(omxDir(root), ...segments);
}

export function stateFile(root: string, mode: string): string {
  return omxPath(root, "state", `${mode}-state.json`);
}

export function tasksFile(root: string): string {
  return omxPath(root, "state", "tasks.json");
}

export function notesFile(root: string): string {
  return omxPath(root, "state", "notepad.json");
}

export function sessionFile(root: string): string {
  return omxPath(root, "sessions", "current.json");
}

export function memoryFile(root: string, namespace = "project"): string {
  return omxPath(root, "memory", `${namespace}.json`);
}

export function teamFile(root: string): string {
  return omxPath(root, "team", "team.json");
}

export function teamLogDir(root: string): string {
  return omxPath(root, "team", "logs");
}

export function teamLogFile(root: string, workerId: string): string {
  return omxPath(root, "team", "logs", `${workerId}.log`);
}

export function reviewsFile(root: string): string {
  return omxPath(root, "state", "reviews.json");
}

export function inboxFile(root: string): string {
  return omxPath(root, "state", "inbox.json");
}

export function ledgerFile(root: string): string {
  return omxPath(root, "logs", "ledger.json");
}

export function hooksStateFile(root: string): string {
  return omxPath(root, "state", "hooks.json");
}

export function pluginsStateFile(root: string): string {
  return omxPath(root, "state", "plugins.json");
}

export function autoresearchLogFile(root: string): string {
  return omxPath(root, "logs", "autoresearch.log");
}

export function hookEventsLogFile(root: string): string {
  return omxPath(root, "logs", "hooks.log");
}

export function hudConfigFile(root: string): string {
  return omxPath(root, "hud-config.json");
}

export function ensureOmxLayout(root: string): string {
  const base = omxDir(root);
  ensureDir(base);
  for (const entry of OMX_LAYOUT_DIRS) {
    ensureDir(omxPath(root, entry));
  }
  ensureDir(teamLogDir(root));

  const hudPath = hudConfigFile(root);
  if (!existsSync(hudPath)) {
    writeJson(hudPath, {
      preset: "focused",
      refreshMs: 1000,
      showInbox: true,
      showReviews: true,
    });
  }

  return base;
}
