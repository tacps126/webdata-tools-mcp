// Writes lhm.plugin.json, the manifest LobeHub's marketplace CLI (`lhm plugin publish|update`)
// reads. It mirrors what `lhm plugin init --stdio …` would generate, but from the server in
// memory, so it needs no Apify token and stays in step with every release.
//   node scripts/lobehub-manifest.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../src/server.js';

const root = new URL('..', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

export async function buildLobeHubManifest() {
  const server = buildServer({ env: {} });
  const client = new Client({ name: 'lhm-manifest', version: '1.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  const { tools } = await client.listTools();
  const { prompts } = await client.listPrompts();
  await client.close();
  return {
    author: 'tacps126',
    authorUrl: 'https://github.com/tacps126',
    description: pkg.description,
    homepage: 'https://github.com/tacps126/webdata-tools-mcp',
    icon: 'https://raw.githubusercontent.com/tacps126/webdata-tools-mcp/main/icon.png',
    identifier: 'tacps126-webdata-tools-mcp',
    name: 'Web Data Tools',
    prompts,
    resources: [],
    tags: [...new Set(pkg.keywords)],
    tools,
    version: pkg.version,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = await buildLobeHubManifest();
  writeFileSync(join(root, 'lhm.plugin.json'), `${JSON.stringify(m, null, 2)}\n`);
  console.log(`wrote lhm.plugin.json (${m.tools.length} tools, ${m.prompts.length} prompts, v${m.version})`);
}
