import { markSessionCommand, readSession, resumeSession, startSession } from "@oh-my-codex/core";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { sessionFile } from "@oh-my-codex/core";
import type { CliContext } from "../context.js";

function branch(context: CliContext): string {
  try {
    return execFileSync("git", ["branch", "--show-current"], {
      cwd: context.cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() || "unknown";
  } catch {
    return "unknown";
  }
}

export function runSessionCommand(
  context: CliContext,
  args: string[],
  write: (line: string) => void,
): number {
  const subcommand = args[0] ?? "status";

  if (subcommand === "status") {
    const session = readSession(context.cwd);
    write(JSON.stringify(session, null, 2));
    return session ? 0 : 1;
  }

  if (subcommand === "start") {
    const session = startSession(context.cwd, branch(context));
    markSessionCommand(context.cwd, "session:start");
    write(JSON.stringify(session, null, 2));
    return 0;
  }

  if (subcommand === "resume") {
    const session = resumeSession(context.cwd, branch(context));
    markSessionCommand(context.cwd, "session:resume");
    write(JSON.stringify(session, null, 2));
    return 0;
  }

  if (subcommand === "stop") {
    const current = readSession(context.cwd);
    if (!current) {
      write("null");
      return 1;
    }
    const next = {
      ...current,
      status: "stopped" as const,
      updatedAt: new Date().toISOString(),
    };
    writeFileSync(sessionFile(context.cwd), JSON.stringify(next, null, 2), "utf8");
    write(JSON.stringify(next, null, 2));
    return 0;
  }

  write(`unknown session subcommand: ${subcommand}`);
  return 1;
}
