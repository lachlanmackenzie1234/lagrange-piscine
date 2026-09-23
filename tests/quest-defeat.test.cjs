const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../js/quest-core.js');
const setup = () => { const g = Q.freshState(); g.coins = 200; g.xp = 1200; g.equip.tête = { id: 'worn', slot: 'tête' }; g.bag = [{ id: 'bag-hat', slot: 'tête' }, { id: 'box', crate: true }]; return [g, { hp: 80, maxHp: 80 }]; };

test('one rematch returns first-defeat money, XP and bag equipment exactly once', () => {
  let [g, m] = setup(); assert.ok(Q.beginBattle(m)); assert.equal(Q.beginBattle(m), false);
  assert.deepEqual(Q.loseBattle(g, m, .19, 0), { coins: 40, xp: 120, item: { id: 'bag-hat', slot: 'tête' }, vanished: false });
  assert.equal(g.equip.tête.id, 'worn'); assert.equal(g.bag[0].id, 'box'); assert.equal(g.hp, 1);
  assert.equal(Q.loseBattle(g, m, 0, 0), null);
  [g, m] = JSON.parse(JSON.stringify([g, m]));
  assert.ok(Q.beginBattle(m)); const recovered = Q.winBattle(g, m);
  assert.equal(recovered.item.id, 'bag-hat'); assert.equal(g.coins, 200); assert.equal(g.xp, 1200);
  assert.equal(g.bag.filter(it => it.id === 'bag-hat').length, 1);
  assert.equal(Q.winBattle(g, m), null); assert.equal(Q.beginBattle(m), false);
});

test('a second defeat permanently takes held equipment and prevents a third combat', () => {
  const [g, m] = setup(); Q.beginBattle(m); Q.loseBattle(g, m, 0, 0); Q.beginBattle(m);
  const second = Q.loseBattle(g, m, 0, 0);
  assert.equal(second.vanished, true); assert.equal(second.item.id, 'bag-hat'); assert.equal(m.loss, null);
  assert.equal(Q.beginBattle(m), false); assert.equal(Q.winBattle(g, m), null);
  assert.equal(g.bag.length, 1); assert.equal(g.equip.tête.id, 'worn');
});

test('escape/reload uses up the rematch, but opening its warning does not', () => {
  const [g, m] = setup(); Q.beginBattle(m); Q.loseBattle(g, m, 0, 0);
  assert.equal(Q.leaveBattle(m), null); assert.ok(m.loss.item);
  Q.beginBattle(m); assert.deepEqual(Q.leaveBattle(m), { vanished: true, item: { id: 'bag-hat', slot: 'tête' } });
  assert.equal(Q.beginBattle(m), false);
});

test('loss chance, currency floors and recovery never discard other bag items', () => {
  const [g, m] = setup(); g.coins = 3; g.xp = 4; Q.beginBattle(m);
  const loss = Q.loseBattle(g, m, .2, 0); assert.equal(loss.item, null); assert.equal(loss.coins, 3); assert.equal(loss.xp, 1);
  const [full, held] = setup(); Q.beginBattle(held); Q.loseBattle(full, held, 0, 0);
  full.bag = Array.from({ length: 8 }, (_, i) => ({ id: 'new-' + i, slot: 'torse' }));
  Q.beginBattle(held); Q.winBattle(full, held); assert.equal(full.bag.length, 9); assert.equal(full.bag.at(-1).id, 'bag-hat');
  assert.equal(new Set(full.bag.map(it => it.id)).size, 9);
  const [legacy, oldMonster] = setup(); Q.beginBattle(oldMonster); Q.loseBattle(legacy, oldMonster, 0, 0);
  legacy.bag.push({ id: 'bag-hat', slot: 'torse' }); Q.beginBattle(oldMonster); Q.winBattle(legacy, oldMonster);
  assert.equal(legacy.bag.length, 3, 'an old reused ID does not erase recovered property');
  assert.equal(legacy.bag.at(-1).slot, 'tête');
});
