import { randomUUID } from "node:crypto";
import { sessionFile } from "./contract.js";
import { appendLedger } from "./runtime.js";
import { readJson, writeJson } from "./json.js";

export interface OmxSession {
  id: string;
  cwd: string;
  branch: string;
  status: "active" | "paused" | "stopped";
  lastCommand: string | null;
  createdAt: string;
  updatedAt: string;
}

function now(): string {
  return new Date().toISOString();
}

export function readSession(root: string): OmxSession | null {
  return readJson<OmxSession | null>(sessionFile(root), null);
}

export function startSession(root: string, branch = "unknown"): OmxSession {
  const next: OmxSession = {
    id: `session_${randomUUID().slice(0, 12)}`,
    cwd: root,
    branch,
    status: "active",
    lastCommand: null,
    createdAt: now(),
    updatedAt: now(),
  };
  writeJson(sessionFile(root), next);
  appendLedger(root, {
    kind: "session",
    action: "session_start",
    detail: `Session started on ${branch}`,
  });
  return next;
}

export function resumeSession(root: string, branch = "unknown"): OmxSession {
  const current = readSession(root);
  if (!current) {
    return startSession(root, branch);
  }
  const next = {
    ...current,
    branch,
    status: "active" as const,
    updatedAt: now(),
  };
  writeJson(sessionFile(root), next);
  appendLedger(root, {
    kind: "session",
    action: "session_resume",
    detail: `Session resumed on ${branch}`,
  });
  return next;
}

export function markSessionCommand(root: string, command: string): OmxSession | null {
  const current = readSession(root);
  if (!current) {
    return null;
  }
  const next = {
    ...current,
    lastCommand: command,
    updatedAt: now(),
  };
  writeJson(sessionFile(root), next);
  appendLedger(root, {
    kind: "session",
    action: "session_mark_command",
    detail: command,
  });
  return next;
}
