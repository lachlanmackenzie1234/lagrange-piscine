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
};

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
    note: 'Rés Eden Club, off Rte du Baganais. Houses 01–22, T4/T5.',
  },
  {
    code: 'AG', name: 'Atlantic Green',
    mapsQuery: 'Lagrange Vacances Atlantic Green, Lacanau-Océan',
    note: 'Rés Atlantic Green, off Rte du Baganais. Houses 01–40.',
  },
  {
    code: 'EP', name: 'Eden Parc Golf',
    mapsQuery: 'Lagrange Vacances Eden Parc Golf, Lacanau-Océan',
    note: 'Eden Parc Golf (Lagrange code L-GOLF) — Rue du Birdie / Rue Eden Parc / Impasse du Pitch. Unit codes carry a plot number (e.g. 6B/75).',
  },
  {
    code: 'EPP', name: 'Eden Parc (Pitch lots)',
    mapsQuery: 'Eden Parc Golf, Impasse du Pitch, Lacanau-Océan',
    note: 'Lots near Fairway 12 / Golf de l’Ardilouse (EPP haut & bas plans). Lot→unit mapping unconfirmed.',
    verify: true,
  },
  {
    code: 'GP', name: 'Green Parc',
    mapsQuery: 'Lagrange Vacances Green Parc, Lacanau-Océan',
    note: 'Villa Green Parc (Lagrange code L-GREP) — ~500 m from Golf de l’Ardilouse, ~3.5 km from the beach. No plan supplied yet.',
  },
  {
    code: 'HO', name: 'HO — to confirm',
    mapsQuery: 'Lacanau-Océan',
    note: 'Residence code "HO" — full name not yet confirmed (no matching Lagrange code found; possibly a non-Lagrange cluster). No plan supplied yet.',
    verify: true,
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
  { res: 'EP', unit: '30B/63' },
  { res: 'EP', unit: '5P' },
  { res: 'EP', unit: '27B/94' },
  { res: 'EP', unit: '40B/52' },
  { res: 'EP', unit: '31B/96' },
  { res: 'EP', unit: '52B/46' },
  { res: 'EP', unit: '6E/99' },

  // Eden Parc Pitch lots
  { res: 'EPP', unit: '3' },
  { res: 'EPP', unit: '4' },
  { res: 'EPP', unit: '7' },
  { res: 'EPP', unit: '11' },
  { res: 'EPP', unit: '12' },

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

// Occupancy from the two sheets. Each entry ties a pool to a turnover week.
// poolId is CODE + '-' + unit slug (built in store.js); here we use res+unit.
const OCCUPANCY = [
  // ---- Week of Sat 27-Jun (sheet 1) ----
  { res: 'EC', unit: '12', week: SAT.jun27, name: 'BRIDIER',  arrival: '2026-06-27', departure: '2026-07-11', status: 'arriving' },
  { res: 'EC', unit: '18', week: SAT.jun27, name: 'FIEVET',   departure: '2026-07-11', status: 'owner' },
  { res: 'EC', unit: '22', week: SAT.jun27, name: 'AVAUX',    arrival: '2026-06-27', departure: '2026-07-04', status: 'owner' },
  { res: 'AG', unit: '9',  week: SAT.jun27, name: 'BARBIER',  arrival: '2026-06-27', departure: '2026-06-29', status: 'arriving' },
  { res: 'AG', unit: '21', week: SAT.jun27, name: 'RENOUARD', arrival: '2026-06-27', departure: '2026-07-04', status: 'owner' },
  { res: 'EP', unit: '19B/90', week: SAT.jun27, name: 'LEGRAND',   departure: '2026-07-04', status: 'occupied' },
  { res: 'EP', unit: '30B/63', week: SAT.jun27, name: 'LECOUF',    departure: '2026-07-04', status: 'occupied' },
  { res: 'EP', unit: '5P',     week: SAT.jun27, name: 'LOHMANN',   departure: '2026-07-04', status: 'occupied' },
  { res: 'EP', unit: '27B/94', week: SAT.jun27, name: 'MATHIESON', arrival: '2026-06-25', departure: '2026-07-02', status: 'occupied' },
  { res: 'EP', unit: '40B/52', week: SAT.jun27, name: 'LECERF',    arrival: '2026-06-27', departure: '2026-07-11', status: 'arriving' },
  { res: 'EP', unit: '31B/96', week: SAT.jun27, name: 'TOMAS',     departure: '2026-07-04', status: 'occupied' },
  { res: 'EP', unit: '6E/99',  week: SAT.jun27, name: 'ACX',       arrival: '2026-06-27', departure: '2026-07-11', status: 'arriving' },
  { res: 'EPP', unit: '11', week: SAT.jun27, name: 'RIBET',  arrival: '2026-06-27', departure: '2026-07-04', status: 'arriving' },
  { res: 'GP', unit: '18', week: SAT.jun27, name: 'BRUNEL',  arrival: '2026-06-27', departure: '2026-07-11', status: 'arriving' },
  { res: 'GP', unit: '39', week: SAT.jun27, name: 'PFOTSCH', departure: '2026-07-04', status: 'occupied' },
  { res: 'HO', unit: '31',  week: SAT.jun27, name: 'RAMOS',     arrival: '2026-06-28', departure: '2026-07-05', status: 'arriving' },
  { res: 'HO', unit: '49',  week: SAT.jun27, name: 'COPPOLA',   arrival: '2026-06-27', departure: '2026-07-11', status: 'arriving' },
  { res: 'HO', unit: '187', week: SAT.jun27, name: 'SHARAPOVA', arrival: '2026-06-28', departure: '2026-07-05', status: 'arriving' },

  // ---- Week of Sat 04-Jul (sheet 2) ----
  { res: 'EC', unit: '12', week: SAT.jul04, name: 'CADIERGUES', arrival: '2026-07-04', departure: '2026-07-11', status: 'arriving' },
  { res: 'EC', unit: '18', week: SAT.jul04, name: 'FIEVET',     departure: '2026-07-11', status: 'owner' },
  { res: 'EC', unit: '22', week: SAT.jul04, name: 'AVAUX',      departure: '2026-07-11', status: 'owner' },
  { res: 'EP', unit: '6B/75',  week: SAT.jul04, name: 'THABUY', arrival: '2026-07-04', departure: '2026-07-18', status: 'arriving' },
  { res: 'EP', unit: '19B/90', week: SAT.jul04, status: 'backup' },
  { res: 'EP', unit: '27B/94', week: SAT.jul04, name: 'BRAY',   arrival: '2026-07-04', departure: '2026-07-11', status: 'arriving' },
  { res: 'EP', unit: '40B/52', week: SAT.jul04, name: 'LECERF', departure: '2026-07-11', status: 'occupied' },
  { res: 'EP', unit: '6E/99',  week: SAT.jul04, name: 'ACX',    departure: '2026-07-11', status: 'occupied' },
  { res: 'EPP', unit: '3',  week: SAT.jul04, name: 'CHEVREL',   arrival: '2026-07-04', departure: '2026-07-11', status: 'arriving', note: 'CE LINÉAIRE' },
  { res: 'EPP', unit: '11', week: SAT.jul04, name: 'FERMÉE',    departure: '2026-07-11', status: 'closed' },
  { res: 'EPP', unit: '12', week: SAT.jul04, name: 'LEMAISTRE', arrival: '2026-07-04', departure: '2026-07-11', status: 'owner' },
  { res: 'GP', unit: '18', week: SAT.jul04, name: 'BRUNEL',    departure: '2026-07-11', status: 'occupied' },
  { res: 'GP', unit: '39', week: SAT.jul04, name: 'MASSINGER', arrival: '2026-07-04', departure: '2026-07-11', status: 'arriving' },
  { res: 'HO', unit: '31',  week: SAT.jul04, name: 'RAMOS',   departure: '2026-07-05', status: 'occupied' },
  { res: 'HO', unit: '49',  week: SAT.jul04, name: 'COPPOLA', departure: '2026-07-11', status: 'occupied' },
  { res: 'HO', unit: '166', week: SAT.jul04, name: 'SEMAY',   arrival: '2026-07-02', departure: '2026-07-11', status: 'arriving' },
  { res: 'HO', unit: '28',  week: SAT.jul04, name: 'FORGAC',  arrival: '2026-07-04', departure: '2026-07-11', status: 'arriving' },
  { res: 'HO', unit: '40',  week: SAT.jul04, name: 'DURAND',  arrival: '2026-07-04', departure: '2026-07-18', status: 'arriving' },
  { res: 'HO', unit: '187', week: SAT.jul04, name: 'SHARAPOVA', departure: '2026-07-05', status: 'occupied' },
];

window.SEED = { CHEM_RANGES, OCC_STATUS, RESIDENCES, POOLS, OCCUPANCY, SAT };
