# Pool detail page — redesign plan

Goal: boil the pool "landing" page down to **three photo-anchored sections**, using the
vertical (iPhone) photos as UI boundaries. Everything that's a *label* becomes an overlay
or an icon; everything that's a *daily tool* stays but gets smaller and better placed.
The advice text panel is replaced by a chemistry graph. History grows full-length at the foot.

The three boundaries (each = one vertical photo):

1. **Portail** — arrival: gate photo, occupation, notes
2. **Piscine** — chemistry: pool photo, chem bars + trend graph, saisir, doses, produits, water/volume icons
3. **Local technique** — pump: pump photo, lavage/sable, pump notes, "entretenue"

Then **Historique**, full length, at the very bottom.

---

## 1 · PORTAIL (gate photo)

| now | proposed |
|---|---|
| `AG 7` title + status line | keep on the photo overlay |
| **Itinéraire** + **Placer sur la carte** — large buttons | smaller, more discreet (icon-buttons on the overlay) |
| GPS coords + "Effacer le GPS" row | keep, compact, under the photo |
| `Dernier entretien 20 juil.` | keep, compact |
| **Occupation** — titled card | drop the "Occupation" title; put the current-guest line as an **overlay on the gate photo** (name · arr → dep · status chip) |

## 2 · NOTES (no photo — sits between portail and piscine)

| now | proposed |
|---|---|
| **Notes** title | drop the title |
| new-note box `ex. vérifier…` + **À faire** checkbox + photo + **Ajouter** | keep the input as just "note de pompe/pool" style; **remove the "À faire (action requise)" checkbox** (to-dos belong to the *Aujourd'hui* page, not here) |
| note must be tagged to a pool | **auto-tag** the note to this pool (e.g. AG 7) — no manual step |
| existing notes list | keep as-is |

## 3 · ACTION SUGGÉRÉE → replaced by a chem graph

- **Remove** the "Action suggérée" bullet panel entirely.
- The advice was static; the *history* already carries the real signal. So instead, after
  **Saisir une mesure**, show a **small pH / Cl / CyA trend graph** (same style as the
  Piscines-page sparkline: shared time axis, stable band, treated-blue caps, product ticks).
- The graph lives with the **Entretien** recommendation (the dose line stays — it's useful).

## 4 · PISCINE / CHIMIE (pool photo)

| now | proposed |
|---|---|
| **Chimie** titled card + "Estimé…" | pool photo is the section; **chem trend graph minimally overlaid** on the photo overlay region |
| chem mini-bars `CL% · CL · CYA · /jour` | keep — glanceable |
| `traité — à revérifier` line | keep, small |
| **DOSES** + Entretien line | keep, move **under** "Saisir une mesure" |
| **＋ Saisir une mesure** | keep (daily tool, minimal) — better placement; **Doses underneath it** |
| water 💧 + volume live here as overlay icons | see §6, §7 |

## 5 · PRODUITS AJOUTÉS

| now | proposed |
|---|---|
| **Produits ajoutés** title + "noter ce qui a été ajouté…" note | **drop** the title + note |
| Qté input + product buttons (Stick, Galet, …) | keep — just the Qté field + buttons |
| added-products list | keep |

## 6 · REMPLISSAGE (water) — mostly collapses

| now | proposed |
|---|---|
| **Remplissage** title | drop |
| **Rappel** timer dropdown | **drop** |
| **Démarrer le remplissage** + water icon | keep only the **water icon**, placed on the **piscine photo overlay**: icon + elapsed watering time until stopped |
| "aujourd'hui" relay | keep as-is (good) |

## 7 · VOLUME — smaller, as an icon

| now | proposed |
|---|---|
| **Volume du bassin ≈ 62.5 m³** card + **Modifier** | shrink; a **bucket icon** on the piscine photo overlay opens it |
| presets **Small / Medium / Large** | **drop Large.** Pools here are ~30–60 m³ (4×8, 5×10). |
| | **Small = 4 × 8 × 1.25 ≈ 40 m³** |
| | **Medium = 5 × 10 × 1.3 ≈ 65 m³** |

## 8 · LOCAL TECHNIQUE / GESTION DE POMPE (pump photo)

| now | proposed |
|---|---|
| **Gestion de pompe** + pump photo | keep the photo as the section |
| **Enregistrer un lavage** + `Dernier lavage` + **Sable du filtre** | move onto the **pump photo overlay** |
| **Notes pompe / particularités** title + textbox | drop the title; just the textbox "notes de pompe" |
| **✔ Marquer entretenue aujourd'hui** | keep, underneath |

## 9 · HISTORIQUE — full length at the foot

| now | proposed |
|---|---|
| **Historique (5)** — 3 rows + "+2 de plus" | show **full history**, no truncation; it grows at the bottom of the page as the season goes |

---

## Build order (on the beta first, then port to live)

1. Three-photo scaffold + overlay system (portail / piscine / pompe)
2. Occupation → gate overlay; notes simplified + auto-tagged; drop À-faire here
3. Chem: mini-bars + **trend graph** replacing Action suggérée; Saisir → Doses under it
4. Produits: strip title/note
5. Remplissage → water icon overlay; Volume → bucket icon + new presets (drop Large)
6. Pompe overlay (lavage/sable) + pump-notes textbox + entretenue
7. Historique full length

Open question to confirm before building: on the **piscine photo overlay**, how much do we
stack — chem trend graph *and* the water icon *and* the bucket icon — before it's too busy?
Proposal: graph as the main overlay, water + bucket as two small corner icons.
