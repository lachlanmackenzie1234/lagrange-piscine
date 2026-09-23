const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { Routine } = require('../js/quest-npcs.js');
const context = vm.createContext({ window: {} }); vm.runInContext(fs.readFileSync(require.resolve('../js/maps.js'), 'utf8'), context);
const maps = context.window.PoolMaps;

test('every NPC strolls and returns home without crossing furniture or other NPCs', () => {
  for (const id of ['bureau', 'depot']) {
    const layout = JSON.parse(JSON.stringify(maps.hub(id))), routine = new Routine(layout, maps.route), left = new Set(), returned = new Set();
    for (let tick = 0; tick < 3600; tick++) {
      routine.update(.1, [[layout.anchors.sp.x, layout.anchors.sp.y]]);
      const cells = new Set();
      for (const p of routine.people) {
        const home = p.cell.join() === p.home.join(); if (!home) left.add(p.id); if (home && left.has(p.id)) returned.add(p.id);
        assert.ok(home || layout.coll[p.cell[1]][p.cell[0]] === 0, `${id}/${p.id} crosses furniture`);
        assert.ok(!cells.has(p.cell.join()), `${id}: NPC overlap`); cells.add(p.cell.join());
        if (p.seated) assert.ok(home && p.seat);
      }
    }
    assert.equal(left.size, 3, id + ' departed'); assert.equal(returned.size, 3, id + ' returned');
  }
});

test('a conversation and reduced motion pause people at their current position', () => {
  const routine = new Routine(maps.hub('depot'), maps.route);
  for (let i = 0; i < 58; i++) routine.update(.1, [[8, 10]]);
  const p = routine.get('matt'), before = [p.x, p.y];
  for (let i = 0; i < 30; i++) routine.update(.1, [[8, 10]], 'matt');
  assert.deepEqual([p.x, p.y], before);
  const all = routine.people.map(p => [p.x, p.y]); routine.update(5, [], null, true);
  assert.deepEqual(routine.people.map(p => [p.x, p.y]), all);
  assert.equal(routine.moving, false);
});
