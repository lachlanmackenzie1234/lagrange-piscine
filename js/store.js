/*
 * Local-storage backed store. All data lives on the device (no server, no
 * account). One JSON blob under a single key, with export/import for backup.
 */
const Store = (() => {
  const KEY = 'lagrange-piscine.v1';
  const SCHEMA = 1;

  const slug = (s) => String(s).trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const poolId = (res, unit) => `${res}-${slug(unit)}`;
  // Collision-proof ids. Date.now()+performance.now() alone collides when a
  // roster import mints 30 rows inside one millisecond — twins sharing an id
  // that deleteOccupancy could never fully tombstone ("Vider leaves rows").
  let seq = 0;
  const uid = (prefix) => `${prefix}-${Date.now()}-${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

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
    const occupancy = occRecords();
    return {
      schema: SCHEMA,
      residences: S.RESIDENCES.map((r) => ({ ...r })),
      pools,
      occupancy,
      readings: [], // chemistry readings
      visits: [],   // maintenance visits / checks
      notes: [],    // chronological notes / to-dos (the "preventive layer")
      coordsSeedVersion: COORDS_SEED,
      occSeedVersion: OCC_SEED,
      occAdopted: true,
      occIdsFixed: true,
      occCleared: {},   // week → ISO time of the last "Vider" (see clearWeek)
      createdAt: new Date().toISOString(),
    };
  }

  // Bump when seed coordinates / classifications change; migrate() reconciles
  // existing installs.
  const COORDS_SEED = 7; // v7: HO units flagged nonPool (rentals, no pool to service)
  // Bump when the OCCUPANCY seed changes (prolongations, new reservations, …).
  // migrate() refreshes the seed rows but PRESERVES any the operator has edited
  // or added (source:'user') so a seed update never clobbers a hand edit.
  const OCC_SEED = 3;

  function occRecords() {
    return window.SEED.OCCUPANCY.map((o, i) => ({
      id: `occ-${i}`,
      poolId: poolId(o.res, o.unit),
      week: o.week,
      name: o.name || '',
      arrival: o.arrival || '',
      departure: o.departure || '',
      status: o.status || 'empty',
      note: o.note || '',
      source: 'seed',
    }));
  }

  // Back-fill seed coordinates (only where the user hasn't set their own — never
  // overwrites a captured GPS) and sync the nonPool classification from seed.
  // Salt is now user-toggleable, so migrate only *adds* newly-flagged seed salt
  // pools — it never clears a field-set salt flag. Adds new seed residences too.
  function migrate() {
    const S = window.SEED;
    // One-time: renter names moved out of the public seed into the gitignored
    // seed.private.js (PII off GitHub). Adopt the existing local roster as
    // operator-owned so it persists across future seed refreshes AND syncs to
    // the other phone — the empty public seed can't wipe it.
    if (!state.occAdopted) {
      (state.occupancy || []).forEach((o) => { o.source = 'user'; });
      state.occAdopted = true;
      save();
    }
    // One-time: pre-v0.70 roster imports could mint twin rows sharing one id
    // (same-millisecond ids). If any twin was Vider'd the whole set was meant
    // to go; otherwise the extras get an id of their own so they finally sync.
    if (!state.occIdsFixed) {
      const byId = new Map();
      (state.occupancy || []).forEach((o) => { if (!byId.has(o.id)) byId.set(o.id, []); byId.get(o.id).push(o); });
      byId.forEach((rows) => {
        if (rows.length < 2) return;
        const dead = rows.find((o) => o.deleted);
        if (dead) rows.forEach((o) => { o.deleted = true; o.deletedAt = o.deletedAt || dead.deletedAt; o.source = 'user'; });
        else rows.slice(1).forEach((o) => { o.id = uid('occ-u'); });
      });
      state.occIdsFixed = true;
      save();
    }
    // occupancy: refresh the seed rows on version bump, but keep the operator's
    // own edits/additions (source:'user'), which override the matching cell.
    if ((state.occSeedVersion || 0) < OCC_SEED) {
      const userRows = (state.occupancy || []).filter((o) => o.source === 'user');
      const userKeys = new Set(userRows.map((o) => `${o.poolId}|${o.week}`));
      state.occupancy = occRecords().filter((o) => !userKeys.has(`${o.poolId}|${o.week}`)).concat(userRows);
      state.occSeedVersion = OCC_SEED;
      save();
    }
    if ((state.coordsSeedVersion || 0) >= COORDS_SEED) return;
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
        normalize();
        migrate();
        return state;
      }
    } catch (e) { console.warn('load failed, reseeding', e); }
    state = seedState();
    save();
    return state;
  }

  // Shape guarantees for a blob that came from disk or a backup file.
  function normalize() {
    if (!state.schema) state.schema = SCHEMA;
    ['readings', 'visits', 'notes', 'occupancy'].forEach((k) => { if (!Array.isArray(state[k])) state[k] = []; });
    if (!state.occCleared || typeof state.occCleared !== 'object') state.occCleared = {};
    if (!state.season || typeof state.season !== 'object') state.season = { start: null, at: '' };
    if (!Array.isArray(state.dirty)) state.dirty = [];
    state.dirtyAll = !!state.dirtyAll;
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

  // ---- season boundary ----
  // "Nouvelle saison" hides chemistry / doses / passages logged before `start`
  // from the live views without deleting anything (the archive stays in the
  // blob + export, and deletes are what sync resurrects). Notes and the pool
  // cards carry over untouched. The marker syncs (last writer wins by `at`);
  // "voir toutes les saisons" is a per-device lens.
  const ALL_KEY = 'lagrange-piscine.allSeasons';
  const seasonStart = () => load().season.start || null;
  const allSeasons = () => { try { return localStorage.getItem(ALL_KEY) === '1'; } catch (_) { return false; } };
  const setAllSeasons = (on) => { try { localStorage.setItem(ALL_KEY, on ? '1' : '0'); } catch (_) {} };
  const inSeason = (rec) => { const st = seasonStart(); return !st || allSeasons() || !rec.at || rec.at >= st; };
  function setSeasonStart(startISO) {
    const rec = { start: startISO || null, at: new Date().toISOString() };
    load().season = rec; save();
    mirror((s) => s.pushSeason(rec), 'meta:season');
    return rec;
  }
  function applyRemoteSeason(rec) {
    if (!rec || typeof rec.at !== 'string' || (load().season.at || '') >= rec.at) return false;
    state.season = { start: rec.start || null, at: rec.at }; save();
    return true;
  }

  const readingsFor = (poolId) =>
    load().readings.filter((r) => r.poolId === poolId && !r.deleted && inSeason(r)).sort((a, b) => b.at.localeCompare(a.at));
  const latestReading = (poolId) => readingsFor(poolId)[0] || null;

  const occupancyFor = (poolId) =>
    load().occupancy.filter((o) => o.poolId === poolId && !o.deleted).sort((a, b) => a.week.localeCompare(b.week));
  const occupancyForWeek = (week) => load().occupancy.filter((o) => o.week === week && !o.deleted);

  function weeks() {
    const set = new Set(load().occupancy.filter((o) => !o.deleted).map((o) => o.week));
    return [...set].sort();
  }

  // ---- mutations ----
  function addReading(r) {
    const rec = {
      id: uid('rd'),
      poolId: r.poolId,
      at: r.at || new Date().toISOString(),
      ph: phNorm(r.ph),
      chlorine: numOrNull(r.chlorine),
      stabilizer: numOrNull(r.stabilizer),
      salt: numOrNull(r.salt),    // salt pools (g/L)
      temp: numOrNull(r.temp),
      note: r.note || '',
      by: r.by != null ? r.by : operator(),
      weather: r.weather || null,
    };
    load().readings.push(rec);
    save();
    mirror((s) => s.pushReading(rec), 'readings:' + rec.id);
    return rec;
  }
  // Soft-delete (tombstone). We keep the record with deleted:true instead of
  // removing it, and push that flag through sync like any other edit. A hard
  // delete only sticks if it reaches the server; a tombstone survives cache
  // clears and re-syncs down as a tombstone (not a resurrection). Read
  // accessors filter deleted records out.
  function deleteReading(id) {
    const r = load().readings.find((x) => x.id === id);
    if (!r) return;
    r.deleted = true; r.deletedAt = new Date().toISOString();
    save();
    mirror((s) => s.pushReading(r), 'readings:' + r.id);
  }

  // ---- visits (service log) ----
  function addVisit(poolId, opts = {}) {
    const rec = {
      id: uid('vs'),
      poolId,
      at: opts.at || new Date().toISOString(),
      type: opts.type || 'service',
      task: opts.task || '',       // cleaning task on a service visit: balai / robot / skimmer
      note: opts.note || '',
      by: opts.by != null ? opts.by : operator(),
      weather: opts.weather || null,
    };
    load().visits.push(rec);
    save();
    mirror((s) => s.pushVisit(rec), 'visits:' + rec.id);
    return rec;
  }
  function visitsFor(poolId) {
    return load().visits.filter((v) => v.poolId === poolId && !v.deleted && inSeason(v)).sort((a, b) => b.at.localeCompare(a.at));
  }
  const lastVisit = (poolId) => visitsFor(poolId)[0] || null;
  const lastService = (poolId) => visitsFor(poolId).find((v) => (v.type || 'service') === 'service') || null;
  const lastBackwash = (poolId) => visitsFor(poolId).find((v) => v.type === 'backwash') || null;
  function deleteVisit(id) {
    const v = load().visits.find((x) => x.id === id);
    if (!v) return;
    v.deleted = true; v.deletedAt = new Date().toISOString();
    save();
    mirror((s) => s.pushVisit(v), 'visits:' + v.id);
  }
  // Edit a visit/treatment in place (e.g. correct its time). Re-pushes the
  // whole record to sync.
  function updateVisit(id, patch) {
    const v = load().visits.find((x) => x.id === id);
    if (v) { Object.assign(v, patch); save(); mirror((s) => s.pushVisit(v), 'visits:' + v.id); }
    return v;
  }
  // ---- product applications ("produits ajoutés") ----
  // Stored as visits with type 'treatment' (so they ride the existing visits
  // sync, append-only). productId references SEED.PRODUCTS; qty is a count of
  // sticks/galets/doses.
  function addTreatment(poolId, opts = {}) {
    const rec = {
      id: uid('tr'),
      poolId,
      at: opts.at || new Date().toISOString(),
      type: 'treatment',
      productId: opts.productId || '',
      qty: numOrNull(opts.qty),
      note: opts.note || '',
      by: opts.by != null ? opts.by : operator(),
      weather: opts.weather || null,
    };
    load().visits.push(rec);
    save();
    mirror((s) => s.pushVisit(rec), 'visits:' + rec.id);
    return rec;
  }
  const treatmentsFor = (poolId) => visitsFor(poolId).filter((v) => v.type === 'treatment');
  const lastTreatment = (poolId) => treatmentsFor(poolId)[0] || null;

  // Was this pool serviced (not just backwashed) on a given local date?
  function servicedOn(poolId, dateISO) {
    return load().visits.some((v) => v.poolId === poolId && !v.deleted && inSeason(v) && (v.type || 'service') === 'service' && localDate(v.at) === dateISO);
  }
  function localDate(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ---- notes / to-dos (chronological, optionally tied to a pool) ----
  function addNote(n) {
    const rec = {
      id: uid('nt'),
      at: n.at || new Date().toISOString(),
      text: (n.text || '').trim(),
      poolId: n.poolId || '',
      todo: !!n.todo,
      done: false,
      by: n.by != null ? n.by : operator(),
      weather: n.weather || null,
    };
    load().notes.push(rec);
    save();
    mirror((s) => s.pushNote(rec), 'notes:' + rec.id);
    return rec;
  }
  const notes = () => load().notes.filter((n) => !n.deleted).sort((a, b) => b.at.localeCompare(a.at));
  const notesFor = (poolId) => notes().filter((n) => n.poolId === poolId);
  const openTodos = () => notes().filter((n) => n.todo && !n.done);
  function setNoteDone(id, done) {
    const n = load().notes.find((x) => x.id === id);
    if (n) { n.done = !!done; save(); mirror((s) => s.pushNote(n), 'notes:' + n.id); }
    return n;
  }
  // Edit a note's text in place (fix a typo / add a forgotten detail).
  function updateNote(id, patch) {
    const n = load().notes.find((x) => x.id === id);
    if (n) { Object.assign(n, patch); save(); mirror((s) => s.pushNote(n), 'notes:' + n.id); }
    return n;
  }
  function deleteNote(id) {
    const n = load().notes.find((x) => x.id === id);
    if (!n) return;
    n.deleted = true; n.deletedAt = new Date().toISOString();
    save();
    mirror((s) => s.pushNote(n), 'notes:' + n.id);
  }
  function applyRemoteNote(rec) {
    const i = load().notes.findIndex((n) => n.id === rec.id);
    if (i >= 0) state.notes[i] = keepDeleted(state.notes[i], rec); else state.notes.push(rec);
    save();
  }
  function applyRemoteNoteRemoved(id) {
    state.notes = load().notes.filter((n) => n.id !== id);
    save();
  }

  // ---- sync glue ----
  // Fire a mirror callback to Team Sync if it's active (no-op otherwise).
  // Each record leaves the phone through this one door. If the door is shut
  // (sync off, or not yet connected in the first seconds after opening) or the
  // push throws, the record's mark goes on the dirty list and the next
  // catch-up sends just that — never the whole log again.
  function mirror(fn, ...marks) {
    if (window.Sync && window.Sync.active) {
      try { fn(window.Sync); return; } catch (_) { /* fall through: mark */ }
    }
    if (marks.length) markDirty(...marks);
  }
  function markDirty(...marks) {
    const st = load();
    let changed = false;
    marks.forEach((m) => { if (m && !st.dirty.includes(m)) { st.dirty.push(m); changed = true; } });
    if (changed) save();
  }
  const dirtyMarks = () => load().dirty.slice();
  const dirtyAll = () => load().dirtyAll;
  // Server acknowledged: drop the pushed marks (null = everything, incl. the
  // post-import "push it all" flag). Marks added meanwhile stay.
  function clearDirty(marks) {
    const st = load();
    if (marks == null) { st.dirty = []; st.dirtyAll = false; }
    else { const done = new Set(marks); st.dirty = st.dirty.filter((m) => !done.has(m)); }
    save();
  }
  // Remote changes coming back from Team Sync — apply WITHOUT re-mirroring.
  function applyRemoteReading(rec) {
    const i = load().readings.findIndex((r) => r.id === rec.id);
    if (i >= 0) state.readings[i] = keepDeleted(state.readings[i], rec); else state.readings.push(rec);
    save();
  }
  function applyRemoteReadingRemoved(id) {
    state.readings = load().readings.filter((r) => r.id !== id);
    save();
  }
  function applyRemoteVisit(rec) {
    const i = load().visits.findIndex((v) => v.id === rec.id);
    if (i >= 0) state.visits[i] = keepDeleted(state.visits[i], rec); else state.visits.push(rec);
    save();
  }
  function applyRemoteVisitRemoved(id) {
    state.visits = load().visits.filter((v) => v.id !== id);
    save();
  }
  function applyRemotePool(poolId, fields) {
    const p = pool(poolId);
    if (!p) return;
    const f = { ...fields };
    // Fill-timer: last writer wins by `wateringAt`. A stale copy — Firestore's
    // cached first snapshot, or the server's value when this phone's stop was
    // made before sync was live — must not resurrect a timer already stopped
    // (or restarted) here.
    Object.keys(LWW).forEach((k) => { const s = LWW[k]; if (k in f && f[s] && p[s] && f[s] < p[s]) { delete f[k]; delete f[s]; } });
    Object.assign(p, f);
    save();
  }

  // Once a record is deleted locally, a stale non-deleted copy arriving from
  // sync must NOT resurrect it — otherwise deletes (and post-delete imports)
  // silently come back. Re-adds always use a fresh id, so nothing legit breaks.
  function keepDeleted(existing, rec) {
    if (existing && existing.deleted && !rec.deleted) return { ...rec, deleted: true, deletedAt: existing.deletedAt };
    return rec;
  }

  // ---- occupancy edits (operator-maintained planning) ----
  // Any edit/add/delete tags the row source:'user' so migrate() preserves it.
  function updateOccupancy(id, patch) {
    const o = load().occupancy.find((x) => x.id === id);
    if (o) { Object.assign(o, patch, { source: 'user' }); save(); mirror((s) => s.pushOccupancy(o), 'occupancy:' + o.id); }
    return o;
  }
  function addOccupancy(entry) {
    const rec = {
      id: uid('occ-u'),
      poolId: entry.poolId, week: entry.week,
      name: entry.name || '', arrival: entry.arrival || '', departure: entry.departure || '',
      status: entry.status || 'occupied', note: entry.note || '', source: 'user',
      createdAt: new Date().toISOString(),
    };
    load().occupancy.push(rec);
    save();
    mirror((s) => s.pushOccupancy(rec), 'occupancy:' + rec.id);
    return rec;
  }
  function deleteOccupancy(id) {
    const rows = load().occupancy.filter((x) => x.id === id);
    if (!rows.length) return;
    // soft-delete (tombstone) + source:'user' so the removal survives a re-seed.
    // Every row carrying the id goes (legacy twins), not just the first match.
    const at = new Date().toISOString();
    rows.forEach((o) => { o.deleted = true; o.deletedAt = at; o.source = 'user'; });
    save();
    mirror((s) => s.pushOccupancy(rows[0]), 'occupancy:' + id);
  }
  // "Vider" is a statement about the WEEK, not about row ids: each phone
  // imports the roster separately (different ids for the same cells), so an
  // id-by-id tombstone from one phone can't reach the other's copies — its
  // stale rows re-sync and the week never fully empties. clearWeek records
  // "everything created before T is gone" and the marker syncs; both sides
  // then drop any row older than the clear, whichever phone minted it.
  const rowCreated = (o) => {
    if (o.createdAt) return o.createdAt;
    const m = /^occ-u-(\d+)-/.exec(o.id || '');       // legacy ids carry their birth ms
    return m ? new Date(+m[1]).toISOString() : '1970-01-01T00:00:00.000Z'; // seed rows: older than any clear
  };
  function clearWeek(week, at) {
    at = at || new Date().toISOString();
    const st = load();
    if ((st.occCleared[week] || '') < at) st.occCleared[week] = at;
    const cut = st.occCleared[week];
    const rows = st.occupancy.filter((o) => o.week === week && !o.deleted && rowCreated(o) < cut);
    rows.forEach((o) => { o.deleted = true; o.deletedAt = cut; o.source = 'user'; });
    save();
    mirror((s) => { s.pushOccCleared(week, cut); rows.forEach((o) => s.pushOccupancy(o)); }, 'meta:occCleared', ...rows.map((o) => 'occupancy:' + o.id));
    return rows.length;
  }
  function applyRemoteOccCleared(map) {
    let changed = false;
    Object.keys(map || {}).forEach((week) => {
      const at = map[week];
      if (typeof at !== 'string' || (load().occCleared[week] || '') >= at) return;
      state.occCleared[week] = at;
      state.occupancy.filter((o) => o.week === week && !o.deleted && rowCreated(o) < at)
        .forEach((o) => { o.deleted = true; o.deletedAt = at; o.source = 'user'; });
      changed = true;
    });
    if (changed) save();
    return changed;
  }
  function applyRemoteOccupancy(rec) {
    const cut = load().occCleared[rec.week];
    if (cut && !rec.deleted && rowCreated(rec) < cut) rec = { ...rec, deleted: true, deletedAt: cut };
    const i = state.occupancy.findIndex((o) => o.id === rec.id);
    if (i >= 0) state.occupancy[i] = keepDeleted(state.occupancy[i], rec); else state.occupancy.push(rec);
    save();
  }
  function applyRemoteOccupancyRemoved(id) {
    state.occupancy = load().occupancy.filter((o) => o.id !== id);
    save();
  }

  // Pool fields that flip across phones and must never be resurrected by a
  // stale copy: each carries a last-writer-wins timestamp.
  const LWW = { watering: 'wateringAt', winter: 'winterAt' };
  function updatePool(id, patch) {
    const p = pool(id);
    if (!p) return p;
    Object.keys(LWW).forEach((k) => { if (k in patch) patch = { ...patch, [LWW[k]]: new Date().toISOString() }; }); // LWW stamps
    Object.assign(p, patch); save(); mirror((s) => s.pushPool(id, patch), 'pools:' + id);
    return p;
  }
  // Hivernage: the pool sleeps (out of À revoir, rhythm, tiles; ice-blue pin)
  // and the flip itself is logged as a service visit so the date, operator and
  // weather sit in the history.
  const isWintered = (p) => !!(p && p.winter && p.winter.since);
  function setWinter(poolId, on) {
    const p = pool(poolId);
    if (!p || isWintered(p) === !!on) return p;
    updatePool(poolId, { winter: on ? { since: localDate(new Date().toISOString()) } : null });
    addVisit(poolId, { type: 'service', task: on ? 'hivernage' : 'remise' });
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
  // pH is physically 0–14. A wet-finger entry like "72" or "83" (comma missed)
  // is an unambiguous dropped decimal — fold it back (72→7.2) and clamp the
  // result to the real scale so one typo can't wreck a pool's history.
  function phNorm(v) {
    let n = numOrNull(v);
    if (n === null) return null;
    while (n > 14) n /= 10;
    return Math.max(0, Math.min(14, n));
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
    normalize();
    state.dirty = []; state.dirtyAll = true; // the server's view is unknown now
    migrate();
    save();
    if (window.Photos && photos.length && Photos.importAll) Photos.importAll(photos);
  }
  function resetToSeed() {
    state = seedState();
    save();
  }

  // ---- operator identity (who is logging) ----
  // Device-local on purpose: this phone belongs to one person, so it does NOT
  // live in the synced blob — my phone stays "Loki", Dodo's stays "Dodo". Every
  // new log is stamped `by`; records made before this existed have no `by` and
  // read as blank (no backfilling, no guessing who did what).
  const OP_KEY = 'lagrange-piscine.operator';
  function operator() { try { return localStorage.getItem(OP_KEY) || ''; } catch (_) { return ''; } }
  function setOperator(name) { try { localStorage.setItem(OP_KEY, (name || '').trim()); } catch (_) {} }
  // Names for the picker = every `by` seen in the data (arrives from either
  // phone via sync) plus this device's own operator. Add-new = just type one.
  function knownOperators() {
    const set = new Set(); const s = load();
    ['readings', 'visits', 'notes'].forEach((k) => (s[k] || []).forEach((r) => { if (r.by) set.add(r.by); }));
    const me = operator(); if (me) set.add(me);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
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
    operator, setOperator, knownOperators,
    updatePool, updateResidence,
    updateOccupancy, addOccupancy, deleteOccupancy, clearWeek,
    isWintered, setWinter, LWW,
    markDirty, dirtyMarks, dirtyAll, clearDirty,
    seasonStart, allSeasons, setAllSeasons, inSeason, setSeasonStart, applyRemoteSeason,
    applyRemoteReading, applyRemoteReadingRemoved,
    applyRemoteVisit, applyRemoteVisitRemoved, applyRemotePool,
    applyRemoteNote, applyRemoteNoteRemoved,
    applyRemoteOccupancy, applyRemoteOccupancyRemoved, applyRemoteOccCleared,
    exportJSON, importJSON, resetToSeed,
  };
})();
window.Store = Store;
