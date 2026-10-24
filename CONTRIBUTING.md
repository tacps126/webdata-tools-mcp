# Contributing

Bug reports and ideas are welcome as issues.

## Run the tests

```bash
npm ci
npm test            # offline
```

## Code style

- Plain ES modules, no build step; Node 22+.
- Every tool argument has a `zod` type and a `.describe()` written for an AI agent: what it does, an example.
- Tool descriptions state the source, the main fields and the price; keep counts and prices in sync with the Actors (the release test checks the manifests).
- Never log or echo the Apify token; it is read from `APIFY_TOKEN` or the request header only.
- `npm run lint` (syntax check of every source file) and `npm test` must pass; CI runs both, offline.

## Add or change a tool

1. Edit `src/tools.js`: the tool name, the Actor it runs, a description, one `zod` shape with a
   `.describe()` on every argument, and `map()` from arguments to the Actor's input.
2. Refresh the list of fields the published Actors accept and run the tests; they fail if a tool sends a
   field the Actor does not know:

   ```bash
   node scripts/sync-actor-inputs.mjs
   npm test
   ```
3. Add a sample call to `test/tools.test.js`.
4. Update the tool table in `README.md`.

## Release

Bump the version in `package.json` and `server.json`, then `npm publish`, `mcp-publisher publish`,
and `node scripts/build-mcpb.mjs` for the Claude Desktop / Smithery bundles.
