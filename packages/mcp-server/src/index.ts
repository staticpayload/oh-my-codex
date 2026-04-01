#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  awaitTeamState,
  buildRepositoryIndex,
  claimTeamTask,
  clearState,
  completeTeamTask,
  createTask,
  createTeam,
  createReview,
  diffSummary,
  explainHookPreset,
  extractSymbols,
  findSymbolReferences,
  getAgentDefinition,
  getTask,
  hookStatus,
  installAgentCatalog,
  installLocalPlugin,
  installPersonalHooks,
  installRepoHooks,
  listRepositoryFiles,
  listAgents,
  listMemory,
  listReviews,
  listStates,
  listTasks,
  listMarketplacePlugins,
  loadPluginManifest,
  packPlugin,
  pluginStatus,
  previewRename,
  previewReplace,
  pushTeamMessage,
  queueTeamTask,
  readMemory,
  readNotes,
  readState,
  readTeam,
  readTeamInbox,
  readTeamLogs,
  heartbeatTeamWorker,
  recordTeamReview,
  resumeTeam,
  runDiagnostics,
  runPluginsDoctor,
  scaffoldPlugin,
  searchRepository,
  setInstalledPluginState,
  shutdownTeam,
  spawnTeamWorker,
  updateHookPresetState,
  updateTask,
  validateAgentCatalog,
  validatePlugin,
  writeMemory,
  writeNotes,
  writeState,
  probeTmux,
} from "@oh-my-codex/core";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
};

function text(value: unknown): ToolResult {
  return {
    content: [
      {
        type: "text",
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

type ToolSchema = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

const productPluginPath = join(fileURLToPath(new URL("../../..", import.meta.url)), "plugins", "omx-product");

export const toolDefinitions: ToolSchema[] = [
  {
    name: "omx_task_create",
    description: "Create a durable task in .omx/state/tasks.json.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        title: { type: "string" },
        kind: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        phase: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "omx_task_get",
    description: "Read a task by id.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        taskId: { type: "string" },
      },
      required: ["taskId"],
    },
  },
  {
    name: "omx_task_list",
    description: "List durable tasks by optional status.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        status: { type: "string" },
      },
    },
  },
  {
    name: "omx_task_update",
    description: "Update task status, owner, notes, or metadata.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        taskId: { type: "string" },
        patch: { type: "object" },
        actor: { type: "string" },
      },
      required: ["taskId", "patch"],
    },
  },
  {
    name: "omx_state_read",
    description: "Read a mode state file from .omx/state.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        mode: { type: "string" },
      },
      required: ["mode"],
    },
  },
  {
    name: "omx_state_write",
    description: "Write or merge a mode state file under .omx/state.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        mode: { type: "string" },
        data: { type: "object" },
        replace: { type: "boolean" },
      },
      required: ["mode", "data"],
    },
  },
  {
    name: "omx_state_clear",
    description: "Delete a mode state file.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        mode: { type: "string" },
      },
      required: ["mode"],
    },
  },
  {
    name: "omx_state_list",
    description: "List all active mode states.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
      },
    },
  },
  {
    name: "omx_memory_read",
    description: "Read a memory namespace from .omx/memory.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        namespace: { type: "string" },
      },
    },
  },
  {
    name: "omx_memory_write",
    description: "Write or merge a memory namespace.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        namespace: { type: "string" },
        patch: { type: "object" },
      },
      required: ["namespace", "patch"],
    },
  },
  {
    name: "omx_memory_list",
    description: "List memory namespaces.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
      },
    },
  },
  {
    name: "omx_note_read",
    description: "Read the omnibox note pad.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
      },
    },
  },
  {
    name: "omx_note_write",
    description: "Write the omnibox note pad.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        patch: { type: "object" },
      },
      required: ["patch"],
    },
  },
  {
    name: "omx_explore_search",
    description: "Search the repository with ripgrep-backed search.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        query: { type: "string" },
      },
      required: ["query"],
    },
  },
  {
    name: "omx_explore_diff",
    description: "Read the git diff summary against a base ref.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        base: { type: "string" },
      },
    },
  },
  {
    name: "omx_explore_files",
    description: "List repository files using the native or ripgrep-backed explorer.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
      },
    },
  },
  {
    name: "omx_explore_symbols",
    description: "Extract symbol anchors for a file.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
      },
      required: ["path"],
    },
  },
  {
    name: "omx_explore_index",
    description: "Build a repository index by extension and file count.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
      },
    },
  },
  {
    name: "omx_explore_refs",
    description: "Find symbol references across the repo.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        symbol: { type: "string" },
      },
      required: ["symbol"],
    },
  },
  {
    name: "omx_explore_rename_preview",
    description: "Preview a rename operation without mutating files.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        from: { type: "string" },
        to: { type: "string" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "omx_explore_replace_preview",
    description: "Preview a search/replace operation without mutating files.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        pattern: { type: "string" },
        replacement: { type: "string" },
      },
      required: ["pattern", "replacement"],
    },
  },
  {
    name: "omx_explore_diagnostics",
    description: "Run the best available repo diagnostics command.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
      },
    },
  },
  {
    name: "omx_explore_tmux",
    description: "Probe tmux availability and version.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
      },
    },
  },
  {
    name: "omx_team_create",
    description: "Create a durable team runtime.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        name: { type: "string" },
        workers: { type: "array" },
      },
      required: ["name", "workers"],
    },
  },
  {
    name: "omx_team_status",
    description: "Read the current team state.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
      },
    },
  },
  {
    name: "omx_team_spawn",
    description: "Spawn or attach a worker runtime.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        workerId: { type: "string" },
        command: { type: "string" },
      },
      required: ["workerId"],
    },
  },
  {
    name: "omx_team_claim",
    description: "Claim a queued task for a worker.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        taskId: { type: "string" },
        workerId: { type: "string" },
      },
      required: ["taskId", "workerId"],
    },
  },
  {
    name: "omx_team_heartbeat",
    description: "Refresh worker lease/heartbeat status.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        workerId: { type: "string" },
        note: { type: "string" },
      },
      required: ["workerId"],
    },
  },
  {
    name: "omx_team_complete",
    description: "Mark a task complete and move it to review.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        taskId: { type: "string" },
        workerId: { type: "string" },
        result: { type: "string" },
      },
      required: ["taskId", "workerId", "result"],
    },
  },
  {
    name: "omx_team_message",
    description: "Push an inbox or system message into the team state.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
        kind: { type: "string", enum: ["inbox", "review", "system"] },
        from: { type: "string" },
        to: { type: "string" },
      },
      required: ["subject", "body"],
    },
  },
  {
    name: "omx_team_review",
    description: "Record a review decision for a task.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        taskId: { type: "string" },
        reviewer: { type: "string" },
        status: { type: "string", enum: ["approved", "changes_requested", "pending"] },
        notes: { type: "string" },
      },
      required: ["taskId", "reviewer", "status", "notes"],
    },
  },
  {
    name: "omx_team_await",
    description: "Poll the current team state until a task reaches a terminal stage.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        taskId: { type: "string" },
        timeoutMs: { type: "number" },
      },
    },
  },
  {
    name: "omx_team_inbox",
    description: "Read the durable team inbox.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
      },
    },
  },
  {
    name: "omx_team_logs",
    description: "Read worker logs from the durable runtime.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        workerId: { type: "string" },
      },
      required: ["workerId"],
    },
  },
  {
    name: "omx_team_resume",
    description: "Resume a stopped team runtime.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
      },
    },
  },
  {
    name: "omx_team_shutdown",
    description: "Shut down the durable team runtime.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
      },
    },
  },
  {
    name: "omx_plugin_list",
    description: "List repo marketplace plugins.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
      },
    },
  },
  {
    name: "omx_plugin_validate",
    description: "Validate a local plugin bundle.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
      },
    },
  },
  {
    name: "omx_plugin_init",
    description: "Scaffold a plugin skeleton under the repo plugins directory.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        name: { type: "string" },
        withMcp: { type: "boolean" },
        withApps: { type: "boolean" },
        withAssets: { type: "boolean" },
      },
      required: ["name"],
    },
  },
  {
    name: "omx_plugin_pack",
    description: "Pack a plugin bundle into a tarball.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        outputDir: { type: "string" },
      },
    },
  },
  {
    name: "omx_plugin_install_local",
    description: "Install a local plugin into the user's Codex home.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        codexHome: { type: "string" },
        enable: { type: "boolean" },
      },
    },
  },
  {
    name: "omx_plugin_status",
    description: "Read enabled state for a local plugin.",
    inputSchema: {
      type: "object",
      properties: {
        codexHome: { type: "string" },
        pluginName: { type: "string" },
      },
      required: ["codexHome", "pluginName"],
    },
  },
  {
    name: "omx_plugin_enable",
    description: "Enable a plugin in Codex config.",
    inputSchema: {
      type: "object",
      properties: {
        codexHome: { type: "string" },
        pluginName: { type: "string" },
      },
      required: ["codexHome", "pluginName"],
    },
  },
  {
    name: "omx_plugin_disable",
    description: "Disable a plugin in Codex config.",
    inputSchema: {
      type: "object",
      properties: {
        codexHome: { type: "string" },
        pluginName: { type: "string" },
      },
      required: ["codexHome", "pluginName"],
    },
  },
  {
    name: "omx_plugin_doctor",
    description: "Report plugin marketplace and config drift.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        codexHome: { type: "string" },
      },
      required: ["codexHome"],
    },
  },
  {
    name: "omx_hook_install",
    description: "Install the OMX first-party hook pack.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        codexHome: { type: "string" },
        scope: { type: "string", enum: ["repo", "personal"] },
        presets: { type: "array" },
      },
      required: ["presets"],
    },
  },
  {
    name: "omx_hook_status",
    description: "Read repo/personal hook installation status.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        codexHome: { type: "string" },
      },
      required: ["codexHome"],
    },
  },
  {
    name: "omx_hook_explain",
    description: "Explain a shipped hook preset.",
    inputSchema: {
      type: "object",
      properties: {
        preset: { type: "string" },
      },
      required: ["preset"],
    },
  },
  {
    name: "omx_hook_enable",
    description: "Enable a hook preset in repo or personal scope.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        codexHome: { type: "string" },
        scope: { type: "string", enum: ["repo", "personal"] },
        preset: { type: "string" },
      },
      required: ["codexHome", "preset"],
    },
  },
  {
    name: "omx_hook_disable",
    description: "Disable a hook preset in repo or personal scope.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string" },
        codexHome: { type: "string" },
        scope: { type: "string", enum: ["repo", "personal"] },
        preset: { type: "string" },
      },
      required: ["codexHome", "preset"],
    },
  },
  {
    name: "omx_agent_list",
    description: "List the committed OMX agent catalog.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "omx_agent_get",
    description: "Read one agent definition by id.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" },
      },
      required: ["agentId"],
    },
  },
  {
    name: "omx_agent_validate",
    description: "Validate the committed agent template set.",
    inputSchema: {
      type: "object",
      properties: {
        repoRoot: { type: "string" },
      },
      required: ["repoRoot"],
    },
  },
  {
    name: "omx_agent_install",
    description: "Install OMX agent prompts into Codex home.",
    inputSchema: {
      type: "object",
      properties: {
        repoRoot: { type: "string" },
        codexHome: { type: "string" },
      },
      required: ["repoRoot", "codexHome"],
    },
  },
];

function withRoot(args: Record<string, unknown>): string {
  return String(args.root ?? process.cwd());
}

export async function invokeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const root = withRoot(args);

  switch (name) {
    case "omx_task_create":
      return text(
        createTask(root, {
          title: String(args.title),
          kind: String(args.kind ?? "general"),
          phase: String(args.phase ?? "default"),
          priority: (args.priority as "low" | "medium" | "high" | undefined) ?? "medium",
        }),
      );
    case "omx_task_get":
      return text(getTask(root, String(args.taskId)));
    case "omx_task_list":
      return text(listTasks(root, args.status as never));
    case "omx_task_update":
      return text(updateTask(root, String(args.taskId), (args.patch as Record<string, unknown>) ?? {}, String(args.actor ?? "")));
    case "omx_state_read":
      return text(readState(root, String(args.mode)));
    case "omx_state_write":
      return text(writeState(root, String(args.mode), (args.data as Record<string, unknown>) ?? {}, Boolean(args.replace)));
    case "omx_state_clear":
      return text(clearState(root, String(args.mode)));
    case "omx_state_list":
      return text(listStates(root));
    case "omx_memory_read":
      return text(readMemory(root, String(args.namespace ?? "project")));
    case "omx_memory_write":
      return text(writeMemory(root, String(args.namespace ?? "project"), (args.patch as Record<string, unknown>) ?? {}));
    case "omx_memory_list":
      return text(listMemory(root));
    case "omx_note_read":
      return text(readNotes(root));
    case "omx_note_write":
      return text(writeNotes(root, (args.patch as Record<string, unknown>) ?? {}));
    case "omx_explore_search":
      return text(searchRepository(root, String(args.query)));
    case "omx_explore_diff":
      return text(diffSummary(root, String(args.base ?? "origin/main")));
    case "omx_explore_files":
      return text(listRepositoryFiles(root));
    case "omx_explore_symbols":
      return text(extractSymbols(String(args.path)));
    case "omx_explore_index":
      return text(buildRepositoryIndex(root));
    case "omx_explore_refs":
      return text(findSymbolReferences(root, String(args.symbol)));
    case "omx_explore_rename_preview":
      return text(previewRename(root, String(args.from), String(args.to)));
    case "omx_explore_replace_preview":
      return text(previewReplace(root, String(args.pattern), String(args.replacement)));
    case "omx_explore_diagnostics":
      return text(runDiagnostics(root));
    case "omx_explore_tmux":
      return text(probeTmux(root));
    case "omx_team_create":
      return text(
        createTeam(
          root,
          String(args.name),
          ((args.workers as Array<Record<string, unknown>>) ?? []).map((worker) => ({
            id: String(worker.id),
            role: String(worker.role),
            agentId: String(worker.agentId ?? worker.id),
          })),
        ),
      );
    case "omx_team_status":
      return text(readTeam(root));
    case "omx_team_spawn":
      return text(spawnTeamWorker(root, String(args.workerId), args.command ? String(args.command) : undefined));
    case "omx_team_claim":
      return text(claimTeamTask(root, String(args.taskId), String(args.workerId)));
    case "omx_team_heartbeat":
      return text(heartbeatTeamWorker(root, String(args.workerId), args.note ? String(args.note) : undefined));
    case "omx_team_complete":
      return text(completeTeamTask(root, String(args.taskId), String(args.workerId), String(args.result)));
    case "omx_team_message":
      return text(
        pushTeamMessage(root, {
          subject: String(args.subject),
          body: String(args.body),
          kind: (args.kind as "inbox" | "review" | "system" | undefined) ?? "inbox",
          from: args.from ? String(args.from) : undefined,
          to: args.to ? String(args.to) : undefined,
        }),
      );
    case "omx_team_review":
      return text(
        recordTeamReview(root, {
          taskId: String(args.taskId),
          reviewer: String(args.reviewer),
          status: args.status as "approved" | "changes_requested" | "pending",
          notes: String(args.notes),
        }),
      );
    case "omx_team_await":
      return text(await awaitTeamState(root, { taskId: args.taskId ? String(args.taskId) : undefined, timeoutMs: Number(args.timeoutMs ?? 5_000) }));
    case "omx_team_inbox":
      return text(readTeamInbox(root));
    case "omx_team_logs":
      return text(readTeamLogs(root, String(args.workerId)));
    case "omx_team_resume":
      return text(resumeTeam(root));
    case "omx_team_shutdown":
      return text(shutdownTeam(root));
    case "omx_plugin_list":
      return text(listMarketplacePlugins(root));
    case "omx_plugin_validate":
      return text(validatePlugin(String(args.path ?? productPluginPath)));
    case "omx_plugin_init":
      return text(
        scaffoldPlugin(root, String(args.name), {
          withMarketplace: true,
          withSkills: true,
          withMcp: Boolean(args.withMcp),
          withApps: Boolean(args.withApps),
          withAssets: Boolean(args.withAssets),
        }),
      );
    case "omx_plugin_pack":
      return text(packPlugin(String(args.path ?? productPluginPath), String(args.outputDir ?? join(root, "dist", "plugins"))));
    case "omx_plugin_install_local":
      return text(installLocalPlugin(String(args.path ?? productPluginPath), String(args.codexHome), { enable: Boolean(args.enable ?? true) }));
    case "omx_plugin_status":
      return text(pluginStatus(String(args.codexHome), String(args.pluginName)));
    case "omx_plugin_enable":
      return text(setInstalledPluginState(String(args.codexHome), String(args.pluginName), true));
    case "omx_plugin_disable":
      return text(setInstalledPluginState(String(args.codexHome), String(args.pluginName), false));
    case "omx_plugin_doctor":
      return text(runPluginsDoctor(root, String(args.codexHome)));
    case "omx_hook_install": {
      const presets = (args.presets as string[]) ?? [];
      if ((args.scope as string | undefined) === "personal") {
        return text(installPersonalHooks(root, String(args.codexHome), presets as never));
      }
      return text(installRepoHooks(root, presets as never));
    }
    case "omx_hook_status":
      return text(hookStatus(root, String(args.codexHome)));
    case "omx_hook_explain":
      return text(explainHookPreset(String(args.preset) as never));
    case "omx_hook_enable": {
      const scope = String(args.scope ?? "repo");
      const state = updateHookPresetState(root, scope as never, String(args.preset) as never, true);
      if (scope === "personal") {
        installPersonalHooks(root, String(args.codexHome), state.personalPresets);
      } else {
        installRepoHooks(root, state.repoPresets);
      }
      return text(state);
    }
    case "omx_hook_disable": {
      const scope = String(args.scope ?? "repo");
      const state = updateHookPresetState(root, scope as never, String(args.preset) as never, false);
      if (scope === "personal") {
        installPersonalHooks(root, String(args.codexHome), state.personalPresets);
      } else {
        installRepoHooks(root, state.repoPresets);
      }
      return text(state);
    }
    case "omx_agent_list":
      return text(listAgents());
    case "omx_agent_get":
      return text(getAgentDefinition(String(args.agentId)));
    case "omx_agent_validate":
      return text(validateAgentCatalog(String(args.repoRoot)));
    case "omx_agent_install":
      return text(installAgentCatalog(String(args.repoRoot), String(args.codexHome)));
    default:
      return text({ error: `Unknown tool ${name}` });
  }
}

export async function startServer(): Promise<void> {
  const server = new Server(
    {
      name: "omx-mcp",
      version: "2.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    invokeTool(request.params.name, (request.params.arguments ?? {}) as Record<string, unknown>),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
