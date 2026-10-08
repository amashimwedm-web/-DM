# Togetherly — working notes for automated agents

## What this app is

A dependency-free static front-end prototype: `index.html`, `styles.css`, `app.js`
and `assets/` at the repository root. No build step, no bundler, no backend, no
npm install. All state lives in browser `localStorage` under the key
`togetherly-v1` — there are no accounts and no external services (the "AI planning
guide" button on the More page is a placeholder that only shows a toast).

## Running it in the Base44 sandbox

```bash
docker compose -f docker-compose.base44.yml up -d
```

- `.base44/dev-server.mjs` serves the repository source on port 3000 and injects a
  small live-reload client into HTML responses (SSE endpoint `/__live-reload`).
  It uses Node built-ins only, so there is nothing to install and no network
  dependency at boot. Editing `index.html`, `styles.css` or `app.js` reloads the
  open preview automatically; no restart is needed.
- Because files are read from the mounted repo on every request, what the preview
  serves is always the live source. Nothing is prebuilt or copied into the image.
- The container has no Host/Origin allowlist, so the preview proxy host is accepted
  as-is. `BASE44_PREVIEW_MODE` is not used by this project.

## How to verify it works

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/     # 200
docker compose -f docker-compose.base44.yml ps                      # health: healthy
```

Behaviour worth checking in the browser: the sidebar switches pages, ticking a
planning step persists (reload keeps it ticked), changing the budget currency
re-renders the amounts, and the More-page tiles add a note to the plan.

## Notes

- Test/temporary state written to `localStorage` during a check stays in the
  viewer's browser. Clear the `togetherly-v1` key to return to the defaults.
- The GitHub Pages setup described in `README.md` is the intended public host;
  there is no deployment configuration in this repository.
