import {
  awaitTeamState,
  claimTeamTask,
  completeTeamTask,
  createTeam,
  heartbeatTeamWorker,
  pushTeamMessage,
  queueTeamTask,
  readTeam,
  readTeamInbox,
  readTeamLogs,
  recordTeamReview,
  resumeTeam,
  shutdownTeam,
  spawnTeamWorker,
} from "@oh-my-codex/core";
import type { CliContext } from "../context.js";

export async function runTeamCommand(
  context: CliContext,
  args: string[],
  write: (line: string) => void,
): Promise<number> {
  const subcommand = args[0] ?? "status";

  if (subcommand === "init") {
    const name = args[1] ?? "omx-team";
    const team = createTeam(
      context.cwd,
      name,
      [
        { id: "architect", agentId: "architect", role: "planner" },
        { id: "executor", agentId: "executor", role: "builder" },
        { id: "reviewer", agentId: "reviewer", role: "verifier" },
      ],
      "main",
    );
    write(JSON.stringify(team, null, 2));
    return 0;
  }

  if (subcommand === "status") {
    write(JSON.stringify(readTeam(context.cwd), null, 2));
    return 0;
  }

  if (subcommand === "spawn") {
    const workerId = args[1];
    if (!workerId) {
      write("usage: omx team spawn <workerId> [command]");
      return 1;
    }
    write(JSON.stringify(spawnTeamWorker(context.cwd, workerId, args.slice(2).join(" ") || undefined), null, 2));
    return 0;
  }

  if (subcommand === "resume") {
    write(JSON.stringify(resumeTeam(context.cwd), null, 2));
    return 0;
  }

  if (subcommand === "shutdown") {
    write(JSON.stringify(shutdownTeam(context.cwd), null, 2));
    return 0;
  }

  if (subcommand === "queue") {
    const task = queueTeamTask(context.cwd, args.slice(1).join(" ") || "Unnamed team task");
    write(JSON.stringify(task, null, 2));
    return 0;
  }

  if (subcommand === "claim") {
    const [taskId, workerId] = [args[1], args[2]];
    if (!taskId || !workerId) {
      write("usage: omx team claim <taskId> <workerId>");
      return 1;
    }
    write(JSON.stringify(claimTeamTask(context.cwd, taskId, workerId), null, 2));
    return 0;
  }

  if (subcommand === "heartbeat") {
    const workerId = args[1];
    if (!workerId) {
      write("usage: omx team heartbeat <workerId> [note]");
      return 1;
    }
    write(JSON.stringify(heartbeatTeamWorker(context.cwd, workerId, args.slice(2).join(" ")), null, 2));
    return 0;
  }

  if (subcommand === "complete") {
    const [taskId, workerId, ...rest] = args.slice(1);
    if (!taskId || !workerId) {
      write("usage: omx team complete <taskId> <workerId> <result>");
      return 1;
    }
    write(JSON.stringify(completeTeamTask(context.cwd, taskId, workerId, rest.join(" ")), null, 2));
    return 0;
  }

  if (subcommand === "message") {
    const [subject, ...body] = args.slice(1);
    if (!subject) {
      write("usage: omx team message <subject> <body>");
      return 1;
    }
    write(
      JSON.stringify(
        pushTeamMessage(context.cwd, {
          kind: "inbox",
          subject,
          body: body.join(" "),
          from: "operator",
        }),
        null,
        2,
      ),
    );
    return 0;
  }

  if (subcommand === "review") {
    const [taskId, reviewer, status, ...notes] = args.slice(1);
    if (!taskId || !reviewer || !status) {
      write("usage: omx team review <taskId> <reviewer> <approved|changes_requested|pending> <notes>");
      return 1;
    }
    write(
      JSON.stringify(
        recordTeamReview(context.cwd, {
          taskId,
          reviewer,
          status: status as "approved" | "changes_requested" | "pending",
          notes: notes.join(" "),
        }),
        null,
        2,
      ),
    );
    return 0;
  }

  if (subcommand === "inbox") {
    write(JSON.stringify(readTeamInbox(context.cwd), null, 2));
    return 0;
  }

  if (subcommand === "logs") {
    const workerId = args[1];
    if (!workerId) {
      write("usage: omx team logs <workerId>");
      return 1;
    }
    write(JSON.stringify(readTeamLogs(context.cwd, workerId), null, 2));
    return 0;
  }

  if (subcommand === "await") {
    const taskId = args[1];
    write(JSON.stringify(await awaitTeamState(context.cwd, { taskId }), null, 2));
    return 0;
  }

  write(`unknown team subcommand: ${subcommand}`);
  return 1;
}
