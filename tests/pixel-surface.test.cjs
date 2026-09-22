const test = require('node:test');
const assert = require('node:assert/strict');
const { dimensions, pixelRect, drawImage } = require('../js/pixel-surface.js');

test('raster dimensions follow the display density with a bounded allocation', () => {
  assert.deepEqual(dimensions(652, 487.5, 2), { width: 1304, height: 975, ratio: 2 });
  assert.deepEqual(dimensions(252, 187.5, 3), { width: 756, height: 563, ratio: 3 });
  assert.equal(dimensions(252, 188, 5).ratio, 3);
  assert.equal(dimensions(0, 0, 1).width, 1);
});

test('moving sprites retain one pixel footprint at fractional canvas scales', () => {
  for (const scale of [1.3125, 2, 3.395833, 5.140625]) {
    const m = { a: scale, d: scale * .99, b: 0, c: 0, e: 13.25, f: 7.75 };
    const widths = new Set(), heights = new Set();
    for (let x = 0; x < 100; x += .25) {
      const rect = pixelRect(x, x / 2, 16, 16, m);
      rect.forEach(n => assert.ok(Number.isInteger(n)));
      widths.add(rect[2]); heights.add(rect[3]);
    }
    assert.equal(widths.size, 1); assert.equal(heights.size, 1);
  }
});

test('projected shadows preserve their intended shear', () => {
  assert.equal(pixelRect(1.2, 3.4, 16, 16, { a: 2, b: 0, c: -.7, d: -.36, e: 0, f: 0 }), null);
});

test('sprite sampling uses integer backing pixels and restores the drawing state', () => {
  const calls = [], source = {};
  const ctx = { getTransform: () => ({ a: 1.3125, d: 1.3125, b: 0, c: 0, e: 3.25, f: 2.5 }),
    save: () => calls.push('save'), restore: () => calls.push('restore'),
    setTransform: (...m) => calls.push(m), drawImage: (...args) => calls.push(args) };
  drawImage(ctx, source, [0, 0, 21, 21], [11.23, 7.93, 16, 16]);
  assert.deepEqual(calls, ['save', [1, 0, 0, 1, 0, 0], [source, 0, 0, 21, 21, 18, 13, 21, 21], 'restore']);
});
