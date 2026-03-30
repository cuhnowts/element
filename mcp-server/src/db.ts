import Database, { type Database as DatabaseType } from "better-sqlite3";

const dbPath = process.argv[2] ?? process.env.ELEMENT_DB_PATH;

if (!dbPath) {
  console.error(
    "Error: No database path provided.\n" +
      "Usage: node dist/index.js <path-to-element.db>\n" +
      "Or set ELEMENT_DB_PATH environment variable."
  );
  process.exit(1);
}

const db: DatabaseType = new Database(dbPath, { readonly: true });

db.pragma("journal_mode=WAL");
db.pragma("busy_timeout=5000");

export { db, dbPath };
