import { ensureOmxLayout, notesFile } from "./contract.js";
import { readJson, writeJson } from "./json.js";

export interface OmxNotes {
  priority: string;
  working: string[];
  manual: string[];
  updatedAt: string;
}

function defaultNotes(): OmxNotes {
  return {
    priority: "",
    working: [],
    manual: [],
    updatedAt: new Date().toISOString(),
  };
}

export function readNotes(root: string): OmxNotes {
  ensureOmxLayout(root);
  return readJson(notesFile(root), defaultNotes());
}

export function writeNotes(root: string, patch: Partial<OmxNotes>): OmxNotes {
  const next = {
    ...readNotes(root),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeJson(notesFile(root), next);
  return next;
}
