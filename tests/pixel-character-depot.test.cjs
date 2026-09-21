const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const context = vm.createContext({ window: {} });
for (const file of ['pixelart.js', 'maps.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
const { PixelArt, PoolMaps } = context.window;
const slots = ['tête', 'torse', 'jambes', 'pieds', 'amulette', 'perche', 'robot', 'balai'];
const directions = ['south', 'east', 'north', 'west'];
const avatar = { skin: '#e8b88a', hairColor: '#4a2e1a', hair: 1 };

// Minimal integer raster context for geometry tests, independent of a browser.
function render(equip = {}, direction = 'south', appearance = avatar) {
  const pixels = Buffer.alloc(24 * 32 * 4), stack = [];
  let transform = { sx: 1, sy: 1, x: 0, y: 0 }, clipped = 0;
  const ctx = {
    fillStyle: '#000000', save() { stack.push({ ...transform }); }, restore() { transform = stack.pop(); },
    translate(x, y) { transform.x += transform.sx * x; transform.y += transform.sy * y; },
    scale(x, y) { transform.sx *= x; transform.sy *= y; },
    fillRect(x, y, w, h) {
      assert.match(this.fillStyle, /^#[0-9a-f]{6}$/i);
      const col = parseInt(this.fillStyle.slice(1), 16);
      const x0 = transform.x + transform.sx * x, x1 = transform.x + transform.sx * (x + w);
      const y0 = transform.y + transform.sy * y, y1 = transform.y + transform.sy * (y + h);
      for (let yy = Math.min(y0, y1); yy < Math.max(y0, y1); yy++) for (let xx = Math.min(x0, x1); xx < Math.max(x0, x1); xx++) {
        if (xx < 0 || xx >= 24 || yy < 0 || yy >= 32) { clipped++; continue; }
        const i = (yy * 24 + xx) * 4;
        pixels[i] = col >> 16; pixels[i + 1] = col >> 8 & 255; pixels[i + 2] = col & 255; pixels[i + 3] = 255;
      }
    },
  };
  PixelArt.keeper(ctx, 0, 0, equip, appearance, direction);
  return { pixels, clipped, hash: createHash('sha256').update(pixels).digest('hex') };
}

test('all five layered outfits fit 24×32 in four directions and every rarity', () => {
  for (const set of ['EC', 'AG', 'EP', 'EPP', 'GP']) for (const rarity of ['common', 'uncommon', 'rare', 'vrare', 'epic', 'legend']) {
    const equip = Object.fromEntries(slots.map(slot => [slot, { res: set, rar: rarity, cursed: rarity !== 'common' }]));
    for (const direction of directions) {
      const result = render(equip, direction);
      assert.equal(result.clipped, 0, set + ' ' + rarity + ' ' + direction);
      assert.ok(result.pixels.some(v => v));
    }
  }
});

test('each individual equipment slot visibly changes the basic keeper', () => {
  for (const direction of directions) {
    const base = render({}, direction);
    for (const slot of slots) {
      assert.notEqual(render({ [slot]: { res: 'EC', rar: 'rare' } }, direction).hash, base.hash, direction + ' ' + slot);
    }
  }
});

test('skin, hair colour and all three hairstyles remain visible without headwear', () => {
  for (const direction of directions) {
    const base = render({}, direction).hash;
    assert.notEqual(render({}, direction, { ...avatar, skin: '#5a3a26' }).hash, base);
    assert.notEqual(render({}, direction, { ...avatar, hairColor: '#e6c35c' }).hash, base);
    assert.notEqual(render({}, direction, { ...avatar, hair: 2 }).hash, base);
    assert.notEqual(render({}, direction, { ...avatar, hair: 3 }).hash, base);
  }
});

test('depot actions and every floor cell are reachable without crossing storage', () => {
  const layout = PoolMaps.depot(), start = [layout.anchors.sp.x, layout.anchors.sp.y];
  for (const row of layout.hotspots) {
    const a = layout.anchors[row.anchor];
    assert.equal(layout.coll[a.y][a.x], 0, row.kind);
    assert.deepEqual(Array.from(PoolMaps.route(layout.coll, start, [a.x, a.y]).at(-1)), [a.x, a.y]);
  }
  layout.coll.forEach((row, y) => row.forEach((blocked, x) => {
    if (blocked) return;
    const route = PoolMaps.route(layout.coll, start, [x, y]);
    assert.deepEqual(Array.from(route.at(-1)), [x, y]);
    assert.ok(route.every(([cx, cy]) => layout.coll[cy][cx] === 0));
  }));
  assert.deepEqual(Array.from(PoolMaps.route(layout.coll, start, [0, 0]).at(-1)), start);
});

test('all 23 creature identities and the depot illustration are available offline', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/quest-motion/manifest.json')));
  for (const id of PoolMaps.ids()) for (const motion of ['idle', 'swim']) {
    const clip = manifest.clips[`pool-creature/${id}/${motion}`];
    assert.ok(clip, id);
    assert.ok(clip.f.every(f => f.r[2] === 24 && f.r[3] === 24));
  }
  assert.deepEqual(manifest.clips['scene/depot'].f[0].r, [0, 0, 256, 192]);
  const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  for (const file of ['creatures.png', 'depot.png']) assert.ok(sw.includes('./assets/quest-motion/' + file));
});
