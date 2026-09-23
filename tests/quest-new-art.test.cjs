const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '../assets');

test('all three native hairstyles preserve 64px frames and original source registration', () => {
  const dir = path.join(root, 'quest-hair'), pack = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json')));
  const png = fs.readFileSync(path.join(dir, 'hair.png')), w = png.readUInt32BE(16), h = png.readUInt32BE(20);
  assert.equal(Object.keys(pack.clips).length, 12); assert.ok(png.length < 96000);
  const reference = fs.readFileSync(path.join(root, 'quest-people/source/keeper.png'));
  for (const style of ['short', 'bald', 'long']) {
    const source = fs.readFileSync(path.join(dir, 'source', style + '.png'));
    assert.equal(crypto.createHash('sha256').update(source).digest('hex'), pack.sources[style]);
    assert.equal(source.readUInt32BE(16), reference.readUInt32BE(16)); assert.equal(source.readUInt32BE(20), reference.readUInt32BE(20));
    for (const direction of ['south', 'east', 'north', 'west']) {
      const clip = pack.clips[`keeper/${style === 'short' ? 'base' : style}/${direction}`];
      assert.equal(clip.hairStyle, style); assert.equal(clip.nativeBody, true); assert.equal(clip.px, 4); assert.deepEqual(clip.a, [32, 63]);
      const [x, y, fw, fh] = clip.f[0].r; assert.deepEqual([fw, fh], [64, 64]); assert.ok(x + fw <= w && y + fh <= h);
    }
  }
});

test('zone/hair runtime atlases are small and cached without generation sources', () => {
  const zones = JSON.parse(fs.readFileSync(path.join(root, 'quest-zones/manifest.json')));
  assert.equal(Object.keys(zones.regions).length, 45); assert.ok(zones.pngBytes < 256000);
  const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  for (const file of ['quest-hair/hair.png', 'quest-hair/manifest.json', 'quest-zones/zones.png', 'quest-zones/manifest.json']) assert.ok(sw.includes('./assets/' + file));
  assert.ok(!sw.includes('quest-hair/source/') && !sw.includes('quest-world/source/'));
  assert.ok(!sw.includes('quest-zones/native/') && !sw.includes('quest-world/trees.png'));
});
