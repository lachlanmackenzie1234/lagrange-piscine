const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/quest-ecology.js');

test('residence tree quotas are stable and each has its preferred majority', () => {
  for (const res of ['EC','AG','EP','EPP','GP']) {
    const id = res + '-test', trees = E.treeRoster(id, 20);
    assert.deepEqual(E.treeRoster(id, 20), trees);
    assert.equal(trees.filter(t => t === E.FORESTS[res].dominant).length, 14);
  }
});

test('Paris calendar grass clocks handle DST and per-pool offsets without writes', () => {
  assert.equal(E.parisClock(new Date('2026-10-24T22:30:00Z')).date, '2026-10-25');
  const dates = Array.from({length:7}, (_,i)=>E.addDays('2026-10-23',i));
  for (const id of ['EC-2','AG-8','GP-18']) {
    const heights = dates.map(d=>E.gardenCycle(id,d).height);
    assert.equal(new Set(heights).size, 7); assert.ok(heights.every(h=>h>=.18&&h<=1));
  }
  const cut={'EC-2':'2026-10-25'};assert.equal(E.gardenCycle('EC-2','2026-10-25',cut).age,0);
  assert.deepEqual(cut,{'EC-2':'2026-10-25'});
});

test('weather uses reported zeros, bounded wind and precipitation, and tolerates missing values', () => {
  const s=E.overviewSnapshot({current:{wind_speed_10m:0,precipitation:0,temperature_2m:0}});
  assert.equal(s.wind,0);assert.equal(s.code,null);
  assert.equal(E.weatherAppearance(s,new Date('2026-09-22T12:00:00Z')).patch.breeze,0);
  const wet=E.weatherAppearance({wind:200,precip:100,temp:50,code:95,uv:20});
  assert.equal(wet.patch.breeze,100);assert.equal(wet.visual.rain,1);assert.equal(wet.visual.sunStrength,1);
  assert.equal(E.overviewSnapshot({}),null);
});

test('grass bends with passage, then recovers, and quiet motion clears it', () => {
  const tuft={x:10,y:10,size:3};const impulse=E.passageImpulse(tuft,{x:8,y:10,vx:58,vy:0});
  for(let i=0;i<20;i++) E.advanceGrassMemory(tuft,impulse,.05);
  assert.ok(tuft.bend>0&&tuft.flatten>.5);
  for(let i=0;i<100;i++) E.advanceGrassMemory(tuft,{bend:0,pressure:0},.05);
  assert.ok(Math.abs(tuft.bend)<.01&&tuft.flatten<.01);
  E.advanceGrassMemory(tuft,impulse,.05,true);assert.equal(tuft.bend,0);assert.equal(tuft.flatten,0);
});
