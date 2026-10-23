# Installing webdata-tools-mcp (for AI assistants)

This is a stdio MCP server published on npm. It needs Node.js 18 or newer and one environment variable.

1. Ask the user for their **Apify API token** (Apify Console → Settings → API & Integrations). A free Apify account works. Don't invent or reuse a token.
2. Add this entry to the MCP settings file (for Cline: `cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "webdata": {
      "command": "npx",
      "args": ["-y", "webdata-tools-mcp"],
      "env": { "APIFY_TOKEN": "<the user's Apify token>" }
    }
  }
}
```

3. Optional settings in `env`:
   - `WEBDATA_MAX_CHARGE_USD`: the most one tool call may spend; default `0.5`.
   - `WEBDATA_TIMEOUT_SECS`: the longest one call may run, 30 to 300; default `150`.
4. Restart the MCP servers and check that 21 tools appear (for example `search_google_news`, `get_company_jobs`, `analyze_field`). Two prompts appear too: `field-opportunity-analysis` and `idea-validation`.
5. To test, call `search_google_news` with `{"query": "open source LLM", "max_items": 5}`. It costs well under one cent on the user's Apify account.

Every tool runs an Apify Actor on the user's own Apify account and is billed per result (about $1–3 per 1,000). Each call is capped at `WEBDATA_MAX_CHARGE_USD`.
