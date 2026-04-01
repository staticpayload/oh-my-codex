import { gatherHudContext, renderHud } from "@oh-my-codex/core";
import type { CliContext } from "../context.js";

export async function runHudCommand(
  context: CliContext,
  options: { json: boolean; watch: boolean },
  io: {
    out(line: string): void;
    clear(): void;
    wait(ms: number): Promise<void>;
  },
): Promise<number> {
  do {
    const hud = gatherHudContext(context.cwd);
    if (options.watch) {
      io.clear();
    }
    io.out(options.json ? JSON.stringify(hud, null, 2) : renderHud(hud));
    if (!options.watch) {
      break;
    }
    await io.wait(1000);
  } while (options.watch);

  return 0;
}
