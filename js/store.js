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
      createdAt: new Date().toISOString(),
    };
  }

  function load() {
    if (state) return state;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        state = JSON.parse(raw);
        if (!state.schema) state.schema = SCHEMA;
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
    return rec;
  }
  function deleteReading(id) {
    state.readings = load().readings.filter((r) => r.id !== id);
    save();
  }

  function updatePool(id, patch) {
    const p = pool(id);
    if (p) { Object.assign(p, patch); save(); }
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
    addReading, deleteReading, updatePool, updateResidence,
    exportJSON, importJSON, resetToSeed,
  };
})();
window.Store = Store;
