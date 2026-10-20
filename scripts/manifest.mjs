// Builds the MCP Bundle manifest from the tool catalogue.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { annotationsOf, outputShape } from '../src/server.js';
import { extraInput, TOOLS } from '../src/tools.js';

const root = new URL('..', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

/** JSON Schema of a tool's arguments, as the server advertises them (defaults stay optional). */
export function inputSchemaOf(tool) {
  const schema = z.toJSONSchema(z.object({ ...tool.shape, extra_input: extraInput }), { io: 'input' });
  delete schema.$schema;
  return schema;
}

/** JSON Schema of the structured result every tool returns. */
export function outputSchemaJson() {
  const schema = z.toJSONSchema(z.object(outputShape));
  delete schema.$schema;
  return schema;
}

export function buildManifest({ withInputSchemas = false } = {}) {
  const m = {
  manifest_version: '0.3',
  name: pkg.name,
  display_name: 'Web Data Tools',
  icon: 'icon.png',
  version: pkg.version,
  description: 'Eleven web-data tools for agents: jobs, hiring signals, news, reviews, Reddit, contacts, real estate, Shopify, exhibitors.',
  long_description:
    'Runs ready-made Apify Actors (published by tacps126) on your own Apify account and returns clean JSON. ' +
    'Covers job postings from career pages, LinkedIn and Indeed, hiring signals, Google News, Trustpilot and app-store reviews, ' +
    'Reddit mentions, website contact details, German property listings, Shopify products and trade-show exhibitor lists. ' +
    'You pay Apify per result (about $1-3 per 1,000); every call has a spend cap.',
  author: { name: 'tacps126', email: 'tacps126@gmail.com', url: 'https://github.com/tacps126' },
  repository: { type: 'git', url: 'https://github.com/tacps126/webdata-tools-mcp' },
  homepage: 'https://github.com/tacps126/webdata-tools-mcp',
  support: 'https://github.com/tacps126/webdata-tools-mcp/issues',
  license: 'MIT',
  keywords: ['jobs', 'hiring-signals', 'news', 'reviews', 'lead-generation', 'apify', 'web-scraping'],
  server: {
    type: 'node',
    entry_point: 'src/index.js',
    mcp_config: {
      command: 'node',
      args: ['${__dirname}/src/index.js'],
      env: {
        APIFY_TOKEN: '${user_config.apify_token}',
        WEBDATA_MAX_CHARGE_USD: '${user_config.max_charge_usd}',
        WEBDATA_TIMEOUT_SECS: '${user_config.timeout_secs}',
      },
    },
  },
  tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
  user_config: {
    apify_token: {
      type: 'string',
      title: 'Apify API token',
      description: 'From Apify Console > Settings > API & Integrations. Actors run on your account.',
      sensitive: true,
      required: true,
    },
    max_charge_usd: {
      type: 'number',
      title: 'Maximum spend per tool call (USD)',
      description: 'Apify stops a run when this is reached.',
      default: 0.5,
      min: 0.05,
      max: 20,
      required: false,
    },
    timeout_secs: {
      type: 'number',
      title: 'Maximum wait per tool call (seconds)',
      description: 'How long one call may run before it is stopped (30 to 300).',
      default: 150,
      min: 30,
      max: 300,
      required: false,
    },
  },
  compatibility: { platforms: ['darwin', 'win32', 'linux'], runtimes: { node: '>=18.0.0' } },
};
  // Smithery's registry requires an inputSchema on every tool of the server card, which the
  // MCPB manifest schema itself rejects; so only the Smithery copy of the bundle carries it.
  if (withInputSchemas) {
    m.tools = TOOLS.map((t) => ({
      name: t.name,
      title: t.title,
      description: t.description,
      inputSchema: inputSchemaOf(t),
      outputSchema: outputSchemaJson(),
      annotations: annotationsOf(t),
    }));
  }
  return m;
}

