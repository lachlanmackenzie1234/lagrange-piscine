const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const Z = require('../js/quest-zones.js');
const World = require('../js/living-world.js');
const context = vm.createContext({ window: {} }); vm.runInContext(fs.readFileSync(require.resolve('../js/maps.js'), 'utf8'), context);
const maps = context.window.PoolMaps;
const dir = path.join(__dirname, '../assets/quest-zones');
const pack = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json')));

test('all 55 provided native assets retain file hashes, dimensions, anchors and sampling metadata', () => {
  const source = JSON.parse(fs.readFileSync(path.join(dir, 'native/manifest.json')));
  const page = fs.readFileSync(path.join(dir, pack.page)), width = page.readUInt32BE(16), height = page.readUInt32BE(20);
  assert.equal(Object.keys(pack.regions).length, 45);
  assert.equal(Object.keys(pack.references).length, 10);
  for (const asset of source.assets) {
    const entry = pack.regions[asset.id] || pack.references[asset.id], png = fs.readFileSync(path.join(dir, entry.native));
    assert.equal(crypto.createHash('sha256').update(png).digest('hex'), entry.pngSHA256);
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], asset.size);
    assert.deepEqual(entry.anchor, asset.anchor); assert.deepEqual(entry.sampling, asset.sampling || null);
    assert.deepEqual(entry.sourceRect, asset.sourceRect || null);
    if (entry.r) {
      const [x, y, w, h] = entry.r; assert.deepEqual([w, h], asset.size);
      assert.ok(x >= 0 && y >= 0 && x + w <= width && y + h <= height);
    } else assert.equal(entry.family, 'houses');
  }
  assert.ok(page.length < 256000); assert.ok(width * height * 4 < 2 * 1048576);
});

test('each zone has ground and foliage stages; alternative buildings remain export references', () => {
  const roofs = { EC: 'Orange', AG: 'Green', EP: 'Teal', EPP: 'Violet', GP: 'Blue' };
  for (const [zone, roof] of Object.entries(roofs)) {
    assert.equal(Z.zoneStyle(zone + '-2').colour, roof);
    for (const kind of ['cut', 'medium', 'tall', 'ground-cut', 'ground-medium', 'ground-tall']) assert.ok(pack.regions[zone + '-' + kind]);
    for (const kind of ['house', 'pump']) { assert.ok(pack.references[zone + '-' + kind]); assert.ok(!pack.regions[zone + '-' + kind]); }
  }
  for (const species of ['oak', 'pine', 'umbrella', 'holm', 'birch']) for (const size of Z.TREE_SIZES) assert.ok(pack.regions[species + '-' + size]);
});

test('every meadow root stays on eligible ground, including partial boundary cells', () => {
  const eligible = (x, y) => x >= 0 && y >= 0 && x < 64 && y < 64 && !(x >= 21 && x < 29);
  const cells = Z.createMeadow({ width: 64, height: 64, eligible });
  assert.deepEqual(cells, Z.createMeadow({ width: 64, height: 64, eligible })); assert.ok(cells.some(c => c.mask !== 63));
  for (const cell of cells) Z.BLADE_ROOTS.forEach(([dx, dy], i) => assert.equal(!!(cell.mask & (1 << i)), eligible(cell.x + dx, cell.y + dy)));
});

test('foreground blades are rooted in front of the feet and stay below the compact head', () => {
  assert.equal(Z.MAX_GRASS_HEIGHT, 8);
  const cell = { x: 44, y: 44, mask: 63, variant: 1, zone: 'wild', bend: 4, flatten: .2 };
  for (const footY of [40, 44, 48]) {
    const mask = Z.foregroundRoots(cell, footY);
    Z.BLADE_ROOTS.forEach(([, dy], i) => assert.equal(!!(mask & (1 << i)), 44 + dy >= footY));
  }
  const shape = Z.meadowShape(cell, { growth: 1, lushness: 100, time: 2, wind: 1, quiet: true, maximum: Z.MAX_GRASS_HEIGHT });
  assert.equal(shape.pose, 0); assert.ok(shape.height <= 8);
  assert.ok(Z.meadowHeight(.18, 'wild', 0, 8) < Z.meadowHeight(1, 'wild', 0, 8));
});

test('all 23 maps use drawn tree sizes and sparse accents without modifying routes or features', () => {
  const allSizes = new Set();
  for (const id of maps.ids()) {
    const layout = maps.get(id), before = JSON.stringify(layout), result = World.plan(layout), eligible = World.lawnEligibility(layout);
    for (const tree of result.props.filter(p => p.species)) { assert.ok(Z.TREE_SIZES.includes(tree.treeSize)); assert.equal(tree.scale, 1); allSizes.add(tree.treeSize); }
    assert.ok(result.grass.length < result.coverage.grass.length);
    assert.equal(new Set(result.grass.map(t => t.patchId)).size, result.grass.length);
    const cells = Z.createMeadow({ width: 512, height: 384, eligible });
    assert.ok(cells.length > 100, id);
    for (const cell of cells) Z.BLADE_ROOTS.forEach(([dx, dy], i) => {
      if (!(cell.mask & (1 << i))) return;
      const x = cell.x + dx, y = cell.y + dy;
      assert.equal(layout.ground[Math.floor(y / 32)][Math.floor(x / 32)], 'grass');
      if (layout.border === 'canal') assert.ok(x < 478);
    });
    assert.equal(JSON.stringify(layout), before);
  }
  assert.deepEqual([...allSizes].sort(), ['large', 'medium', 'small']);
});
