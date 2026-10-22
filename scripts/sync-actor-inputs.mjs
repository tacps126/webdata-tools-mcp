// Regenerates test/fixtures/actor-inputs.json from the PUBLISHED Actors' latest builds, so the
// tests catch drift between this server's argument mapping and the live input schemas.
// Usage: node scripts/sync-actor-inputs.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { ACTORS } from '../src/tools.js';

const get = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()).data;
};

// Actors not public yet (the API answers 404 without a token): read the input schema
// from the sibling apify_actors checkout instead, which is what their latest build uses.
const MONOREPO = new URL('../../apify_actors/actors/', import.meta.url);
const localSchema = (name) => {
  for (const top of readdirSync(MONOREPO)) {
    const dirs = [new URL(`${top}/`, MONOREPO)];
    const variants = new URL(`${top}/variants/`, MONOREPO);
    if (existsSync(variants)) for (const v of readdirSync(variants)) dirs.push(new URL(`${v}/`, variants));
    for (const d of dirs) {
      const aj = new URL('.actor/actor.json', d);
      if (existsSync(aj) && JSON.parse(readFileSync(aj, 'utf8')).name === name) {
        return JSON.parse(readFileSync(new URL('.actor/input_schema.json', d), 'utf8'));
      }
    }
  }
  return null;
};

const out = {};
for (const actor of ACTORS) {
  try {
    const act = await get(`https://api.apify.com/v2/acts/${actor.replace('/', '~')}`);
    const build = await get(`https://api.apify.com/v2/actor-builds/${act.taggedBuilds.latest.buildId}`);
    out[actor] = Object.keys(build.actorDefinition.input.properties);
  } catch (e) {
    const schema = localSchema(actor.split('/')[1]);
    if (!schema) throw e;
    console.log(`${actor}: not public yet, using the monorepo schema`);
    out[actor] = Object.keys(schema.properties);
  }
}
writeFileSync(new URL('../test/fixtures/actor-inputs.json', import.meta.url), `${JSON.stringify(out, null, 2)}\n`);
console.log(`wrote ${Object.keys(out).length} actors`);
