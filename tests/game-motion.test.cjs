const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Timeline, frameAt, fullSet, setAuraState } = require('../js/game-motion.js');
const assetDir = path.join(__dirname, '../assets/quest-motion');
const manifest = JSON.parse(fs.readFileSync(path.join(assetDir, 'manifest.json')));

test('damage occurs once at impact; completion waits until the final frame is drawn', () => {
  const timeline = new Timeline(), events = [];
  const action = { dur: .8, impactAt: .4, onStart: () => events.push('start'), onImpact: () => events.push('damage'), onEnd: () => events.push('end') };
  timeline.jobs.push(action);
  assert.equal(timeline.advance(.1).progress, 0);
  timeline.advance(.39);
  assert.deepEqual(events, ['start']);
  timeline.advance(.02);
  timeline.advance(.4);
  assert.deepEqual(events, ['start', 'damage']);
  assert.equal(timeline.jobs.length, 1, 'the last frame still owns the action');
  timeline.finish(); timeline.finish(); timeline.advance(1);
  assert.deepEqual(events, ['start', 'damage', 'end']);
  assert.equal(timeline.jobs.length, 0);
});

test('an enemy response starts a new clock after the player action completes', () => {
  const timeline = new Timeline(), events = [];
  const enemy = { dur: .8, impactAt: .32, onImpact: () => events.push('enemy') };
  timeline.jobs.push({ dur: .8, impactAt: .4, onImpact: () => events.push('player'), onEnd: () => timeline.jobs.push(enemy) });
  timeline.advance(0); timeline.advance(2); timeline.finish();
  assert.deepEqual(events, ['player'], 'a slow frame cannot skip the response animation');
  assert.equal(timeline.advance(.1).progress, 0);
  timeline.advance(.31);
  assert.deepEqual(events, ['player']);
  timeline.advance(.02);
  assert.deepEqual(events, ['player', 'enemy']);
});

test('cancelling before impact prevents delayed damage and completion', () => {
  const timeline = new Timeline(), events = [];
  timeline.jobs.push({ dur: 1, impactAt: .5, onImpact: () => events.push('damage'), onEnd: () => events.push('end') });
  timeline.advance(0); timeline.advance(.2); timeline.cancel();
  timeline.advance(10); timeline.finish();
  assert.deepEqual(events, []);
  assert.equal(timeline.current, null);
});

test('callbacks may cancel their stage without returning a stale action', () => {
  for (const cancelAt of ['onStart', 'onImpact']) {
    const timeline = new Timeline(); let ended = false;
    timeline.jobs.push({ dur: 1, impactAt: 0, [cancelAt]: () => timeline.cancel(), onEnd: () => { ended = true; } });
    assert.equal(timeline.advance(0).action, null);
    timeline.finish();
    assert.equal(ended, false);
  }
});

test('walking can calculate its path duration when it reaches the front of the queue', () => {
  const timeline = new Timeline();
  const walk = { dur: .08, onStart: () => { walk.dur = 2; } };
  timeline.jobs.push(walk);
  timeline.advance(0);
  assert.equal(timeline.advance(1).progress, .5);
  timeline.finish();
  assert.equal(timeline.jobs.length, 1);
});

test('all atlas clips fit their PNG page and retain every frame boundary', () => {
  const dimensions = Object.fromEntries(manifest.pages.map((name) => {
    const png = fs.readFileSync(path.join(assetDir, name));
    assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    return [name, [png.readUInt32BE(16), png.readUInt32BE(20)]];
  }));
  for (const [id, clip] of Object.entries(manifest.clips)) {
    const [width, height] = dimensions[clip.page];
    assert.equal(clip.f.reduce((sum, frame) => sum + frame.d, 0), clip.duration, id);
    let elapsed = 0;
    clip.f.forEach((frame, i) => {
      const [x, y, w, h] = frame.r;
      assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= width && y + h <= height, id);
      assert.equal(frameAt(clip, elapsed).index, i, id + ' frame start');
      assert.equal(frameAt(clip, elapsed + frame.d - 1).index, i, id + ' frame end');
      elapsed += frame.d;
    });
    assert.equal(frameAt(clip, clip.duration).index, clip.loop ? 0 : clip.f.length - 1, id);
    assert.equal(frameAt(clip, clip.duration).done, !clip.loop, id);
    assert.deepEqual(frameAt(clip, 100, true).o, [0, 0], id + ' reduced motion');
    if (clip.end) assert.equal(frameAt(clip, clip.duration, true).index, clip.f.length - 1, id + ' transparent ending');
  }
});

test('the pack covers every monster, move, service, water state and aura used by the runtime', () => {
  for (const id of ['algue', 'moutarde', 'feuilles', 'aiguille', 'calcaire', 'moustique', 'filtre', 'sable', 'gland', 'locataire']) {
    for (const motion of ['idle', 'attack', 'hit', 'spawn', 'defeat']) assert.ok(manifest.clips[`monster/${id}/${motion}`]);
  }
  for (const move of ['perche', 'balai', 'robot', 'choc', 'phm', 'floc', 'lavage']) assert.ok(manifest.clips['fx/action/' + move]);
  for (const action of ['test', 'drop', 'scatter', 'sweep', 'wash']) assert.ok(manifest.clips['fx/service/' + action]);
  for (const state of ['calme', 'traite', 'sauvage', 'critique']) assert.ok(manifest.clips['water/' + state]);
  for (const group of Object.values(manifest.auras)) for (const layer of ['back', 'front']) assert.ok(manifest.clips[group[layer]]);
  for (const direction of ['north', 'south', 'east', 'west']) {
    for (const motion of ['idle', 'walk', 'cast', 'hit', 'victory', 'spawn', 'defeat', 'flee', 'crouch']) {
      const clip = manifest.keeper[direction][motion];
      assert.equal(clip.duration, clip.f.reduce((sum, frame) => sum + frame.d, 0));
    }
  }
});

test('set aura requires all eight slots from the same known set', () => {
  const slots = ['tête', 'torse', 'jambes', 'pieds', 'amulette', 'perche', 'robot', 'balai'];
  const equip = Object.fromEntries(slots.map((slot, i) => [slot, { res: 'EC', rar: i % 2 ? 'rare' : 'common' }]));
  assert.equal(fullSet(equip), 'EC');
  delete equip.balai;
  assert.equal(fullSet(equip), null);
  equip.balai = { res: 'AG' };
  assert.equal(fullSet(equip), null);
  assert.equal(fullSet(Object.fromEntries(slots.map(slot => [slot, { res: 'unknown' }]))), null);
  assert.equal(fullSet(), null);
});

test('a full-set aura uses the lowest equipped rarity, with no aura for mixed sets', () => {
  const slots = ['tête', 'torse', 'jambes', 'pieds', 'amulette', 'perche', 'robot', 'balai'];
  const equip = Object.fromEntries(slots.map(slot => [slot, { res: 'AG', rar: 'legend' }]));
  assert.deepEqual(setAuraState(equip), { set: 'AG', rank: 5, rarity: 'legend' });
  equip.balai.rar = 'rare';
  assert.deepEqual(setAuraState(equip), { set: 'AG', rank: 2, rarity: 'rare' });
  equip.tête.res = 'EC';
  assert.equal(setAuraState(equip), null);
});
