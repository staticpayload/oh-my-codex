import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main, type CliIo } from "../index.js";

function capture(): { io: CliIo; output: string[]; errors: string[] } {
  const output: string[] = [];
  const errors: string[] = [];
  return {
    output,
    errors,
    io: {
      out: (line) => output.push(line),
      err: (line) => errors.push(line),
      clear: () => {},
      wait: async () => {},
    },
  };
}

test("version command prints the current cli version", async () => {
  const sink = capture();
  const code = await main(["version"], sink.io);

  assert.equal(code, 0);
  assert.equal(sink.output[0], "2.0.0");
});

test("session start creates a persisted session record", async () => {
  const sink = capture();
  const cwd = mkdtempSync(join(tmpdir(), "omx-cli-"));
  const previous = process.cwd();

  process.chdir(cwd);
  try {
    const code = await main(["session", "start"], sink.io);
    assert.equal(code, 0);
    assert.match(sink.output[0] ?? "", /session_/);
  } finally {
    process.chdir(previous);
  }
});

test("setup dry-run reports the v2 install actions", async () => {
  const sink = capture();
  const code = await main(["setup", "apply", "--dry-run"], sink.io);

  assert.equal(code, 0);
  assert.match(sink.output.join("\n"), /dry-run/);
  assert.match(sink.output.join("\n"), /would configure MCP server/);
});

test("plugins doctor command is available", async () => {
  const sink = capture();
  const cwd = mkdtempSync(join(tmpdir(), "omx-cli-plugins-"));
  const previous = process.cwd();

  process.chdir(cwd);
  try {
    const code = await main(["plugins", "doctor"], sink.io);
    assert.equal(code, 0);
    assert.match(sink.output.join("\n"), /marketplacePlugins/);
  } finally {
    process.chdir(previous);
  }
});
