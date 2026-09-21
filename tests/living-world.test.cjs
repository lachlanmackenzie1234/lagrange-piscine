const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { plan } = require('../js/living-world.js');
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/maps.js'), 'utf8'), context);
const maps = context.window.PoolMaps;

test('all pool scenery is deterministic and leaves routes, deck and anchors untouched', () => {
  for (const id of maps.ids()) {
    const layout = maps.get(id), before = JSON.stringify(layout), result = plan(layout);
    assert.deepEqual(plan(layout), result, id);
    assert.equal(JSON.stringify(layout), before, id);
    assert.ok(result.props.length > layout.objects.length, id);
    for (const tuft of result.grass) {
      const x = Math.floor(tuft.x / 32), y = Math.floor(tuft.y / 32);
      assert.equal(layout.ground[y][x], 'grass', id);
      assert.equal(layout.coll[y][x], 0, id);
      for (const a of Object.values(layout.anchors)) assert.ok(Math.hypot(tuft.x - (a.x + .5) * 32, tuft.y - (a.y + .5) * 32) > 22, id);
    }
    const from = [layout.anchors.sp.x, layout.anchors.sp.y];
    for (const to of [[0, 0], [layout.pool.x, layout.pool.y], [15, 11], [layout.anchors.pu.x, layout.anchors.pu.y]]) {
      const cell = Array.from(maps.nearestReachable(layout.coll, from, to));
      assert.equal(layout.coll[cell[1]][cell[0]], 0, id);
      const route = maps.route(layout.coll, from, cell);
      assert.deepEqual(Array.from(route.at(-1)), cell, id);
      assert.ok(route.every(([x, y]) => layout.coll[y][x] === 0), id);
    }
  }
});

test('a blocked tap finds the nearest reachable cell, not an isolated open island', () => {
  const coll = Array.from({ length: 12 }, () => Array(16).fill(1));
  for (let y = 1; y < 4; y++) for (let x = 1; x < 4; x++) coll[y][x] = 0;
  coll[6][6] = 0;
  assert.deepEqual(Array.from(maps.nearestReachable(coll, [1, 1], [6, 6])), [3, 3]);
  assert.deepEqual(Array.from(maps.nearestReachable(coll, [1, 1], [2, 3])), [2, 3]);
  assert.equal(maps.nearestReachable(coll, [0, 0], [6, 6]), null);
});

test('only the small native foliage atlas is downloaded for offline rendering', () => {
  const dir = path.join(__dirname, '../assets/quest-world');
  const pack = JSON.parse(fs.readFileSync(path.join(dir, 'foliage.json')));
  const png = fs.readFileSync(path.join(dir, 'foliage.png'));
  assert.ok(png.length < 160000);
  assert.equal(pack.regions.length, 8);
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  for (const [x, y, w, h] of pack.regions) assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= width && y + h <= height);
  const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  assert.ok(sw.includes('./js/living-world.js'));
  assert.ok(sw.includes('./assets/quest-world/foliage.png'));
  assert.ok(sw.includes('./assets/quest-world/foliage.json'));
  assert.ok(!sw.includes('quest-world/source/'));
});
