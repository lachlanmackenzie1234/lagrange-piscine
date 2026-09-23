const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { frameAt } = require('../js/game-motion.js');
const dir = path.join(__dirname, '../assets/quest-hires');
const pack = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json')));
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/maps.js'), 'utf8'), context);
const maps = context.window.PoolMaps;

test('HD atlas rectangles and timings are valid within a 32 MiB pixel budget', () => {
  let pixels = 0;
  const pages = Object.fromEntries(pack.pages.map(file => { const png = fs.readFileSync(path.join(dir, file)); const w = png.readUInt32BE(16), h = png.readUInt32BE(20); pixels += w * h * 4; return [file, [w, h]]; }));
  const legacyDir = path.join(__dirname, '../assets/quest-motion');
  const legacy = JSON.parse(fs.readFileSync(path.join(legacyDir, 'manifest.json')));
  for (const file of legacy.pages) { const png = fs.readFileSync(path.join(legacyDir, file)); pixels += png.readUInt32BE(16) * png.readUInt32BE(20) * 4; }
  const people = fs.readFileSync(path.join(__dirname, '../assets/quest-people/people.png'));
  pixels += people.readUInt32BE(16) * people.readUInt32BE(20) * 4;
  for (const file of ['quest-hair/hair.png', 'quest-zones/zones.png', 'quest-world/foliage.png', 'quest-hubs/props.png']) {
    const png = fs.readFileSync(path.join(__dirname, '../assets', file)); pixels += png.readUInt32BE(16) * png.readUInt32BE(20) * 4;
  }
  assert.ok(pixels < 32 * 1048576);
  for (const [id, clip] of Object.entries(pack.clips)) {
    assert.equal(clip.px, 2, id); const [w, h] = pages[clip.page]; let t = 0;
    clip.f.forEach((frame, i) => { const [x, y, fw, fh] = frame.r; assert.ok(x >= 0 && y >= 0 && fw > 0 && fh > 0 && x + fw <= w && y + fh <= h, id); assert.equal(frameAt(clip, t).index, i, id); t += frame.d; });
    assert.equal(t, clip.duration, id);
  }
});

test('native sizes cover the approved actors, equipment, terrain and scenes', () => {
  for (const [id, clip] of Object.entries(pack.clips)) {
    const size = clip.f[0].r.slice(2);
    if (id.startsWith('npc/') || id.startsWith('keeper/')) assert.deepEqual(size, [48, 64], id);
    else if (id.startsWith('monster/')) assert.deepEqual(size, [56, 48], id);
    else if (id.startsWith('pool-creature/') || id.startsWith('species/')) assert.deepEqual(size, [48, 48], id);
    else if (id.startsWith('scene/')) assert.deepEqual(size, [512, 384], id);
    else assert.deepEqual(size, [32, 32], id);
  }
  for (const id of ['jojo', 'karine', 'matt', 'jp', 'pj']) for (const direction of ['south', 'east', 'north', 'west']) assert.ok(pack.clips[`npc/${id}/${direction}`]);
  for (const id of maps.ids()) assert.ok(pack.clips[`pool-creature/${id}/idle`]);
});

test('both hubs have reachable NPC approach points and no isolated floor cells', () => {
  for (const id of ['depot', 'bureau']) {
    const layout = maps.hub(id), start = [layout.anchors.sp.x, layout.anchors.sp.y];
    assert.equal(layout.npcs.length, 3);
    for (const npc of layout.npcs) assert.equal(layout.coll[npc.cell[1]][npc.cell[0]], 1);
    for (const a of Object.values(layout.anchors)) assert.deepEqual(Array.from(maps.route(layout.coll, start, [a.x, a.y]).at(-1)), [a.x, a.y]);
    layout.coll.forEach((row, y) => row.forEach((blocked, x) => { if (!blocked) assert.deepEqual(Array.from(maps.route(layout.coll, start, [x, y]).at(-1)), [x, y]); }));
  }
});

test('all runtime HD pages are precached, source-generation PNGs are not', () => {
  const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  for (const file of pack.pages) assert.ok(sw.includes('./assets/quest-hires/' + file), file);
  assert.ok(sw.includes('./assets/quest-hires/manifest.json')); assert.ok(!sw.includes('quest-hires/source/'));
});
