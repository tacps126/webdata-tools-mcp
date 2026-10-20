// Release metadata must agree before a tag is cut (CI runs this too).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (f) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));
const pkg = read('package.json');
const server = read('server.json');
const manifest = read('manifest.json');

test('package.json, server.json and manifest.json carry the same version', () => {
  assert.equal(server.version, pkg.version, 'server.json version');
  for (const p of server.packages ?? []) assert.equal(p.version, pkg.version, `server.json ${p.registryType} package version`);
  assert.equal(manifest.version, pkg.version, 'manifest.json version (run npm run build:mcpb)');
});

test('server.json fits the MCP Registry limits', () => {
  // The registry rejects descriptions over 100 characters.
  assert.ok(server.description.length <= 100, `server.json description is ${server.description.length} chars (max 100)`);
  assert.equal(server.name, pkg.mcpName, 'server.json name must equal package.json mcpName');
});
