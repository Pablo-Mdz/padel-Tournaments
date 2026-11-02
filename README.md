# Padel Team Challenge

Live scoring app for a team padel tournament. A tablet enters the points,
players follow the standings on their phones and a TV shows `/display`.

Built for the 4PADEL Berlin team tournaments,
and reusable for any other tournament: the teams, date, courts and match length
are all set in the app.

**Free and open for public use.** This is a personal, non-commercial side project
by [Pablo Cigoy](https://www.pablocigoy.com) — anyone is welcome to use it to run
their own tournament. Nothing is sold here, there are no ads and no payments.


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

## Tournament formats

`src/formats/` holds one format per file — today only the **Tennessee Tournament**
(teams of four, duels of four matches, a winner on points rather than duels won).
A format owns its name and its rules text, which is written from the live settings so
the rules page and the printed poster always match the tournament that is set up.
Sections marked `poster: true` are the ones that go on the poster. Further formats are meant
to sit beside it in `FORMATS`.

## Screens

| Route        | Purpose |
|--------------|---------|
| `/`          | Scoring: 4 courts of the active round, tap a court to score the duel |
| `/rules`     | How the Tennessee Tournament is played, written from the live settings |
| `/poster`    | The same rules as a one-page A4 poster; print it or save it as a PDF |
| `/standings` | Overall table (decides the champion) + qualifying table, manual tie resolution |
| `/results`   | Final ranking 1–8 with points per round and per match type, CSV/JSON export |
| `/setup`     | Number of teams, players, club logo, courts, match lengths, schedule, backup, reset |
| `/display`   | TV screen, rotates every 15 s: live scores → overall → qualifying |

Courts are always shown with their real numbers (default 2, 3, 4, 5 – editable in Setup).

## Rules implemented

- Duel = Women, Men, Mixed 1, Mixed 2 on the same court. +1 opponent error, +2 winner.
  The duel goes to the team with more total points; draws are allowed.
- 4, 6, 8 or 10 teams, set in Setup. One duel per two teams, so courts = teams / 2.
- Rounds 1 and 2 are fixed pairings, built so nobody meets the same opponent twice.
- Qualifying ranking after round 2 (for round 3 pairings): points for → point difference →
  head-to-head (only if all tied teams played each other) → manual order (shown in red until set).
- Round 3 pairings come from the qualifying table — 1st plays 2nd, 3rd plays 4th, and so
  on — generated when round 2 is closed. They follow later corrections until they are
  edited by hand or a round 3 duel starts.
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
