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
const command =
  payload?.tool_input?.command ||
  payload?.tool_input?.input ||
  payload?.command ||
  "";

const blocked = /\brm\s+-rf\b|\bgit\s+reset\s+--hard\b|\bgit\s+clean\s+-fd\b|\bDROP\s+TABLE\b|\bmkfs\b/i.test(command);
const root = rootDir();
mkdirSync(join(root, ".omx", "logs"), { recursive: true });
appendFileSync(join(root, ".omx", "logs", "hooks.log"), `${new Date().toISOString()} PreToolUse ${command}\n`, "utf8");

if (blocked) {
  process.stdout.write(JSON.stringify({
    decision: "deny",
    reason: "OMX safety preset blocked an obviously destructive command.",
  }));
} else {
  process.stdout.write(JSON.stringify({ continue: true }));
}
