import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface OmxAgentDefinition {
  id: string;
  role: string;
  defaultSkill: string;
  description: string;
  promptTemplate: string;
  allowedTools: string[];
  escalationRules: string[];
  verifyContract: string[];
  runtimeMode: "solo" | "team" | "review";
}

export interface AgentValidationReport {
  ok: boolean;
  missingTemplates: string[];
  invalidSkills: string[];
}

export const OMX_SKILL_CATALOG = [
  "ultrawork",
  "deep-interview",
  "plan",
  "research",
  "team",
  "review",
  "tdd",
  "doctor",
  "hud",
  "trace",
  "autoresearch",
  "architect",
  "executor",
  "reviewer",
] as const;

export const OMX_AGENT_CATALOG: OmxAgentDefinition[] = [
  {
    id: "architect",
    role: "Architecture and tradeoff analysis",
    defaultSkill: "$architect",
    description: "Maps boundaries, interfaces, risks, and sequencing before implementation begins.",
    promptTemplate: "architect.md",
    allowedTools: ["omx_state_*", "omx_explore_*", "omx_note_*", "omx_memory_*"],
    escalationRules: ["Escalate when scope crosses multiple systems or durable data migrations."],
    verifyContract: ["Produces plan slices", "Names verification commands", "Calls out blast radius"],
    runtimeMode: "solo",
  },
  {
    id: "planner",
    role: "Execution planning",
    defaultSkill: "$plan",
    description: "Turns intent into durable execution slices with verify steps and handoff notes.",
    promptTemplate: "planner.md",
    allowedTools: ["omx_task_*", "omx_state_*", "omx_note_*", "omx_memory_*"],
    escalationRules: ["Escalate to team mode when work cannot fit in one context window."],
    verifyContract: ["Creates phase plans", "Creates verification map", "Queues concrete tasks"],
    runtimeMode: "solo",
  },
  {
    id: "researcher",
    role: "Product and code research",
    defaultSkill: "$research",
    description: "Gathers repo facts, current patterns, and integration risks into durable artifacts.",
    promptTemplate: "researcher.md",
    allowedTools: ["omx_explore_*", "omx_note_*", "omx_memory_*", "omx_state_*"],
    escalationRules: ["Escalate when external validation or risky migration patterns appear."],
    verifyContract: ["Writes brownfield map", "Writes research summary", "Captures open questions"],
    runtimeMode: "solo",
  },
  {
    id: "executor",
    role: "Focused implementation",
    defaultSkill: "$executor",
    description: "Takes a scoped plan slice, builds it, and records verification evidence.",
    promptTemplate: "executor.md",
    allowedTools: ["omx_task_*", "omx_state_*", "omx_note_*", "omx_explore_*", "omx_team_*"],
    escalationRules: ["Escalate when the task is blocked, underspecified, or requires review."],
    verifyContract: ["Owns one slice", "Records commands run", "Hands off to review"],
    runtimeMode: "team",
  },
  {
    id: "reviewer",
    role: "Verification and regression review",
    defaultSkill: "$reviewer",
    description: "Audits changed code, coverage, docs drift, and remaining risk before landing.",
    promptTemplate: "reviewer.md",
    allowedTools: ["omx_task_*", "omx_state_*", "omx_explore_*", "omx_team_*"],
    escalationRules: ["Escalate when findings are ambiguous or high-risk."],
    verifyContract: ["Lists findings first", "Names missing tests", "States residual risk"],
    runtimeMode: "review",
  },
  {
    id: "operator",
    role: "Durable runtime operator",
    defaultSkill: "$team",
    description: "Runs tmux-backed workers, leases, inbox routing, and review flow for larger work.",
    promptTemplate: "operator.md",
    allowedTools: ["omx_team_*", "omx_task_*", "omx_state_*", "omx_note_*"],
    escalationRules: ["Escalate when tmux or worker health is degraded."],
    verifyContract: ["Keeps queue moving", "Keeps workers healthy", "Keeps inbox actionable"],
    runtimeMode: "team",
  },
];

export function listAgents(): OmxAgentDefinition[] {
  return OMX_AGENT_CATALOG;
}

export function getAgentDefinition(agentId: string): OmxAgentDefinition | null {
  return OMX_AGENT_CATALOG.find((agent) => agent.id === agentId) ?? null;
}

export function agentTemplatePath(repoRoot: string, agentId: string): string {
  return join(repoRoot, "templates", "agents", `${agentId}.md`);
}

export function validateAgentCatalog(repoRoot: string): AgentValidationReport {
  const missingTemplates = OMX_AGENT_CATALOG.map((agent) => agent.id).filter(
    (agentId) => !existsSync(agentTemplatePath(repoRoot, agentId)),
  );

  const invalidSkills = OMX_AGENT_CATALOG.filter(
    (agent) => !OMX_SKILL_CATALOG.includes(agent.defaultSkill.replace(/^\$/, "") as (typeof OMX_SKILL_CATALOG)[number]),
  ).map((agent) => agent.defaultSkill);

  return {
    ok: missingTemplates.length === 0 && invalidSkills.length === 0,
    missingTemplates,
    invalidSkills,
  };
}

export function installAgentCatalog(repoRoot: string, codexHome: string): { targetDir: string; installed: string[] } {
  const targetDir = join(codexHome, "agents", "omx");
  mkdirSync(targetDir, { recursive: true });

  const installed: string[] = [];
  for (const agent of OMX_AGENT_CATALOG) {
    const source = agentTemplatePath(repoRoot, agent.id);
    if (!existsSync(source)) {
      continue;
    }
    cpSync(source, join(targetDir, `${agent.id}.md`), { force: true });
    installed.push(agent.id);
  }

  writeFileSync(join(targetDir, "catalog.json"), JSON.stringify(OMX_AGENT_CATALOG, null, 2), "utf8");
  return { targetDir, installed };
}
