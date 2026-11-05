# Changelog

## 2.0.0 — "He's a person now"

**Characters & art**
- Aputu redrawn as a vector toddler: hands-and-knees gait tied to speed, 8 expressions,
  10 poses, 5 hair styles, gender variants, and an accessory for every outfit.
- 13 guardians drawn as distinct people with a proper run cycle.
- 12 hazards redrawn and animated; each has a visible "fixed!" outcome.
- 15 neighbourhoods with parallax skylines, props, road surfaces and surroundings.
- Weather (rain, storms + lightning, wind, dust, fireflies, confetti) and a real night mode.

**Behaviour**
- Curiosity steering (hazards now always reach him), curiosity moments (flower, butterfly,
  balloon, cat), idle moments (sneeze, yawn, wave, clap), looking back at his guardian.
- Vehicles and animals move; Freeze Traffic and Slow Time now affect them.
- Rescue sequence: helper stops the hazard, guardian scoops him up, halo and stars.
- Challenge events: traffic jam, runaway goat, heavy rain, power outage, parade, broken
  traffic light, golden hour.

**Game**
- Modes: Endless, Zen, Time Attack, Hardcore.
- Levels & titles, stars, per-mode high scores, Nanny's Scrapbook (31 memories).
- All guardian perks and all power-ups are now genuinely implemented.
- Magnet Coins pull collectable road coins; coin trails and coin rain.
- Animated intro story, chapter cards, hint tags, shrinking danger rings.

**Sound:** synthesised giggle, coo, cry, sneeze, honk, bark, baa, cluck, meow, thunder, rain.

**Engineering:** render layer split out as pure functions; 96 tests including a headless
full-game simulation; art/screenshot preview tooling.

**Fixes found by the new simulation:** crash when `AudioContext` is unavailable; curiosity
moments that almost never triggered; Village Chief perk that did nothing.

## 1.0.0
TypeScript/Vite port of the first prototype.
