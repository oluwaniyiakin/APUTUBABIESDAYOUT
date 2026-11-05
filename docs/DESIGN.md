# Design Reference

Distilled from the original brief; cross-reference `src/data/*` when adding content.

## Tone (non-negotiable)

Joyful, warm and safe. No violence, no blood, no peril shown. A missed hazard is always a
loving rescue — a cuddle, a halo, a giggle. Game-over copy is affectionate
("Aputu got a little too curious"), never a warning.

## Core loop

Aputu crawls on his own → the player scans ahead → fixes hazards (tap / drag / hold) before he
arrives → speed and busyness build → challenge events add variety → a run ends in a rescue.

## Brief vs. build

| Brief | Status |
|---|---|
| Baby crawling with expressive animation (laugh, clap, point, sneeze, yawn, cry, wave, look back, curious head-tilt…) | ✅ vector rig with gait, 8 expressions, 10 poses |
| Baby AI: pauses at flowers, chases butterflies, stops to pet animals, reaches for balloons, looks back and smiles, crawls toward shiny things | ✅ all of these (`core/baby.ts`, curiosity system in `core/game.ts`) |
| Baby gender, skin, hair, outfit customisable | ✅ gender, 5 skin tones, 5 hair styles, 14 outfits — all visible in-game with matching accessories |
| 15 neighbourhoods | ✅ each with its own skyline, props, road and surroundings |
| Hazards: traffic, animals, gutters, carts, wires, barrels… | ✅ 12 hand-drawn, animated; vehicles/animals move |
| Player actions (stop traffic, plank, mat, distract animals, power off…) | ✅ 12 visible outcomes via 3 gestures |
| Power-ups (12) | ✅ 11, all functional (incl. Magnet Coins and Instant Bridge) |
| Guardians (12) | ✅ 13 drawn characters; every perk implemented and tested |
| Weather (rain, lightning, wind), night mode, power outage | ✅ |
| Challenge Events instead of bosses | ✅ 7 events |
| Game modes (Story/Endless/Challenge/Daily/Time Attack/Puzzle/Hardcore/Zen) | ✅ Endless, Zen, Time Attack, Hardcore; Daily Missions separate; Story is delivered as the intro + chapter cards + scrapbook. Puzzle mode not built |
| Scoring: coins, distance, hazards, combos, stars, XP, daily missions | ✅ all |
| Failure: baby sits and cries, nanny picks him up, angel, stars | ✅ exactly this |
| Sound: baby laughs, traffic, dogs, rain… | ✅ synthesised giggle, cry, honk, bark, baa, cluck, meow, thunder, rain |
| Accessibility: colour-blind, subtitles, adjustable difficulty | ◐ colour-blind, reduce-motion, hints, Zen. Audio subtitles not built (speech is shown as bubbles) |
| Monetisation | Out of scope for a static build (no ads/IAP) |
| Unity/Unreal 3D "Pixar-style" | ✗ This is a 2D web game; the art is original vector code |

## Guardian perk philosophy

A perk should change *how a run feels*, not only add a number: Grandpa eases the opening,
Mom rewards sustained play, Firefighter gives one dramatic save, the Village Chief shows
trouble sooner. Add new ones in `data/nannies.ts` **and** implement them — a test fails
otherwise.
