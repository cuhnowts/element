/**
 * Shell allowlist validation for bot skill shell execution.
 *
 * Commands are validated against an allowlist before execution (D-07).
 * Shell metacharacters are rejected to prevent injection attacks.
 * Users can extend the allowlist via Settings > AI (D-08).
 */

/** Characters that indicate shell injection attempts */
const SHELL_METACHARACTERS = /[;|&`$()><]/;

/** Multi-word command prefixes (first token requires a second token for matching) */
const MULTI_WORD_PREFIXES = new Set(["git", "npm", "yarn", "pnpm"]);

/**
 * Default allowlist of safe commands (per D-07).
 * Each entry is either a single command (e.g. "ls") or a
 * multi-word prefix (e.g. "git status").
 */
export const DEFAULT_ALLOWLIST: string[] = [
  // Git commands
  "git status",
  "git log",
  "git diff",
  "git branch",
  // npm commands
  "npm test",
  "npm run",
  "npm build",
  // yarn commands
  "yarn test",
  "yarn run",
  "yarn build",
  // pnpm commands
  "pnpm test",
  "pnpm run",
  "pnpm build",
  // Basic Unix commands
  "ls",
  "cat",
  "head",
  "tail",
  "wc",
  "echo",
  "date",
  "pwd",
];

/**
 * Parse the base command from a full command string.
 *
 * For known multi-word commands (git, npm, yarn, pnpm), returns first 2 tokens.
 * For single-word commands (ls, cat, etc.), returns first token only.
 */
export function parseBaseCommand(command: string): string {
  const trimmed = command.trim();
  const tokens = trimmed.split(/\s+/);

  if (tokens.length >= 2 && MULTI_WORD_PREFIXES.has(tokens[0])) {
    return `${tokens[0]} ${tokens[1]}`;
  }

  return tokens[0];
}

/**
 * Check if a command is allowed to execute.
 *
 * Returns false if:
 * - Command is empty after trimming
 * - Command contains shell metacharacters (injection prevention)
 * - Base command is not in the allowlist
 */
export function isCommandAllowed(command: string, allowlist: string[]): boolean {
  const trimmed = command.trim();

  if (trimmed.length === 0) {
    return false;
  }

  if (SHELL_METACHARACTERS.test(trimmed)) {
    return false;
  }

  const baseCommand = parseBaseCommand(trimmed);
  return allowlist.includes(baseCommand);
}
