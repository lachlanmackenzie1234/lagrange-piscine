const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const Q = require('../js/quest-core.js');
const tick = () => new Promise(resolve => setImmediate(resolve));
function device(transport) {
  const data = new Map([['lagrange-piscine.team', 'team-a']]), handlers = new Map(), timers = new Map(); let time = Date.now(), serial = 0;
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
  const window = { QuestCore: Q, Sync: { active: true, team: 'team-a', pushPlayerProfile: transport }, addEventListener: (name, fn) => handlers.set(name, fn), dispatchEvent() {} };
  const context = vm.createContext({ window, document: { hidden: false, addEventListener: (name, fn) => handlers.set(name, fn) }, navigator: { onLine: true }, localStorage: storage, CustomEvent: class { constructor(type) { this.type = type; } }, Promise, Date: class extends Date { static now() { return time; } }, console, setTimeout: fn => { timers.set(++serial, fn); return serial; }, clearTimeout: id => timers.delete(id) });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/quest-profiles.js'), 'utf8'), context);
  return { api: window.QuestProfiles, storage, window, handlers, retry: () => { time += 31000; [...timers.values()].forEach(fn => fn()); }, outbox: () => JSON.parse(storage.getItem('lagrange-piscine.quest-profiles.team-a') || '{}').outbox || {} };
}

test('repeated game saves do not repeatedly upload the same outfit', async () => {
  const calls = [], d = device(async (packet, team) => calls.push({ packet, team })), g = Q.freshState();
  d.api.publish('Loki', g); await tick(); await tick();
  for (let i = 0; i < 10; i++) { g.coins++; d.api.publish('Loki', g); }
  await tick(); assert.equal(calls.length, 1); assert.equal(calls[0].team, 'team-a'); assert.equal(calls[0].packet.coins, undefined);
  assert.deepEqual(Object.keys(d.outbox()), []);
});

test('an old acknowledgement cannot discard a newer outfit waiting to sync', async () => {
  const calls = [], pending = [], d = device(packet => { calls.push(packet); return new Promise(resolve => pending.push(resolve)); }), g = Q.freshState();
  d.api.publish('Loki', g); await tick();
  g.equip.tête = { res: 'GP', rar: 'epic' }; d.api.publish('Loki', g);
  pending.shift()(); await tick(); await tick();
  assert.equal(calls.length, 2); assert.equal(d.outbox().loki.equip.tête.res, 'GP');
  pending.shift()(); await tick(); await tick(); assert.deepEqual(Object.keys(d.outbox()), []);
});

test('failed appearance writes stay queued and retry on reconnect', async () => {
  let attempts = 0; const d = device(async () => { if (++attempts === 1) throw Error('offline'); });
  d.api.publish('Dodo', Q.freshState()); await tick(); await tick(); assert.ok(d.outbox().dodo);
  d.handlers.get('online')(); await tick(); await tick(); assert.equal(attempts, 2); assert.deepEqual(Object.keys(d.outbox()), []);
});

test('a retry is scheduled even when the first write fails after a reconnect event', async () => {
  let rejectFirst, count = 0;
  const d = device(() => ++count === 1 ? new Promise((_, reject) => { rejectFirst = reject; }) : Promise.resolve());
  d.api.publish('Loki', Q.freshState()); await tick(); d.handlers.get('online')(); rejectFirst(Error('late network failure'));
  await tick(); await tick(); assert.ok(d.outbox().loki);
  d.retry(); await tick(); await tick(); assert.equal(count, 2); assert.deepEqual(Object.keys(d.outbox()), []);
});

test('two device views exchange only sanitized current-team appearance', async () => {
  const a = device(async packet => b.api.ingest('team-a', packet.operator, packet));
  const b = device(async packet => a.api.ingest('team-a', packet.operator, packet));
  const loki = Q.freshState(), dodo = Q.freshState(); loki.coins = 100; loki.equip.tête = { res: 'EC', rar: 'rare' }; dodo.avatar.hairColor = '#d82f2f';
  a.api.publish('Loki', loki); b.api.publish('Dodo', dodo); await tick(); await tick();
  assert.equal(b.api.get('loki').equip.tête.res, 'EC'); assert.equal(a.api.get('dodo').avatar.hairColor, '#d82f2f'); assert.equal(b.api.get('loki').coins, undefined);
  const latest = b.api.get('loki'); assert.equal(b.api.ingest('team-a', 'loki', { ...latest, updatedAt: '2000-01-01T00:00:00Z', equip: {} }), false);
  assert.equal(b.api.ingest('another-team', 'loki', latest), false);
  b.storage.setItem('lagrange-piscine.team', 'another-team'); assert.equal(b.api.get('loki'), null);
});
