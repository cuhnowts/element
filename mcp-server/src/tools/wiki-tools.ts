import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  accessSync,
  constants,
} from "node:fs";
import { dirname, join } from "node:path";

interface McpResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function handleWikiQuery(
  dbPath: string,
  args: { query: string }
): McpResult {
  const knowledgeDir = join(dirname(dbPath), ".knowledge");

  if (!existsSync(knowledgeDir)) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Wiki not initialized. Enable the knowledge plugin first.",
        },
      ],
      isError: true,
    };
  }

  const indexPath = join(knowledgeDir, "index.md");
  if (!existsSync(indexPath)) {
    return {
      content: [
        { type: "text" as const, text: "No wiki articles matched your query" },
      ],
    };
  }

  const indexContent = readFileSync(indexPath, "utf-8");
  const lines = indexContent.split("\n");
  const query = args.query.toLowerCase();

  // Parse markdown links from index: - [Title](path/to/file.md)
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/;
  const matches: Array<{ title: string; relativePath: string }> = [];

  for (const line of lines) {
    if (!line.toLowerCase().includes(query)) {
      continue;
    }
    const match = line.match(linkPattern);
    if (match) {
      matches.push({ title: match[1], relativePath: match[2] });
    }
  }

  if (matches.length === 0) {
    return {
      content: [
        { type: "text" as const, text: "No wiki articles matched your query" },
      ],
    };
  }

  const articles: Array<{ path: string; content: string }> = [];
  for (const { relativePath } of matches) {
    const articlePath = join(knowledgeDir, relativePath);
    if (existsSync(articlePath)) {
      try {
        const content = readFileSync(articlePath, "utf-8");
        articles.push({ path: relativePath, content });
      } catch {
        // Skip unreadable articles
      }
    }
  }

  if (articles.length === 0) {
    return {
      content: [
        { type: "text" as const, text: "No wiki articles matched your query" },
      ],
    };
  }

  return {
    content: [
      { type: "text" as const, text: JSON.stringify(articles, null, 2) },
    ],
  };
}

export function handleWikiIngest(
  dbPath: string,
  args: { filePath: string }
): McpResult {
  const knowledgeDir = join(dirname(dbPath), ".knowledge");

  if (!existsSync(knowledgeDir)) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Wiki not initialized. Enable the knowledge plugin first.",
        },
      ],
      isError: true,
    };
  }

  if (!existsSync(args.filePath)) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: File not found: ${args.filePath}`,
        },
      ],
      isError: true,
    };
  }

  try {
    accessSync(args.filePath, constants.R_OK);
  } catch {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: File not readable: ${args.filePath}`,
        },
      ],
      isError: true,
    };
  }

  const queueDir = join(dirname(dbPath), "agent-queue");
  const operationsDir = join(queueDir, "operations");
  mkdirSync(operationsDir, { recursive: true });

  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  const operationId = `wiki-ingest-${timestamp}-${random}`;

  const payload = {
    id: operationId,
    type: "wiki_ingest",
    filePath: args.filePath,
    status: "accepted",
    createdAt: new Date().toISOString(),
  };

  writeFileSync(
    join(operationsDir, `${operationId}.json`),
    JSON.stringify(payload, null, 2)
  );

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ operationId, status: "accepted" }),
      },
    ],
  };
}
