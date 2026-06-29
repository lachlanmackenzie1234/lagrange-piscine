/*
 * Team Sync — optional, offline-first multi-device sync via Firebase Firestore.
 *
 * Design:
 *  - Disabled by default; the base app is 100% local/offline without it.
 *  - When enabled, the Firebase SDK is lazy-loaded (ESM from gstatic, cached by
 *    the service worker for offline use).
 *  - Anonymous auth; data scoped under teams/{teamCode}/… so two phones sharing
 *    a code mirror each other. The team code is a shared secret (not in source).
 *  - readings & visits are append-only docs keyed by their unique id → conflict
 *    free across devices. Pool GPS/notes are last-write-wins per pool.
 *  - Firestore's persistent cache makes writes instant offline and syncs
 *    automatically (store-and-forward) when a connection returns.
 *
 * The web apiKey is a public client identifier (not a secret); security is
 * enforced by the Firestore rules (auth required).
 */
const Sync = (() => {
  const CFG = {
    apiKey: 'AIzaSyASL_7vUGjnkwghlMn-p5G0DiZhlm82hg8',
    authDomain: 'lagrange-piscine.firebaseapp.com',
    projectId: 'lagrange-piscine',
    storageBucket: 'lagrange-piscine.firebasestorage.app',
    messagingSenderId: '830853054332',
    appId: '1:830853054332:web:54acd0349bff3e7ecbaef9',
  };
  const SDK = '10.12.5';
  const LS_TEAM = 'lagrange-piscine.team';
  const LS_ON = 'lagrange-piscine.sync';

  let fb = null;          // loaded SDK + instances
  let active = false;
  let status = 'off';     // off | connecting | online | offline | error
  let team = localStorage.getItem(LS_TEAM) || '';
  const unsubs = [];

  const teamId = (s) => String(s).trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '');
  const stripId = (o) => { const { id, ...rest } = o; return rest; };
  function setStatus(s) { status = s; window.dispatchEvent(new CustomEvent('lp-sync-status', { detail: s })); }

  async function loadSdk() {
    const base = `https://www.gstatic.com/firebasejs/${SDK}/`;
    const [appM, authM, fsM] = await Promise.all([
      import(base + 'firebase-app.js'),
      import(base + 'firebase-auth.js'),
      import(base + 'firebase-firestore.js'),
    ]);
    return { appM, authM, fsM };
  }

  function col(name) { return fb.fsM.collection(fb.db, 'teams', team, name); }
  function ref(name, id) { return fb.fsM.doc(fb.db, 'teams', team, name, id); }

  function attach() {
    const { fsM } = fb;
    unsubs.push(fsM.onSnapshot(col('readings'), (s) => applyLog(s, 'reading'),
      () => setStatus('error')));
    unsubs.push(fsM.onSnapshot(col('visits'), (s) => applyLog(s, 'visit'),
      () => setStatus('error')));
    unsubs.push(fsM.onSnapshot(col('notes'), (s) => applyLog(s, 'note'),
      () => setStatus('error')));
    unsubs.push(fsM.onSnapshot(col('pools'), applyPools, () => setStatus('error')));
    unsubs.push(fsM.onSnapshot(col('photos'), applyPhotos, () => setStatus('error')));
  }

  function applyPhotos(snap) {
    if (!window.Photos) return;
    snap.docChanges().forEach((ch) => {
      if (ch.type === 'removed') Photos.applyRemoteRemoved(ch.doc.id);
      else Photos.applyRemote({ ...ch.doc.data(), id: ch.doc.id });
    });
  }

  const APPLY = {
    reading: { put: (r) => Store.applyRemoteReading(r), del: (id) => Store.applyRemoteReadingRemoved(id) },
    visit: { put: (r) => Store.applyRemoteVisit(r), del: (id) => Store.applyRemoteVisitRemoved(id) },
    note: { put: (r) => Store.applyRemoteNote(r), del: (id) => Store.applyRemoteNoteRemoved(id) },
  };
  function applyLog(snap, kind) {
    const a = APPLY[kind];
    snap.docChanges().forEach((ch) => {
      if (ch.type === 'removed') a.del(ch.doc.id);
      else a.put({ ...ch.doc.data(), id: ch.doc.id });
    });
    window.dispatchEvent(new CustomEvent('lp-data-changed'));
  }
  function applyPools(snap) {
    snap.docChanges().forEach((ch) => {
      if (ch.type === 'removed') return;
      Store.applyRemotePool(ch.doc.id, ch.doc.data());
    });
    window.dispatchEvent(new CustomEvent('lp-data-changed'));
  }

  async function pushAllLocal() {
    const { fsM } = fb;
    const st = Store.load();
    const jobs = [];
    st.readings.forEach((r) => jobs.push(fsM.setDoc(ref('readings', r.id), stripId(r), { merge: true })));
    st.visits.forEach((v) => jobs.push(fsM.setDoc(ref('visits', v.id), stripId(v), { merge: true })));
    (st.notes || []).forEach((n) => jobs.push(fsM.setDoc(ref('notes', n.id), stripId(n), { merge: true })));
    (window.Photos ? Photos.all() : []).forEach((ph) => jobs.push(fsM.setDoc(ref('photos', ph.id), stripId(ph), { merge: true })));
    st.pools.filter((p) => p.lat != null).forEach((p) =>
      jobs.push(fsM.setDoc(ref('pools', p.id), { lat: p.lat, lng: p.lng, note: p.note || '' }, { merge: true })));
    await Promise.all(jobs);
  }

  function trackConnectivity() {
    const upd = () => { if (active) setStatus(navigator.onLine ? 'online' : 'offline'); };
    window.addEventListener('online', upd);
    window.addEventListener('offline', upd);
  }

  async function enable(teamCode) {
    team = teamId(teamCode);
    if (!team) throw new Error('team code required');
    localStorage.setItem(LS_TEAM, team);
    localStorage.setItem(LS_ON, '1');
    setStatus('connecting');
    try {
      if (!fb) {
        const { appM, authM, fsM } = await loadSdk();
        const app = appM.initializeApp(CFG);
        const db = fsM.initializeFirestore(app, {
          localCache: fsM.persistentLocalCache({ tabManager: fsM.persistentMultipleTabManager() }),
        });
        const auth = authM.getAuth(app);
        fb = { appM, authM, fsM, app, db, auth };
        await authM.signInAnonymously(auth);
        trackConnectivity();
      }
      attach();
      await pushAllLocal();
      active = true;
      setStatus(navigator.onLine ? 'online' : 'offline');
    } catch (e) {
      console.warn('Team Sync failed to start:', e);
      active = false;
      setStatus('error');
      throw e;
    }
  }

  function disable() {
    unsubs.forEach((u) => { try { u(); } catch (_) {} });
    unsubs.length = 0;
    active = false;
    localStorage.setItem(LS_ON, '0');
    setStatus('off');
  }

  // mirror hooks called by the store on local mutations (no-op unless active)
  const pushReading = (rec) => active && fb && fb.fsM.setDoc(ref('readings', rec.id), stripId(rec), { merge: true }).catch(() => {});
  const removeReading = (id) => active && fb && fb.fsM.deleteDoc(ref('readings', id)).catch(() => {});
  const pushVisit = (rec) => active && fb && fb.fsM.setDoc(ref('visits', rec.id), stripId(rec), { merge: true }).catch(() => {});
  const removeVisit = (id) => active && fb && fb.fsM.deleteDoc(ref('visits', id)).catch(() => {});
  const pushNote = (rec) => active && fb && fb.fsM.setDoc(ref('notes', rec.id), stripId(rec), { merge: true }).catch(() => {});
  const removeNote = (id) => active && fb && fb.fsM.deleteDoc(ref('notes', id)).catch(() => {});
  const pushPhoto = (rec) => active && fb && fb.fsM.setDoc(ref('photos', rec.id), stripId(rec), { merge: true }).catch(() => {});
  const removePhoto = (id) => active && fb && fb.fsM.deleteDoc(ref('photos', id)).catch(() => {});
  function pushPool(poolId, patch) {
    if (!(active && fb)) return;
    const f = {};
    if ('lat' in patch) f.lat = patch.lat ?? null;
    if ('lng' in patch) f.lng = patch.lng ?? null;
    if ('note' in patch) f.note = patch.note ?? '';
    fb.fsM.setDoc(ref('pools', poolId), f, { merge: true }).catch(() => {});
  }

  // resume sync automatically next session if it was on
  function maybeAutoStart() {
    if (localStorage.getItem(LS_ON) === '1' && team) enable(team).catch(() => {});
  }

  return {
    enable, disable, maybeAutoStart,
    pushReading, removeReading, pushVisit, removeVisit, pushNote, removeNote, pushPhoto, removePhoto, pushPool,
    get active() { return active; },
    get status() { return status; },
    get team() { return team; },
  };
})();
window.Sync = Sync;
