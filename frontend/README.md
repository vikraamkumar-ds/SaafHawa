# SaafHawa — Frontend

Multi-page static site. Talks to the FastAPI backend at the URL in `config.js`.
**Works even when the backend is unreachable** — a built-in deterministic
fallback mirrors the backend, so the demo never goes blank.

```
frontend/
├── index.html      ← Home (landing, hero, problem, how it works, CTA)
├── app.html        ← The tool itself (AQI / household / verdict / ask)
├── about.html      ← Mission, civic themes, team, partners
├── styles.css      ← shared brand theme
├── shared.js       ← nav + footer + team/partners renderers
├── app.js          ← tool state, API calls, offline fallback
├── team.js         ← ★ EDIT YOUR TEAM AND PARTNERS HERE
└── config.js       ← ★ EDIT API_BASE HERE
```

## Quick start

The backend should be running on http://localhost:8000 (see `../backend/README.md`).
Then in another terminal:

```bash
cd frontend
python -m http.server 9000
# open http://localhost:9000
```

## Two places to edit

### 1. Backend URL — `config.js`

```js
window.SAAFHAWA_CONFIG = {
  API_BASE: "https://your-backend-url",   // change me
};
```

Set to `""` (empty string) and the frontend runs in pure-offline-demo mode —
the bilingual fallback handles everything.

### 2. Team and partners — `team.js`

```js
window.SAAFHAWA_TEAM = [
  { name: "Your Real Name", role: "Backend · AI · Data", bio: "...", links: {...} },
  { name: "Teammate Name",  role: "Frontend · UX",        bio: "...", links: {...} },
];

window.SAAFHAWA_PARTNERS = [
  { name: "Code for Pakistan",       role: "Organizer" },
  { name: "FAST NUCES Islamabad",    role: "Host" },
  { name: "Grey Software",           role: "Partner" },
  { name: "Scrimba",                 role: "Partner" },
];
```

Names render as initial-circles with a stable color per name. To use real
logos, replace the `partner-lockup` div in `shared.js` `renderPartners()` with
an `<img>` tag and put the image files in `frontend/img/`.

## Browser support

Modern Chrome / Edge / Safari / Firefox. Uses `fetch`, `async/await`, `color-mix()`.

## How the offline fallback works

If `fetch` to `API_BASE` fails (network, CORS, rate-limit, empty config), the
frontend runs the same rule-based plan that lives in `backend/llm.py`. The
verdict card shows an **OFFLINE GUIDANCE** tag so it's transparent — but the
user always gets a useful answer.
