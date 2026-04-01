import { readdirSync } from "node:fs";
import { ensureOmxLayout, memoryFile, omxPath } from "./contract.js";
import { readJson, writeJson } from "./json.js";

export interface OmxMemoryDoc {
  namespace: string;
  summary: string;
  facts: string[];
  updatedAt: string;
}

function defaultMemory(namespace: string): OmxMemoryDoc {
  return {
    namespace,
    summary: "",
    facts: [],
    updatedAt: new Date().toISOString(),
  };
}

export function readMemory(root: string, namespace = "project"): OmxMemoryDoc {
  ensureOmxLayout(root);
  return readJson(memoryFile(root, namespace), defaultMemory(namespace));
}

export function writeMemory(
  root: string,
  namespace: string,
  patch: Partial<OmxMemoryDoc>,
): OmxMemoryDoc {
  const next = {
    ...readMemory(root, namespace),
    ...patch,
    namespace,
    updatedAt: new Date().toISOString(),
  };
  writeJson(memoryFile(root, namespace), next);
  return next;
}

export function listMemory(root: string): OmxMemoryDoc[] {
  ensureOmxLayout(root);
  return readdirSync(omxPath(root, "memory"))
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => {
      const namespace = entry.replace(/\.json$/, "");
      return readJson(memoryFile(root, namespace), defaultMemory(namespace));
    });
}
