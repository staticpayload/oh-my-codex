import {
  buildRepositoryIndex,
  diffSummary,
  extractSymbols,
  findSymbolReferences,
  listRepositoryFiles,
  previewRename,
  previewReplace,
  probeTmux,
  runDiagnostics,
  searchRepository,
} from "@oh-my-codex/core";
import { resolve } from "node:path";
import type { CliContext } from "../context.js";

export function runExploreCommand(
  context: CliContext,
  args: string[],
  write: (line: string) => void,
): number {
  const subcommand = args[0] ?? "search";

  if (subcommand === "search") {
    const query = args.slice(1).join(" ");
    write(JSON.stringify(searchRepository(context.cwd, query), null, 2));
    return 0;
  }

  if (subcommand === "diff") {
    write(diffSummary(context.cwd, args[1] ?? "origin/main"));
    return 0;
  }

  if (subcommand === "files") {
    write(JSON.stringify(listRepositoryFiles(context.cwd), null, 2));
    return 0;
  }

  if (subcommand === "index") {
    write(JSON.stringify(buildRepositoryIndex(context.cwd), null, 2));
    return 0;
  }

  if (subcommand === "symbols" || subcommand === "anchors") {
    const target = args[1];
    if (!target) {
      write(`usage: omx explore ${subcommand} <path>`);
      return 1;
    }
    const resolved = target.startsWith("/") ? target : resolve(context.cwd, target);
    write(JSON.stringify(extractSymbols(resolved), null, 2));
    return 0;
  }

  if (subcommand === "refs") {
    const symbol = args[1];
    if (!symbol) {
      write("usage: omx explore refs <symbol>");
      return 1;
    }
    write(JSON.stringify(findSymbolReferences(context.cwd, symbol), null, 2));
    return 0;
  }

  if (subcommand === "rename-preview") {
    const from = args[1];
    const to = args[2];
    if (!from || !to) {
      write("usage: omx explore rename-preview <from> <to>");
      return 1;
    }
    write(JSON.stringify(previewRename(context.cwd, from, to), null, 2));
    return 0;
  }

  if (subcommand === "replace-preview") {
    const pattern = args[1];
    const replacement = args[2];
    if (!pattern || replacement === undefined) {
      write("usage: omx explore replace-preview <pattern> <replacement>");
      return 1;
    }
    write(JSON.stringify(previewReplace(context.cwd, pattern, replacement), null, 2));
    return 0;
  }

  if (subcommand === "diagnostics") {
    write(JSON.stringify(runDiagnostics(context.cwd), null, 2));
    return 0;
  }

  if (subcommand === "tmux") {
    write(JSON.stringify(probeTmux(context.cwd), null, 2));
    return 0;
  }

  write(`unknown explore subcommand: ${subcommand}`);
  return 1;
}
