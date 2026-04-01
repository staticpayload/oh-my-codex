import { randomUUID } from "node:crypto";
import { ensureOmxLayout, tasksFile } from "./contract.js";
import { readJson, writeJson } from "./json.js";

export type OmxTaskStatus =
  | "pending"
  | "queued"
  | "in_progress"
  | "blocked"
  | "review"
  | "completed"
  | "cancelled"
  | "failed";

export interface OmxTaskEvent {
  status: OmxTaskStatus;
  at: string;
  by?: string;
  note?: string;
}

export interface OmxTask {
  id: string;
  title: string;
  kind: string;
  phase: string;
  status: OmxTaskStatus;
  priority: "low" | "medium" | "high";
  owner?: string;
  verify: string[];
  notes: string[];
  metadata: Record<string, unknown>;
  dependencies: string[];
  blockers: string[];
  reviewStatus: "none" | "pending" | "approved" | "changes_requested";
  claimedAt?: string;
  completedAt?: string;
  result?: string;
  history: OmxTaskEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  kind?: string;
  phase?: string;
  priority?: OmxTask["priority"];
  verify?: string[];
  notes?: string[];
  metadata?: Record<string, unknown>;
  dependencies?: string[];
}

function now(): string {
  return new Date().toISOString();
}

function load(root: string): OmxTask[] {
  ensureOmxLayout(root);
  return readJson<OmxTask[]>(tasksFile(root), []);
}

function save(root: string, tasks: OmxTask[]): void {
  writeJson(tasksFile(root), tasks);
}

export function createTask(root: string, input: CreateTaskInput): OmxTask {
  const createdAt = now();
  const task: OmxTask = {
    id: `task_${randomUUID().slice(0, 12)}`,
    title: input.title,
    kind: input.kind ?? "general",
    phase: input.phase ?? "default",
    status: "pending",
    priority: input.priority ?? "medium",
    verify: input.verify ?? [],
    notes: input.notes ?? [],
    metadata: input.metadata ?? {},
    dependencies: input.dependencies ?? [],
    blockers: [],
    reviewStatus: "none",
    history: [
      {
        status: "pending",
        at: createdAt,
        note: "task created",
      },
    ],
    createdAt,
    updatedAt: createdAt,
  };

  const tasks = load(root);
  tasks.push(task);
  save(root, tasks);
  return task;
}

export function getTask(root: string, taskId: string): OmxTask | null {
  return load(root).find((task) => task.id === taskId) ?? null;
}

export function listTasks(root: string, status?: OmxTaskStatus): OmxTask[] {
  const tasks = load(root);
  return status ? tasks.filter((task) => task.status === status) : tasks;
}

export function updateTask(
  root: string,
  taskId: string,
  patch: Partial<Omit<OmxTask, "id" | "createdAt" | "history">>,
  actor?: string,
): OmxTask | null {
  const tasks = load(root);
  const index = tasks.findIndex((task) => task.id === taskId);
  if (index === -1) {
    return null;
  }

  const current = tasks[index];
  const nextStatus = patch.status ?? current.status;
  const history =
    nextStatus !== current.status
      ? [
          ...current.history,
          {
            status: nextStatus,
            at: now(),
            by: actor,
            note: typeof patch.result === "string" ? patch.result : undefined,
          },
        ]
      : current.history;

  const next: OmxTask = {
    ...current,
    ...patch,
    history,
    updatedAt: now(),
  };
  tasks[index] = next;
  save(root, tasks);
  return next;
}
