import { existsSync, readdirSync, rmSync } from "node:fs";
import { ensureOmxLayout, omxPath, stateFile } from "./contract.js";
import { readJson, writeJson } from "./json.js";

export type OmxModeState = Record<string, unknown> & {
  active?: boolean;
  updatedAt?: string;
};

function now(): string {
  return new Date().toISOString();
}

export function readState(root: string, mode: string): OmxModeState | null {
  ensureOmxLayout(root);
  const path = stateFile(root, mode);
  if (!existsSync(path)) {
    return null;
  }
  return readJson<OmxModeState | null>(path, null);
}

export function writeState(
  root: string,
  mode: string,
  data: Record<string, unknown>,
  replace = false,
): OmxModeState {
  ensureOmxLayout(root);
  const current = replace ? {} : readState(root, mode) ?? {};
  const next = {
    ...current,
    ...data,
    updatedAt: now(),
  } satisfies OmxModeState;
  writeJson(stateFile(root, mode), next);
  return next;
}

export function clearState(root: string, mode: string): boolean {
  const path = stateFile(root, mode);
  if (!existsSync(path)) {
    return false;
  }
  rmSync(path);
  return true;
}

export function listStates(root: string): Array<{ mode: string; state: OmxModeState }> {
  ensureOmxLayout(root);
  const dir = omxPath(root, "state");
  return readdirSync(dir)
    .filter((entry) => entry.endsWith("-state.json"))
    .map((entry) => ({
      mode: entry.replace(/-state\.json$/, ""),
      state: readJson<OmxModeState>(omxPath(root, "state", entry), {}),
    }));
}
