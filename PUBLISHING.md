# Publishing a release

One version goes to several places. GitHub Releases are automatic. npm and the MCP Registry are automatic once you switch them on (step 0); until then they are manual. Smithery and the directories are manual.

## 0. One-time setup (optional): let CI publish to npm and the MCP Registry

The `Release` workflow can publish without any stored token, using GitHub's OIDC identity:

1. **npm Trusted Publishing:**
   1. On npmjs.com, open the package `webdata-tools-mcp`, then **Settings → Trusted Publisher → GitHub Actions**.
   2. Organization or user: `tacps126`. Repository: `webdata-tools-mcp`. Workflow filename: `release.yml`.
   3. Save.
2. **MCP Registry:** nothing to configure. The `io.github.tacps126/...` namespace is proved by the workflow running in `github.com/tacps126`.
3. In the GitHub repo, open **Settings → Secrets and variables → Actions → Variables** and add:
   - `PUBLISH_NPM` = `true`
   - `PUBLISH_MCP_REGISTRY` = `true`

Until both variables exist, those two jobs are skipped and you publish by hand (step 3).

## 1. Prepare the version (on your machine)

1. Bump the version in `package.json` and in **both** places in `server.json`: the top-level `version`, and `packages[0].version`.
2. Run:
   ```bash
   npm run sync:inputs
   ```
   This refreshes `test/fixtures/actor-inputs.json` from the live Actors.
3. Run:
   ```bash
   npm test
   ```
   The tests check that the three version numbers match, that the `server.json` description is at most 100 characters (the MCP Registry limit), and that every tool only sends fields its Actor accepts.
4. Run:
   ```bash
   npm run build:mcpb
   ```
   This regenerates `manifest.json` and builds both bundles into `dist/`.
5. Commit everything, including `manifest.json`, and push to `main`.

## 2. What CI does on that push

`.github/workflows/release.yml` sees the new version in `package.json` and:

1. runs the tests and builds the bundles again;
2. fails if the committed `manifest.json` is stale;
3. creates the tag `vX.Y.Z` and a **GitHub Release** with two files:
   - `webdata-tools-mcp-X.Y.Z.mcpb`: the MCP Bundle. Claude Desktop installs it with one click.
   - `webdata-tools-mcp-X.Y.Z.smithery.mcpb`: the same files with per-tool input schemas. Smithery needs those schemas, but the official MCPB validator rejects them, hence two files.
4. If enabled: `npm publish --provenance`, then `mcp-publisher publish`.

A version that is already tagged is skipped. To re-run by hand, use **Actions → Release → Run workflow**.

## 3. Manual publishing (when CI publishing is off)

From the repo root:

```bash
npm publish
```

```bash
mcp-publisher login github
```

```bash
mcp-publisher publish
```

`npm publish` asks for your passkey.

## 4. Smithery (manual every release)

1. Download `webdata-tools-mcp-X.Y.Z.smithery.mcpb` from the GitHub Release, or take it from `dist/` after `npm run build:mcpb`.
2. On smithery.ai, open the server **tacps126/webdata-tools-mcp** and upload the file as a new release.

Upload the `.smithery.mcpb` file, not the plain one: without the input schemas Smithery's listing loses its tool forms and its score drops. (The Smithery CLI refused an update once; the web upload works.)

## 5. Directories and lists

| Where | How it updates | Status / action |
|---|---|---|
| GitHub Releases | CI, every version | Automatic |
| npm | CI (if enabled) or `npm publish` | Every version |
| Official MCP Registry | CI (if enabled) or `mcp-publisher publish` | Every version. Description ≤ 100 characters |
| Smithery | Upload `.smithery.mcpb` | Every version (step 4) |
| Glama | Syncs from the GitHub repo (`glama.json`) | Check the listing after a release; answering issues and regular commits raise its score |
| awesome-mcp-servers | PR `punkpeye/awesome-mcp-servers#16764` (fork branch `add-webdata-tools-mcp`) | Edit the entry on the fork branch when the tool count changes |
| PulseMCP | Reportedly ingests the official MCP Registry | Check the listing exists; if not, use its submit form |
| Cline MCP Marketplace | Submission issue on `github.com/cline/mcp-marketplace` | Not submitted yet. Needs the repo URL, logo and a short reason |
| LobeHub MCP | Submit on lobehub.com (MCP section) | Not submitted yet |
| mcpservers.org | Submit form | Not submitted yet (free) |
| cursor.directory | Submit form (MCP section) | Not submitted yet |
| mcp.so | Paid form ($39), or free: comment on `chatmcp/mcpso` issue #1 | Free route not used yet |
| Docker MCP Catalog | PR to `docker/mcp-registry` | Not applicable yet: it needs a container image, and this server runs with `npx` |

The rows marked "reportedly", plus the submission flows of directories we haven't used yet, come from secondary sources. Check each one's current page before submitting. Submitting is done under your own accounts.

## Checklist per release

- [ ] Versions bumped (package.json, server.json ×2); `npm test` green
- [ ] `npm run build:mcpb`; `manifest.json` committed; pushed to `main`
- [ ] GitHub Release `vX.Y.Z` has both `.mcpb` files
- [ ] npm and MCP Registry published (CI or manual)
- [ ] Smithery: `.smithery.mcpb` uploaded
- [ ] If the tool list or count changed: README, awesome-mcp-servers entry, and the site (`tacps126.github.io`: `MCP_TOOLS` in `build.mjs`, then `node build.mjs`)
