import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GARDENS, gardenCycle, addDays } from './living-state.mjs';
import { zoneStyle, zoneAsset, treeAsset, grassStage, TREE_SIZES, TREE_PLACEMENT_SIZES } from './zone-art.mjs';
import { TREE_SPECIES } from './ecology.mjs';

const root = new URL('./', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('assets/zone-kit/manifest.json', root)));
function verifyAsset(path) {
  const file = readFileSync(new URL(path, root));
  assert.equal(file.subarray(1,4).toString(), 'PNG');
  assert.equal(file[25], 6, `${path} must retain RGBA transparency`);
  const meta = manifest.assets.find(a => path.endsWith(a.file));
  assert.ok(meta, `Missing manifest entry: ${path}`);
  const dimensions = [file.readUInt32BE(16), file.readUInt32BE(20)];
  assert.deepEqual(dimensions, meta.size);
  assert.deepEqual(meta.anchor, meta.family === 'ground' ? [0,0] : [dimensions[0]/2, dimensions[1]]);
  return dimensions;
}

test('every residence resolves its own buildings and all weekly grass stages', () => {
  const roofs = new Set(), grasses = new Set();
  for (const garden of GARDENS) {
    const zone = zoneStyle(garden.id);
    assert.equal(zone.id, garden.id.split('-')[0]); // EP and EPP remain distinct.
    for (const kind of ['house','pump']) verifyAsset(zoneAsset(zone.id, kind));
    for (const stage of ['cut','medium','tall']) assert.deepEqual(verifyAsset(`assets/zone-kit/ground/${zone.id}-${stage}.png`),[32,32]);
    roofs.add(zoneAsset(zone.id, 'house'));
    const stages = new Set();
    for (let day = 0; day < 7; day++) {
      const cycle = gardenCycle(garden.id, addDays('2026-09-21', day), { [garden.id]: '2026-09-21' });
      const stage = grassStage(cycle.height); stages.add(stage);
      const path = zoneAsset(zone.id, stage); grasses.add(path); verifyAsset(path);
    }
    assert.deepEqual(stages, new Set(['cut','medium','tall']));
  }
  assert.equal(roofs.size, 5); assert.equal(grasses.size, 15);
});

test('each species has increasing native sizes and offscreen roots keep mature crowns', () => {
  for (const species of Object.keys(TREE_SPECIES)) {
    let previous = [0,0];
    for (const size of TREE_SIZES) {
      const dimensions = verifyAsset(treeAsset(species, size));
      assert.ok(dimensions.every((n, i) => n > previous[i])); previous = dimensions;
    }
  }
  const counts = TREE_SIZES.map(size => TREE_PLACEMENT_SIZES.filter(s => s === size).length);
  assert.ok(counts[1] > counts[0] && counts[1] > counts[2]);
  assert.ok(TREE_PLACEMENT_SIZES.slice(11).every(size => size === 'large'));
  assert.equal(new Set(manifest.assets.map(a => a.file)).size, 55);
});
