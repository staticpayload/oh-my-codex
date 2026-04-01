#!/usr/bin/env node
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
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

const payload = readStdin();
const root = rootDir();
mkdirSync(join(root, ".omx", "logs"), { recursive: true });
const status = payload?.tool_output?.exit_code ?? payload?.exit_code ?? "unknown";
appendFileSync(
  join(root, ".omx", "logs", "hooks.log"),
  `${new Date().toISOString()} PostToolUse status=${status} ${JSON.stringify(payload)}\n`,
  "utf8",
);

process.stdout.write(JSON.stringify({
  continue: true,
  additionalContext: status === 0 ? "" : "OMX noticed a failing Bash command. Check the team inbox or diagnostics.",
}));
