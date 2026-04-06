import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { existsSync } from "node:fs";

import { handleDiscoverTests } from "./tools/discover-tests.js";
import { handleRunTests } from "./tools/run-tests.js";
import { handleCheckCoverageGaps } from "./tools/coverage-gaps.js";

// Accept project root as CLI arg or env var
const projectRoot = process.argv[2] || process.env.PROJECT_ROOT || process.cwd();

if (!existsSync(projectRoot)) {
  console.error(`Project root does not exist: ${projectRoot}`);
  process.exit(1);
}

const server = new Server(
  { name: "testing-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

// --- List Tools ---

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "discover_tests",
      description:
        "Discover available test suites, files, and test names for Vitest and/or cargo test",
      inputSchema: {
        type: "object" as const,
        properties: {
          runner: {
            type: "string",
            enum: ["vitest", "cargo", "all"],
            description: "Which test runner to query (default: all)",
          },
          file: {
            type: "string",
            description: "Optional file path pattern to filter results",
          },
        },
      },
    },
    {
      name: "run_tests",
      description:
        "Run specified tests and return structured pass/fail/error results per test",
      inputSchema: {
        type: "object" as const,
        properties: {
          runner: {
            type: "string",
            enum: ["vitest", "cargo"],
            description: "Which test runner to use",
          },
          file: {
            type: "string",
            description: "Specific test file to run",
          },
          testName: {
            type: "string",
            description:
              "Test name pattern to filter (regex for vitest, substring for cargo)",
          },
          timeout: {
            type: "number",
            description: "Timeout in milliseconds (default: 120000)",
          },
        },
        required: ["runner"],
      },
    },
    {
      name: "check_coverage_gaps",
      description:
        "Read coverage reports and identify uncovered files and functions",
      inputSchema: {
        type: "object" as const,
        properties: {
          runner: {
            type: "string",
            enum: ["vitest"],
            description: "Coverage source (currently vitest only)",
          },
          coveragePath: {
            type: "string",
            description:
              "Custom path to coverage-final.json (default: coverage/coverage-final.json)",
          },
        },
      },
    },
  ],
}));

// --- Call Tool Dispatch ---

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "discover_tests":
        return await handleDiscoverTests(
          projectRoot,
          args as { runner?: "vitest" | "cargo" | "all"; file?: string },
        );

      case "run_tests":
        return await handleRunTests(
          projectRoot,
          args as {
            runner: "vitest" | "cargo";
            file?: string;
            testName?: string;
            timeout?: number;
          },
        );

      case "check_coverage_gaps":
        return await handleCheckCoverageGaps(
          projectRoot,
          args as { runner?: "vitest"; coveragePath?: string },
        );

      default:
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Unknown tool "${name}"`,
            },
          ],
          isError: true,
        };
    }
  } catch (err) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
      isError: true,
    };
  }
});

// --- Start Server ---

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("Testing MCP server started", { projectRoot });
