import { appendFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { basename } from "node:path";
import { teamFile, teamLogFile } from "./contract.js";
import { readJson, writeJson } from "./json.js";
import { appendLedger, createReview, listInbox, listReviews, pushInboxItem, updateReview } from "./runtime.js";
import { createTask, getTask, updateTask } from "./tasks.js";

export interface OmxTeamWorker {
  id: string;
  agentId: string;
  role: string;
  status: "idle" | "busy" | "offline" | "stale";
  assignedTaskIds: string[];
  leaseExpiresAt: string | null;
  lastHeartbeatAt: string | null;
  runtime: {
    backend: "tmux" | "mock";
    sessionName: string | null;
    windowName: string | null;
    command: string | null;
    logFile: string;
  };
}

export interface OmxTeamMessage {
  id: string;
  subject: string;
  body: string;
  kind: "inbox" | "review" | "system";
  from?: string;
  to?: string;
  createdAt: string;
}

export interface OmxTeamState {
  id: string;
  name: string;
  active: boolean;
  baseBranch: string;
  backend: {
    kind: "tmux" | "mock";
    available: boolean;
    sessionName: string | null;
    degradedReason?: string;
  };
  workers: OmxTeamWorker[];
  taskQueue: string[];
  messages: OmxTeamMessage[];
  createdAt: string;
  updatedAt: string;
}

function now(): string {
  return new Date().toISOString();
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function tmuxAvailable(): boolean {
  try {
    execFileSync("sh", ["-lc", "command -v tmux"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function ensureTmuxSession(sessionName: string): void {
  try {
    execFileSync("tmux", ["has-session", "-t", sessionName], { stdio: "ignore" });
  } catch {
    execFileSync("tmux", ["new-session", "-d", "-s", sessionName, "-n", "operator"], { stdio: "ignore" });
  }
}

function createTmuxWindow(sessionName: string, windowName: string, command: string): void {
  try {
    execFileSync("tmux", ["new-window", "-t", sessionName, "-n", windowName, command], {
      stdio: "ignore",
    });
  } catch {
    // fall through to degraded mode
  }
}

function load(root: string): OmxTeamState | null {
  return readJson<OmxTeamState | null>(teamFile(root), null);
}

function save(root: string, state: OmxTeamState): OmxTeamState {
  const next = {
    ...state,
    updatedAt: now(),
  };
  writeJson(teamFile(root), next);
  return next;
}

function defaultWorker(root: string, input: { id: string; role: string; agentId?: string }, backend: "tmux" | "mock", sessionName: string | null): OmxTeamWorker {
  return {
    id: input.id,
    role: input.role,
    agentId: input.agentId ?? input.id,
    status: "idle",
    assignedTaskIds: [],
    leaseExpiresAt: null,
    lastHeartbeatAt: null,
    runtime: {
      backend,
      sessionName,
      windowName: null,
      command: null,
      logFile: teamLogFile(root, input.id),
    },
  };
}

function reconcileWorker(worker: OmxTeamWorker): OmxTeamWorker {
  if (worker.leaseExpiresAt && Date.parse(worker.leaseExpiresAt) < Date.now() && worker.status === "busy") {
    return {
      ...worker,
      status: "stale",
    };
  }
  return worker;
}

export function createTeam(
  root: string,
  name: string,
  workers: Array<{ id: string; role: string; agentId?: string }>,
  baseBranch = "main",
): OmxTeamState {
  const tmuxReady = tmuxAvailable();
  const sessionName = `omx-${slug(basename(root))}-${slug(name)}`;
  if (tmuxReady) {
    ensureTmuxSession(sessionName);
  }

  const team = save(root, {
    id: `team_${randomUUID().slice(0, 10)}`,
    name,
    active: true,
    baseBranch,
    backend: {
      kind: tmuxReady ? "tmux" : "mock",
      available: tmuxReady,
      sessionName: tmuxReady ? sessionName : null,
      ...(tmuxReady ? {} : { degradedReason: "tmux not installed, using mock runtime" }),
    },
    workers: workers.map((worker) => defaultWorker(root, worker, tmuxReady ? "tmux" : "mock", tmuxReady ? sessionName : null)),
    taskQueue: [],
    messages: [],
    createdAt: now(),
    updatedAt: now(),
  });

  appendLedger(root, {
    kind: "worker",
    action: "team_init",
    detail: `Created team ${name} with ${workers.length} workers`,
  });
  pushInboxItem(root, {
    kind: "system",
    subject: "Team initialized",
    body: tmuxReady ? `tmux session ${sessionName} ready` : "tmux missing, running in degraded mock mode",
  });
  return team;
}

export function readTeam(root: string): OmxTeamState | null {
  const team = load(root);
  if (!team) {
    return null;
  }
  return {
    ...team,
    workers: team.workers.map(reconcileWorker),
  };
}

export function resumeTeam(root: string): OmxTeamState | null {
  const team = load(root);
  if (!team) {
    return null;
  }
  if (team.backend.available && team.backend.sessionName) {
    ensureTmuxSession(team.backend.sessionName);
  }
  appendLedger(root, {
    kind: "worker",
    action: "team_resume",
    detail: `Resumed team ${team.name}`,
  });
  return save(root, { ...team, active: true });
}

export function shutdownTeam(root: string): OmxTeamState | null {
  const team = load(root);
  if (!team) {
    return null;
  }
  if (team.backend.available && team.backend.sessionName) {
    try {
      execFileSync("tmux", ["kill-session", "-t", team.backend.sessionName], { stdio: "ignore" });
    } catch {
      // keep shutdown best-effort
    }
  }
  appendLedger(root, {
    kind: "worker",
    action: "team_shutdown",
    detail: `Shut down team ${team.name}`,
  });
  return save(root, { ...team, active: false });
}

export function spawnTeamWorker(root: string, workerId: string, command?: string): OmxTeamState | null {
  const team = load(root);
  if (!team) {
    return null;
  }
  const worker = team.workers.find((entry) => entry.id === workerId);
  if (!worker) {
    return null;
  }
  const workerCommand = command ?? `printf 'OMX worker ${workerId} ready\n'; while true; do sleep 3600; done`;
  if (team.backend.available && team.backend.sessionName) {
    createTmuxWindow(team.backend.sessionName, workerId, workerCommand);
    worker.runtime.windowName = workerId;
  }
  worker.runtime.command = workerCommand;
  worker.lastHeartbeatAt = now();
  appendWorkerLog(root, workerId, `spawn ${workerCommand}`);
  appendLedger(root, {
    kind: "worker",
    action: "worker_spawn",
    detail: `Spawned worker ${workerId}`,
    workerId,
  });
  return save(root, team);
}

export function enqueueTeamTask(root: string, taskId: string): OmxTeamState | null {
  const team = load(root);
  if (!team || team.taskQueue.includes(taskId)) {
    return team;
  }
  team.taskQueue.push(taskId);
  updateTask(root, taskId, { status: "queued" });
  appendLedger(root, {
    kind: "task",
    action: "task_enqueued",
    detail: `Queued ${taskId}`,
    taskId,
  });
  return save(root, team);
}

export function claimTeamTask(root: string, taskId: string, workerId: string): OmxTeamState | null {
  const team = load(root);
  if (!team) {
    return null;
  }
  const worker = team.workers.find((entry) => entry.id === workerId);
  if (!worker || !team.taskQueue.includes(taskId)) {
    return null;
  }
  worker.status = "busy";
  if (!worker.assignedTaskIds.includes(taskId)) {
    worker.assignedTaskIds.push(taskId);
  }
  worker.lastHeartbeatAt = now();
  worker.leaseExpiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  team.taskQueue = team.taskQueue.filter((entry) => entry !== taskId);
  updateTask(
    root,
    taskId,
    {
      owner: workerId,
      status: "in_progress",
      claimedAt: now(),
      reviewStatus: "none",
    },
    workerId,
  );
  appendWorkerLog(root, workerId, `claim ${taskId}`);
  appendLedger(root, {
    kind: "task",
    action: "task_claim",
    detail: `Worker ${workerId} claimed ${taskId}`,
    workerId,
    taskId,
  });
  return save(root, team);
}

export function heartbeatTeamWorker(root: string, workerId: string, note?: string): OmxTeamState | null {
  const team = load(root);
  if (!team) {
    return null;
  }
  const worker = team.workers.find((entry) => entry.id === workerId);
  if (!worker) {
    return null;
  }
  worker.lastHeartbeatAt = now();
  if (worker.status === "stale") {
    worker.status = worker.assignedTaskIds.length ? "busy" : "idle";
  }
  appendWorkerLog(root, workerId, `heartbeat${note ? ` ${note}` : ""}`);
  return save(root, team);
}

export function pushTeamMessage(
  root: string,
  input: Omit<OmxTeamMessage, "id" | "createdAt">,
): OmxTeamState | null {
  const team = load(root);
  if (!team) {
    return null;
  }
  const message: OmxTeamMessage = {
    id: `msg_${randomUUID().slice(0, 10)}`,
    createdAt: now(),
    ...input,
  };
  team.messages.push(message);
  pushInboxItem(root, {
    kind: input.kind === "review" ? "review" : "inbox",
    subject: input.subject,
    body: input.body,
    from: input.from,
    to: input.to,
  });
  appendLedger(root, {
    kind: "worker",
    action: "team_message",
    detail: `${input.subject}: ${input.body}`,
  });
  return save(root, team);
}

export function completeTeamTask(
  root: string,
  taskId: string,
  workerId: string,
  result: string,
): OmxTeamState | null {
  const team = load(root);
  if (!team) {
    return null;
  }
  const worker = team.workers.find((entry) => entry.id === workerId);
  if (!worker || !worker.assignedTaskIds.includes(taskId)) {
    return null;
  }
  worker.status = "idle";
  worker.assignedTaskIds = worker.assignedTaskIds.filter((entry) => entry !== taskId);
  worker.lastHeartbeatAt = now();
  worker.leaseExpiresAt = null;
  appendWorkerLog(root, workerId, `complete ${taskId}: ${result}`);

  updateTask(
    root,
    taskId,
    {
      status: "review",
      result,
      reviewStatus: "pending",
      notes: [...(getTask(root, taskId)?.notes ?? []), result],
    },
    workerId,
  );
  createReview(root, {
    taskId,
    reviewer: "reviewer",
    summary: result,
  });
  pushInboxItem(root, {
    kind: "review",
    subject: `Review requested for ${taskId}`,
    body: result,
    taskId,
    from: workerId,
    to: "reviewer",
  });
  appendLedger(root, {
    kind: "task",
    action: "task_complete",
    detail: `Worker ${workerId} completed ${taskId}`,
    workerId,
    taskId,
  });
  return save(root, team);
}

export function recordTeamReview(
  root: string,
  input: {
    taskId: string;
    reviewer: string;
    status: "approved" | "changes_requested" | "pending";
    notes: string;
  },
): OmxTeamState | null {
  const team = load(root);
  if (!team) {
    return null;
  }

  const existing = listReviews(root).find((review) => review.taskId === input.taskId && review.status === "pending");
  if (existing) {
    updateReview(root, existing.id, {
      reviewer: input.reviewer,
      status: input.status,
      summary: input.notes,
      notes: [...existing.notes, input.notes],
    });
  } else {
    createReview(root, {
      taskId: input.taskId,
      reviewer: input.reviewer,
      status: input.status,
      summary: input.notes,
      notes: [input.notes],
    });
  }

  if (input.status === "approved") {
    updateTask(root, input.taskId, {
      status: "completed",
      reviewStatus: "approved",
      completedAt: now(),
    }, input.reviewer);
  } else if (input.status === "changes_requested") {
    updateTask(root, input.taskId, {
      status: "blocked",
      reviewStatus: "changes_requested",
      blockers: [...(getTask(root, input.taskId)?.blockers ?? []), input.notes],
    }, input.reviewer);
  } else {
    updateTask(root, input.taskId, {
      status: "review",
      reviewStatus: "pending",
    }, input.reviewer);
  }

  team.messages.push({
    id: `msg_${randomUUID().slice(0, 10)}`,
    subject: `Review ${input.status}`,
    body: input.notes,
    kind: "review",
    from: input.reviewer,
    createdAt: now(),
  });
  appendLedger(root, {
    kind: "review",
    action: `review_${input.status}`,
    detail: `${input.reviewer} marked ${input.taskId} as ${input.status}`,
    actor: input.reviewer,
    taskId: input.taskId,
  });
  return save(root, team);
}

export function readTeamLogs(root: string, workerId: string, limit = 50): string[] {
  try {
    return execFileSync("sh", ["-lc", `tail -n ${limit} "${teamLogFile(root, workerId)}"`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function appendWorkerLog(root: string, workerId: string, line: string): void {
  appendFileSync(teamLogFile(root, workerId), `${now()} ${line}\n`, "utf8");
}

export function readTeamInbox(root: string) {
  return listInbox(root);
}

export async function awaitTeamState(
  root: string,
  options: {
    taskId?: string;
    timeoutMs?: number;
    pollMs?: number;
  } = {},
): Promise<OmxTeamState | null> {
  const timeoutMs = options.timeoutMs ?? 5_000;
  const pollMs = options.pollMs ?? 250;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const team = readTeam(root);
    if (!team) {
      return null;
    }
    if (!options.taskId) {
      return team;
    }
    const task = getTask(root, options.taskId);
    if (task && ["review", "completed", "blocked", "failed"].includes(task.status)) {
      return team;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return readTeam(root);
}

export function queueTeamTask(root: string, title: string, owner = "operator") {
  const task = createTask(root, {
    title,
    kind: "team",
    priority: "high",
  });
  enqueueTeamTask(root, task.id);
  pushInboxItem(root, {
    kind: "inbox",
    subject: "Task queued",
    body: `${title} queued by ${owner}`,
    taskId: task.id,
    from: owner,
  });
  return task;
}
