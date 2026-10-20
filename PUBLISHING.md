# Publishing a release

One version goes to several places. GitHub Releases are automatic. npm, the MCP Registry and Smithery are automatic once you switch them on (step 0); until then they are manual. The directories are manual.

## 0. One-time setup: let CI publish to npm, the MCP Registry and Smithery

| Target | What to set up | Where |
|---|---|---|
| **Smithery** | Secret `SMITHERY_API_KEY` (an API key from your Smithery account settings) | GitHub → Settings → Secrets and variables → Actions → **Secrets** |
| **npm** | 1. Trusted Publisher on npmjs.com: package `webdata-tools-mcp` → Settings → Trusted Publisher → GitHub Actions; owner `tacps126`, repository `webdata-tools-mcp`, workflow `release.yml`. 2. Variable `PUBLISH_NPM` = `true` | npmjs.com, then GitHub → … → **Variables** |
| **MCP Registry** | Variable `PUBLISH_MCP_REGISTRY` = `true`. Nothing else: the workflow proves the `io.github.tacps126` namespace with GitHub's OIDC identity | GitHub → … → **Variables** |

Notes:
- Smithery runs whenever the `SMITHERY_API_KEY` secret exists. A `PUBLISH_SMITHERY` entry isn't needed; delete it if you added one.
- Variables and secrets are different lists in GitHub. `PUBLISH_NPM` and `PUBLISH_MCP_REGISTRY` must be **Variables**, because workflows can't read secrets in the conditions that decide whether a job runs.
- npm Trusted Publishing needs no token: npm trusts this repo's `release.yml` and adds a provenance badge. If your npm account requires approval for publishes, approve it on npmjs.com when the job runs.
- Without these, publish by hand (steps 3 and 4).

**Publish an existing version** (e.g. after adding the setup above): Actions → Release → **Run workflow**, tick **republish**. The GitHub Release isn't recreated; only the publish jobs run.

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
4. Publishes to whatever step 0 set up:
   - `npm publish --provenance`
   - then `mcp-publisher publish`
   - and `smithery mcp publish` of the `.smithery.mcpb` file

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

## 4. Smithery (when CI publishing is off)

Smithery has no web upload; publish with its CLI. You are already logged in on this machine; otherwise run `npx -y @smithery/cli@latest auth login` first.

```bash
npm run build:mcpb
```

```bash
npx -y @smithery/cli@latest mcp publish dist/webdata-tools-mcp-X.Y.Z.smithery.mcpb -n tacps126/webdata-tools-mcp
```

Use the **`.smithery.mcpb`** file, not the plain `.mcpb`. It carries the per-tool input schemas Smithery needs for its tool forms and score. The same file is attached to each GitHub Release.

## 5. Directories and lists

| Where | How it updates | Status / action |
|---|---|---|
| GitHub Releases | CI, every version | Automatic |
| npm | CI (if enabled) or `npm publish` | Every version |
| Official MCP Registry | CI (if enabled) or `mcp-publisher publish` | Every version. Description ≤ 100 characters |
| Smithery | CI (if enabled) or `smithery mcp publish` of `.smithery.mcpb` | Every version (step 4) |
| Glama | Syncs from the GitHub repo (`glama.json`) | Check the listing after a release; answering issues and regular commits raise its score |
| MCPRush | Listed (mcprush.com/to/webdata-tools-mcp) | Check after releases; README card badge in place |
| awesome-mcp-servers | PR `punkpeye/awesome-mcp-servers#16764` (fork branch `add-webdata-tools-mcp`), **open, not merged yet** | Edit the entry on the fork branch when the tool count changes |
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
- [ ] Smithery: `.smithery.mcpb` published (CI or CLI)
- [ ] If the tool list or count changed: README, awesome-mcp-servers entry, and the site (`tacps126.github.io`: `MCP_TOOLS` in `build.mjs`, then `node build.mjs`)
- [ ] If a listing was added or removed: README badges and **Listed on** section, this table, and the site's listing links (`build.mjs`: header links, MCP page pills, FAQ "Where is it listed?")

## Badges

| Badge | Source | Note |
|---|---|---|
| npm version, GitHub release, license, MCP Registry, Smithery | shields.io | Smithery's own badge (`smithery.ai/badge/tacps126/webdata-tools-mcp`) returned HTTP 500 on 2026-10-18 and 2026-10-20; use it once it renders |
| CI | GitHub Actions | |
| Glama score + card | glama.ai | Score in the header row, card under **Listed on** |
| MCPRush card | mcprush.com | Under **Listed on** |
