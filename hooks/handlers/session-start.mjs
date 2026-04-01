#!/usr/bin/env node
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";

function rootDir() {
  try {
    return execSync("git rev-parse --show-toplevel", { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return process.cwd();
  }
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2), "utf8");
}

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

const root = rootDir();
const payload = readStdin();
const omx = join(root, ".omx");
mkdirSync(join(omx, "logs"), { recursive: true });
mkdirSync(join(omx, "state"), { recursive: true });
const notes = readJson(join(omx, "state", "notepad.json"), {});
const memory = readJson(join(omx, "memory", "project.json"), {});

appendFileSync(join(omx, "logs", "hooks.log"), `${new Date().toISOString()} SessionStart ${JSON.stringify(payload)}\n`, "utf8");
writeJson(join(omx, "state", "hook-runtime.json"), {
  lastSessionStartAt: new Date().toISOString(),
  cwd: root,
  trigger: payload.session_type ?? "unknown",
});

const bits = [
  notes.priority ? `Priority: ${notes.priority}` : null,
  memory.summary ? `Project memory: ${memory.summary}` : null,
].filter(Boolean);

process.stdout.write(JSON.stringify({
  continue: true,
  additionalContext: bits.join(" | "),
}));
