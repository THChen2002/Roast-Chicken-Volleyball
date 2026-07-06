# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev       # Vite dev server, http://localhost:5173
npm run build      # production build (outputs dist/)
npm run preview    # serve the production build locally
npm run seed        # node scripts/seed.mjs — writes config/* (marquee, regulations, registration, aboutFiles) only (see below)
```

There is no lint or test setup in this repo (no ESLint config, no test framework). `npm run build` is the
only automated correctness check available — always run it after non-trivial changes.

## Architecture

### Dual-bundle SPA, one entry point
`src/main.jsx` inspects `window.location.pathname` and dynamically imports one of two independent React
apps — the public site (`src/App.jsx`) or the admin backend (`src/admin/AdminApp.jsx`, mounted at
`/admin` with `BrowserRouter basename="/admin"`). Each imports its own CSS. Neither bundle downloads the
other's code. When editing shared logic (`src/lib/*`, `src/services/firestore.js`), remember both bundles
depend on it.

### Firestore is the only backend
No custom server — `src/services/firestore.js` is the entire data access layer (subscriptions, CRUD).
`src/firebase.js` holds the (public, client-safe) Firebase config inline — no `.env`. Real access control
lives in `firestore.rules`, not in the client code.

Admin auth: Google sign-in via `src/hooks/useAuth.js`; a user is treated as admin only if
`users/{uid}.permission == 'admin'` exists in Firestore (checked both client-side in `AdminGate` for UI
gating and server-side in `firestore.rules` for real enforcement). There's no self-service promotion —
the first admin has to be created by hand in the Firebase console.

### `matchNo` ties everything together
Every match (prelim or finals) is one document at `results/{matchNo}` — the single record for schedule
(date/time/field) *and* score. While a match is being scored live, `admin/components/Scoreboard.jsx`
writes the same score payload to **two** places at once: `results/{matchNo}` (so the public schedule/
results pages update) and `liveMatches/{courtName}` (an ephemeral per-court "now playing" board that
drives the `/score` live page and its popularity voting). `results.status` moves
`scheduled → live → done`; `deriveStatus()` in `admin/pages/ScheduleAdmin.jsx` derives it from set scores
rather than letting it be hand-edited.

### Placeholder seeds, resolved at display time
Match documents never store final team names directly in a durable way — `results.teams`/`results.seeds`
hold placeholder tokens: `A1`…`F4` (prelim bracket position), `A冠`/`A亞`/… (post-round-robin rank), or
`22勝`/`22敗` (winner/loser of match 22). `src/lib/teamSeed.js` builds a `seed → team name` map from
`teams[].seed` (an array — a team can hold multiple tokens as it advances) and resolves placeholders to
real names for display. This indirection is what lets "結算排名" (settle group standings) and finals
winner/loser propagation just rewrite a team's `seed` array instead of touching every match document that
references that position.

### The bracket/round-robin structure is fixed code, not data
`src/admin/lib/prelim.js` and `src/admin/lib/finals.js` hardcode the tournament structure: which matchNo
plays which position pair (prelim), and the full 28-match double-elimination bracket graph for finals
(which matchNo's winner/loser feeds into which downstream matchNo). This is deliberate, not legacy cruft:
- `ScheduleAdmin.jsx`'s label dropdowns (`SLOT_OPTIONS`) are generated from it, so scores can only
  reference valid positions.
- `admin/lib/propagateFinals.js` (`finalsPropagationTargets`) uses it to auto-advance a winner/loser's
  resolved name into the next match's placeholder when a finals match is marked done.
- `teamSeed.js`'s `normalizeSeedTags()` uses it to validate a team's seed chain stays attached to a
  reachable bracket path.
- `FinalsBracket.jsx` (public bracket visualization) separately hardcodes its own column/row grid layout
  per matchNo and derives connector lines by parsing these same placeholder labels.

Changing team counts per group, or the bracket shape, means editing these two files (and
`FinalsBracket.jsx`'s layout) by hand — there is intentionally no admin UI to redefine the bracket graph.
Date/time/court scheduling *is* fully admin-editable (`ScheduleAdmin.jsx`), independent of this structure.

### Standings are computed live, not stored
`src/components/GroupStandings.jsx` (`standingsForGroup`) recomputes group rankings on every render
directly from `results`, sorted by win count → total sets lost → point ratio (to 3 decimals). There is no
head-to-head tiebreaker implemented — ties that the automatic rule can't resolve are handled by the manual
up/down override in the admin "循環賽排名" page (`RoundResultsAdmin.jsx`), not by more sort logic.
The `roundResults` Firestore collection (and its CRUD functions in `firestore.js`) still exists in
`firestore.rules` but is **not read or written by any page** — treat it as legacy/unused, not a second
source of truth.

### Volleyball scoring rules
`src/admin/lib/volleyball.js` is the single source of truth for match rules (best-of-3, 25 points for
sets 1–2, 15-point deuce set 3, `computeMatch()` derives set/match winner from raw set scores). Both the
admin `Scoreboard.jsx` and any set-score display logic should treat this file as authoritative rather than
re-deriving win/loss from `gameScore` strings.

### Match day is derived from `date`, not stored per-day labels
`src/lib/matchDay.js` computes "DAY 1/DAY 2" purely by sorting the distinct `date` values across
`results` — there's no separate day index field. `LEGACY_DAY_DATES` exists only as a fallback for any
future old-format document that somehow has a `day` ('day1'/'day2') field but no `date`; production data
was migrated to `date`-only already. `Home.jsx`'s hero date-range text (e.g. "2026/08/01 - 08/02") is a
separate free-text field, `config/registration.eventDate`, edited via `RegistrationAdmin.jsx` — it is not
derived from `results`, so it needs updating by hand alongside the rest of that admin page each season.

### Styling
Tailwind is loaded via CDN in `index.html` with the theme config inline in a `<script>` tag — **there is
no `tailwind.config.js` file**; look in `index.html` for the `navy`/`vbyellow`/`court` color scale and font
families (Barlow Condensed for display/scores, Barlow + Noto Sans TC for body). Component-specific CSS
that Tailwind utilities don't cover cleanly (the live scoreboard, team roster cards) lives in
`src/styles/*.css` and is imported per-page. Prefer the existing white-card-on-`navy-50` / `vbyellow-400`
accent look used across the public pages over introducing new colors.

## Firestore data shape

```
config/marquee          { text, visible }
config/regulations      { articles: [{ title, content }] }
config/tournament        { groups: [{ key, size }], startTime, slotMinutes }
config/registration      { eventDate, url, isOpen, deadline }
config/aboutFiles        { files: [{ title, desc, tag, color, href }] }
announcements/{id}      { date, type, title, content, order }
users/{uid}             { permission: 'admin' | 'user' }
teams/{id}              { order, team, department, group, members[{number,name,gender,status}], seed[] }
courts/{id}             { name, order }
results/{matchNo}       { matchNo, round('prelim'|'finals'), group, date, time, field,
                          teams[2], seeds[2], gameScore, setScores[], status, votes[2] }
liveMatches/{courtName} { index, field, matchNo, set, gameScore, teams[2], setScores[], votes[2], status }
```

`firestore.rules`: everything above is publicly readable; writes require
`users/{uid}.permission == 'admin'`, except `liveMatches` where anyone may update *only* the `votes` field
(popularity voting) — enforced via `onlyVotesChanged()` in the rules file.

## Seed script

`scripts/seed.mjs` uses `firebase-admin` with a service account key (`service-account.json` at repo root,
gitignored, or `GOOGLE_APPLICATION_CREDENTIALS`). It must be run manually (`npm run seed`) — nothing
invokes it automatically. It only writes `config/marquee`, `config/regulations`, `config/registration`, and
`config/aboutFiles`; `teams`/`results`/`liveMatches` are cleared, not repopulated with sample data (teams
are meant to be added via the admin
"參賽名單" page, then assigned to bracket positions via drag-and-drop in "預賽分組").

## Deployment

`BrowserRouter` is used for both bundles (admin with `basename="/admin"`) — any static host needs an SPA
rewrite (all paths, including `/admin/*`, → `index.html`) or deep-linking to sub-routes 404s on refresh.
