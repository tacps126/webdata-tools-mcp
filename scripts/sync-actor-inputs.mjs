// Regenerates test/fixtures/actor-inputs.json from the PUBLISHED Actors' latest builds, so the
// tests catch drift between this server's argument mapping and the live input schemas.
// Usage: node scripts/sync-actor-inputs.mjs
import { writeFileSync } from 'node:fs';
import { ACTORS } from '../src/tools.js';

const get = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()).data;
};

const out = {};
for (const actor of ACTORS) {
  const act = await get(`https://api.apify.com/v2/acts/${actor.replace('/', '~')}`);
  const build = await get(`https://api.apify.com/v2/actor-builds/${act.taggedBuilds.latest.buildId}`);
  out[actor] = Object.keys(build.actorDefinition.input.properties);
}
writeFileSync(new URL('../test/fixtures/actor-inputs.json', import.meta.url), `${JSON.stringify(out, null, 2)}\n`);
console.log(`wrote ${Object.keys(out).length} actors`);
