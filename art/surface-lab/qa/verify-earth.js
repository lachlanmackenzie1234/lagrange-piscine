/* Run in the open Surface lab: agent-browser eval --stdin < this file. */
(async () => {
  const assert = (ok, message) => { if (!ok) throw Error(message); }, pause = ms => new Promise(r => setTimeout(r, ms));
  const wait = async fn => { for (let n = 0; n < 160; n++) { if (fn()) return; await pause(25); } throw Error('Earth preview timed out'); };
  const before = JSON.stringify(Object.fromEntries(Object.entries(localStorage))), report = {};
  let mixed = 0, dry = 0, wet = 0, samples = 0;
  for (let y = 4; y < 384; y += 8) for (let x = 4; x < 512; x += 8) {
    const m = TerrainStudy.materialWeights(x, y, 24, 'blend'); assert(Object.values(m).every(v => v >= 0 && v <= 1) && Math.abs(Object.values(m).reduce((a,b)=>a+b,0) - 1) < 1e-8, 'Material blend weights');
    if (m.earth > .1 && m.sand > .1) mixed++;
    const a = SurfaceEarth.sample(x, y, 0), b = SurfaceEarth.sample(x, y, 1);
    assert(a.join(',') === SurfaceEarth.sample(x, y, 0).join(','), 'Earth texture is unstable'); dry += a.reduce((a, b) => a + b); wet += b.reduce((a, b) => a + b); samples++;
  }
  assert(mixed > 0 && dry > wet + samples * 70, 'Moisture/edge variation missing');
  report.materials = { normalizedWeights: true, mixedSandEarthSamples: mixed, stableTexture: true, dryMean: dry / samples / 3, wetMean: wet / samples / 3 };
  const started = performance.now(), earth = new TerrainStudy.Field({ mode: 'earth', moisture: 0 });
  report.buildMs = performance.now() - started;
  assert(earth.cells.length === 0 && !earth.hasSand && earth.grains.width === 1, 'Earth contains grass or sand effects');
  const c = document.createElement('canvas'); c.width = 512; c.height = 384; const g = c.getContext('2d');
  earth.time = 5; earth.paintSandLight(g, false); assert(!g.getImageData(0, 0, 512, 384).data.some(Boolean), 'Earth shimmers like sand');
  const hero = { x: 230, y: 280 }; earth.advance(.05, hero); hero.x += 12; earth.advance(.05, hero);
  assert(earth.tracks.length > 0 && earth.tracks.every(t => t.earth === 1 && t.sand === 0), 'Earth contact not isolated');
  const dryDust = earth.dust.length; earth.clearTracks(); earth.configure({ moisture: 1 }); hero.x += 12; earth.advance(.05, hero);
  assert(earth.dust.length < dryDust && SurfaceEarth.response(1, 1).indent > SurfaceEarth.response(1, 0).indent, 'Moisture does not affect compression/dust');
  report.contact = { dryParticles: dryDust, wetParticles: earth.dust.length, deeperWetPrint: true, isolated: true };
  for (let n = 0; n < 90; n++) earth.advance(.1, hero);
  assert(earth.tracks.length === 0 && earth.dust.length === 0, 'Earth does not settle'); report.settles = true;
  earth.seekSequence(4.2); assert(earth.tracks.length > 0 && earth.tracks.every(t => t.earth === 1), 'Sequence does not disturb earth');
  const stamp = JSON.stringify(earth.tracks); earth.seekSequence(4.2); assert(stamp === JSON.stringify(earth.tracks), 'Earth replay not deterministic');
  earth.seekSequence(13); assert(earth.tracks.length === 0 && earth.sequenceState.phase === 'At rest', 'Earth sequence did not finish'); report.sequence = true;
  const canvas = document.getElementById('terrain');
  document.querySelector('[data-mode="earth"]').click(); await wait(() => canvas.dataset.mode === 'earth');
  assert(+canvas.dataset.cells === 0 && !document.getElementById('earth-control').hidden, 'Earth mode control');
  const moisture = document.getElementById('moisture'); moisture.value = 100; moisture.dispatchEvent(new Event('input', { bubbles: true })); await wait(() => +canvas.dataset.moisture === 1);
  moisture.value = 35; moisture.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('[data-mode="grass"]').click(); await wait(() => canvas.dataset.mode === 'grass'); assert(!document.getElementById('earth-control').hidden, 'Ground moisture control missing');
  document.querySelector('[data-mode="blend"]').click(); await wait(() => canvas.dataset.mode === 'blend'); assert(!document.getElementById('earth-control').hidden, 'Blend hides Earth control');
  report.controls = true; report.noGameStores = typeof Store === 'undefined' && typeof Sync === 'undefined' && typeof Game === 'undefined';
  report.storageUnchanged = before === JSON.stringify(Object.fromEntries(Object.entries(localStorage)));
  return report;
})()
