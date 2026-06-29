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
  `EPP` Eden Parc (Pitch lots), `GP` Green Parc, `HO` (to confirm).
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

- **`HO`** residence full name (no matching Lagrange code found; possibly a
  non-Lagrange cluster). **`GP` confirmed as Green Parc.**
- **`EPP`** located on site: **Allée des Villas de l'Ardilouse** (~45.002, −1.177),
  numbered evenly 2–12 down the street. Inferred LOT→unit: 7→2, 6→4, 5→6, 4→8,
  3→10, 2→12 (7→2, 4→8, 3→10 confirmed by boss). The **haut** cluster (LOT 11)
  is still to confirm. Unit keys unchanged so occupancy links hold.
- Whether the highlighted pools are the **complete** maintenance list, or just this
  fortnight's active ones.
- Exact chemistry target bands you work to (the defaults above are standard for
  outdoor stabilized pools).

## Roadmap

- Route optimisation between today's stops (Google Maps directions API).
- Optional Google Calendar import of the turnover sheet.
- Photo attachments per visit; consumables/dosing log.
