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

  // Read the original capture time from EXIF (DateTimeOriginal); fall back to
  // the file's modified time. Parsed from the raw bytes before canvas strips EXIF.
  async function exifTime(file) {
    try {
      const buf = await file.slice(0, 256 * 1024).arrayBuffer();
      const v = new DataView(buf);
      if (v.getUint16(0) !== 0xFFD8) return null; // not JPEG
      let off = 2;
      while (off + 4 <= v.byteLength) {
        const marker = v.getUint16(off);
        if (marker === 0xFFE1) { // APP1
          if (v.getUint32(off + 4) === 0x45786966) { // "Exif"
            const tiff = off + 10;
            const le = v.getUint16(tiff) === 0x4949;
            const u16 = (o) => v.getUint16(o, le);
            const u32 = (o) => v.getUint32(o, le);
            const readIFD = (ifd) => { const n = u16(ifd); const m = {}; for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12; m[u16(e)] = e; } return m; };
            const readStr = (e) => { const cnt = u32(e + 4); const o2 = cnt > 4 ? tiff + u32(e + 8) : e + 8; let s = ''; for (let k = 0; k < cnt; k++) { const ch = v.getUint8(o2 + k); if (!ch) break; s += String.fromCharCode(ch); } return s; };
            const d0 = readIFD(tiff + u32(tiff + 4));
            let str = null;
            if (d0[0x8769] !== undefined) { const de = readIFD(tiff + u32(d0[0x8769] + 8)); str = (de[0x9003] !== undefined && readStr(de[0x9003])) || (de[0x9004] !== undefined && readStr(de[0x9004])) || null; }
            if (!str && d0[0x0132] !== undefined) str = readStr(d0[0x0132]);
            if (str) { const m = str.match(/(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/); if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).toISOString(); }
          }
          return null;
        }
        if ((marker & 0xFF00) !== 0xFF00) break;
        off += 2 + v.getUint16(off + 2);
      }
    } catch (e) { /* fall through */ }
    return null;
  }

  async function add(meta, file) {
    if (!db) await init();
    const [dataUrl, exif] = await Promise.all([compress(file), exifTime(file)]);
    const rec = {
      id: `ph-${Date.now()}-${Math.floor(performance.now())}`,
      poolId: meta.poolId || '',
      noteId: meta.noteId || '',
      label: meta.label || '',
      at: exif || new Date(file.lastModified || Date.now()).toISOString(), // photo's own time
      dataUrl,
    };
    cache.set(rec.id, rec);
    await putDb(rec);
    if (window.Sync && Sync.active) Sync.pushPhoto(rec);
    changed();
    return rec;
  }
  // Soft-delete (tombstone). Like the store's notes/visits: we keep a light
  // record with deleted:true (dropping the heavy dataUrl to reclaim space) and
  // push that through sync, instead of a hard delete that only sticks if it
  // reaches the server. Survives cache clears; view accessors filter it out.
  async function remove(id) {
    const old = cache.get(id);
    const tomb = {
      id,
      poolId: old ? old.poolId : '',
      noteId: old ? old.noteId : '',
      label: old ? old.label : '',
      at: old ? old.at : new Date().toISOString(),
      dataUrl: '',
      deleted: true,
      deletedAt: new Date().toISOString(),
    };
    cache.set(id, tomb);
    await putDb(tomb);
    if (window.Sync && Sync.active) Sync.pushPhoto(tomb);
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

  // Restore photos from a full backup (writes to cache + IndexedDB).
  async function importAll(records) {
    if (!db) await init();
    for (const r of records) { if (r && r.id) { cache.set(r.id, r); await putDb(r); } }
    changed();
  }

  const get = (id) => cache.get(id) || null;
  const all = () => [...cache.values()];
  // Views exclude tombstones; all() stays raw so export/sync keep the tombstones.
  const byNote = (noteId) => all().filter((p) => p.noteId === noteId && !p.deleted).sort((a, b) => a.at.localeCompare(b.at));
  const refsForPool = (poolId) => all().filter((p) => p.poolId === poolId && !p.noteId && !p.deleted);
  const poolRef = (poolId, label) => all().find((p) => p.poolId === poolId && p.label === label && !p.noteId && !p.deleted) || null;

  return { init, add, remove, applyRemote, applyRemoteRemoved, importAll, get, all, byNote, refsForPool, poolRef, exifTime };
})();
window.Photos = Photos;
