// Live smoke test: starts the server over stdio and calls three cheap tools with a tiny spend cap.
// Needs a real token:  APIFY_TOKEN=... node scripts/smoke.mjs   (costs a few cents at most)
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

if (!process.env.APIFY_TOKEN) {
  console.error('Set APIFY_TOKEN first.');
  process.exit(1);
}
const transport = new StdioClientTransport({
  command: 'node',
  args: [new URL('../src/index.js', import.meta.url).pathname],
  env: { ...process.env, WEBDATA_MAX_CHARGE_USD: '0.05' },
});
const client = new Client({ name: 'smoke', version: '0' });
await client.connect(transport);

const calls = [
  ['search_google_news', { query: 'rust programming language', max_items: 3, timeframe: '7d' }],
  ['get_trustpilot_reviews', { companies: ['apify.com'], max_reviews: 3 }],
  ['find_website_contacts', { websites: ['apify.com'], max_items: 1 }],
];
let failed = 0;
for (const [name, args] of calls) {
  const t0 = Date.now();
  const res = await client.callTool({ name, arguments: args });
  const text = res.content[0].text;
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`${res.isError ? 'FAIL' : 'ok  '} ${name} ${secs}s\n${text.slice(0, 300)}\n`);
  if (res.isError) failed += 1;
}
await client.close();
process.exit(failed ? 1 : 0);
