const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dir = path.join(__dirname, '../assets/quest-people');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json')));

test('all six regenerated people have four whole, ground-anchored native views', () => {
  const atlas = fs.readFileSync(path.join(dir, 'people.png'));
  const width = atlas.readUInt32BE(16), height = atlas.readUInt32BE(20);
  assert.equal(Object.keys(manifest.clips).length, 24);
  for (const name of ['keeper', 'jojo', 'karine', 'matt', 'jp', 'pj']) {
    const source = fs.readFileSync(path.join(dir, 'source', name + '.png'));
    assert.equal(crypto.createHash('sha256').update(source).digest('hex'), manifest.sources[name].sha256);
    for (const direction of ['south', 'east', 'north', 'west']) {
      const id = name === 'keeper' ? `keeper/base/${direction}` : `npc/${name}/${direction}`;
      const clip = manifest.clips[id];
      assert.ok(clip.nativeBody, id); assert.equal(clip.px, 4);
      assert.deepEqual(clip.a, [32, 63]);
      for (const { r: [x, y, w, h] } of clip.f) {
        assert.equal(w, 64); assert.equal(h, 64);
        assert.ok(x >= 0 && y >= 0 && x + w <= width && y + h <= height, id);
      }
      assert.equal(clip.f.reduce((t, f) => t + f.d, 0), clip.duration);
      const png = fs.readFileSync(path.join(dir, 'exports', `${name}-${direction}.png`));
      assert.equal(png.readUInt32BE(16), 64); assert.equal(png.readUInt32BE(20), 64);
    }
  }
});

test('the people pack fits 128 KiB download / 512 KiB decoded and precaches only runtime files', () => {
  const png = fs.readFileSync(path.join(dir, 'people.png'));
  assert.ok(png.length <= 128 * 1024);
  assert.ok(png.readUInt32BE(16) * png.readUInt32BE(20) * 4 <= 512 * 1024);
  const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  for (const name of ['manifest.json', 'people.png']) assert.ok(sw.includes('./assets/quest-people/' + name));
  assert.ok(sw.includes('./js/pixel-surface.js'));
  assert.ok(!sw.includes('quest-people/source/') && !sw.includes('quest-people/exports/'));
});
