#!/usr/bin/env node
/* ============================================================
   APUTU: Baby's Day Out — scripts/validate-data.mjs
   Static-analysis sanity checks over the src/data/*.ts content,
   run via `npm run validate`. Catches the kind of mistakes that
   are easy to make by hand when adding a new world/hazard/nanny/
   power-up/outfit and that TypeScript's structural typing won't
   catch (duplicate ids, out-of-order unlock thresholds, hazard
   ids referenced by a world that don't exist anywhere).

   Deliberately dependency-free (no ts-node): it does a light
   regex-based extraction of `id:` fields rather than executing
   the TypeScript, so it works in any Node environment with zero
   installs beyond Node itself.
   ============================================================ */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'src', 'data');
const coreDir = join(__dirname, '..', 'src', 'core');

let errors = 0;
let warnings = 0;

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  errors++;
}
function warn(msg) {
  console.warn(`  ! ${msg}`);
  warnings++;
}
function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

function extractIds(source) {
  // Matches `id: 'something',` at any indentation level
  const matches = [...source.matchAll(/id:\s*'([^']+)'/g)];
  return matches.map(m => m[1]);
}

function extractField(source, field) {
  const matches = [...source.matchAll(new RegExp(`${field}:\\s*([0-9.]+)`, 'g'))];
  return matches.map(m => Number(m[1]));
}

console.log('\nAPUTU data validation\n----------------------');

/* ---------------- Worlds ---------------- */
{
  console.log('\nWorlds (src/data/worlds.ts):');
  const src = readFileSync(join(dataDir, 'worlds.ts'), 'utf8');
  const ids = extractIds(src);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    fail(`Duplicate world ids found (${ids.length} entries, ${uniqueIds.size} unique)`);
  } else {
    pass(`${ids.length} world ids, all unique`);
  }

  const distances = extractField(src, 'unlockAtDistance');
  const sorted = [...distances].sort((a, b) => a - b);
  const isAscending = distances.every((v, i) => v === sorted[i]);
  if (!isAscending) {
    fail('World unlockAtDistance values are not in strictly ascending order — this will confuse the World Map screen');
  } else {
    pass('unlockAtDistance values are in ascending order');
  }
  if (distances[0] !== 0) {
    warn('First world does not unlock at distance 0 — players would start with no available world');
  }
}

/* ---------------- Hazards ---------------- */
let hazardIds = [];
{
  console.log('\nHazards (src/core/hazards.ts):');
  const src = readFileSync(join(coreDir, 'hazards.ts'), 'utf8');
  hazardIds = extractIds(src).filter((_, i, arr) => true);
  const uniqueIds = new Set(hazardIds);
  if (uniqueIds.size !== hazardIds.length) {
    fail(`Duplicate hazard ids found (${hazardIds.length} entries, ${uniqueIds.size} unique)`);
  } else {
    pass(`${hazardIds.length} hazard ids, all unique`);
  }
}

/* ---------------- World -> hazard id cross-reference ---------------- */
{
  console.log('\nWorld hazard references:');
  const src = readFileSync(join(dataDir, 'worlds.ts'), 'utf8');
  const hazardIdArrays = [...src.matchAll(/hazardIds:\s*\[([^\]]+)\]/g)];
  let allValid = true;
  const referenced = new Set();
  hazardIdArrays.forEach((match, worldIndex) => {
    const ids = [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
    ids.forEach(id => referenced.add(id));
    const invalid = ids.filter(id => !hazardIds.includes(id));
    if (invalid.length) {
      fail(`World #${worldIndex + 1} references unknown hazard id(s): ${invalid.join(', ')}`);
      allValid = false;
    }
  });
  if (allValid) pass('Every world.hazardIds entry references a real hazard id');

  const unusedHazards = hazardIds.filter(id => !referenced.has(id));
  if (unusedHazards.length) {
    warn(`Hazard id(s) never referenced by any world: ${unusedHazards.join(', ')}`);
  } else {
    pass('Every hazard is used by at least one world');
  }
}

/* ---------------- Nannies ---------------- */
{
  console.log('\nNannies (src/data/nannies.ts):');
  const src = readFileSync(join(dataDir, 'nannies.ts'), 'utf8');
  const ids = extractIds(src);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    fail(`Duplicate nanny ids found (${ids.length} entries, ${uniqueIds.size} unique)`);
  } else {
    pass(`${ids.length} nanny ids, all unique`);
  }
  if (!ids.includes('nanny')) {
    fail(`No default 'nanny' entry found — Storage.loadCustomization() defaults to nanny: 'nanny'`);
  }
}

/* ---------------- Power-ups ---------------- */
{
  console.log('\nPower-ups (src/data/powerups.ts):');
  const src = readFileSync(join(dataDir, 'powerups.ts'), 'utf8');
  const ids = extractIds(src);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    fail(`Duplicate power-up ids found (${ids.length} entries, ${uniqueIds.size} unique)`);
  } else {
    pass(`${ids.length} power-up ids, all unique`);
  }

  const rarities = extractField(src, 'rarity');
  const totalRarity = rarities.reduce((a, b) => a + b, 0);
  if (totalRarity <= 0) {
    fail('Total power-up rarity sums to 0 — pickRandomPowerup() would loop without ever selecting one');
  } else {
    pass(`Rarity weights sum to ${totalRarity.toFixed(2)} (used as a weighted-random pool, doesn't need to total 1.0)`);
  }
}

/* ---------------- Outfits ---------------- */
{
  console.log('\nOutfits (src/data/outfits.ts):');
  const src = readFileSync(join(dataDir, 'outfits.ts'), 'utf8');
  const ids = extractIds(src);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    fail(`Duplicate outfit ids found (${ids.length} entries, ${uniqueIds.size} unique)`);
  } else {
    pass(`${ids.length} outfit ids, all unique`);
  }
  if (!ids.includes('ankara')) {
    fail(`No 'ankara' outfit found — Storage.loadCustomization() defaults to outfit: 'ankara'`);
  }
}

/* ---------------- Scrapbook coverage ---------------- */
{
  console.log('\nScrapbook (src/data/scrapbook.ts):');
  const src = readFileSync(join(dataDir, 'scrapbook.ts'), 'utf8');
  const ids = [...src.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);
  if (new Set(ids).size !== ids.length) fail('Duplicate scrapbook ids');
  else pass(`${ids.length} scrapbook entries, all unique`);
  const worldIds = extractIds(readFileSync(join(dataDir, 'worlds.ts'), 'utf8'));
  const missing = [
    ...hazardIds.filter(h => !ids.includes(`hazard:${h}`)).map(h => `hazard:${h}`),
    ...worldIds.filter(w => !ids.includes(`world:${w}`)).map(w => `world:${w}`),
  ];
  if (missing.length) fail(`Scrapbook is missing entries for: ${missing.join(', ')}`);
  else pass('Every hazard and every world has a scrapbook entry');
}

/* ---------------- Challenge events ---------------- */
{
  console.log('\nChallenge events (src/data/events.ts):');
  const src = readFileSync(join(dataDir, 'events.ts'), 'utf8');
  const ids = extractIds(src);
  if (new Set(ids).size !== ids.length) fail('Duplicate event ids'); else pass(`${ids.length} events, all unique`);
  const forced = [...src.matchAll(/forcedHazards:\s*\[([^\]]+)\]/g)].flatMap(m => [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]));
  const bad = forced.filter(id => !hazardIds.includes(id));
  if (bad.length) fail(`Events force unknown hazards: ${bad.join(', ')}`); else pass('Every forced hazard exists');
}

/* ---------------- Scenery coverage ---------------- */
{
  console.log('\nScenery (src/render/scenery.ts):');
  const scn = readFileSync(join(__dirname, '..', 'src', 'render', 'scenery.ts'), 'utf8');
  const worldIds = extractIds(readFileSync(join(dataDir, 'worlds.ts'), 'utf8'));
  const missing = worldIds.filter(w => !scn.includes(`'${w}':`));
  if (missing.length) fail(`No scene defined for world(s): ${missing.join(', ')}`); else pass('Every world has a scene definition');
}

/* ---------------- Summary ---------------- */
console.log('\n----------------------');
if (errors > 0) {
  console.error(`FAILED: ${errors} error(s), ${warnings} warning(s)\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`PASSED with ${warnings} warning(s)\n`);
  process.exit(0);
} else {
  console.log('All data files passed validation with no issues.\n');
  process.exit(0);
}
