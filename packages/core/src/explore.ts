import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface SearchResult {
  file: string;
  line: number;
  text: string;
}

export interface SymbolResult {
  file: string;
  line: number;
  symbol: string;
  kind: "function" | "class" | "type" | "enum" | "const";
}

export interface RepositoryIndex {
  root: string;
  fileCount: number;
  extensions: Array<{ extension: string; count: number }>;
}

export interface DiagnosticResult {
  command: string;
  ok: boolean;
  output: string;
}

function nativeCandidates(root: string): string[] {
  return [
    join(root, "target", "debug", "omx-explore"),
    join(root, "target", "release", "omx-explore"),
  ];
}

function resolveNative(root: string): string | null {
  return nativeCandidates(root).find((candidate) => existsSync(candidate)) ?? null;
}

export function searchRepository(root: string, query: string, limit = 50): SearchResult[] {
  try {
    const output = execFileSync("rg", ["-n", "--hidden", "--glob", "!.git", query, root], {
      encoding: "utf8",
    }).trim();

    return output
      .split("\n")
      .filter(Boolean)
      .slice(0, limit)
      .map((line) => {
        const [file, lineNumber, ...rest] = line.split(":");
        return {
          file,
          line: Number(lineNumber),
          text: rest.join(":"),
        };
      });
  } catch {
    return [];
  }
}

export function listRepositoryFiles(root: string): string[] {
  const native = resolveNative(root);
  if (native) {
    try {
      return JSON.parse(execFileSync(native, ["files", root], { encoding: "utf8" })) as string[];
    } catch {
      // fall through
    }
  }

  try {
    return execFileSync("rg", ["--files", root], {
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function buildRepositoryIndex(root: string): RepositoryIndex {
  const native = resolveNative(root);
  if (native) {
    try {
      return JSON.parse(execFileSync(native, ["index", root], { encoding: "utf8" })) as RepositoryIndex;
    } catch {
      // fall through
    }
  }

  const files = listRepositoryFiles(root);
  const counts = new Map<string, number>();
  for (const file of files) {
    const extension = file.includes(".") ? `.${file.split(".").pop()}` : "<none>";
    counts.set(extension, (counts.get(extension) ?? 0) + 1);
  }
  return {
    root,
    fileCount: files.length,
    extensions: [...counts.entries()]
      .map(([extension, count]) => ({ extension, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
  };
}

export function diffSummary(root: string, base = "origin/main"): string {
  const native = resolveNative(root);
  if (native) {
    try {
      return execFileSync(native, ["git-diff", root, base], {
        encoding: "utf8",
      }).trim();
    } catch {
      // fall through
    }
  }

  try {
    return execFileSync("git", ["diff", "--stat", base], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

export function extractSymbols(filePath: string): SymbolResult[] {
  const native = resolveNative(process.cwd());
  if (native) {
    try {
      return JSON.parse(execFileSync(native, ["anchors", filePath], { encoding: "utf8" })) as SymbolResult[];
    } catch {
      // fall through
    }
  }

  const lines = execFileSync("sed", ["-n", "1,300p", filePath], {
    encoding: "utf8",
  })
    .split("\n")
    .map((line, index) => ({ line, index: index + 1 }));

  const patterns: Array<{ regex: RegExp; kind: SymbolResult["kind"] }> = [
    { regex: /^\s*export\s+function\s+([A-Za-z0-9_]+)/, kind: "function" },
    { regex: /^\s*function\s+([A-Za-z0-9_]+)/, kind: "function" },
    { regex: /^\s*class\s+([A-Za-z0-9_]+)/, kind: "class" },
    { regex: /^\s*export\s+class\s+([A-Za-z0-9_]+)/, kind: "class" },
    { regex: /^\s*export\s+type\s+([A-Za-z0-9_]+)/, kind: "type" },
    { regex: /^\s*export\s+enum\s+([A-Za-z0-9_]+)/, kind: "enum" },
    { regex: /^\s*export\s+const\s+([A-Za-z0-9_]+)/, kind: "const" },
    { regex: /^\s*const\s+([A-Za-z0-9_]+)\s*=/, kind: "const" },
  ];

  const symbols: SymbolResult[] = [];
  for (const entry of lines) {
    for (const pattern of patterns) {
      const match = entry.line.match(pattern.regex);
      if (match) {
        symbols.push({
          file: filePath,
          line: entry.index,
          symbol: match[1]!,
          kind: pattern.kind,
        });
        break;
      }
    }
  }

  return symbols;
}

export function findSymbolReferences(root: string, symbol: string, limit = 200): SearchResult[] {
  return searchRepository(root, `\\b${symbol}\\b`, limit);
}

export function previewRename(root: string, from: string, to: string, limit = 200): Array<SearchResult & { replacement: string }> {
  return findSymbolReferences(root, from, limit).map((result) => ({
    ...result,
    replacement: result.text.replace(new RegExp(`\\b${from}\\b`, "g"), to),
  }));
}

export function previewReplace(root: string, pattern: string, replacement: string, limit = 200): Array<SearchResult & { replacement: string }> {
  return searchRepository(root, pattern, limit).map((result) => ({
    ...result,
    replacement: result.text.replace(new RegExp(pattern, "g"), replacement),
  }));
}

export function probeTmux(root: string): { available: boolean; version: string | null } {
  const native = resolveNative(root);
  if (native) {
    try {
      return JSON.parse(execFileSync(native, ["tmux-probe"], { encoding: "utf8" })) as {
        available: boolean;
        version: string | null;
      };
    } catch {
      // fall through
    }
  }

  try {
    const version = execFileSync("tmux", ["-V"], { encoding: "utf8" }).trim();
    return { available: true, version };
  } catch {
    return { available: false, version: null };
  }
}

export function runDiagnostics(root: string): DiagnosticResult {
  const candidates: Array<{ command: string; args: string[] }> = [
    { command: "npm", args: ["run", "typecheck", "--silent"] },
    { command: "cargo", args: ["check", "-q"] },
    { command: "tsc", args: ["--noEmit"] },
  ];

  for (const candidate of candidates) {
    try {
      const output = execFileSync(candidate.command, candidate.args, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
      return {
        command: `${candidate.command} ${candidate.args.join(" ")}`,
        ok: true,
        output,
      };
    } catch (error) {
      const message =
        error && typeof error === "object" && "stdout" in error
          ? `${String((error as { stdout?: string }).stdout ?? "")}${String((error as { stderr?: string }).stderr ?? "")}`
          : String(error);
      if (message.trim()) {
        return {
          command: `${candidate.command} ${candidate.args.join(" ")}`,
          ok: false,
          output: message.trim(),
        };
      }
    }
  }

  return {
    command: "unsupported",
    ok: false,
    output: "No supported diagnostic command found",
  };
}
