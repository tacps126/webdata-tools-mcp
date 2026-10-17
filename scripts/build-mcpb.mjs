// Builds dist/webdata-tools-mcp.mcpb (an MCP Bundle: one-click install in Claude Desktop, and the
// artifact Smithery distributes for local stdio servers).
//   node scripts/build-mcpb.mjs
// It writes manifest.json from the tool catalogue, stages a production-only copy of the project in a
// temp folder, and runs Anthropic's `mcpb` packer on it.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TOOLS } from '../src/tools.js';

const root = new URL('..', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const manifest = {
  manifest_version: '0.3',
  name: pkg.name,
  display_name: 'Web Data Tools',
  version: pkg.version,
  description: 'Ten web-data tools for agents: jobs, hiring signals, news, reviews, Reddit, contacts, real estate, Shopify.',
  long_description:
    'Runs ready-made Apify Actors (published by tacps126) on your own Apify account and returns clean JSON. ' +
    'Covers job postings from career pages, LinkedIn and Indeed, hiring signals, Google News, Trustpilot and app-store reviews, ' +
    'Reddit mentions, website contact details, German property listings and Shopify products. ' +
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
      },
    },
  },
  tools: TOOLS.map((t) => ({ name: t.name, description: t.title })),
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
  },
  compatibility: { platforms: ['darwin', 'win32', 'linux'], runtimes: { node: '>=18.0.0' } },
};

const stage = mkdtempSync(join(tmpdir(), 'mcpb-'));
try {
  for (const f of ['src', 'package.json', 'package-lock.json', 'LICENSE', 'README.md']) {
    cpSync(join(root, f), join(stage, f), { recursive: true });
  }
  writeFileSync(join(stage, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  execFileSync('npm', ['ci', '--omit=dev', '--silent'], { cwd: stage, stdio: 'inherit' });
  mkdirSync(join(root, 'dist'), { recursive: true });
  const out = join(root, 'dist', `${pkg.name}-${pkg.version}.mcpb`);
  execFileSync('npx', ['-y', '@anthropic-ai/mcpb@2.1.2', 'validate', join(stage, 'manifest.json')], { stdio: 'inherit' });
  execFileSync('npx', ['-y', '@anthropic-ai/mcpb@2.1.2', 'pack', stage, out], { stdio: 'inherit' });
  console.log(`built ${out}`);
} finally {
  rmSync(stage, { recursive: true, force: true });
}
