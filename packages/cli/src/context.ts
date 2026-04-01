import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface CliContext {
  cwd: string;
  codexHome: string;
  homeDir: string;
  repoRoot: string;
}

export function createCliContext(env: NodeJS.ProcessEnv, cwd = process.cwd()): CliContext {
  const sourceDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(sourceDir, "../../..");

  return {
    cwd,
    codexHome: env.CODEX_HOME || resolve(homedir(), ".codex"),
    homeDir: homedir(),
    repoRoot,
  };
}
