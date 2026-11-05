# Architecture

A client-only TypeScript + Canvas 2D game bundled by Vite. State lives in `localStorage`;
all art is vector code and all audio is Web-Audio synthesis, so there are no binary assets.

## Layers

```
data/      what exists      (worlds, nannies, modes, events, scrapbook…)   — plain objects, no logic
core/      how it behaves   (engine, baby AI, hazards, power-ups, storage…) — no drawing
render/    how it looks     (baby, guardians, hazards, scenery, weather…)   — pure functions of state
ui/        menus & HUD      (DOM screens, animated menu canvases, intro)
```

Rules that keep it tidy:

- `render/*` never reads game state; it takes position, scale and a small *draw-state* object.
  That is why the same code draws Aputu in-game, in the Customize preview, in shop thumbnails,
  on the home screen and in the scrapbook — and why every sprite can be smoke-tested headlessly.
- `data/*` never imports engine code. Adding content rarely means touching logic.
- `storage.ts` is the only module that touches `localStorage`.

## The run loop (`core/game.ts`)

Each frame, in order: weather/particles → (rescue sequence if active) → time-attack clock →
speed model → challenge events → power-ups → hazards drift / auto-solves → **steering** →
baby update → nanny follow → world transition → spawning (hazards, curiosity objects, coins) →
hold interaction → miss detection → combo decay. Then `render()`.

### Why hazards matter: curiosity steering

Aputu can't be steered, but `chooseSteer()` points his curiosity at whatever is *nearest ahead*:
the next hazard, or a flower/butterfly/balloon/cat, or a trail of coins. A hazard therefore
always ends up in his lane, so "blocked / missed" is a real, visible event rather than a
bookkeeping rule.

### Curiosity moments

Every ~9–14 s a curiosity object spawns **beyond** any live hazard and opens a *calm window*
(`calmUntilX`) in which no new hazards spawn. `isSafe(dur)` also accounts for how far moving
hazards travel while Aputu stands still. The headless simulation asserts the resulting pacing
(about one moment per 13 s). Without this, hazards arrive so often that the moments never fire.

### Rescue

A miss that no shield/perk absorbs starts a 2.7 s sequence: someone stops the hazard (guard,
plank, mat), the guardian sprints over, scoops Aputu up, a halo and stars appear, he giggles.
Endless/Hardcore/Time Attack then end the run; Zen resumes.

## Modes are data

`data/modes.ts` is a bundle of multipliers (`speedMul`, `spawnMul`, `coinMul`, `rampSpeed`,
`failEnds`, `allowFreeSaves`, `eventsEnabled`, `timeLimit`, `stars`). The engine has one code path.

## Game ↔ UI circular import

`Game` calls `UI` for HUD pieces and `UI` calls `Game` to start/stop runs. This is safe under
ESM because neither is touched at module-evaluation time, only inside methods.

## Testing strategy

| File | Covers |
|---|---|
| `logic.test.ts` | events scheduler, baby behaviour, levels, modes, scrapbook coverage, storage scoring, helpers, **every guardian perk is implemented** |
| `render.test.ts` | every outfit × gender × hair × pose × expression, all 13 guardians, all hazards in every solve stage, all 15 worlds, weather, overlays — nothing throws and everything paints pixels |
| `game-sim.test.ts` | boots the real UI in jsdom with a node-canvas, then plays the real game with an auto-player using genuine mouse events: every mode, events, rescue, Zen, Time Attack, perks, intro flow, pacing |
| `screenshots.test.ts` | opt-in (`PREVIEW=1`): writes real in-game frames to `docs/previews/` |

The simulation has already caught real bugs (a crash when `AudioContext` is missing; curiosity
moments that almost never happened). When adding a feature, add a case there.

## Performance notes

- Entities are depth-sorted once per frame; scenery props are generated from a hash of their
  index (no allocation, infinite street).
- The night/blackout lighting uses one reusable offscreen canvas and only runs when dark.
- HUD DOM writes are cached and only happen when a value changes.
- Lifetime distance is read once per run, not every frame.
