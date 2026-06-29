# Lagrange Piscine 🏊

A phone-first **Progressive Web App (PWA)** to organise seasonal pool-maintenance
work across the Lagrange Vacances residences in **Lacanau-Océan**.

It tracks, per pool:

- **Chemistry** — pH, free chlorine, stabilizer (CYA), temperature — logged over
  time with in-range / out-of-range flags.
- **Occupancy** — the Saturday rental turnover cycle (who arrives, who's staying,
  owners, closed units), so you know which pools must be pristine for arrivals and
  which need mid-week cycling.
- **Location** — one tap to open each residence in Google Maps for directions.

No server, no account, no monthly cost. All data lives **on your phone** (browser
local storage) and works **offline**. Export/import JSON for backup.

## Screens

| Tab | What it shows |
|-----|----------------|
| **Today** | This week's arrivals to prep, mid-week checks, pools whose chemistry is due, and a one-tap **multi-stop route** for the day's properties. |
| **Pools** | Every maintained pool grouped by residence, with its latest reading. |
| **Pool detail** | Occupancy timeline, a log-a-reading form, full chemistry history, **suggested corrective actions** when a reading is out of range, a **Mark serviced today** toggle, and **capture GPS here** (stand at the pool, tap once → precise pin for directions/routing). |
| **Schedule** | Each Saturday turnover, grouped by residence. |
| **Map** | Open any residence in Google Maps. |
| **More** | Language (FR/EN), export / import backup, reset to seed data, chemistry targets. |

Every unit is labelled by its **residence-code prefix + logement number** (e.g.
`EC 12`, `HO 187`) to match the rental papers. Residences are either **pool
(maintained)** or **management-only** (`nonPool`, e.g. `HO` = Les Hameaux de
l'Océan in Carcans — no pools). Management-only units stay listed and appear in
**Schedule** for the full rental picture, but are excluded from the maintenance
views (Today's pool work, chemistry-due, the day route) and have no chemistry log.

Interface is **bilingual (French default / English)** — switch under *More → Langue*.
Suggested actions are qualitative prompts (e.g. "pH high → add pH⁻") meant as
reminders, not dosing amounts — always follow your product labels.

## Run it

It's a static site — no build step.

```bash
# locally
python3 -m http.server 8000   # then open http://localhost:8000
```

### Deploy free on GitHub Pages

1. Push this branch / merge to `main`.
2. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   pick the branch and `/ (root)`.
3. Open the published URL on your phone → browser menu → **Add to Home Screen**.
   It then launches full-screen and works offline.

## Data model

Seed data lives in [`js/seed.js`](js/seed.js) and is loaded into local storage on
first run. After that, your edits persist locally and the seed is only re-applied
via **More → Reset to seed data**.

- **Residences** — `EC` Eden Club, `AG` Atlantic Green, `EP` Eden Parc Golf,
  `EPP` Eden Parc (Pitch lots), `GP` Green Parc (pool *tbc*),
  `HO` Les Hameaux de l'Océan (Carcans, management-only).
  Names verified against Lagrange's own residence codes
  (`L-EDEC`, `L-GREE`, `L-GOLF`, `L-GREP`).
- **Pools** — the orange-highlighted units on the residence plans / listed on the
  rotation sheets.
- **Occupancy** — transcribed from the two weekly sheets (turnover Saturdays
  27-Jun and 04-Jul 2026).

### Chemistry targets (editable in `js/seed.js`)

| Metric | Range | Ideal |
|--------|-------|-------|
| pH | 7.0 – 7.6 | 7.2 |
| Free chlorine | 1 – 3 ppm | 2 |
| Stabilizer (cyanuric acid) | 30 – 50 ppm | 40 |

## ⚠︎ To confirm

These were inferred from the source images and are flagged in-app:

- **`EPP`** located & pinned. Two clusters in the Ardilouse golf zone: bas lots
  3–7 ≈ `45.0027, −1.1697` (ZAC de l'Ardilouse / Rés Eden Parc 6); lots 11 & 12
  ("Lot. Éden Club") ≈ `44.9976, −1.1718`. LOT→unit 7→2, 4→8, 3→10 confirmed;
  exact unit # for 11/12 still to confirm. Unit keys unchanged so occupancy holds.
- **`HO`** confirmed **management-only** — Les Hameaux de l'Océan, Carcans-Plage
  (no pools). Kept for cross-referencing; excluded from maintenance views.
- **`GP` (Green Parc)** — pool status unconfirmed (possibly *38 Lot. Green Land,
  33680 Lacanau*). Left as a pool residence for now; to be confirmed / GPS-captured
  on a future visit.
- Individual pool-less units inside a pool residence can be marked `nonPool` on the
  unit (not just the residence) — they drop out of maintenance views but stay in
  Schedule. To be annotated as they're identified.

## Teams (roadmap to a shared tool)

The business runs as several teams. This app is **pool-first**, but the structure
is meant to generalise so it could become a shared team tool later:

| Team | Scope |
|------|-------|
| Management | calls, lists, scheduling, staffing |
| Cleaning | in-person reception + on-departure property checks |
| Gardening | garden upkeep (a subset of properties) |
| **Pools** | pool maintenance — most properties (a few cleaned individually) — **current focus** |
| Technician | repairs & inspections |

How it would extend (no team data invented yet):

- Each residence is `pool` or `nonPool` (management-only); per-**unit** `nonPool`
  exceptions are supported too. The same idea generalises to a per-property
  **services** tag (pool / garden / cleaning / …) plus a **role filter**.
- The existing **Today vs Schedule** split already models it: each team gets its own
  "today's work" view over a **shared rental calendar**.

## Team Sync (optional, two+ phones)

Off by default; the app is fully local/offline without it. When enabled
(*More → Team sync*), it mirrors **chemistry readings, services, and GPS pins**
between phones via **Firebase Firestore** — offline-first, auto-merging,
store-and-forward (logs while offline, syncs when back online).

- **Conflict-free:** readings & visits are append-only docs keyed by unique id;
  pool GPS/notes are last-write-wins. Two people on different houses never clash.
- **Pairing:** both phones enter the same **team code** under *More → Team sync*.
  Data is scoped to `teams/{teamCode}/…`.
- **Security:** the web `apiKey` in `js/sync.js` is a public client identifier
  (safe to commit); access is gated by [`firestore.rules`](firestore.rules)
  (auth required) + the secret team code. The **Admin SDK service-account key is
  a secret and must never be committed** (git-ignored).

Setup (one-time): create a Firebase project, enable **Firestore** + **Anonymous
auth**, paste [`firestore.rules`](firestore.rules) into the Rules tab, and put the
web config in `js/sync.js`. The Firebase SDK is loaded from gstatic and cached by
the service worker for offline use.

## Roadmap

- Confirm GP and any pool-less units; tag per-unit exceptions.
- Route optimisation (nearest-first ordering once enough pools have GPS pins).
- Optional Google Calendar import of the turnover sheet.
- Photo attachments per visit; consumables/dosing log.
- Optional multi-team mode (role filter + per-property service tags).
