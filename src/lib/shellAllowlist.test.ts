import { describe, expect, it } from "vitest";
import { DEFAULT_ALLOWLIST, isCommandAllowed, parseBaseCommand } from "./shellAllowlist";

describe("shellAllowlist", () => {
  describe("DEFAULT_ALLOWLIST", () => {
    it('contains git commands: "git status", "git log", "git diff", "git branch"', () => {
      expect(DEFAULT_ALLOWLIST).toContain("git status");
      expect(DEFAULT_ALLOWLIST).toContain("git log");
      expect(DEFAULT_ALLOWLIST).toContain("git diff");
      expect(DEFAULT_ALLOWLIST).toContain("git branch");
    });

    it('contains npm commands: "npm test", "npm run", "npm build"', () => {
      expect(DEFAULT_ALLOWLIST).toContain("npm test");
      expect(DEFAULT_ALLOWLIST).toContain("npm run");
      expect(DEFAULT_ALLOWLIST).toContain("npm build");
    });

    it('contains yarn commands: "yarn test", "yarn run", "yarn build"', () => {
      expect(DEFAULT_ALLOWLIST).toContain("yarn test");
      expect(DEFAULT_ALLOWLIST).toContain("yarn run");
      expect(DEFAULT_ALLOWLIST).toContain("yarn build");
    });

    it('contains pnpm commands: "pnpm test", "pnpm run", "pnpm build"', () => {
      expect(DEFAULT_ALLOWLIST).toContain("pnpm test");
      expect(DEFAULT_ALLOWLIST).toContain("pnpm run");
      expect(DEFAULT_ALLOWLIST).toContain("pnpm build");
    });

    it('contains basic Unix commands: "ls", "cat", "head", "tail", "wc", "echo", "date", "pwd"', () => {
      expect(DEFAULT_ALLOWLIST).toContain("ls");
      expect(DEFAULT_ALLOWLIST).toContain("cat");
      expect(DEFAULT_ALLOWLIST).toContain("head");
      expect(DEFAULT_ALLOWLIST).toContain("tail");
      expect(DEFAULT_ALLOWLIST).toContain("wc");
      expect(DEFAULT_ALLOWLIST).toContain("echo");
      expect(DEFAULT_ALLOWLIST).toContain("date");
      expect(DEFAULT_ALLOWLIST).toContain("pwd");
    });
  });

  describe("isCommandAllowed", () => {
    it('allows "git status"', () => {
      expect(isCommandAllowed("git status", DEFAULT_ALLOWLIST)).toBe(true);
    });

    it('allows "git status --short" (prefix match with args)', () => {
      expect(isCommandAllowed("git status --short", DEFAULT_ALLOWLIST)).toBe(true);
    });

    it('allows "git log --oneline"', () => {
      expect(isCommandAllowed("git log --oneline", DEFAULT_ALLOWLIST)).toBe(true);
    });

    it('rejects "rm -rf /"', () => {
      expect(isCommandAllowed("rm -rf /", DEFAULT_ALLOWLIST)).toBe(false);
    });

    it('rejects "curl evil.com"', () => {
      expect(isCommandAllowed("curl evil.com", DEFAULT_ALLOWLIST)).toBe(false);
    });

    // Injection prevention
    it('rejects "git status; rm -rf /" (semicolon injection)', () => {
      expect(isCommandAllowed("git status; rm -rf /", DEFAULT_ALLOWLIST)).toBe(false);
    });

    it('rejects "git status && rm -rf /" (&& injection)', () => {
      expect(isCommandAllowed("git status && rm -rf /", DEFAULT_ALLOWLIST)).toBe(false);
    });

    it('rejects "git status || rm -rf /" (|| injection)', () => {
      expect(isCommandAllowed("git status || rm -rf /", DEFAULT_ALLOWLIST)).toBe(false);
    });

    it('rejects "git status | cat /etc/passwd" (pipe injection)', () => {
      expect(isCommandAllowed("git status | cat /etc/passwd", DEFAULT_ALLOWLIST)).toBe(false);
    });

    it('rejects "echo $(whoami)" ($() injection)', () => {
      expect(isCommandAllowed("echo $(whoami)", DEFAULT_ALLOWLIST)).toBe(false);
    });

    it('rejects "echo `whoami`" (backtick injection)', () => {
      expect(isCommandAllowed("echo `whoami`", DEFAULT_ALLOWLIST)).toBe(false);
    });

    it('rejects "ls > /tmp/out" (redirect injection)', () => {
      expect(isCommandAllowed("ls > /tmp/out", DEFAULT_ALLOWLIST)).toBe(false);
    });

    it('allows "npm run dev"', () => {
      expect(isCommandAllowed("npm run dev", DEFAULT_ALLOWLIST)).toBe(true);
    });

    it("rejects empty command", () => {
      expect(isCommandAllowed("", DEFAULT_ALLOWLIST)).toBe(false);
    });

    it('allows "  git status  " (whitespace trimming)', () => {
      expect(isCommandAllowed("  git status  ", DEFAULT_ALLOWLIST)).toBe(true);
    });

    it('allows "docker ps" with custom allowlist entry', () => {
      expect(isCommandAllowed("docker ps", [...DEFAULT_ALLOWLIST, "docker"])).toBe(true);
    });
  });

  describe("parseBaseCommand", () => {
    it('parseBaseCommand("git status --short") returns "git status"', () => {
      expect(parseBaseCommand("git status --short")).toBe("git status");
    });

    it('parseBaseCommand("ls -la") returns "ls"', () => {
      expect(parseBaseCommand("ls -la")).toBe("ls");
    });

    it('parseBaseCommand("npm run build") returns "npm run"', () => {
      expect(parseBaseCommand("npm run build")).toBe("npm run");
    });
  });
});
