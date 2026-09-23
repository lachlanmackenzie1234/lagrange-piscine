import test from 'node:test';
import assert from 'node:assert/strict';
import { createGroundCover } from './ground-cover.mjs';

test('full lushness covers every eligible patch with approximately 90% grass and 10% rocks', () => {
  const eligible = (x, y) => x >= 0 && y >= 0 && x < 320 && y < 320;
  const cover = createGroundCover({ width: 320, height: 320, seed: 23, eligible });
  assert.equal(cover.patches.length, 100);
  assert.equal(cover.stats.grassPercent, 90); assert.equal(cover.stats.rockPercent, 10);
  assert.ok(cover.patches.every(p => p.threshold <= 100 && p.threshold > 0));
  assert.ok(cover.grass.every(t => t.size >= 2));
  assert.ok(cover.patches.filter(p => p.kind === 'grass').every(p => cover.grass.some(t => t.patchId === p.id)));
});
test('paths and reserved planting are excluded, and changing density does not reroll positions', () => {
  const eligible = (x, y) => x >= 8 && y >= 8 && x < 310 && y < 310 && !(x > 125 && x < 170);
  const options = { width: 320, height: 320, seed: 51, eligible, rockEligible: (x, y) => eligible(x, y) && y > 50 };
  const first = createGroundCover(options), second = createGroundCover(options);
  assert.deepEqual(first, second);
  assert.ok(first.grass.every(t => eligible(t.x, t.y)));
  assert.ok(first.rocks.every(r => r.y > 50 && eligible(r.x, r.y)));
  const sparse = first.grass.filter(t => t.threshold <= 30), dense = first.grass.filter(t => t.threshold <= 100);
  assert.ok(dense.length > sparse.length * 2); assert.ok(sparse.every(t => dense.includes(t)));
});
