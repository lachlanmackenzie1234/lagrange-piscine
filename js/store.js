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
      coordsSeedVersion: COORDS_SEED,
      createdAt: new Date().toISOString(),
    };
  }

  // Bump when seed coordinates change; migrate() back-fills existing installs.
  const COORDS_SEED = 2;

  // Fill in pool/residence coordinates added to the seed since this device was
  // first seeded — only where the user hasn't already set their own. Never
  // overwrites a coordinate the user captured/edited.
  function migrate() {
    if ((state.coordsSeedVersion || 0) >= COORDS_SEED) return;
    const S = window.SEED;
    S.POOLS.forEach((sp) => {
      if (sp.lat == null) return;
      const p = state.pools.find((x) => x.id === poolId(sp.res, sp.unit));
      if (p && p.lat == null) { p.lat = sp.lat; p.lng = sp.lng; }
    });
    S.RESIDENCES.forEach((sr) => {
      if (sr.lat == null) return;
      const r = state.residences.find((x) => x.code === sr.code);
      if (r && r.lat == null) { r.lat = sr.lat; r.lng = sr.lng; }
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
      temp: numOrNull(r.temp),
      note: r.note || '',
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
  function deleteVisit(id) {
    state.visits = load().visits.filter((v) => v.id !== id);
    save();
    mirror((s) => s.removeVisit(id));
  }
  // Was this pool serviced on a given local date (YYYY-MM-DD)?
  function servicedOn(poolId, dateISO) {
    return load().visits.some((v) => v.poolId === poolId && localDate(v.at) === dateISO);
  }
  function localDate(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  // ---- backup ----
  function exportJSON() {
    return JSON.stringify(load(), null, 2);
  }
  function importJSON(text) {
    const data = JSON.parse(text);
    if (!data || !data.pools) throw new Error('Not a valid backup file.');
    state = data;
    save();
  }
  function resetToSeed() {
    state = seedState();
    save();
  }

  return {
    KEY, slug, poolId,
    load, save,
    residences, residence, pools, pool, poolsByRes,
    readingsFor, latestReading, occupancyFor, occupancyForWeek, weeks,
    addReading, deleteReading,
    addVisit, visitsFor, lastVisit, deleteVisit, servicedOn, localDate,
    updatePool, updateResidence,
    applyRemoteReading, applyRemoteReadingRemoved,
    applyRemoteVisit, applyRemoteVisitRemoved, applyRemotePool,
    exportJSON, importJSON, resetToSeed,
  };
})();
window.Store = Store;
