# TestPaperBuilder — Nuxt frontend

This is the web app for browsing and editing exam papers.

Stack:
- Nuxt 4 + [Nuxt UI](https://ui.nuxt.com)
- Tailwind CSS
- Lucide icons via `@iconify-json/lucide`
- One Vue component per exam section in `components/sections/`

The legacy static site remains in `../site/` and is not used by this app.

## Prerequisites

- Node.js 20+
- Python API server: `./scripts/run_api_server.sh` from the repo root

## Development

```bash
cd web
npm install
npm run dev
```

Open http://127.0.0.1:3000. The Nuxt dev server proxies API requests to `http://127.0.0.1:8000`.

## Useful scripts

- `npm run dev` — start the local dev server
- `npm run build` — build the production server bundle
- `npm run preview` — preview the built app locally
- `npm run generate` — generate a static build, if you only need static output

## Deploy

This app is deployed as a Nuxt server, not a plain static site, because it proxies paper assets and API routes at runtime.

1. Make sure the Python API server is reachable from the web app.
2. Set `NUXT_API_PROXY_TARGET` if the API is not running on `http://127.0.0.1:8000`.
3. Build the app:

```bash
cd web
npm install
npm run build
```

4. Start the production server:

```bash
node .output/server/index.mjs
```

If you want to sanity-check the production build locally first, run `npm run preview`.

## Layout

- App sidebar — Home, English, Chinese, Settings
- Paper viewer — nested sidebar with papers by year, section tabs, and toolbar
- Home — card grid of paper sets with filters

## Section components

Registry: `utils/sectionRegistry.ts` maps section stems to dedicated components.
