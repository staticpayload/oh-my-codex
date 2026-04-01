import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { omxPath } from "./contract.js";
import { readMemory } from "./memory.js";
import { readNotes } from "./notes.js";
import { listInbox, listReviews } from "./runtime.js";
import { readSession } from "./session.js";
import { listStates } from "./state.js";
import { listTasks } from "./tasks.js";
import { readTeam } from "./team.js";

export interface OmxHudContext {
  branch: string;
  session: ReturnType<typeof readSession>;
  notes: ReturnType<typeof readNotes>;
  memory: ReturnType<typeof readMemory>;
  states: ReturnType<typeof listStates>;
  tasks: ReturnType<typeof listTasks>;
  team: ReturnType<typeof readTeam>;
  reviews: ReturnType<typeof listReviews>;
  inbox: ReturnType<typeof listInbox>;
  logs: {
    autoresearchTail: string[];
  };
}

function gitBranch(root: string): string {
  try {
    return execFileSync("git", ["branch", "--show-current"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() || "detached";
  } catch {
    return "unknown";
  }
}

function readLogTail(path: string, maxLines = 4): string[] {
  try {
    return readFileSync(path, "utf8")
      .trim()
      .split("\n")
      .slice(-maxLines);
  } catch {
    return [];
  }
}

export function gatherHudContext(root: string): OmxHudContext {
  return {
    branch: gitBranch(root),
    session: readSession(root),
    notes: readNotes(root),
    memory: readMemory(root),
    states: listStates(root),
    tasks: listTasks(root),
    team: readTeam(root),
    reviews: listReviews(root),
    inbox: listInbox(root),
    logs: {
      autoresearchTail: readLogTail(join(omxPath(root, "logs"), "autoresearch.log")),
    },
  };
}

export function renderHud(context: OmxHudContext): string {
  const pending = context.tasks.filter((task) => task.status === "pending" || task.status === "queued").length;
  const inProgress = context.tasks.filter((task) => task.status === "in_progress").length;
  const review = context.tasks.filter((task) => task.status === "review").length;
  const activeStates = context.states.filter((entry) => entry.state.active !== false).map((entry) => entry.mode);
  const workers = context.team?.workers.length ?? 0;
  const busyWorkers = context.team?.workers.filter((worker) => worker.status === "busy").length ?? 0;
  const staleWorkers = context.team?.workers.filter((worker) => worker.status === "stale").length ?? 0;
  const openInbox = context.inbox.filter((item) => item.status === "open").length;
  const pendingReviews = context.reviews.filter((item) => item.status === "pending").length;

  return [
    "OMX HUD",
    "=======",
    `Branch: ${context.branch}`,
    `Session: ${context.session?.id ?? "none"} (${context.session?.status ?? "inactive"})`,
    `Tasks: ${pending} queued, ${inProgress} active, ${review} in review`,
    `Modes: ${activeStates.length ? activeStates.join(", ") : "none"}`,
    `Team: ${context.team?.name ?? "none"} (${busyWorkers}/${workers} busy, ${staleWorkers} stale, backend ${context.team?.backend.kind ?? "none"})`,
    `Inbox: ${openInbox} open, Reviews: ${pendingReviews} pending`,
    `Priority note: ${context.notes.priority || "none"}`,
    `Memory: ${context.memory.summary || "empty"}`,
    context.logs.autoresearchTail.length
      ? `Autoresearch: ${context.logs.autoresearchTail.join(" | ")}`
      : "Autoresearch: idle",
  ].join("\n");
}
