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

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
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

const root = rootDir();
const payload = readStdin();
const omx = join(root, ".omx");
mkdirSync(join(omx, "logs"), { recursive: true });
appendFileSync(join(omx, "logs", "hooks.log"), `${new Date().toISOString()} Stop ${JSON.stringify(payload)}\n`, "utf8");

const runtimePath = join(omx, "state", "hook-runtime.json");
const runtime = readJson(runtimePath, {});
writeJson(runtimePath, {
  ...runtime,
  lastStopAt: new Date().toISOString(),
});

process.stdout.write(JSON.stringify({
  continue: true,
  additionalContext: "OMX stored stop-time context in .omx/state/hook-runtime.json",
}));
