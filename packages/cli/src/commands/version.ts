export const CLI_VERSION = "2.0.0";

export function runVersionCommand(write: (line: string) => void): number {
  write(CLI_VERSION);
  return 0;
}
