// MCP server definition: one typed tool per Apify Actor.

import { readFileSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ApifyError, runActorSync } from './apify.js';
import { extraInput, TOOLS } from './tools.js';

const { version: VERSION } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const DEFAULT_MAX_CHARGE_USD = 0.5;
const DEFAULT_TIMEOUT_SECS = 150;
const MAX_TEXT_CHARS = 60_000; // keep one tool result inside a sane context budget
const MAX_FIELD_CHARS = 600;

/** Truncate very long string fields (job descriptions, review bodies) so results stay readable. */
export function shrink(value) {
  if (typeof value === 'string') {
    return value.length > MAX_FIELD_CHARS ? `${value.slice(0, MAX_FIELD_CHARS)}…` : value;
  }
  if (Array.isArray(value)) return value.map(shrink);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shrink(v)]));
  }
  return value;
}

/** Shape of every successful tool result (also advertised as the tool's output schema). */
export const outputShape = {
  tool: z.string().describe('Name of the tool that produced the result.'),
  count: z.number().int().describe('Number of records the Actor returned.'),
  shown: z.number().int().describe('Number of records included in `items` (can be lower than count when the result is long).'),
  truncated: z.boolean().describe('True when records were left out to keep the result short; ask for fewer items.'),
  items: z.array(z.record(z.string(), z.unknown())).describe('The records. Long text fields are shortened to 600 characters.'),
};

/** MCP annotations: every tool only reads public web data, so it is read-only and repeatable. */
export const annotationsOf = (tool) => ({
  title: tool.title,
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
});

/** Turn dataset items into the text an agent reads plus the structured result, dropping rows if too big. */
export function buildResult(tool, items) {
  const rows = items.map(shrink);
  let kept = rows.length;
  let body = JSON.stringify(rows, null, 1);
  while (body.length > MAX_TEXT_CHARS && kept > 1) {
    kept = Math.max(1, Math.floor(kept * 0.7));
    body = JSON.stringify(rows.slice(0, kept), null, 1);
  }
  const truncated = kept < rows.length;
  const note = truncated
    ? ` Showing the first ${kept} of ${rows.length} (output size limit); ask for fewer items.`
    : '';
  return {
    text: `${tool.title}: ${rows.length} result(s).${note}\n${body}`,
    structured: { tool: tool.name, count: rows.length, shown: kept, truncated, items: rows.slice(0, kept) },
  };
}

/** Same as buildResult but only the text (kept for callers that do not use structured output). */
export const formatResult = (tool, items) => buildResult(tool, items).text;

export function buildServer({ env = process.env, fetchImpl = fetch } = {}) {
  const server = new McpServer({ name: 'webdata-tools-mcp', version: VERSION });
  const maxCharge = Number(env.WEBDATA_MAX_CHARGE_USD) || DEFAULT_MAX_CHARGE_USD;
  const timeoutSecs = Math.min(300, Math.max(30, Number(env.WEBDATA_TIMEOUT_SECS) || DEFAULT_TIMEOUT_SECS));

  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: `${tool.description} Runs the Apify Actor ${tool.actor} on your Apify account (${tool.price}; spend per call is capped at $${maxCharge}).`,
        inputSchema: { ...tool.shape, extra_input: extraInput },
        outputSchema: outputShape,
        annotations: annotationsOf(tool),
      },
      async (args) => {
        const problem = tool.check?.(args);
        if (problem) return { isError: true, content: [{ type: 'text', text: problem }] };
        try {
          const { items } = await runActorSync({
            actor: tool.actor,
            input: { ...tool.map(args), ...args.extra_input },
            limit: tool.limit(args),
            token: env.APIFY_TOKEN,
            maxChargeUsd: maxCharge,
            timeoutSecs,
            fetchImpl,
          });
          const { text, structured } = buildResult(tool, items);
          return { content: [{ type: 'text', text }], structuredContent: structured };
        } catch (err) {
          const text = err instanceof ApifyError ? err.message : `Unexpected error: ${err.message}`;
          return { isError: true, content: [{ type: 'text', text }] };
        }
      },
    );
  }
  return server;
}
