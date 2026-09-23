import test from 'node:test';
import assert from 'node:assert/strict';
import { GARDENS, parisClock, addDays, gardenCycle, recordGardenCut, overviewSnapshot, weatherAppearance } from './living-state.mjs';

test('each garden grows over seven days and returns to its cut height', () => {
  assert.equal(gardenCycle('EC-2', '2026-09-21').age, 0);
  assert.equal(gardenCycle('EC-2', '2026-09-27').growth, 1);
  assert.equal(gardenCycle('EC-2', '2026-09-28').age, 0);
  assert.equal(new Set(GARDENS.map(g => gardenCycle(g.id, '2026-09-21').age)).size, GARDENS.length);
});
test('a gardener visit resets only its garden and stale or future events cannot overwrite it', () => {
  const cuts = recordGardenCut({}, 'AG-7', '2026-09-21', '2026-09-21');
  assert.equal(gardenCycle('AG-7', '2026-09-21', cuts).age, 0);
  assert.equal(gardenCycle('AG-7', '2026-09-24', cuts).age, 3);
  assert.equal(gardenCycle('EP-6B-75', '2026-09-21', cuts).age, gardenCycle('EP-6B-75', '2026-09-21').age);
  assert.equal(recordGardenCut(cuts, 'AG-7', '2026-09-20', '2026-09-21'), cuts);
  assert.equal(recordGardenCut(cuts, 'AG-7', '2026-09-22', '2026-09-21'), cuts);
  assert.equal(gardenCycle('AG-7', '2026-09-28', cuts).age, 0);
});
test('garden days follow the Paris calendar across daylight saving and midnight', () => {
  assert.equal(parisClock(new Date('2026-09-21T22:30:00Z')).date, '2026-09-22');
  assert.equal(addDays('2026-10-24', 2), '2026-10-26');
  const cuts = { 'EC-2': '2026-10-24' };
  assert.equal(gardenCycle('EC-2', '2026-10-26', cuts).age, 2);
});
test('weather values map to bounded appearance controls without driving grass growth', () => {
  const snapshot = overviewSnapshot({ at: '2026-09-21T12:00:00Z', current: { temperature_2m: 22, wind_speed_10m: 30, uv_index: 5, precipitation: 0, weather_code: 2 } });
  const look = weatherAppearance(snapshot, new Date('2026-09-21T12:00:00Z'));
  assert.equal(look.patch.breeze, 50); assert.equal(look.patch.water, 60); assert.equal(look.patch.mood, 'day');
  assert.ok(!('lushness' in look.patch)); assert.ok(!('growth' in look.patch));
  const storm = weatherAppearance({ ...snapshot, wind: 150, precip: 80 }, new Date('2026-09-21T21:00:00Z'));
  assert.equal(storm.patch.breeze, 100); assert.equal(storm.patch.water, 100); assert.equal(storm.visual.rain, 1); assert.equal(storm.patch.mood, 'dusk');
});
test('missing weather fields preserve manual motion; calm wind is a valid zero', () => {
  assert.equal(overviewSnapshot({ current: {} }), null);
  const partial = overviewSnapshot({ current: { temperature_2m: 0, wind_speed_10m: null } });
  assert.equal(partial.temp, 0); assert.equal(partial.wind, null);
  assert.ok(!('breeze' in weatherAppearance(partial).patch));
  assert.equal(weatherAppearance({ ...partial, wind: 0 }).patch.breeze, 0);
});
