-- Plugin MCP tool registry for cross-process MCP server access
CREATE TABLE IF NOT EXISTS plugin_mcp_tools (
    prefixed_name TEXT PRIMARY KEY,
    plugin_name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    input_schema TEXT NOT NULL DEFAULT '{}',
    enabled INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_plugin_mcp_tools_plugin ON plugin_mcp_tools(plugin_name);
