import { randomUUID } from "node:crypto";
import { inboxFile, ledgerFile, reviewsFile } from "./contract.js";
import { readJson, writeJson } from "./json.js";

export type OmxLedgerKind = "task" | "worker" | "review" | "session" | "plugin" | "hook" | "setup";

export interface OmxLedgerEntry {
  id: string;
  kind: OmxLedgerKind;
  action: string;
  detail: string;
  actor?: string;
  taskId?: string;
  workerId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type OmxInboxKind = "inbox" | "review" | "system" | "plugin" | "hook";
export type OmxInboxStatus = "open" | "acknowledged" | "resolved";

export interface OmxInboxItem {
  id: string;
  kind: OmxInboxKind;
  subject: string;
  body: string;
  from?: string;
  to?: string;
  taskId?: string;
  status: OmxInboxStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OmxReviewItem {
  id: string;
  taskId: string;
  reviewer: string;
  status: "pending" | "approved" | "changes_requested";
  summary: string;
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

function now(): string {
  return new Date().toISOString();
}

function loadLedger(root: string): OmxLedgerEntry[] {
  return readJson<OmxLedgerEntry[]>(ledgerFile(root), []);
}

function saveLedger(root: string, entries: OmxLedgerEntry[]): void {
  writeJson(ledgerFile(root), entries);
}

function loadInbox(root: string): OmxInboxItem[] {
  return readJson<OmxInboxItem[]>(inboxFile(root), []);
}

function saveInbox(root: string, items: OmxInboxItem[]): void {
  writeJson(inboxFile(root), items);
}

function loadReviews(root: string): OmxReviewItem[] {
  return readJson<OmxReviewItem[]>(reviewsFile(root), []);
}

function saveReviews(root: string, items: OmxReviewItem[]): void {
  writeJson(reviewsFile(root), items);
}

export function listLedger(root: string, limit = 50): OmxLedgerEntry[] {
  return loadLedger(root).slice(-limit);
}

export function appendLedger(
  root: string,
  input: Omit<OmxLedgerEntry, "id" | "createdAt" | "metadata"> & { metadata?: Record<string, unknown> },
): OmxLedgerEntry {
  const entry: OmxLedgerEntry = {
    id: `ledger_${randomUUID().slice(0, 12)}`,
    createdAt: now(),
    metadata: input.metadata ?? {},
    ...input,
  };
  const entries = loadLedger(root);
  entries.push(entry);
  saveLedger(root, entries);
  return entry;
}

export function listInbox(root: string, status?: OmxInboxStatus): OmxInboxItem[] {
  const items = loadInbox(root);
  return status ? items.filter((item) => item.status === status) : items;
}

export function pushInboxItem(
  root: string,
  input: Omit<OmxInboxItem, "id" | "status" | "createdAt" | "updatedAt"> & { status?: OmxInboxStatus },
): OmxInboxItem {
  const item: OmxInboxItem = {
    id: `inbox_${randomUUID().slice(0, 12)}`,
    status: input.status ?? "open",
    createdAt: now(),
    updatedAt: now(),
    ...input,
  };
  const items = loadInbox(root);
  items.push(item);
  saveInbox(root, items);
  return item;
}

export function updateInboxItem(
  root: string,
  itemId: string,
  patch: Partial<Omit<OmxInboxItem, "id" | "createdAt">>,
): OmxInboxItem | null {
  const items = loadInbox(root);
  const index = items.findIndex((item) => item.id === itemId);
  if (index === -1) {
    return null;
  }
  items[index] = {
    ...items[index],
    ...patch,
    updatedAt: now(),
  };
  saveInbox(root, items);
  return items[index];
}

export function listReviews(root: string, status?: OmxReviewItem["status"]): OmxReviewItem[] {
  const items = loadReviews(root);
  return status ? items.filter((item) => item.status === status) : items;
}

export function createReview(
  root: string,
  input: Omit<OmxReviewItem, "id" | "createdAt" | "updatedAt" | "status" | "notes"> & {
    status?: OmxReviewItem["status"];
    notes?: string[];
  },
): OmxReviewItem {
  const item: OmxReviewItem = {
    id: `review_${randomUUID().slice(0, 12)}`,
    status: input.status ?? "pending",
    notes: input.notes ?? [],
    createdAt: now(),
    updatedAt: now(),
    ...input,
  };
  const items = loadReviews(root);
  items.push(item);
  saveReviews(root, items);
  return item;
}

export function updateReview(
  root: string,
  reviewId: string,
  patch: Partial<Omit<OmxReviewItem, "id" | "createdAt">>,
): OmxReviewItem | null {
  const items = loadReviews(root);
  const index = items.findIndex((item) => item.id === reviewId);
  if (index === -1) {
    return null;
  }
  items[index] = {
    ...items[index],
    ...patch,
    updatedAt: now(),
  };
  saveReviews(root, items);
  return items[index];
}
