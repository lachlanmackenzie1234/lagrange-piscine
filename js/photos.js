/*
 * Photos — in-browser compressed images, no paid storage.
 *
 * Each photo is downscaled (max 1024px) to a JPEG data URL (~50–150 KB), kept
 * in IndexedDB (so it never bloats the localStorage app blob) and mirrored to
 * Firestore when Team Sync is on (each well under the 1 MB doc limit).
 *
 * A photo belongs to a pool (poolId) and is either a reference photo (a label
 * like "gate"/"pool"/"pit", noteId === '') or attached to a note (noteId set).
 * An in-memory cache lets the synchronous UI read metadata + thumbnails.
 */
const Photos = (() => {
  const DB = 'lagrange-piscine';
  const STORE = 'photos';
  let db = null;
  const cache = new Map();

  function open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  const store = (mode) => db.transaction(STORE, mode).objectStore(STORE);
  const putDb = (rec) => new Promise((res) => { const r = store('readwrite').put(rec); r.onsuccess = res; r.onerror = res; });
  const delDb = (id) => new Promise((res) => { const r = store('readwrite').delete(id); r.onsuccess = res; r.onerror = res; });
  function loadAll() {
    return new Promise((res) => {
      const req = store('readonly').openCursor();
      req.onsuccess = () => { const c = req.result; if (c) { cache.set(c.value.id, c.value); c.continue(); } else res(); };
      req.onerror = () => res();
    });
  }
  const changed = () => window.dispatchEvent(new CustomEvent('lp-data-changed'));

  async function init() {
    try { db = await open(); await loadAll(); changed(); }
    catch (e) { console.warn('Photos unavailable:', e); }
  }

  // Downscale + JPEG-compress a File to a data URL.
  function compress(file, maxEdge = 1024, quality = 0.5) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width: w, height: h } = img;
        const m = Math.max(w, h);
        if (m > maxEdge) { const s = maxEdge / m; w = Math.round(w * s); h = Math.round(h * s); }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function add(meta, file) {
    if (!db) await init();
    const dataUrl = await compress(file);
    const rec = {
      id: `ph-${Date.now()}-${Math.floor(performance.now())}`,
      poolId: meta.poolId || '',
      noteId: meta.noteId || '',
      label: meta.label || '',
      at: new Date(file.lastModified || Date.now()).toISOString(), // photo's own time
      dataUrl,
    };
    cache.set(rec.id, rec);
    await putDb(rec);
    if (window.Sync && Sync.active) Sync.pushPhoto(rec);
    changed();
    return rec;
  }
  async function remove(id) {
    cache.delete(id);
    await delDb(id);
    if (window.Sync && Sync.active) Sync.removePhoto(id);
    changed();
  }
  // from Team Sync (no re-mirror)
  async function applyRemote(rec) {
    if (!rec || !rec.id) return;
    cache.set(rec.id, rec);
    if (!db) await init();
    await putDb(rec);
    changed();
  }
  async function applyRemoteRemoved(id) {
    cache.delete(id);
    if (db) await delDb(id);
    changed();
  }

  const get = (id) => cache.get(id) || null;
  const all = () => [...cache.values()];
  const byNote = (noteId) => all().filter((p) => p.noteId === noteId).sort((a, b) => a.at.localeCompare(b.at));
  const refsForPool = (poolId) => all().filter((p) => p.poolId === poolId && !p.noteId);
  const poolRef = (poolId, label) => all().find((p) => p.poolId === poolId && p.label === label && !p.noteId) || null;

  return { init, add, remove, applyRemote, applyRemoteRemoved, get, all, byNote, refsForPool, poolRef };
})();
window.Photos = Photos;
