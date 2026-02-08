#!/usr/bin/env node
// ==========================================================================
// omx — oh-my-codex MCP server
// Unified orchestration server: async Claude Code delegation, state
// management, session notepad, and project memory.
// ==========================================================================

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

// ==========================================================================
// Constants & Paths
// ==========================================================================
const HOME = homedir();
const OMX_DIR = join(HOME, ".codex", ".omx");
const STATE_DIR = join(OMX_DIR, "state");
const NOTEPAD_PATH = join(OMX_DIR, "notepad.json");
const MAX_COMPLETED_JOBS = 50;

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
ensureDir(STATE_DIR);

// ==========================================================================
// Debug
// ==========================================================================
const DEBUG = process.env.MCP_OMX_DEBUG === "true";
function log(...args) {
  if (DEBUG) console.error("[omx]", ...args);
}

// ==========================================================================
// Claude CLI resolution
// ==========================================================================
function findClaudeCli() {
  const envName = process.env.CLAUDE_CLI_NAME;
  if (envName) return envName;
  const localPath = join(HOME, ".claude", "local", "claude");
  if (existsSync(localPath)) return localPath;
  return "claude";
}
const CLAUDE_CLI = findClaudeCli();

// ==========================================================================
// Job store (claude_code async)
// ==========================================================================
const jobs = new Map();

function pruneJobs() {
  const completed = [...jobs.entries()].filter(
    ([, j]) => j.status !== "running",
  );
  if (completed.length > MAX_COMPLETED_JOBS) {
    completed
      .sort((a, b) => (a[1].endTime || 0) - (b[1].endTime || 0))
      .slice(0, completed.length - MAX_COMPLETED_JOBS)
      .forEach(([id]) => jobs.delete(id));
  }
}

// ==========================================================================
// File helpers (state, notepad, memory)
// ==========================================================================
function readJSON(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJSON(path, data) {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

function statePath(mode) {
  return join(STATE_DIR, `${mode}.json`);
}

function memoryPath(workFolder) {
  return join(workFolder, ".omx", "memory.json");
}

// ==========================================================================
// Notepad helpers
// ==========================================================================
function readNotepad() {
  return readJSON(NOTEPAD_PATH, {
    priority: "",
    working: [],
    manual: [],
  });
}

function writeNotepad(np) {
  writeJSON(NOTEPAD_PATH, np);
}

// ==========================================================================
// MCP Server
// ==========================================================================
const server = new Server(
  { name: "omx", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

// ==========================================================================
// Tool Catalogue
// ==========================================================================
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ------------------------------------------------------------------
    // CLAUDE CODE (async delegation)
    // ------------------------------------------------------------------
    {
      name: "claude_code",
      description:
        "Start a Claude Code task asynchronously. Returns a job ID immediately — no timeout risk. " +
        "Claude Code has full filesystem access: read, write, edit files, run shell commands, " +
        "search codebases, perform complex multi-step coding tasks. " +
        "Use claude_code_status to wait for results. Use claude_code_cancel to abort.",
      inputSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description:
              "Task instructions for Claude Code. ALWAYS include " +
              "'Your work folder is /absolute/path' at the start.",
          },
          workFolder: {
            type: "string",
            description: "Absolute path to working directory. Defaults to $HOME.",
          },
        },
        required: ["prompt"],
      },
    },
    {
      name: "claude_code_status",
      description:
        "Wait for a Claude Code job to finish (long-polling). Waits up to waitSeconds " +
        "(default 25, max 25) for completion. If done, returns full output. If still running, " +
        "returns partial output + hint to call again. Just keep calling this in a loop " +
        "until status is 'completed' or 'failed'. NEVER times out.",
      inputSchema: {
        type: "object",
        properties: {
          jobId: { type: "string", description: "Job ID from claude_code." },
          waitSeconds: {
            type: "number",
            description: "Max seconds to wait (default 25, max 25). 0 for instant check.",
          },
        },
        required: ["jobId"],
      },
    },
    {
      name: "claude_code_cancel",
      description: "Cancel a running Claude Code job.",
      inputSchema: {
        type: "object",
        properties: {
          jobId: { type: "string", description: "Job ID to cancel." },
        },
        required: ["jobId"],
      },
    },
    {
      name: "claude_code_list",
      description: "List all Claude Code jobs with status. Newest first.",
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["all", "running", "completed", "failed", "cancelled"],
            description: "Filter by status. Default: 'all'.",
          },
        },
      },
    },

    // ------------------------------------------------------------------
    // STATE MANAGEMENT
    // ------------------------------------------------------------------
    {
      name: "omx_state_read",
      description:
        "Read the state for a workflow mode (autopilot, plan, research, tdd, etc.). " +
        "Returns JSON state or null if no state exists.",
      inputSchema: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            description: "Mode name: autopilot, plan, research, tdd, review, analyze, or any custom name.",
          },
        },
        required: ["mode"],
      },
    },
    {
      name: "omx_state_write",
      description:
        "Write or update state for a workflow mode. Pass a JSON object with the state data. " +
        "Merges with existing state by default.",
      inputSchema: {
        type: "object",
        properties: {
          mode: { type: "string", description: "Mode name." },
          data: {
            type: "object",
            description: "State data to write/merge.",
            additionalProperties: true,
          },
          replace: {
            type: "boolean",
            description: "If true, replaces state entirely instead of merging. Default: false.",
          },
        },
        required: ["mode", "data"],
      },
    },
    {
      name: "omx_state_clear",
      description: "Clear/delete state for a workflow mode.",
      inputSchema: {
        type: "object",
        properties: {
          mode: { type: "string", description: "Mode name to clear." },
        },
        required: ["mode"],
      },
    },
    {
      name: "omx_state_list",
      description: "List all active workflow modes with their state summaries.",
      inputSchema: { type: "object", properties: {} },
    },

    // ------------------------------------------------------------------
    // NOTEPAD (session memory — persists across conversation compaction)
    // ------------------------------------------------------------------
    {
      name: "omx_note_read",
      description:
        "Read the session notepad. Sections: 'priority' (always-loaded context, max 500 chars), " +
        "'working' (timestamped entries, auto-pruned after 7 days), 'manual' (permanent entries), " +
        "or 'all' for everything.",
      inputSchema: {
        type: "object",
        properties: {
          section: {
            type: "string",
            enum: ["all", "priority", "working", "manual"],
            description: "Section to read. Default: 'all'.",
          },
        },
      },
    },
    {
      name: "omx_note_write",
      description:
        "Write to the session notepad. For 'priority': replaces content (max 500 chars). " +
        "For 'working': adds timestamped entry. For 'manual': adds permanent entry.",
      inputSchema: {
        type: "object",
        properties: {
          section: {
            type: "string",
            enum: ["priority", "working", "manual"],
            description: "Section to write to.",
          },
          content: { type: "string", description: "Content to write." },
        },
        required: ["section", "content"],
      },
    },

    // ------------------------------------------------------------------
    // PROJECT MEMORY (per-project persistent info)
    // ------------------------------------------------------------------
    {
      name: "omx_memory_read",
      description:
        "Read project memory for a given work folder. Stores tech stack, conventions, " +
        "build commands, notes — anything that should persist across sessions for this project.",
      inputSchema: {
        type: "object",
        properties: {
          workFolder: {
            type: "string",
            description: "Project root directory. Required.",
          },
        },
        required: ["workFolder"],
      },
    },
    {
      name: "omx_memory_write",
      description:
        "Write/update project memory for a given work folder. Merges with existing memory.",
      inputSchema: {
        type: "object",
        properties: {
          workFolder: {
            type: "string",
            description: "Project root directory.",
          },
          data: {
            type: "object",
            description:
              "Memory data to merge. Common keys: techStack, buildCommand, testCommand, " +
              "conventions, structure, notes.",
            additionalProperties: true,
          },
          replace: {
            type: "boolean",
            description: "If true, replaces memory entirely. Default: false.",
          },
        },
        required: ["workFolder", "data"],
      },
    },
  ],
}));

// ==========================================================================
// Tool Dispatch
// ==========================================================================
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    // ================================================================
    // CLAUDE CODE — async delegation
    // ================================================================
    case "claude_code": {
      const prompt = args?.prompt;
      if (!prompt || typeof prompt !== "string") {
        return reply("Error: prompt is required.", true);
      }

      const workFolder =
        args?.workFolder && typeof args.workFolder === "string"
          ? args.workFolder
          : HOME;

      const jobId = randomUUID().slice(0, 8);
      const job = {
        id: jobId,
        status: "running",
        stdout: "",
        stderr: "",
        startTime: Date.now(),
        endTime: null,
        exitCode: null,
        promptPreview: prompt.slice(0, 200),
        workFolder,
        _proc: null,
      };

      log(`Starting job ${jobId} in ${workFolder}`);

      const cliArgs = [
        "--dangerously-skip-permissions",
        "-p",
        prompt,
        "--output-format",
        "text",
      ];

      try {
        const proc = spawn(CLAUDE_CLI, cliArgs, {
          cwd: workFolder,
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
        });

        job._proc = proc;

        proc.stdout.on("data", (chunk) => {
          job.stdout += chunk.toString();
        });
        proc.stderr.on("data", (chunk) => {
          job.stderr += chunk.toString();
        });
        proc.on("close", (code) => {
          job.status = code === 0 ? "completed" : "failed";
          job.exitCode = code;
          job.endTime = Date.now();
          job._proc = null;
          log(`Job ${jobId} done: code=${code}`);
          pruneJobs();
        });
        proc.on("error", (err) => {
          job.status = "failed";
          job.stderr += `\nSpawn error: ${err.message}`;
          job.endTime = Date.now();
          job._proc = null;
        });
      } catch (err) {
        job.status = "failed";
        job.stderr = `Failed to spawn Claude CLI: ${err.message}`;
        job.endTime = Date.now();
      }

      jobs.set(jobId, job);

      return reply({
        jobId,
        status: "running",
        message: `Job started. Call claude_code_status(jobId: "${jobId}") to wait for results.`,
      });
    }

    case "claude_code_status": {
      const jobId = args?.jobId;
      if (!jobId) return reply("Error: jobId is required.", true);

      const job = jobs.get(jobId);
      if (!job)
        return reply(
          `Error: No job "${jobId}". Use claude_code_list to see all jobs.`,
          true,
        );

      // Long-poll
      const maxWait = Math.min(Math.max(0, Number(args?.waitSeconds ?? 25)), 25);
      if (job.status === "running" && maxWait > 0) {
        const deadline = Date.now() + maxWait * 1000;
        await new Promise((resolve) => {
          const iv = setInterval(() => {
            if (job.status !== "running" || Date.now() >= deadline) {
              clearInterval(iv);
              resolve();
            }
          }, 500);
        });
      }

      const elapsed = ((job.endTime || Date.now()) - job.startTime) / 1000;
      const result = {
        jobId: job.id,
        status: job.status,
        elapsedSeconds: Math.round(elapsed),
        workFolder: job.workFolder,
      };

      if (job.exitCode !== null) result.exitCode = job.exitCode;

      if (job.status === "running") {
        const tail = job.stdout.slice(-3000);
        result.outputTail =
          tail.length < job.stdout.length
            ? `...(${job.stdout.length} chars)...\n${tail}`
            : tail || "(no output yet)";
        result.hint = "Still running. Call claude_code_status again.";
      } else {
        result.output = job.stdout || "(no output)";
      }

      if (job.stderr && job.status === "failed") {
        result.error = job.stderr.slice(-2000);
      }

      return reply(result);
    }

    case "claude_code_cancel": {
      const jobId = args?.jobId;
      if (!jobId) return reply("Error: jobId is required.", true);
      const job = jobs.get(jobId);
      if (!job) return reply(`Error: No job "${jobId}".`, true);
      if (job.status !== "running")
        return reply(`Job ${jobId} already ${job.status}.`);

      if (job._proc) {
        job._proc.kill("SIGTERM");
        setTimeout(() => {
          if (job._proc)
            try { job._proc.kill("SIGKILL"); } catch {}
        }, 5000);
      }
      job.status = "cancelled";
      job.endTime = Date.now();
      job._proc = null;
      return reply(`Job ${jobId} cancelled.`);
    }

    case "claude_code_list": {
      const filter = args?.status || "all";
      const entries = [...jobs.values()]
        .filter((j) => filter === "all" || j.status === filter)
        .map((j) => ({
          jobId: j.id,
          status: j.status,
          elapsedSeconds: Math.round(
            ((j.endTime || Date.now()) - j.startTime) / 1000,
          ),
          promptPreview: j.promptPreview,
          workFolder: j.workFolder,
        }))
        .reverse();
      return reply(entries.length > 0 ? entries : "No jobs found.");
    }

    // ================================================================
    // STATE MANAGEMENT
    // ================================================================
    case "omx_state_read": {
      const mode = args?.mode;
      if (!mode) return reply("Error: mode is required.", true);
      const data = readJSON(statePath(mode), null);
      return reply(data !== null ? data : { exists: false, mode });
    }

    case "omx_state_write": {
      const mode = args?.mode;
      const data = args?.data;
      if (!mode || !data) return reply("Error: mode and data are required.", true);

      let state;
      if (args?.replace) {
        state = { ...data, _mode: mode, _updatedAt: new Date().toISOString() };
      } else {
        const existing = readJSON(statePath(mode), {});
        state = {
          ...existing,
          ...data,
          _mode: mode,
          _updatedAt: new Date().toISOString(),
        };
      }
      writeJSON(statePath(mode), state);
      return reply({ ok: true, mode, state });
    }

    case "omx_state_clear": {
      const mode = args?.mode;
      if (!mode) return reply("Error: mode is required.", true);
      const path = statePath(mode);
      if (existsSync(path)) unlinkSync(path);
      return reply({ ok: true, mode, cleared: true });
    }

    case "omx_state_list": {
      const files = existsSync(STATE_DIR)
        ? readdirSync(STATE_DIR).filter((f) => f.endsWith(".json"))
        : [];
      const modes = files.map((f) => {
        const mode = f.replace(".json", "");
        const data = readJSON(join(STATE_DIR, f), {});
        return {
          mode,
          active: data.active !== false,
          phase: data.phase || data.current_phase || null,
          updatedAt: data._updatedAt || null,
        };
      });
      return reply(modes.length > 0 ? modes : "No active modes.");
    }

    // ================================================================
    // NOTEPAD
    // ================================================================
    case "omx_note_read": {
      const np = readNotepad();
      const section = args?.section || "all";

      if (section === "all") return reply(np);
      if (section === "priority") return reply({ priority: np.priority });
      if (section === "working") return reply({ working: np.working });
      if (section === "manual") return reply({ manual: np.manual });
      return reply("Error: invalid section.", true);
    }

    case "omx_note_write": {
      const section = args?.section;
      const content = args?.content;
      if (!section || !content)
        return reply("Error: section and content required.", true);

      const np = readNotepad();

      if (section === "priority") {
        np.priority = content.slice(0, 500);
      } else if (section === "working") {
        np.working.push({
          content,
          timestamp: new Date().toISOString(),
        });
        // Auto-prune entries older than 7 days
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        np.working = np.working.filter(
          (e) => new Date(e.timestamp).getTime() > cutoff,
        );
      } else if (section === "manual") {
        np.manual.push({
          content,
          timestamp: new Date().toISOString(),
        });
      } else {
        return reply("Error: section must be priority, working, or manual.", true);
      }

      writeNotepad(np);
      return reply({ ok: true, section });
    }

    // ================================================================
    // PROJECT MEMORY
    // ================================================================
    case "omx_memory_read": {
      const wf = args?.workFolder;
      if (!wf) return reply("Error: workFolder is required.", true);
      const data = readJSON(memoryPath(wf), null);
      return reply(data !== null ? data : { exists: false, workFolder: wf });
    }

    case "omx_memory_write": {
      const wf = args?.workFolder;
      const data = args?.data;
      if (!wf || !data)
        return reply("Error: workFolder and data required.", true);

      const mp = memoryPath(wf);
      let memory;
      if (args?.replace) {
        memory = { ...data, _updatedAt: new Date().toISOString() };
      } else {
        const existing = readJSON(mp, {});
        memory = {
          ...existing,
          ...data,
          _updatedAt: new Date().toISOString(),
        };
        // Merge notes arrays if both exist
        if (Array.isArray(existing.notes) && Array.isArray(data.notes)) {
          memory.notes = [...existing.notes, ...data.notes];
        }
      }
      writeJSON(mp, memory);
      return reply({ ok: true, workFolder: wf });
    }

    // ================================================================
    default:
      return reply(`Unknown tool: ${name}`, true);
  }
});

// ==========================================================================
// Helpers
// ==========================================================================
function reply(data, isError = false) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text", text }],
    ...(isError && { isError: true }),
  };
}

// ==========================================================================
// Start
// ==========================================================================
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("omx MCP server running");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
