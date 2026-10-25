import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { z } from 'zod';
import { runActorSync } from '../src/apify.js';
import { buildServer, formatResult, shrink } from '../src/server.js';
import { TOOLS } from '../src/tools.js';

const published = JSON.parse(readFileSync(new URL('./fixtures/actor-inputs.json', import.meta.url)));

// Valid sample arguments per tool, built from each tool's own zod shape + required values.
const SAMPLE = {
  search_google_news: { query: 'ai' },
  find_hiring_companies: { companies: ['https://jobs.lever.co/spotify'], role_keywords: ['data'] },
  get_company_jobs: { career_page_urls: ['https://jobs.lever.co/spotify'] },
  search_indeed_jobs: { query: 'react', location: 'Austin, TX', date_posted_days: '7' },
  get_trustpilot_reviews: { companies: ['apify.com'], star_ratings: ['1', '2'] },
  get_app_reviews: { apps: ['com.spotify.music'] },
  search_reddit: { keywords: ['apify'] },
  find_website_contacts: { websites: ['apify.com'] },
  search_german_property_listings: { locations: ['Berlin'], min_rooms: 2 },
  get_shopify_products: { stores: ['allbirds.com'], only_on_sale: true },
  get_trade_show_exhibitors: { shows: ['medica'], urls: ['https://ish.messefrankfurt.com/frankfurt/en/exhibitor-search.html'], max_items: 20 },
  find_events: { searches: ['AI'], location: 'London', urls: ['https://luma.com/ai'], max_items: 10 },
  search_naukri_jobs: { query: 'python developer', location: 'Bangalore', max_items: 5 },
  find_remote_jobs: { title_includes: ['engineer'], countries: ['US'] },
  search_startup_jobs: { role: 'software engineer', city: 'San Francisco' },
  search_tech_jobs: { query: 'data engineer', location: 'New York' },
  find_reddit_leads: { categories: ['CRM'], competitors: ['HubSpot'] },
  search_research: { queries: ['solid state battery'], posted_within_days: 30 },
  search_gov_updates: { keywords: ['AI'], jurisdictions: ['uk'] },
  search_tenders: { sectors: ['tech'], countries: ['GB'] },
  get_alerts: { countries: ['IN'], hazards: ['flood'] },
  search_grants: { keywords: ['battery'], countries: ['EU'] },
  get_india_district_notices: { states: ['Bihar'], categories: ['tenders'] },
  search_legislation: { keywords: ['sanctions'], countries: ['EU'] },
  get_supplier_contracts: { suppliers: ['Accenture'], countries: ['GB'] },
  screen_sanctions: { names: ['Rosneft'], date_of_birth: '1952' },
  search_recalls: { keywords: ['peanut'], categories: ['food'] },
  analyze_field: { fields: ['solid state battery'] },
  validate_idea: { ideas: ['a drone that plants trees'] },
  analyze_shopify_stores: { stores: ['allbirds.com'] },
};

test('every tool has a sample and a published Actor to map onto', () => {
  for (const t of TOOLS) {
    assert.ok(SAMPLE[t.name], `no sample for ${t.name}`);
    assert.ok(published[t.actor], `${t.actor} missing from fixtures/actor-inputs.json`);
  }
});

test('mapped input only uses fields the published Actor accepts', () => {
  for (const t of TOOLS) {
    const args = z.object(t.shape).parse(SAMPLE[t.name]);
    const input = t.map(args);
    const unknown = Object.keys(input).filter((k) => !published[t.actor].includes(k));
    assert.deepEqual(unknown, [], `${t.name} sends unknown fields to ${t.actor}`);
    assert.ok(Number.isInteger(t.limit(args)) && t.limit(args) > 0, `${t.name} limit`);
  }
});

test('empty optional values are not sent', () => {
  const t = TOOLS.find((x) => x.name === 'search_indeed_jobs');
  const input = t.map(z.object(t.shape).parse({ query: 'react' }));
  assert.equal('locations' in input, false);
  assert.equal('jobType' in input, false);
});

test('tools that need a source reject calls without one', () => {
  const hiring = TOOLS.find((x) => x.name === 'find_hiring_companies');
  assert.match(hiring.check({ role_keywords: ['data'] }), /companies|searches/);
  const reddit = TOOLS.find((x) => x.name === 'search_reddit');
  assert.match(reddit.check({}), /keywords or subreddits/);
  const jobs = TOOLS.find((x) => x.name === 'get_company_jobs');
  assert.match(jobs.check({}), /career_page_urls or company_names/);
  const leads = TOOLS.find((x) => x.name === 'find_reddit_leads');
  assert.match(leads.check({}), /categories or competitors/);
});

test('runActorSync sends token, limit and spend cap; parses items', async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = { url: String(url), init };
    return new Response(JSON.stringify([{ a: 1 }]), { status: 201, headers: { 'x-apify-run-id': 'r1' } });
  };
  const out = await runActorSync({
    actor: 'tacps126/google-news',
    input: { queries: ['x'] },
    limit: 5,
    token: 'tok',
    maxChargeUsd: 0.25,
    fetchImpl,
  });
  assert.deepEqual(out, { items: [{ a: 1 }], runId: 'r1' });
  const url = new URL(seen.url);
  assert.equal(url.pathname, '/v2/acts/tacps126~google-news/run-sync-get-dataset-items');
  assert.equal(url.searchParams.get('limit'), '5');
  assert.equal(url.searchParams.get('maxTotalChargeUsd'), '0.25');
  assert.equal(seen.init.headers.authorization, 'Bearer tok');
  assert.equal(url.search.includes('tok'), false, 'token must not be in the URL');
});

test('runActorSync turns API failures into readable errors', async () => {
  const make = (status, body) => async () => new Response(body, { status });
  const base = { actor: 'a/b', input: {}, limit: 1, token: 't', maxChargeUsd: 1 };
  await assert.rejects(runActorSync({ ...base, token: '' }), /APIFY_TOKEN is not set/);
  await assert.rejects(runActorSync({ ...base, fetchImpl: make(401, '{}') }), /rejected the API token/);
  await assert.rejects(
    runActorSync({ ...base, fetchImpl: make(402, '{"error":{"message":"limit"}}') }),
    /Not enough Apify credit.*limit/,
  );
  await assert.rejects(runActorSync({ ...base, fetchImpl: make(408, '{}') }), /did not finish in time/);
});

test('shrink and formatResult bound the output size', () => {
  assert.equal(shrink('x'.repeat(2000)).length, 601);
  const items = Array.from({ length: 400 }, (_, i) => ({ i, text: 'y'.repeat(500) }));
  const out = formatResult({ title: 'T' }, items);
  assert.ok(out.length < 61_000);
  assert.match(out, /Showing the first \d+ of 400/);
});

test('server registers every tool and surfaces missing-token errors', async () => {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
  const server = buildServer({ env: {}, fetchImpl: async () => assert.fail('must not call network') });
  const client = new Client({ name: 'test', version: '0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);

  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), TOOLS.map((t) => t.name).sort());
  for (const t of tools) assert.ok(t.description.length > 40, t.name);

  const res = await client.callTool({ name: 'search_google_news', arguments: { query: 'ai' } });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /APIFY_TOKEN/);
  await client.close();
});

test('a successful call returns text plus validated structured content', async () => {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
  const items = [{ title: 'A', text: 'x'.repeat(2000) }, { title: 'B' }];
  const fetchImpl = async () => new Response(JSON.stringify(items), { status: 201 });
  const server = buildServer({ env: { APIFY_TOKEN: 't' }, fetchImpl });
  const client = new Client({ name: 'test', version: '0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);

  const { tools } = await client.listTools();
  for (const t of tools) {
    assert.equal(t.outputSchema.type, 'object', `${t.name} outputSchema`);
    assert.equal(t.annotations.readOnlyHint, true, `${t.name} annotations`);
    assert.equal(t.annotations.destructiveHint, false);
  }

  const res = await client.callTool({ name: 'search_google_news', arguments: { query: 'ai' } });
  assert.notEqual(res.isError, true);
  assert.equal(res.structuredContent.tool, 'search_google_news');
  assert.equal(res.structuredContent.count, 2);
  assert.equal(res.structuredContent.truncated, false);
  assert.equal(res.structuredContent.items[0].text.length, 601, 'long text is shortened');
  assert.match(res.content[0].text, /2 result/);
  await client.close();
});

test('exhibitor links go as {url} objects and the limit counts every show', () => {
  const t = TOOLS.find((x) => x.name === 'get_trade_show_exhibitors');
  const args = z.object(t.shape).parse(SAMPLE[t.name]);
  const input = t.map(args);
  assert.deepEqual(input.startUrls, [{ url: 'https://ish.messefrankfurt.com/frankfurt/en/exhibitor-search.html' }]);
  assert.deepEqual(input.exhibitionList, ['medica']);
  assert.equal(t.limit(args), 40);
  assert.equal('startUrls' in t.map(z.object(t.shape).parse({ shows: ['medica'] })), false);
});

test('find_events sends links as {url} objects and counts each search per site', () => {
  const t = TOOLS.find((x) => x.name === 'find_events');
  const args = z.object(t.shape).parse(SAMPLE[t.name]);
  const input = t.map(args);
  assert.deepEqual(input.startUrls, [{ url: 'https://luma.com/ai' }]);
  assert.equal(input.location, 'London');
  assert.equal(t.limit(args), 40);
});

test('analyst prompts carry the rubric and name the tool to call', async () => {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
  const server = buildServer({ env: {} });
  const client = new Client({ name: 'test', version: '0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  const { prompts } = await client.listPrompts();
  assert.deepEqual(prompts.map((p) => p.name).sort(), ['field-opportunity-analysis', 'idea-validation']);
  const field = await client.getPrompt({ name: 'field-opportunity-analysis', arguments: { fields: 'sodium-ion battery; solid state battery' } });
  const text = field.messages[0].content.text;
  assert.match(text, /analyze_field tool with fields \["sodium-ion battery","solid state battery"\]/);
  assert.match(text, /labToMarketGap/);
  assert.match(text, /Evidence quality/);
  const idea = await client.getPrompt({ name: 'idea-validation', arguments: { idea: 'a drone that plants trees' } });
  assert.match(idea.messages[0].content.text, /validate_idea tool with ideas \["a drone that plants trees"\]/);
});
