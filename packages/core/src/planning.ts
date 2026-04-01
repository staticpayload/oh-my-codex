import { existsSync, writeFileSync } from "node:fs";
import { omxPath, ensureOmxLayout } from "./contract.js";
import { appendLedger } from "./runtime.js";
import { writeMemory } from "./memory.js";
import { writeState } from "./state.js";

function writeMarkdown(path: string, body: string): void {
  writeFileSync(path, body, "utf8");
}

export interface BootstrapPlanningInput {
  goal: string;
  phase?: string;
  audience?: string;
}

export function bootstrapPlanning(root: string, input: BootstrapPlanningInput): string[] {
  ensureOmxLayout(root);
  const phase = input.phase ?? "phase-1";
  const created: string[] = [];

  const files: Array<[string, string]> = [
    [
      omxPath(root, "plans", `${phase}.md`),
      `# ${phase}\n\n## Goal\n${input.goal}\n\n## Requirements\n- [ ] Clarify scope\n- [ ] Name acceptance checks\n- [ ] Capture risk and rollback\n\n## Execution Slices\n- [ ] Slice 1\n- [ ] Slice 2\n`,
    ],
    [
      omxPath(root, "plans", "brownfield-map.md"),
      "# Brownfield Map\n\n- Stack:\n- Entry points:\n- Existing plugin/hook surfaces:\n- Risky subsystems:\n- Verification gaps:\n",
    ],
    [
      omxPath(root, "research", "summary.md"),
      `# Research Summary\n\nGoal: ${input.goal}\n\n- Current best-practice patterns\n- Existing repo constraints\n- Integration risks\n- Verification strategy\n`,
    ],
    [
      omxPath(root, "plans", `${phase}-verification.md`),
      "# Verification Map\n\n- Unit:\n- Integration:\n- End-to-end:\n- Manual checks:\n- Hook/plugin validation:\n",
    ],
    [
      omxPath(root, "plans", `${phase}-requirements.md`),
      "# Requirements\n\n- User outcome:\n- Constraints:\n- Non-goals:\n- Open questions:\n",
    ],
    [
      omxPath(root, "plans", `${phase}-review-notes.md`),
      "# Review Notes\n\n- Findings:\n- Risk:\n- Docs drift:\n- Follow-up work:\n",
    ],
    [
      omxPath(root, "logs", "execution-ledger.md"),
      "# Execution Ledger\n\n| Timestamp | Task | Result |\n| --- | --- | --- |\n",
    ],
  ];

  for (const [path, body] of files) {
    if (!existsSync(path)) {
      writeMarkdown(path, body);
      created.push(path);
    }
  }

  writeMemory(root, "project", {
    summary: input.goal,
    facts: [
      `Audience: ${input.audience ?? "builders using Codex"}`,
      `Active phase: ${phase}`,
      "Planning artifacts are durable under .omx/",
    ],
  });

  writeState(root, "planning", {
    active: true,
    phase,
    goal: input.goal,
    artifacts: created,
  });
  appendLedger(root, {
    kind: "task",
    action: "planning_bootstrap",
    detail: `Bootstrapped planning artifacts for ${phase}`,
    metadata: { artifacts: created },
  });

  return created;
}
