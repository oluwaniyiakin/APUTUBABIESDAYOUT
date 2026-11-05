# Deployment

This project now has a real build step (TypeScript → bundled JS via
Vite), unlike the earlier plain-HTML prototype. Netlify (or any static
host) needs to **run the build**, not just serve the source folder.

## Local build

```bash
npm install
npm run build      # type-checks, then builds to dist/
npm run preview    # serve the production build locally to sanity-check it
```

`npm run build` runs `tsc --noEmit` first, so a type error anywhere in
`src/` or `tests/` will fail the build before Vite even bundles —
catch problems locally with `npm run typecheck` during development.

## Deploy to Netlify

**Option A — Git-connected (recommended now that there's a build step):**

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Netlify: "Add new site" → "Import an existing project".
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Deploy. `netlify.toml` at the repo root already encodes these
   settings, so Netlify should auto-detect them.

**Option B — CLI:**

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

**Option C — drag and drop (no CI):**

1. Run `npm run build` locally.
2. Go to https://app.netlify.com/drop.
3. Drag the generated `dist/` folder in (not the whole repo — Netlify
   Drop serves whatever folder you give it as-is, and `dist/` is the
   built, deployable output).

## Environment / runtime notes

- No environment variables are required — there's no backend, no API
  keys, no secrets. All state is `localStorage` in the player's browser.
- No server-side rendering; this is a fully static single-page app.
- The Vite dev server (`npm run dev`) is for local development only and
  is never what gets deployed.
