const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { humanGeometry, humanStyle, npcRig } = require('../js/game-motion.js');
const dir = path.join(__dirname, '../assets/quest-hubs');
const pack = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json')));
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/maps.js'), 'utf8'), context);
const maps = context.window.PoolMaps;

test('the legacy fallback shares a compact body while retaining source heads and boots', () => {
  for (const scale of [.8, 1.6]) {
    const reference = humanGeometry(npcRig.karine.neck, scale);
    for (const rig of [humanStyle, ...Object.values(npcRig)]) {
      const geometry = humanGeometry(rig.neck, scale);
      assert.equal(geometry.head, Math.round(rig.neck * scale));
      for (const part of ['torso', 'legs', 'feet']) assert.equal(geometry[part], reference[part]);
      assert.ok(rig.neck < rig.waist && rig.waist < rig.ankle && rig.ankle < 64);
      assert.equal(geometry.height - geometry.head, reference.height - reference.head);
    }
  }
  assert.equal(humanGeometry().legs, 1);
  assert.equal(humanGeometry().torso, 6);
  assert.equal(humanGeometry().feet, 3);
});

test('layered hub stations have packed art, solid footprints and reachable approaches', () => {
  const png = fs.readFileSync(path.join(dir, 'props.png'));
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  for (const { r: [x, y, w, h], anchor } of Object.values(pack.props)) {
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= width && y + h <= height);
    assert.equal(anchor[1], h - 1);
  }
  for (const id of ['bureau', 'depot']) {
    const layout = maps.hub(id), from = [layout.anchors.sp.x, layout.anchors.sp.y];
    for (const prop of layout.scenery.filter(p => p.asset)) {
      assert.ok(pack.props[prop.asset], prop.asset);
      // Walkers stand near the south edge of their cell, not at its north edge.
      const row = Math.round((prop.y - 30) / 32);
      assert.equal(layout.coll[row][Math.floor(prop.x / 32)], 1, prop.asset + ' footprint');
      if (prop.npc) assert.ok(layout.npcs.some(n => n.id === prop.npc));
    }
    for (const a of Object.values(layout.anchors)) assert.deepEqual(Array.from(maps.route(layout.coll, from, [a.x, a.y]).at(-1)), [a.x, a.y]);
  }
  const office = maps.hub('bureau'), spawn = [office.anchors.sp.x, office.anchors.sp.y];
  for (const to of [[2, 2], [8, 2]]) assert.deepEqual(Array.from(maps.route(office.coll, spawn, to).at(-1)), to, 'space behind desks');
  assert.deepEqual(Array.from(office.size), [384, 288]);
  office.coll.forEach((row, y) => row.forEach((blocked, x) => { if (!blocked) assert.ok((x + 1) * 32 <= office.size[0] && (y + 1) * 32 <= office.size[1], 'walkable floor fits smaller room'); }));
});

test('both new atlases fit a 200 KB download budget and only native hub art is precached', () => {
  const foliage = fs.statSync(path.join(__dirname, '../assets/quest-world/foliage.png')).size;
  assert.ok(foliage + fs.statSync(path.join(dir, 'props.png')).size < 200000);
  const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  for (const file of ['props.png', 'manifest.json']) assert.ok(sw.includes('./assets/quest-hubs/' + file));
  assert.ok(sw.includes('./js/hub-art.js'));
  assert.ok(!sw.includes('quest-hubs/source/'));
});
