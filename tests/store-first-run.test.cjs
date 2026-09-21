const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function freshStore() {
  const data = new Map();
  const context = vm.createContext({
    window: {}, console,
    localStorage: { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) },
  });
  for (const file of ['seed.js', 'store.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
  return context.window.Store;
}

test('a fresh install can open Settings and log maintenance before its first reload', () => {
  const store = freshStore();
  assert.equal(store.seasonStart(), null);
  assert.deepEqual(Array.from(store.dirtyMarks()), []);
  assert.equal(store.dirtyAll(), false);
  const poolId = store.pools()[0].id;
  const reading = store.addReading({ poolId, ph: '7,2', chlorine: '1,5' });
  const visit = store.addVisit(poolId, { type: 'service', task: 'balai' });
  assert.equal(store.readingsFor(poolId)[0].ph, 7.2);
  assert.equal(store.visitsFor(poolId)[0].task, 'balai');
  assert.ok(store.dirtyMarks().includes('readings:' + reading.id));
  assert.ok(store.dirtyMarks().includes('visits:' + visit.id));
});

test('resetting to seed retains the same initialized season and sync fields', () => {
  const store = freshStore();
  store.setSeasonStart('2026-06-01T00:00:00.000Z');
  store.resetToSeed();
  assert.equal(store.seasonStart(), null);
  assert.deepEqual(Array.from(store.dirtyMarks()), []);
  assert.equal(store.dirtyAll(), false);
});
