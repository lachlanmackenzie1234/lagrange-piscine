/* Only the public avatar/equipment projection syncs; game saves stay local. */
const QuestProfiles = (() => {
  const Q = window.QuestCore, PREFIX = 'lagrange-piscine.quest-profiles.';
  const inflight = new Map(), retryAt = new Map(), retryTimers = new Map();
  const team = () => localStorage.getItem('lagrange-piscine.team') || '';
  const read = scope => { try { return JSON.parse(localStorage.getItem(PREFIX + scope) || '{}'); } catch (_) { return {}; } };
  const write = (scope, value) => localStorage.setItem(PREFIX + scope, JSON.stringify(value));
  function get(id) { const state = read(team()); return [state.profiles?.[id], state.own?.[id]].map(p => Q.sanitizeProfile(p, id)).filter(Boolean).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null; }
  function ingest(scope, id, raw) {
    if (scope !== team()) return false;
    const packet = Q.sanitizeProfile(raw, id); if (!packet) return false;
    const state = read(scope), old = state.profiles?.[id];
    if (old && old.updatedAt >= packet.updatedAt) return false;
    state.profiles ||= {}; state.profiles[id] = packet; write(scope, state);
    window.dispatchEvent(new CustomEvent('lp-quest-profile')); return true;
  }
  function remove(scope, id) {
    if (scope !== team()) return;
    const state = read(scope); if (!state.profiles?.[id]) return;
    delete state.profiles[id]; write(scope, state); window.dispatchEvent(new CustomEvent('lp-quest-profile'));
  }
  function publish(name, g) {
    const packet = Q.profile(name, g); if (!packet) return;
    const scope = team(), state = read(scope), previous = state.outbox?.[packet.operator] || state.own?.[packet.operator];
    if (!previous || Q.profileKey(previous) !== Q.profileKey(packet)) {
      if (previous?.updatedAt >= packet.updatedAt) packet.updatedAt = new Date(Date.parse(previous.updatedAt) + 1).toISOString();
      state.own ||= {}; state.outbox ||= {}; state.own[packet.operator] = packet; state.outbox[packet.operator] = packet; write(scope, state);
    }
    flush();
  }
  function flush() {
    const scope = team(), sync = window.Sync;
    if (!scope || !sync?.active || sync.team !== scope || navigator.onLine === false) return;
    const state = read(scope);
    Object.entries(state.outbox || {}).forEach(([id, raw]) => {
      const packet = Q.sanitizeProfile(raw, id), key = scope + ':' + id;
      if (!packet || inflight.has(key) || (retryAt.get(key) || 0) > Date.now()) return;
      const job = Promise.resolve().then(() => sync.pushPlayerProfile(packet, scope)); inflight.set(key, job);
      job.then(() => {
        const latest = read(scope); if (latest.outbox?.[id]?.updatedAt === packet.updatedAt) { delete latest.outbox[id]; write(scope, latest); }
        retryAt.delete(key); clearTimeout(retryTimers.get(key)); retryTimers.delete(key);
      }).catch(() => {
        retryAt.set(key, Date.now() + 30000);
        clearTimeout(retryTimers.get(key)); retryTimers.set(key, setTimeout(() => { retryTimers.delete(key); flush(); }, 30010));
      }).finally(() => { inflight.delete(key); if (!(retryAt.get(key) > Date.now())) flush(); });
    });
  }
  const retryNow = () => { retryAt.clear(); retryTimers.forEach(timer => clearTimeout(timer)); retryTimers.clear(); flush(); };
  window.addEventListener('online', retryNow);
  window.addEventListener('lp-sync-status', () => { if (window.Sync?.active && navigator.onLine !== false) retryNow(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) flush(); });
  return { get, ingest, remove, publish, flush };
})();
window.QuestProfiles = QuestProfiles;
