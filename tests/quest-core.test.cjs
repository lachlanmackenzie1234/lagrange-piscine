const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../js/quest-core.js');
const { RenderClock } = require('../js/game-motion.js');
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) }; };

test('six NPCs have the user-assigned jobs and actions', () => {
  assert.equal(Q.NPCS.length, 6); assert.equal(new Set(Q.NPCS.map(n => n.id)).size, 6);
  assert.equal(Q.NPCS.find(n => n.id === 'jojo').action, 'potions');
  assert.equal(Q.NPCS.find(n => n.id === 'karine').action, 'craft');
  assert.equal(Q.NPCS.find(n => n.id === 'pj').map, 'bureau');
  assert.equal(Q.NPCS.find(n => n.id === 'jp').action, 'quest');
  assert.equal(Q.counterpart(' Dodo '), 'loki'); assert.equal(Q.counterpart('LOKI'), 'dodo'); assert.equal(Q.counterpart(''), null);
});

test('buying and consuming a potion preserves cost, count and HP limits', () => {
  const g = Q.freshState(); g.coins = 20; g.hp = 75;
  assert.equal(Q.buyPotion(g, 'small'), true); assert.equal(g.coins, 12); assert.equal(g.potions.small, 1);
  assert.deepEqual(Q.usePotion(g, 'small'), { healed: 25, hp: 100, max: 100 }); assert.equal(g.potions.small, 0);
  Q.buyPotion(g, 'small'); assert.equal(Q.usePotion(g, 'small'), null); assert.equal(g.potions.small, 1);
  assert.equal(Q.usePotion(g, 'small', 0), null); assert.equal(Q.buyPotion(g, 'large'), false);
  assert.equal(Q.buyPotion(g, 'unknown'), false);
});

test('daily quests count only accepted matching kills and pay once', () => {
  const g = Q.freshState(), day = '2026-09-21';
  assert.equal(Q.recordKill(g, 'algue', day), false);
  assert.equal(Q.acceptQuest(g, day), true); assert.equal(Q.acceptQuest(g, day), false);
  assert.equal(Q.recordKill(g, 'sable', day), false); assert.equal(Q.claimQuest(g, day), null);
  for (let i = 0; i < 3; i++) assert.equal(Q.recordKill(g, 'algue', day), true);
  assert.equal(Q.recordKill(g, 'algue', day), false);
  assert.deepEqual(Q.claimQuest(g, day), { coins: 25, xp: 16, potions: 1 });
  const restored = JSON.parse(JSON.stringify(g)); assert.equal(Q.claimQuest(restored, day), null);
  assert.equal(restored.coins, 25); assert.equal(restored.xp, 16); assert.equal(restored.potions.small, 1);
  assert.equal(Q.dailyQuest(g, '2026-09-22'), null); assert.equal(Q.acceptQuest(g, '2026-09-22'), true);
});

test('the old game save migrates to one operator without granting it to the other', () => {
  const s = storage(), base = 'lagrange-piscine.quest', old = Q.freshState(); old.coins = 47;
  s.setItem(base, JSON.stringify(old));
  const loki = Q.loadPlayer(s, 'Loki'); assert.equal(loki.state.coins, 47);
  loki.state.coins = 51; s.setItem(loki.key, JSON.stringify(loki.state));
  const dodo = Q.loadPlayer(s, 'Dodo'); assert.equal(dodo.state.coins, 0);
  assert.equal(Q.loadPlayer(s, 'loki').state.coins, 51);
  assert.equal(JSON.parse(s.getItem(base)).coins, 47, 'original save remains a backup');
});

test('an unnamed local save can be assigned once to the first selected player', () => {
  const s = storage(); const guest = Q.loadPlayer(s, ''); guest.state.coins = 9; s.setItem(guest.key, JSON.stringify(guest.state));
  assert.equal(Q.loadPlayer(s, 'Dodo').state.coins, 9);
  assert.equal(Q.loadPlayer(s, 'Loki').state.coins, 0);
});

test('public profiles contain only appearance and visual equipment', () => {
  const g = Q.freshState(); g.coins = 900; g.hp = 4; g.potions.small = 9;
  g.avatar.secret = 'private'; g.equip.tête = { res: 'EC', rar: 'rare', cursed: true, id: 'private-id', affixes: [{ k: 'gold', v: 50 }] };
  const p = Q.profile('Loki', g, '2026-09-21T10:00:00Z');
  assert.deepEqual(Object.keys(p).sort(), ['avatar', 'equip', 'operator', 'updatedAt', 'version']);
  assert.deepEqual(p.equip.tête, { res: 'EC', rar: 'rare', cursed: true }); assert.equal(p.avatar.secret, undefined);
  assert.equal(Q.profile('Matt', g), null);
  assert.equal(Q.sanitizeProfile({ ...p, operator: 'dodo' }, 'loki'), null);
  assert.equal(Q.sanitizeProfile({ ...p, updatedAt: 'invalid' }, 'loki'), null);
  assert.equal(Q.sanitizeProfile({ ...p, avatar: null }, 'loki').avatar.skin, '#e8b88a');
});

test('partner activity uses the correct operator and excludes deleted logs', () => {
  const d = { visits: [{ by: 'Dodo', at: '2026-09-21T08:00:00Z', poolId: 'EC-2' }, { by: 'Dodo', at: '2026-09-21T11:00:00Z', deleted: true }], readings: [{ by: 'Loki', at: '2026-09-21T12:00:00Z' }, { by: ' dodo ', at: '2026-09-21T09:00:00Z', poolId: 'AG-8' }] };
  assert.equal(Q.lastActivity(d, 'Dodo').poolId, 'AG-8');
  assert.equal(Q.lastActivity(d, 'Dodo').type, 'reading');
});

test('render clock separates 60/30 fps presentation from elapsed animation time', () => {
  for (const hz of [60, 90, 120]) for (const target of [30, 60]) {
    const clock = new RenderClock(); let frames = 0, elapsed = 0;
    for (let i = 0; i < hz * 2; i++) { const step = clock.tick(1 / hz, target); if (step != null) { frames++; elapsed += step; } }
    assert.ok(Math.abs(frames - target * 2) <= 1, `${hz}Hz/${target}fps: ${frames}`);
    assert.ok(Math.abs(elapsed - 2) < .04);
    clock.reset(); assert.equal(clock.tick(.001, 30), null);
  }
});
