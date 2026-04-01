import { markSessionCommand } from "@oh-my-codex/core";
import { createCliContext } from "./context.js";
import { runAgentsCommand } from "./commands/agents.js";
import { runAutoresearchCommand } from "./commands/autoresearch.js";
import { runDoctorCommand } from "./commands/doctor.js";
import { runExploreCommand } from "./commands/explore.js";
import { runHooksCommand } from "./commands/hooks.js";
import { runHudCommand } from "./commands/hud.js";
import { runPluginsCommand } from "./commands/plugins.js";
import { runSessionCommand } from "./commands/session.js";
import { runSetup } from "./commands/setup.js";
import { runTeamCommand } from "./commands/team.js";
import { CLI_VERSION, runVersionCommand } from "./commands/version.js";
import { HELP_TEXT } from "./help.js";

export interface CliIo {
  out(line: string): void;
  err(line: string): void;
  clear(): void;
  wait(ms: number): Promise<void>;
}

export const defaultIo: CliIo = {
  out: (line) => console.log(line),
  err: (line) => console.error(line),
  clear: () => process.stdout.write("\x1bc"),
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export async function main(args: string[], io: CliIo = defaultIo): Promise<number> {
  const context = createCliContext(process.env);
  const [command, ...rest] = args;

  if (!command || command === "--help" || command === "-h") {
    io.out(HELP_TEXT);
    return 0;
  }

  if (command === "--version" || command === "-v") {
    io.out(CLI_VERSION);
    return 0;
  }

  const write = (line: string) => io.out(line);
  const fail = (line: string) => io.err(line);

  let code = 0;
  if (command === "setup") {
    code = runSetup(context, rest, write);
  } else if (command === "doctor") {
    code = runDoctorCommand(context, rest.includes("--json"), write);
  } else if (command === "hud") {
    code = await runHudCommand(
      context,
      {
        json: rest.includes("--json"),
        watch: rest.includes("--watch"),
      },
      io,
    );
  } else if (command === "team") {
    code = await runTeamCommand(context, rest, write);
  } else if (command === "explore") {
    code = runExploreCommand(context, rest, write);
  } else if (command === "session") {
    code = runSessionCommand(context, rest, write);
  } else if (command === "autoresearch") {
    code = runAutoresearchCommand(context, rest, write);
  } else if (command === "agents") {
    code = runAgentsCommand(context, rest, write);
  } else if (command === "plugins") {
    code = runPluginsCommand(context, rest, write);
  } else if (command === "hooks") {
    code = runHooksCommand(context, rest, write);
  } else if (command === "version") {
    code = runVersionCommand(write);
  } else {
    fail(`unknown command: ${command}`);
    fail(HELP_TEXT);
    return 1;
  }

  markSessionCommand(context.cwd, `omx:${command}`);
  return code;
}
