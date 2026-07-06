# World Cup Challenge — Build & Deploy Playbook

A record of what this project is, how it's built, and the exact steps used to
ship it, so a similar contest page can reuse the same pattern.

## What it is

A static HTML page (`World_Cup_Challenge.html`) for the Newton Comm Monday
Men's League's "World Cup Challenge" — a 9-hole group-stage golf contest.
The UI is entirely client-side, but it's backed by a small Worker
(`worker.js`) and a Cloudflare KV namespace so that whatever the scorer
enters is visible to anyone who opens the page — see "Shared results
backend" below.

## Scoring rules

Every hole is scored net-to-par (gross score minus handicap strokes for that
hole, compared to par):

| Result | Points |
|---|---|
| Net birdie or better | 3 (Win) |
| Net par | 1 (Draw) |
| Net bogey or worse | 0 (Loss) |

**Tiebreaker — Penalty Shootout:** most holes won (3-pt holes) across all 9
holes; still tied, most holes drawn (1-pt holes). The philosophy: whoever
beat par most often gets the advantage — like counting goals, not counting
close misses.

**Tiebreaker — Sudden Death:** if still tied, apply the *same* test (most
wins, then most draws) but starting narrow — just Hole 9 — and widening
backward one hole at a time (Holes 8–9, then 7–9, etc.) until someone
separates.

Full writeup lives in `World_Cup_Challenge_Rules.md`.

## Page structure

1. **Hero** — league name (small gold "eyebrow" label), contest name as a
   big display headline, one-paragraph explainer, and three stat chips
   (Win/Draw/Loss point values).
2. **Match Sheet** (input table) — one row per player, one column per hole.
   Each hole cell stacks a strokes-allowed input, a gross-score input, and a
   live point badge. Player names are sorted by tee time (from the posted
   tee sheet), then last name within each tee time group. Tab order goes
   strokes(1–9) then gross(1–9) for one player before moving to the next.
3. **Group Table** (standings) — sorted by points. Columns: Pos, Player,
   Holes (a row of W/D/L badges with hole-number ticks above them so you can
   tell which badge is which hole), a gap, then two 2-column stat blocks —
   **Shootout** (wins/draws across all 9 holes) and **Sudden Death**
   (wins/draws in whichever window actually decided that player's tie,
   defaulting to Hole 9 if Sudden Death was never needed) — then Pts. The
   specific stat that decided a tie is highlighted gold, and the matching
   hole badge(s) get a gold ring.
4. **Tiebreaker Breakdown panel** — appears only when there are ties;
   groups tied players by point total and states in plain language which
   round (Penalty Shootout or Sudden Death + hole range) and stat separated
   them.
5. **Controls row** — Calculate Standings, Reset All Scores, Save to File,
   Load from File, and a small lock icon (see below).
6. **Footer** — visually mirrors the hero (same gradient, border, and gold
   dash-label styling) with the contest + league name.

## Edit-lock (PIN) feature

The Match Sheet inputs and "Reset All Scores" are disabled by default. A
lock icon next to Reset opens a small popover; entering the correct PIN
unlocks editing for the rest of that browser tab's session
(`sessionStorage` — closing the tab re-locks it). Clicking the icon again
while unlocked re-locks instantly, no PIN needed.

**Important caveat to repeat if you build this again:** this is a
client-side deterrent, not real security. The PIN lives in the page's JS
source and is visible via view-source/devtools. It stops casual tampering,
not a determined person. The PIN itself is saved in the password manager,
not reprinted here.

## Shared results backend

So players can see standings without needing the PIN (and without the
scorer needing to send anyone a file), the site runs as a small Worker with
a Cloudflare KV namespace behind it, instead of pure static assets:

- `wrangler.jsonc` gained a `main: "./worker.js"` entry point, an
  `assets.binding: "ASSETS"` (so the Worker script can fall back to serving
  the static site for any path that isn't its own API), and a
  `kv_namespaces` binding (`SCORES`) pointing at a KV namespace created
  ahead of time in the dashboard (**Storage & databases → KV → Create
  instance**) — this can't be provisioned from a config file alone, it has
  to exist first.
- `worker.js` handles two routes: `GET /api/scores` (public, returns
  whatever's currently stored — this is what makes results visible to
  players) and `POST /api/scores` (requires the same PIN as the client
  lock, checked server-side, and overwrites the stored JSON on success).
  Everything else falls through to `env.ASSETS.fetch(request)`, i.e. the
  normal static site — though in practice static-asset requests are served
  before the Worker script even runs, per Workers' default routing
  behavior, so this fallback mostly matters for stray paths.
- On the client: `calculateStandings()` and `resetAll()` both publish to
  `/api/scores` automatically whenever the sheet is unlocked (so the
  scorer's normal workflow — enter scores, hit Calculate — is also what
  keeps the shared copy current). Every page load fetches `/api/scores`
  and populates the sheet from it, regardless of lock state, so a locked
  (i.e. any normal player's) view still shows current results.
- **Security note:** the PIN is checked server-side now, which is a real
  improvement over the old client-only check — but the PIN is still the
  same value embedded in the page's client-side JS (needed for the unlock
  UI), so someone who reads the page source and calls the API directly
  could still write bad data. This is proportionate for a friendly league
  scoring tool, not bank-grade auth. If you build the next contest's page
  and want stronger separation, the write-PIN would need to never be sent
  to the client at all, which means a different (non-UI-gated) way for the
  scorer to authenticate — more complexity than this project needed.

## Save/Load (manual backup)

"Save to File" serializes every player's strokes/gross inputs to JSON
(matched by player **name**, so it survives future roster reordering) and
triggers a browser download of `world-cup-challenge-scores.json`. "Load
from File" reads a previously saved JSON file back in, repopulates the
sheet, recalculates standings, and — since it's unlocked-only — publishes
the result to the shared backend too. This is a manual, offline-friendly
backup/export path; the shared backend above is what keeps everyone in
sync day to day.

## Favicon

A soccer ball, as an inline SVG encoded as a `data:image/svg+xml;base64,...`
URI directly in the `<link rel="icon">` tag — no separate image file to
manage. For a different sport, swap the SVG shape/colors and re-encode
(`base64 -i icon.svg`).

## Design system (reuse these for a similar page)

CSS custom properties used throughout:

```css
--pitch-dark: #0B3D2E;
--pitch-mid: #14532D;
--turf: #2D6A4F;
--chalk: #F7F7F2;
--navy: #142850;
--crimson: #C8102E;
--gold: #D4AF37;
--line: #DAD9D0;
--ink: #142016;
--muted: #6B7568;
```

Fonts (Google Fonts): **Anton** for the big display headline, **Inter** for
body copy, **JetBrains Mono** for all data, labels, buttons, and uppercase
chip text. Green pitch-gradient hero with a subtle yard-line pattern and
circular "pitch line" decorations; W/D/L badges in green/gray/red; gold
used consistently for "this is the decisive/highlighted thing."

## File naming

Keep it simple and permanent — avoid version-number suffixes like `_1`:
- `<ContestName>.html` — the app itself
- `<ContestName>_Rules.md` — the rules writeup

Renaming later is easy with `git mv`, but do it *before* connecting
Cloudflare Pages/Workers if at all possible — once a URL is shared, direct
links to the old filename break on rename (the site root usually still
works via `_redirects`, but bookmarked deep links don't).

## Deployment playbook: GitHub → Cloudflare

### 1. GitHub

```bash
git init
git remote add origin https://github.com/<you>/<repo>.git
git fetch origin
git checkout -b main origin/main   # pulls in the auto-created README, if any
```

Add a `.gitignore` for local tool cruft (e.g. `.claude/`) before your first
commit. Commit and push your site files.

### 2. Cloudflare — connect the repo

In the dashboard: **Workers & Pages → Create → Pages → Connect to Git**
(or the unified "Import a repository" flow). Authorize the Cloudflare
GitHub App if prompted, select the repo, leave build command blank (static
site, no framework), output directory `/`.

**Gotcha #1:** Cloudflare's current dashboard sets this up as a **Worker**,
not classic Pages — the build log will show `Executing user deploy command:
npx wrangler deploy`. A plain static repo with no `wrangler.jsonc` fails
with *"Could not detect a directory containing static files."* Fix: add a
Wrangler config at the repo root:

```jsonc
// wrangler.jsonc
{
  "name": "your-project-name",
  "compatibility_date": "YYYY-MM-DD",   // today's date
  "assets": {
    "directory": "."
  }
}
```

And a `.assetsignore` (Workers does **not** auto-exclude `.git`,
`.claude`, etc. the way Pages did) so those don't get uploaded as public
assets:

```
.git
.claude
.gitignore
.assetsignore
wrangler.jsonc
node_modules
.DS_Store
```

**Gotcha #2:** if your main HTML file isn't named `index.html`, the site
root (`/`) won't serve it by default. Add a `_redirects` file at the repo
root — Workers static assets supports the same `_redirects` syntax Pages
did:

```
/    /YourFile.html   200
```

**Gotcha #3 (the big one):** if pushes stop auto-deploying and the
dashboard shows *"This project is disconnected from your Git account"* —
the Cloudflare GitHub App most likely doesn't have access to that specific
repo (common if the App is scoped to "only select repositories" instead of
"all repositories"). Fix at **github.com/settings/installations** → find
**Cloudflare Workers and Pages** → **Configure** → add the repo to its
access list → **Save**. Then push a new commit to confirm the webhook
fires — the dashboard's **"New deployment"** button is a *manual
file-upload* tool, not a "rebuild from Git" trigger, so it won't help you
test this; you need an actual push.

### 3. Custom domain

Only works if the domain's nameservers are already pointed at Cloudflare
(an active zone in your account) — unlike classic Pages, Workers Custom
Domains don't support arbitrary external CNAME setups. In the dashboard:
your Worker → **Settings → Domains & Routes → Add → Custom Domain**. DNS
record and SSL cert are created automatically, usually live within a
minute or two.

## If you build the next contest's page from this one

1. Copy `World_Cup_Challenge.html` as a starting template — the CSS
   variables, fonts, and component patterns (badges, chips, tiebreak panel,
   lock feature) are all reusable; swap the `PARS`/`PLAYERS` arrays and the
   scoring/tiebreak language for the new contest's rules.
2. Give it its own repo (or a subfolder + its own `wrangler.jsonc`/
   `_redirects` if you want it in the same repo — Workers only supports one
   asset directory per Worker, so a second contest page likely wants its
   own Worker/project even if it shares the GitHub repo).
3. Generate a fresh PIN if you reuse the edit-lock feature — don't reuse
   this project's PIN.
4. Walk the deployment playbook above in order: GitHub push → Cloudflare
   Git connection → grant repo access to the GitHub App *before* your
   first push if possible → `wrangler.jsonc` + `.assetsignore` +
   `_redirects` → verify → custom domain.
