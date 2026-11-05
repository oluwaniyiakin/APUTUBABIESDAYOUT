# assets/

Source design assets — **not** automatically served by Vite. This is
where original/master art and audio files would live before being
optimized and either:

- placed in `public/` (served as-is, e.g. favicon, manifest icons), or
- imported directly into TypeScript/CSS under `src/` (so Vite can
  hash, optimize, and bundle them).

## Current status

The shipped build currently needs **zero binary assets**:

- `images/` — sprites are drawn procedurally on the `<canvas>`
  (`src/core/game.ts`) plus emoji glyphs, so there's nothing to place
  here yet. Add real art (PNG/SVG spritesheets) here as a staging area
  once available, then wire it up in `game.ts`'s `drawBaby()` /
  `drawHazard()` / `drawPowerup()` methods.
- `sfx/` — all sound is synthesized live via the Web Audio API in
  `src/core/audio.ts`. Add real recorded audio here once available,
  then swap the `tone()` calls for buffer playback.

Both folders are kept in version control via `.gitkeep` so the
structure is ready to receive real files without further setup.
