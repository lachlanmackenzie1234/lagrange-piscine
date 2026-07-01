/*
 * Local-storage backed store. All data lives on the device (no server, no
 * account). One JSON blob under a single key, with export/import for backup.
 */
const Store = (() => {
  const KEY = 'lagrange-piscine.v1';
  const SCHEMA = 1;

  const slug = (s) => String(s).trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const poolId = (res, unit) => `${res}-${slug(unit)}`;

  let state = null;

  function seedState() {
    const S = window.SEED;
    const pools = S.POOLS.map((p) => ({
      id: poolId(p.res, p.unit),
      res: p.res,
      unit: p.unit,
      type: p.type || '',
      note: p.note || '',
      verify: !!p.verify,
      nonPool: !!p.nonPool,
      salt: !!p.salt,             // salt-chlorine-generator pool
      electroNote: p.electroNote || '',
      dims: null,                 // { l, w, dmin, dmax } in metres
      volM3: null,                // pool volume (m³), from dims or entered
      volEst: false,              // true = a size-preset estimate, not measured
      covered: !!p.covered,       // has a cover (slows chlorine loss)
      lat: p.lat ?? null,
      lng: p.lng ?? null,
    }));
    const occupancy = S.OCCUPANCY.map((o, i) => ({
      id: `occ-${i}`,
      poolId: poolId(o.res, o.unit),
      week: o.week,
      name: o.name || '',
      arrival: o.arrival || '',
      departure: o.departure || '',
      status: o.status || 'empty',
      note: o.note || '',
    }));
    return {
      schema: SCHEMA,
      residences: S.RESIDENCES.map((r) => ({ ...r })),
      pools,
      occupancy,
      readings: [], // chemistry readings
      visits: [],   // maintenance visits / checks
      notes: [],    // chronological notes / to-dos (the "preventive layer")
      coordsSeedVersion: COORDS_SEED,
      createdAt: new Date().toISOString(),
    };
  }

  // Bump when seed coordinates / classifications change; migrate() reconciles
  // existing installs.
  const COORDS_SEED = 6;

  // Back-fill seed coordinates (only where the user hasn't set their own — never
  // overwrites a captured GPS) and sync the nonPool classification from seed.
  // Salt is now user-toggleable, so migrate only *adds* newly-flagged seed salt
  // pools — it never clears a field-set salt flag. Adds new seed residences too.
  function migrate() {
    if ((state.coordsSeedVersion || 0) >= COORDS_SEED) return;
    const S = window.SEED;
    S.POOLS.forEach((sp) => {
      const p = state.pools.find((x) => x.id === poolId(sp.res, sp.unit));
      if (!p) return;
      if (sp.lat != null && p.lat == null) { p.lat = sp.lat; p.lng = sp.lng; }
      p.nonPool = !!sp.nonPool;
      if (sp.salt) p.salt = true; // additive — don't clobber a user's toggle
      if (p.salt && !p.electroNote && sp.electroNote) p.electroNote = sp.electroNote;
    });
    S.RESIDENCES.forEach((sr) => {
      let r = state.residences.find((x) => x.code === sr.code);
      if (!r) { r = { ...sr }; state.residences.push(r); }  // new POI/residence (dépôt)
      if (sr.lat != null && r.lat == null) { r.lat = sr.lat; r.lng = sr.lng; }
      r.nonPool = !!sr.nonPool;
      r.poi = !!sr.poi;
    });
    state.coordsSeedVersion = COORDS_SEED;
    save();
  }

  function load() {
    if (state) return state;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        state = JSON.parse(raw);
        if (!state.schema) state.schema = SCHEMA;
        ['readings', 'visits', 'notes'].forEach((k) => { if (!Array.isArray(state[k])) state[k] = []; });
        migrate();
        return state;
      }
    } catch (e) { console.warn('load failed, reseeding', e); }
    state = seedState();
    save();
    return state;
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  // ---- accessors ----
  const residences = () => load().residences;
  const residence = (code) => residences().find((r) => r.code === code);
  const pools = () => load().pools;
  const pool = (id) => pools().find((p) => p.id === id);
  const poolsByRes = (code) => pools().filter((p) => p.res === code);
  const wateringPools = () => pools().filter((p) => p.watering && p.watering.startedAt);

  const readingsFor = (poolId) =>
    load().readings.filter((r) => r.poolId === poolId).sort((a, b) => b.at.localeCompare(a.at));
  const latestReading = (poolId) => readingsFor(poolId)[0] || null;

  const occupancyFor = (poolId) =>
    load().occupancy.filter((o) => o.poolId === poolId).sort((a, b) => a.week.localeCompare(b.week));
  const occupancyForWeek = (week) => load().occupancy.filter((o) => o.week === week);

  function weeks() {
    const set = new Set(load().occupancy.map((o) => o.week));
    return [...set].sort();
  }

  // ---- mutations ----
  function addReading(r) {
    const rec = {
      id: `rd-${Date.now()}-${Math.floor(performance.now())}`,
      poolId: r.poolId,
      at: r.at || new Date().toISOString(),
      ph: numOrNull(r.ph),
      chlorine: numOrNull(r.chlorine),
      stabilizer: numOrNull(r.stabilizer),
      salt: numOrNull(r.salt),    // salt pools (g/L)
      temp: numOrNull(r.temp),
      note: r.note || '',
      weather: r.weather || null,
    };
    load().readings.push(rec);
    save();
    mirror((s) => s.pushReading(rec));
    return rec;
  }
  function deleteReading(id) {
    state.readings = load().readings.filter((r) => r.id !== id);
    save();
    mirror((s) => s.removeReading(id));
  }

  // ---- visits (service log) ----
  function addVisit(poolId, opts = {}) {
    const rec = {
      id: `vs-${Date.now()}-${Math.floor(performance.now())}`,
      poolId,
      at: opts.at || new Date().toISOString(),
      type: opts.type || 'service',
      note: opts.note || '',
    };
    load().visits.push(rec);
    save();
    mirror((s) => s.pushVisit(rec));
    return rec;
  }
  function visitsFor(poolId) {
    return load().visits.filter((v) => v.poolId === poolId).sort((a, b) => b.at.localeCompare(a.at));
  }
  const lastVisit = (poolId) => visitsFor(poolId)[0] || null;
  const lastService = (poolId) => visitsFor(poolId).find((v) => (v.type || 'service') === 'service') || null;
  const lastBackwash = (poolId) => visitsFor(poolId).find((v) => v.type === 'backwash') || null;
  function deleteVisit(id) {
    state.visits = load().visits.filter((v) => v.id !== id);
    save();
    mirror((s) => s.removeVisit(id));
  }
  // Edit a visit/treatment in place (e.g. correct its time). Re-pushes the
  // whole record to sync.
  function updateVisit(id, patch) {
    const v = load().visits.find((x) => x.id === id);
    if (v) { Object.assign(v, patch); save(); mirror((s) => s.pushVisit(v)); }
    return v;
  }
  // ---- product applications ("produits ajoutés") ----
  // Stored as visits with type 'treatment' (so they ride the existing visits
  // sync, append-only). productId references SEED.PRODUCTS; qty is a count of
  // sticks/galets/doses.
  function addTreatment(poolId, opts = {}) {
    const rec = {
      id: `tr-${Date.now()}-${Math.floor(performance.now())}`,
      poolId,
      at: opts.at || new Date().toISOString(),
      type: 'treatment',
      productId: opts.productId || '',
      qty: numOrNull(opts.qty),
      note: opts.note || '',
      weather: opts.weather || null,
    };
    load().visits.push(rec);
    save();
    mirror((s) => s.pushVisit(rec));
    return rec;
  }
  const treatmentsFor = (poolId) => visitsFor(poolId).filter((v) => v.type === 'treatment');
  const lastTreatment = (poolId) => treatmentsFor(poolId)[0] || null;

  // Was this pool serviced (not just backwashed) on a given local date?
  function servicedOn(poolId, dateISO) {
    return load().visits.some((v) => v.poolId === poolId && (v.type || 'service') === 'service' && localDate(v.at) === dateISO);
  }
  function localDate(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ---- notes / to-dos (chronological, optionally tied to a pool) ----
  function addNote(n) {
    const rec = {
      id: `nt-${Date.now()}-${Math.floor(performance.now())}`,
      at: n.at || new Date().toISOString(),
      text: (n.text || '').trim(),
      poolId: n.poolId || '',
      todo: !!n.todo,
      done: false,
      weather: n.weather || null,
    };
    load().notes.push(rec);
    save();
    mirror((s) => s.pushNote(rec));
    return rec;
  }
  const notes = () => load().notes.slice().sort((a, b) => b.at.localeCompare(a.at));
  const notesFor = (poolId) => notes().filter((n) => n.poolId === poolId);
  const openTodos = () => notes().filter((n) => n.todo && !n.done);
  function setNoteDone(id, done) {
    const n = load().notes.find((x) => x.id === id);
    if (n) { n.done = !!done; save(); mirror((s) => s.pushNote(n)); }
    return n;
  }
  // Edit a note's text in place (fix a typo / add a forgotten detail).
  function updateNote(id, patch) {
    const n = load().notes.find((x) => x.id === id);
    if (n) { Object.assign(n, patch); save(); mirror((s) => s.pushNote(n)); }
    return n;
  }
  function deleteNote(id) {
    state.notes = load().notes.filter((n) => n.id !== id);
    save();
    mirror((s) => s.removeNote(id));
  }
  function applyRemoteNote(rec) {
    const i = load().notes.findIndex((n) => n.id === rec.id);
    if (i >= 0) state.notes[i] = rec; else state.notes.push(rec);
    save();
  }
  function applyRemoteNoteRemoved(id) {
    state.notes = load().notes.filter((n) => n.id !== id);
    save();
  }

  // ---- sync glue ----
  // Fire a mirror callback to Team Sync if it's active (no-op otherwise).
  function mirror(fn) {
    if (window.Sync && window.Sync.active) { try { fn(window.Sync); } catch (_) {} }
  }
  // Remote changes coming back from Team Sync — apply WITHOUT re-mirroring.
  function applyRemoteReading(rec) {
    const i = load().readings.findIndex((r) => r.id === rec.id);
    if (i >= 0) state.readings[i] = rec; else state.readings.push(rec);
    save();
  }
  function applyRemoteReadingRemoved(id) {
    state.readings = load().readings.filter((r) => r.id !== id);
    save();
  }
  function applyRemoteVisit(rec) {
    const i = load().visits.findIndex((v) => v.id === rec.id);
    if (i >= 0) state.visits[i] = rec; else state.visits.push(rec);
    save();
  }
  function applyRemoteVisitRemoved(id) {
    state.visits = load().visits.filter((v) => v.id !== id);
    save();
  }
  function applyRemotePool(poolId, fields) {
    const p = pool(poolId);
    if (p) { Object.assign(p, fields); save(); }
  }

  function updatePool(id, patch) {
    const p = pool(id);
    if (p) { Object.assign(p, patch); save(); mirror((s) => s.pushPool(id, patch)); }
    return p;
  }
  function updateResidence(code, patch) {
    const r = residence(code);
    if (r) { Object.assign(r, patch); save(); }
    return r;
  }

  function numOrNull(v) {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(String(v).replace(',', '.').trim()); // accept comma decimals
    return Number.isFinite(n) ? n : null;
  }

  // ---- backup ----
  // Full backup: the whole local state PLUS the photos (which live in IndexedDB,
  // not the localStorage blob) as base64. So a single file captures everything —
  // pools, coordinates, readings, visits/treatments, notes, and images.
  function exportJSON(withPhotos = true) {
    const data = { ...load() };
    if (withPhotos && window.Photos) data.photos = Photos.all();
    return JSON.stringify(data, null, 2);
  }
  function importJSON(text) {
    const data = JSON.parse(text);
    if (!data || !data.pools) throw new Error('Not a valid backup file.');
    const photos = Array.isArray(data.photos) ? data.photos : [];
    delete data.photos;
    state = data;
    save();
    if (window.Photos && photos.length && Photos.importAll) Photos.importAll(photos);
  }
  function resetToSeed() {
    state = seedState();
    save();
  }

  return {
    KEY, slug, poolId,
    load, save,
    residences, residence, pools, pool, poolsByRes, wateringPools,
    readingsFor, latestReading, occupancyFor, occupancyForWeek, weeks,
    addReading, deleteReading,
    addVisit, visitsFor, lastVisit, lastService, lastBackwash, deleteVisit, updateVisit, servicedOn, localDate,
    addTreatment, treatmentsFor, lastTreatment,
    addNote, notes, notesFor, openTodos, setNoteDone, updateNote, deleteNote,
    updatePool, updateResidence,
    applyRemoteReading, applyRemoteReadingRemoved,
    applyRemoteVisit, applyRemoteVisitRemoved, applyRemotePool,
    applyRemoteNote, applyRemoteNoteRemoved,
    exportJSON, importJSON, resetToSeed,
  };
})();
window.Store = Store;
