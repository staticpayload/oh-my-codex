import { runDoctor } from "@oh-my-codex/core";
import type { CliContext } from "../context.js";

export function runDoctorCommand(
  context: CliContext,
  asJson: boolean,
  write: (line: string) => void,
): number {
  const report = runDoctor(context.cwd, context.codexHome);

  if (asJson) {
    write(JSON.stringify(report, null, 2));
    return report.summary.failed ? 1 : 0;
  }

  write("OMX Doctor");
  write("==========");
  for (const check of report.checks) {
    write(`[${check.level.toUpperCase()}] ${check.name}: ${check.detail}`);
  }
  write(
    `Results: ${report.summary.passed} passed, ${report.summary.warnings} warnings, ${report.summary.failed} failed`,
  );
  return report.summary.failed ? 1 : 0;
}
