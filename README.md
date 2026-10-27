# Padel Team Challenge – 4PADEL Berlin

Live scoring app for the team tournament on Saturday 31.10.2026 (12:00–16:00).
A tablet at reception enters the points; a TV in the club shows `/display`.

## Run

```sh
npm install
npm run dev        # development
npm run build      # production build in dist/ (works offline after the first visit)
npm run preview    # serve the build locally
npm test           # unit tests for scoring & standings logic
```

Serve `dist/` from any static host. `/display` needs SPA fallback (included for
Netlify via `public/_redirects`); `#/display` works on any host.

## Screens

| Route        | Purpose |
|--------------|---------|
| `/`          | Scoring: 4 courts of the active round, tap a court to score the duel |
| `/standings` | Overall table (decides the champion) + group tables, manual tie resolution |
| `/results`   | Final ranking 1–8 with points per round and per match type, CSV/JSON export |
| `/setup`     | Teams, players, groups, courts, match lengths, schedule, backup, reset |
| `/display`   | TV screen, rotates every 15 s: live scores → overall → groups |

Courts are always shown with their real numbers (default 2, 3, 4, 5 – editable in Setup).

## Rules implemented

- Duel = Women, Men, Mixed 1, Mixed 2 on the same court. +1 opponent error, +2 winner.
  The duel goes to the team with more total points; draws are allowed.
- Group ranking after round 2 (for round 3 pairings): points for → point difference →
  head-to-head (only if all tied teams played each other) → manual order (shown in red until set).
- Round 3 pairings (1A–1B … 4A–4B) are generated when round 2 is closed and follow later
  corrections until they are edited by hand or a round 3 duel starts.
- Champion and final ranking: total points over all 3 rounds, same tie-breakers.

## Data & sync

- State is saved to `localStorage` on every change and synced to other tabs of the same
  browser via `BroadcastChannel` (with `storage` events and polling as fallback).
- **Backup:** Setup → Download backup (JSON). Import it on another device to continue.
- All UI texts live in `src/i18n/texts.ts`.

## claude.ai build (shared with players and the TV)

```sh
npm run build:artifact                                # → dist-artifact/padel-team-challenge.html
node scripts/package-artifact.mjs path/to/state.json  # optional: embed the currently published results
```

Publish `dist-artifact/padel-team-challenge.html` as an artifact with the capabilities
`artifact`, `user` and `downloads`. The organiser's view republishes the page with the
results embedded; everybody else gets a read-only view that reloads to each new version.

**Connection problems never block the organiser.** Once a device has been confirmed as
the organiser's (first visit with a connection), it is editable immediately on every
later visit, even if claude.ai does not answer. Every change is saved on the device first;
sharing retries in the background (5 s → 60 s) and resumes automatically when the
connection comes back. Do not reload the page while offline – claude.ai itself would
not load; the open page keeps working.
