import { appendFileSync } from "node:fs";
import { bootstrapPlanning, ensureOmxLayout, omxPath, readState, writeState } from "@oh-my-codex/core";
import type { CliContext } from "../context.js";

export function runAutoresearchCommand(
  context: CliContext,
  args: string[],
  write: (line: string) => void,
): number {
  const subcommand = args[0] ?? "status";
  ensureOmxLayout(context.cwd);

  if (subcommand === "init") {
    const mission = args[1] ?? "default-mission";
    bootstrapPlanning(context.cwd, {
      goal: `Autoresearch mission: ${mission}`,
      phase: mission,
      audience: "operators running durable experiments",
    });
    const state = writeState(context.cwd, "autoresearch", {
      active: true,
      mission,
      currentPhase: "initialized",
    });
    appendFileSync(omxPath(context.cwd, "logs", "autoresearch.log"), `${new Date().toISOString()} init ${mission}\n`);
    write(JSON.stringify(state, null, 2));
    return 0;
  }

  if (subcommand === "log") {
    appendFileSync(
      omxPath(context.cwd, "logs", "autoresearch.log"),
      `${new Date().toISOString()} ${args.slice(1).join(" ")}\n`,
    );
    write("logged");
    return 0;
  }

  write(JSON.stringify(readState(context.cwd, "autoresearch"), null, 2));
  return 0;
}
