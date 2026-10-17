import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildManifest } from '../scripts/manifest.mjs';
import { TOOLS } from '../src/tools.js';

test('the MCPB manifest lists every tool without extra keys (the MCPB schema is strict)', () => {
  const m = buildManifest();
  assert.deepEqual(m.tools.map((t) => t.name).sort(), TOOLS.map((t) => t.name).sort());
  for (const t of m.tools) assert.deepEqual(Object.keys(t).sort(), ['description', 'name']);
});

test('the Smithery manifest gives every tool an object inputSchema', () => {
  const m = buildManifest({ withInputSchemas: true });
  for (const t of m.tools) {
    assert.equal(t.inputSchema.type, 'object', t.name);
    assert.ok(Object.keys(t.inputSchema.properties).length > 1, t.name);
    assert.ok('extra_input' in t.inputSchema.properties, t.name);
  }
});
