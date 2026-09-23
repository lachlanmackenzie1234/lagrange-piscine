/* Rendered texture transport, turns, grain restraint and foot-only gravel. */
(() => {
  const assert = (ok, message) => { if (!ok) throw Error(message); }, report = {};
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 768;
  const g = canvas.getContext('2d'); g.scale(2, 2);
  const hero = { x: -40, y: -40 }, empty = () => {};
  const pixels = layer => layer.getContext('2d').getImageData(0, 0, layer.width, layer.height).data;
  const changes = (a, b) => a.reduce((count, v, i) => count + (v !== b[i]), 0);
  const draw = field => { field.paint(g, hero, empty, empty); return pixels(canvas); };
  const field = new TerrainStudy.Field({ mode: 'sand', moisture: 0, wind: .9, sun: 0, variation: 0, edgeGrain: 0, pathWear: 0 });
  const speeds = ['water', 'sand', 'earth', 'gravel'].map(type => SurfaceDynamics.transport(type, 0, .9));
  assert(speeds[0] > speeds[1] && speeds[1] > speeds[2] && speeds[2] > 0 && speeds[3] === 0, 'Wind response order');
  assert(speeds[2] < speeds[1] * .15, 'Earth moves too freely');
  assert(SurfaceDynamics.transport('gravel', 0, 20) === 0, 'Gravel is not explicitly wind-locked');
  report.normalizedWindResponse = speeds;

  report.directions = [];
  for (let n = 0; n < 8; n++) {
    const angle = n * Math.PI / 4, x = Math.cos(angle), y = Math.sin(angle);
    field.configure({ angle }); field.sandOffset = { x: 0, y: 0 }; field.earthOffset = { x: 0, y: 0 };
    for (let i = 0; i < 60; i++) {
      const before = { ...field.sandOffset }; field.advance(1 / 30, hero);
      const dx = field.sandOffset.x - before.x, dy = field.sandOffset.y - before.y;
      assert(dx * x + dy * y > 0, 'Sand reverses within a gust');
      assert(Math.abs(dx * y - dy * x) < 1e-9, 'Sand shuffles across the wind');
    }
    const sand = Math.hypot(field.sandOffset.x, field.sandOffset.y), earth = Math.hypot(field.earthOffset.x, field.earthOffset.y);
    assert(earth > 0 && earth < sand * .15, 'Earth displacement is not slower');
    report.directions.push({ degrees: n * 45, sand, earth });
  }
  const beforeTurn = draw(field), offsets = JSON.stringify([field.sandOffset, field.earthOffset]);
  field.configure({ angle: Math.PI });
  assert(offsets === JSON.stringify([field.sandOffset, field.earthOffset]), 'Turning wind resets texture phase');
  assert(changes(beforeTurn, draw(field)) === 0, 'Turning wind teleports or rotates the ground');
  report.continuousWindTurn = true;

  // Follow actual output pixels, not just displacement bookkeeping. A half-pixel
  // move must translate the same grain pattern by one pixel at the 2x resolution.
  report.renderedTranslation = {};
  for (const type of ['sand', 'earth']) {
    field.configure({ mode: type }); field[type + 'Offset'] = { x: 0, y: 0 };
    const paint = () => type === 'sand' ? field.paintSandLight(g, false) : field.paintEarthGrains(g, false);
    paint(); const layer = field[type + 'Grains'], a = pixels(layer);
    field[type + 'Offset'].x = .5; paint(); const b = pixels(layer);
    let equal = 0, count = 0;
    for (let y = 0; y < layer.height; y++) for (let x = 1; x < layer.width; x++) for (let c = 0; c < 4; c++) {
      const i = (y * layer.width + x) * 4 + c; equal += Math.abs(b[i] - a[i - 4]) <= 1; count++;
    }
    assert(equal / count > .999, type + ' grains are resampling instead of translating');
    field[type + 'Offset'].x = 512.5; paint();
    assert(changes(b, pixels(layer)) === 0, type + ' does not wrap seamlessly');
    report.renderedTranslation[type] = equal / count;
  }
  field.configure({ mode: 'sand', wind: 0 }); const still = draw(field);
  for (let i = 0; i < 90; i++) field.advance(1 / 30, hero);
  assert(changes(still, draw(field)) === 0, 'Sand shimmer still oscillates without wind');
  field.configure({ wind: 1 }); const reduced = (() => { field.paint(g, hero, empty, empty, true); return pixels(canvas); })();
  for (let i = 0; i < 30; i++) field.advance(1 / 30, hero, true);
  field.paint(g, hero, empty, empty, true); assert(changes(reduced, pixels(canvas)) === 0, 'Reduced motion still moves grains');
  report.stillAirAndReducedMotion = true;

  field.configure({ mode: 'gravel', wind: 1, moisture: 0 }); field.clearTracks();
  const gravel = draw(field);
  for (let i = 0; i < 120; i++) field.advance(1 / 30, hero);
  assert(changes(gravel, draw(field)) === 0, 'Wind moves untouched gravel');
  field.stampStep({ x: 240, y: 230 }, 40, 0); field.advance(.15, hero);
  const moved = draw(field), changed = changes(gravel, moved);
  assert(changed > 30, 'A step has no visible gravel response');
  let outside = 0;
  for (let y = 0; y < 768; y++) for (let x = 0; x < 1024; x++) {
    if (x >= 452 && x <= 510 && y >= 432 && y <= 490) continue;
    const i = (y * 1024 + x) * 4; outside += moved[i] !== gravel[i] || moved[i + 1] !== gravel[i + 1] || moved[i + 2] !== gravel[i + 2];
  }
  assert(outside === 0, 'Walking displaces gravel outside the contact patch');
  for (let i = 0; i < 270; i++) field.advance(1 / 30, hero);
  assert(changes(gravel, draw(field)) === 0, 'Gravel does not settle back after contact');
  report.gravel = { windStatic: true, contactChangedChannels: changed, outsideContactChangedPixels: outside, recovered: true };
  return report;
})()
