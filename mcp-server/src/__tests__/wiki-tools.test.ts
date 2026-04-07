import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { handleWikiQuery, handleWikiIngest } from "../tools/wiki-tools.js";

let tempDir: string;
let dbPath: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "wiki-tools-test-"));
  dbPath = join(tempDir, "element.db");
  // dbPath doesn't need to be a real DB -- handlers only use dirname(dbPath)
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("handleWikiQuery", () => {
  it("returns MCP error when .knowledge/ directory does not exist", () => {
    const result = handleWikiQuery(dbPath, { query: "anything" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      "Wiki not initialized. Enable the knowledge plugin first."
    );
  });

  it("returns no-match message when index.md exists but no entries match", () => {
    const knowledgeDir = join(tempDir, ".knowledge");
    mkdirSync(knowledgeDir);
    writeFileSync(
      join(knowledgeDir, "index.md"),
      "- [Setup Guide](wiki/setup.md)\n- [API Reference](wiki/api.md)\n"
    );

    const result = handleWikiQuery(dbPath, { query: "nonexistent-topic" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe(
      "No wiki articles matched your query"
    );
  });

  it("returns no-match message when index.md does not exist", () => {
    const knowledgeDir = join(tempDir, ".knowledge");
    mkdirSync(knowledgeDir);

    const result = handleWikiQuery(dbPath, { query: "anything" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe(
      "No wiki articles matched your query"
    );
  });

  it("returns matching articles with full content and file paths", () => {
    const knowledgeDir = join(tempDir, ".knowledge");
    const wikiDir = join(knowledgeDir, "wiki");
    mkdirSync(wikiDir, { recursive: true });

    writeFileSync(
      join(knowledgeDir, "index.md"),
      "- [Setup Guide](wiki/setup.md)\n- [API Reference](wiki/api.md)\n- [Deployment](wiki/deploy.md)\n"
    );
    writeFileSync(join(wikiDir, "setup.md"), "# Setup Guide\n\nHow to set up the project.");
    writeFileSync(join(wikiDir, "api.md"), "# API Reference\n\nAPI docs here.");
    writeFileSync(join(wikiDir, "deploy.md"), "# Deployment\n\nDeployment instructions.");

    const result = handleWikiQuery(dbPath, { query: "setup" });
    expect(result.isError).toBeUndefined();

    const articles = JSON.parse(result.content[0].text);
    expect(articles).toHaveLength(1);
    expect(articles[0].path).toBe("wiki/setup.md");
    expect(articles[0].content).toContain("How to set up the project.");
  });

  it("matching is case-insensitive", () => {
    const knowledgeDir = join(tempDir, ".knowledge");
    const wikiDir = join(knowledgeDir, "wiki");
    mkdirSync(wikiDir, { recursive: true });

    writeFileSync(
      join(knowledgeDir, "index.md"),
      "- [Setup Guide](wiki/setup.md)\n"
    );
    writeFileSync(join(wikiDir, "setup.md"), "# Setup\n\nContent here.");

    const result = handleWikiQuery(dbPath, { query: "SETUP" });
    expect(result.isError).toBeUndefined();

    const articles = JSON.parse(result.content[0].text);
    expect(articles).toHaveLength(1);
    expect(articles[0].path).toBe("wiki/setup.md");
  });

  it("returns multiple matching articles", () => {
    const knowledgeDir = join(tempDir, ".knowledge");
    const wikiDir = join(knowledgeDir, "wiki");
    mkdirSync(wikiDir, { recursive: true });

    writeFileSync(
      join(knowledgeDir, "index.md"),
      "- [API Overview](wiki/api-overview.md)\n- [API Auth](wiki/api-auth.md)\n- [Setup](wiki/setup.md)\n"
    );
    writeFileSync(join(wikiDir, "api-overview.md"), "# API Overview");
    writeFileSync(join(wikiDir, "api-auth.md"), "# API Auth");
    writeFileSync(join(wikiDir, "setup.md"), "# Setup");

    const result = handleWikiQuery(dbPath, { query: "api" });
    const articles = JSON.parse(result.content[0].text);
    expect(articles).toHaveLength(2);
  });
});

describe("handleWikiIngest", () => {
  it("returns MCP error when .knowledge/ directory does not exist", () => {
    const result = handleWikiIngest(dbPath, { filePath: "/some/file.md" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      "Wiki not initialized. Enable the knowledge plugin first."
    );
  });

  it("returns MCP error when file path does not exist", () => {
    mkdirSync(join(tempDir, ".knowledge"));
    const result = handleWikiIngest(dbPath, {
      filePath: join(tempDir, "nonexistent.md"),
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("File not found");
  });

  it("writes operation JSON to agent-queue/operations/ and returns acknowledgment", () => {
    mkdirSync(join(tempDir, ".knowledge"));
    const sourceFile = join(tempDir, "source.md");
    writeFileSync(sourceFile, "# Source Content");

    const result = handleWikiIngest(dbPath, { filePath: sourceFile });
    expect(result.isError).toBeUndefined();

    const response = JSON.parse(result.content[0].text);
    expect(response.operationId).toMatch(/^wiki-ingest-/);
    expect(response.status).toBe("accepted");

    // Verify the operation file was written
    const operationsDir = join(tempDir, "agent-queue", "operations");
    expect(existsSync(operationsDir)).toBe(true);

    const files = readdirSync(operationsDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^wiki-ingest-.*\.json$/);

    const payload = JSON.parse(
      readFileSync(join(operationsDir, files[0]), "utf-8")
    );
    expect(payload.id).toBe(response.operationId);
    expect(payload.type).toBe("wiki_ingest");
    expect(payload.filePath).toBe(sourceFile);
    expect(payload.status).toBe("accepted");
    expect(payload.createdAt).toBeDefined();
  });

  it("operation ID starts with wiki-ingest- prefix", () => {
    mkdirSync(join(tempDir, ".knowledge"));
    const sourceFile = join(tempDir, "test.md");
    writeFileSync(sourceFile, "content");

    const result = handleWikiIngest(dbPath, { filePath: sourceFile });
    const response = JSON.parse(result.content[0].text);
    expect(response.operationId).toMatch(/^wiki-ingest-\d+-[a-z0-9]+$/);
  });
});
