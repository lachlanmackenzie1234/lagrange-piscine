/*
 * Seed data for Lagrange Piscine.
 * Extracted from the residence plans (orange-highlighted = pools maintained)
 * and the two weekly rotation sheets (location_calendrier_1 / _2).
 *
 * Rental turnover is on SATURDAYS. The 2026 season Saturdays referenced
 * by the sheets are 27-Jun, 04-Jul, 11-Jul, 18-Jul.
 *
 * Anything uncertain is flagged with `verify: true` so it surfaces in the UI
 * and can be corrected in-app. Edits are saved to local storage; this file is
 * only the first-run starting point.
 */

const CHEM_RANGES = {
  ph:         { label: 'pH',                 unit: '',    min: 7.0, max: 7.6, ideal: 7.2, step: 0.1 },
  chlorine:   { label: 'Free chlorine',      unit: 'ppm', min: 1.0, max: 3.0, ideal: 2.0, step: 0.1 },
  stabilizer: { label: 'Stabilizer (CYA)',   unit: 'ppm', min: 30,  max: 50,  ideal: 40,  step: 1 },
  // salt pools: higher CYA protects the continuously-generated chlorine from UV.
  salt:       { label: 'Salt',               unit: 'g/L', min: 3.0, max: 5.0, ideal: 4.0, step: 0.1 },
};
// Salt-chlorine-generator pools want a higher stabiliser band than manual pools.
const CYA_SALT = { min: 60, max: 80, ideal: 70 };

// Products carried daily in the car. `active` = available-chlorine fraction
// (for dosing maths); `grammage` = grams per stick/galet/dose; `addsCya` flags
// stabilised chlorine (raises CYA as it dissolves). Figures sourced from the
// manufacturers' product pages (HTH Stick cal-hypo ~65%, HTH Maxitab galet
// trichlor ~90%). The dépôt also stocks liquid chlorine etc. (not listed here).
const PRODUCTS = [
  // Slow-release maintenance feeds (skimmer): coverM3 = m³ served per unit,
  // days = how long it lasts. NOT for fast correction — that's the choc.
  { id: 'hth-stick',   brand: 'HTH',     name: 'Stick',       kind: 'cl-unstab', unit: 'stick', grammage: 300, active: 0.65, addsCya: false, coverM3: 20, days: 5, note: 'Hypochlorite de calcium · non stabilisé · 1×300 g / 20 m³ / ~5 j (skimmer)' },
  { id: 'hth-galet',   brand: 'HTH',     name: 'Galet',       kind: 'cl-stab',   unit: 'galet', grammage: 200, active: 0.90, addsCya: true,  coverM3: 22, days: 7, targetCl: 2, note: 'Trichlore · stabilisé (+CYA) · 1×200 g / 20–25 m³ / 7–10 j' },
  // Fast correction (dissolves quickly, dose by grams):
  { id: 'hypomen-pro', brand: 'Choc', name: 'Cal-hypo',       kind: 'shock',     unit: 'g',     grammage: null, active: 0.70, addsCya: false, note: 'Hypochlorite de calcium · chlore choc non stabilisé · 70 % actif (confirmé étiquette)' },
  { id: 'hth-phminus', brand: 'HTH',     name: 'pH-',         kind: 'ph-minus',  unit: 'g', dosePerM3: 15, dropPh: 0.2, note: '≈ 150 g / 10 m³ → −0,2 pH · filtrer + retester' },
  { id: 'mareva-phplus', brand: 'Mareva', name: 'pH+',        kind: 'ph-plus',   unit: 'g', dosePerM3: 10, raisePh: 0.1, note: '≈ 10 g/m³ → +0,1 pH · filtrer + retester' },
  // stabiliser (cyanuric acid powder): ~1 g/m³ raises CYA ~1 ppm (assumes ~pure;
  // confirm from the Mareva label). Used to build CYA when a choc isn't needed.
  { id: 'mareva-cya',  brand: 'Mareva', name: 'Stabilisant', kind: 'stabilizer', unit: 'g', ratePerPpmM3: 1, note: 'Acide cyanurique (poudre) · 300 g/10 m³ = +30 ppm (confirmé) · hors-saison; en saison les galets montent le stabilisant' },
  { id: 'hth-borkler', brand: 'HTH',     name: 'Borkler gel', kind: 'algae',     unit: 'dose' },
  { id: 'acti-yellow', brand: 'Acti',    name: 'Yellow',      kind: 'algae',     unit: 'dose',  note: 'Algues moutardes' },
  { id: 'acti-floc',   brand: 'Acti',    name: 'Floc Bag',    kind: 'floc',      unit: 'sachet' },
];

// Status codes seen on the rotation sheets.
const OCC_STATUS = {
  arriving:  { label: 'Arriving (turnover)', cls: 'st-arriving' }, // new guest this Saturday
  occupied:  { label: 'Occupied',            cls: 'st-occupied' }, // mid-stay (DÉJÀ LÀ)
  departing: { label: 'Departing',           cls: 'st-departing' },
  owner:     { label: 'Owner (PROPRIO)',     cls: 'st-owner' },
  closed:    { label: 'Closed (FERMÉE)',     cls: 'st-closed' },
  backup:    { label: 'Backup (EN SECOURS)', cls: 'st-backup' },
  empty:     { label: 'Empty',               cls: 'st-empty' },
};

const RESIDENCES = [
  {
    code: 'EC', name: 'Eden Club',
    mapsQuery: 'Lagrange Vacances Eden Club, Lacanau-Océan',
    lat: 44.9996, lng: -1.1752, approx: true,
    note: 'Rés Eden Club, off Rte du Baganais. Houses 01–22, T4/T5.',
  },
  {
    code: 'AG', name: 'Atlantic Green',
    mapsQuery: 'Lagrange Vacances Atlantic Green, Lacanau-Océan',
    lat: 44.9978, lng: -1.1690, approx: true,
    note: 'Rés Atlantic Green, off Rte du Baganais. Houses 01–40.',
  },
  {
    code: 'EP', name: 'Eden Parc Golf',
    mapsQuery: 'Lagrange Vacances Eden Parc Golf, Lacanau-Océan',
    lat: 45.0013, lng: -1.1722, approx: true,
    note: 'Eden Parc Golf (Lagrange code L-GOLF) — Rue du Birdie / Rue Eden Parc / Impasse du Pitch. Unit codes carry a plot number (e.g. 6B/75).',
  },
  {
    code: 'EPP', name: 'Eden Parc (Pitch lots)',
    mapsQuery: 'ZAC de l’Ardilouse, 6 Rés Eden Parc 6, 33680 Lacanau',
    lat: 45.002698, lng: -1.169749,
    note: 'Two clusters in the Ardilouse golf zone. Bas lots 3–7 ≈ 45.0027, −1.1697 (ZAC de l’Ardilouse / Rés Eden Parc 6). Lots 11 & 12 ("Lot. Éden Club") ≈ 44.9976, −1.1718. Street numbered evenly 2–12; LOT→unit 7→2, 4→8, 3→10 confirmed by boss.',
  },
  {
    code: 'GP', name: 'Green Parc',
    mapsQuery: 'Lagrange Vacances Green Parc, Lacanau-Océan',
    lat: 45.0038, lng: -1.1665, approx: true,
    note: 'Villa Green Parc (Lagrange code L-GREP) — ~500 m from Golf de l’Ardilouse, ~3.5 km from the beach. No plan supplied yet.',
  },
  {
    code: 'HO', name: 'Les Hameaux de l’Océan',
    mapsQuery: 'Lagrange Vacances Les Hameaux de l’Océan, Rue des Mouettes, 33121 Carcans',
    note: 'Carcans-Plage (Rue des Mouettes, 33121 Carcans) — rental management only, no pools we maintain. Kept to cross-reference the calendars / rental papers.',
    nonPool: true,
  },
  {
    code: 'DEPOT', name: 'Dépôt produits',
    mapsQuery: '45.0069865,-1.1680504',
    lat: 45.0069865, lng: -1.1680504,
    note: 'Stock produits (chlore liquide, stabilisant, etc.). Point de ravitaillement.',
    nonPool: true, poi: true,
  },
];

// Pools maintained, grouped by residence. `unit` is the rotation-sheet code.
// `type` from the plan where known (T3/T4/T5). `id` = CODE-unit (slugged).
const POOLS = [
  // Eden Club — orange-highlighted houses on the plan
  { res: 'EC', unit: '2',  type: 'T4' },
  { res: 'EC', unit: '5',  type: 'T4' },
  { res: 'EC', unit: '12', type: 'T4' },
  { res: 'EC', unit: '18', type: 'T4' },
  { res: 'EC', unit: '22', type: 'T4' },

  // Atlantic Green
  { res: 'AG', unit: '7' },
  { res: 'AG', unit: '8' },
  { res: 'AG', unit: '9' },
  { res: 'AG', unit: '21' },
  { res: 'AG', unit: '32' },

  // Eden Parc (unit + plot)
  { res: 'EP', unit: '6B/75' },
  { res: 'EP', unit: '19B/90' },
  { res: 'EP', unit: '30B/63', salt: true, note: 'Piscine au sel · électrolyse' },
  { res: 'EP', unit: '5P', note: 'No pool (rental only)', nonPool: true },
  { res: 'EP', unit: '27B/94', salt: true, note: 'Piscine au sel · électrolyse' },
  { res: 'EP', unit: '40B/52' },
  { res: 'EP', unit: '31B/96' },
  { res: 'EP', unit: '52B/46' },
  { res: 'EP', unit: '6E/99' },

  // Eden Parc Pitch lots. `unit` keeps the rotation-sheet/LOT number (so the
  // occupancy links hold); `note` records the boss's 2026 renumbering until
  // confirmed on site.
  { res: 'EPP', unit: '3',  lat: 45.002698, lng: -1.169749, note: 'Plan LOT 3 (T5 open) → 2026 #10 · bas cluster' },
  { res: 'EPP', unit: '4',  lat: 45.002698, lng: -1.169749, salt: true, electroNote: 'Sondes d’électrolyse HS — en attente de réparation. Doser le chlore manuellement en attendant.', note: 'Plan LOT 4 (T5 pp ter) → 2026 #8 · bas cluster · piscine au sel' },
  { res: 'EPP', unit: '7',  lat: 45.002698, lng: -1.169749, note: 'Plan LOT 7 (T5 open) → 2026 #2 · bas cluster' },
  { res: 'EPP', unit: '11', lat: 44.997581, lng: -1.171753, note: '"Lot. Éden Club" cluster · no pool (rental only)', nonPool: true },
  { res: 'EPP', unit: '12', lat: 44.997581, lng: -1.171753, note: '"12 Lot." cluster · no pool (rental only)', nonPool: true },

  // GP
  { res: 'GP', unit: '18' },
  { res: 'GP', unit: '39' },

  // HO
  { res: 'HO', unit: '31' },
  { res: 'HO', unit: '49' },
  { res: 'HO', unit: '166' },
  { res: 'HO', unit: '28' },
  { res: 'HO', unit: '40' },
  { res: 'HO', unit: '62' },
  { res: 'HO', unit: '187' },
  { res: 'HO', unit: '222' },
  { res: 'HO', unit: '229' },
];

// ISO Saturdays for the 2026 season turnover.
const SAT = { jun27: '2026-06-27', jul04: '2026-07-04', jul11: '2026-07-11', jul18: '2026-07-18' };

// Occupancy roster (renter NAMES) is PII — it must not live in the committed,
// publicly-served code. It's kept in the gitignored js/seed.private.js
// (window.SEED_PRIVATE), loaded before this file when present. On the public
// deploy that file is absent, so the roster is empty here; the operator's live
// roster persists in localStorage + Team Sync (adopted as source:'user') and is
// maintained via the in-app planning editor.
const OCCUPANCY = (window.SEED_PRIVATE && window.SEED_PRIVATE.OCCUPANCY) || [];

window.SEED = { CHEM_RANGES, CYA_SALT, PRODUCTS, OCC_STATUS, RESIDENCES, POOLS, OCCUPANCY, SAT };
