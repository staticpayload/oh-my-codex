import {
  getAgentDefinition,
  installAgentCatalog,
  listAgents,
  validateAgentCatalog,
} from "@oh-my-codex/core";
import type { CliContext } from "../context.js";

export function runAgentsCommand(
  context: CliContext,
  args: string[],
  write: (line: string) => void,
): number {
  const subcommand = args[0] ?? "list";

  if (subcommand === "list") {
    write(JSON.stringify(listAgents(), null, 2));
    return 0;
  }

  if (subcommand === "show") {
    const agent = getAgentDefinition(args[1] ?? "");
    write(JSON.stringify(agent ?? null, null, 2));
    return agent ? 0 : 1;
  }

  if (subcommand === "install") {
    write(JSON.stringify(installAgentCatalog(context.repoRoot, context.codexHome), null, 2));
    return 0;
  }

  if (subcommand === "validate") {
    const report = validateAgentCatalog(context.repoRoot);
    write(JSON.stringify(report, null, 2));
    return report.ok ? 0 : 1;
  }

  write(`unknown agents subcommand: ${subcommand}`);
  return 1;
}
