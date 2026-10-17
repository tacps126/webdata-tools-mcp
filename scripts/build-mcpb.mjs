// Builds dist/webdata-tools-mcp.mcpb (an MCP Bundle: one-click install in Claude Desktop, and the
// artifact Smithery distributes for local stdio servers).
//   node scripts/build-mcpb.mjs
// It writes manifest.json from the tool catalogue, stages a production-only copy of the project in a
// temp folder, and runs Anthropic's `mcpb` packer on it.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildManifest } from './manifest.mjs';

const root = new URL('..', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const manifest = buildManifest();

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

  // Smithery copy: same files, manifest with per-tool inputSchema (an .mcpb is a plain zip).
  const smithery = join(root, 'dist', `${pkg.name}-${pkg.version}.smithery.mcpb`);
  rmSync(smithery, { force: true });
  writeFileSync(join(stage, 'manifest.json'), `${JSON.stringify(buildManifest({ withInputSchemas: true }), null, 2)}\n`);
  execFileSync('zip', ['-qr', smithery, '.'], { cwd: stage });
  console.log(`built ${smithery}`);
} finally {
  rmSync(stage, { recursive: true, force: true });
}
