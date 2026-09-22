const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../js/quest-core.js');
const item = (id, slot = 'tête') => ({ id, slot, res: 'EC', rar: 'rare', name: id });
const owned = g => [...g.bag, ...Object.values(g.equip)].map(it => it.id).sort();

test('full-bag swaps, repeated clicks and reordered bags retain every owned item', () => {
  const g = Q.freshState(); g.bag = Array.from({ length: 8 }, (_, i) => item('bag-' + i)); g.equip.tête = item('old-hat');
  const all = owned(g);
  assert.ok(Q.equipItem(g, 'bag-4')); assert.equal(g.equip.tête.id, 'bag-4'); assert.deepEqual(owned(g), all);
  assert.equal(Q.equipItem(g, 'bag-4'), false); assert.deepEqual(owned(g), all);
  g.bag.reverse(); assert.ok(Q.equipItem(g, 'old-hat')); assert.deepEqual(owned(g), all);
  assert.equal(Q.unequipItem(g, 'tête', 'bag-4'), false);
  assert.equal(Q.unequipItem(g, 'tête', 'old-hat'), false, 'full bag'); assert.deepEqual(owned(g), all);
  for (let n = 0; n < 50; n++) { assert.ok(Q.equipItem(g, g.bag[n % 8].id)); assert.deepEqual(owned(g), all); }
});

test('sale resolves an item once and requires depot access', () => {
  const g = Q.freshState(); g.bag = [item('hat'), { id: 'crate', crate: true }];
  assert.equal(Q.sellItem(g, 'hat', 8, false), 0); assert.equal(g.bag.length, 2);
  assert.equal(Q.sellItem(g, 'crate', 8, true), 0);
  assert.equal(Q.sellItem(g, 'hat', 8, true), 8); assert.equal(Q.sellItem(g, 'hat', 8, true), 0);
  assert.equal(g.coins, 8); assert.deepEqual(g.bag.map(it => it.id), ['crate']);
});

test('200-coin remote depot access is charged once per visit and survives a reload', () => {
  const g = Q.freshState(); g.coins = 199; assert.equal(Q.buyDepotPass(g), false);
  g.coins = 500; assert.ok(Q.buyDepotPass(g)); assert.equal(g.coins, 300);
  const restored = Q.normalize(JSON.parse(JSON.stringify(g))); assert.equal(Q.buyDepotPass(restored), false);
  assert.equal(restored.coins, 300); restored.depotPass = false;
  assert.ok(Q.buyDepotPass(restored)); assert.equal(restored.coins, 100);
});
