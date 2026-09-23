/* Run in the open lab with agent-browser eval --stdin < this file. */
(async () => {
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const wait = async fn => { for (let n = 0; n < 160; n++) { if (fn()) return; await pause(25); } throw Error('Surface lab timed out'); };
  const assert = (ok, message) => { if (!ok) throw Error(message); };
  const storage = JSON.stringify(Object.fromEntries(Object.entries(localStorage))), report = {};
  const field = new TerrainStudy.Field(), hero = { x: 250, y: 125 };
  report.growth = field.growthStats; assert(Math.abs(report.growth.mean - 20) < .2, 'Grass average changed');
  field.configure({ mode: 'grass' });
  for (let n = 0; n < 12; n++) { hero.x += 1; field.advance(.05, hero); }
  const touched = field.cells.filter(c => c.flatten > .05); assert(touched.length > 0, 'No grass contact');
  hero.x = 30; hero.y = 40;
  for (let n = 0; n < 30; n++) field.advance(.1, hero);
  const afterThree = Math.max(...touched.map(c => c.flatten)); assert(afterThree > .025, 'Trailing grass returns too quickly');
  for (let n = 0; n < 70; n++) field.advance(.1, hero);
  assert(touched.every(c => c.flatten === 0 && c.bend === 0), 'Grass did not return to rest');
  report.grassTrail = { touched: touched.length, flattenAfterThreeSeconds: afterThree, settledByTenSeconds: true };
  const sample = field.cells.find(c => c.targetLength >= 18 && c.targetLength <= 22), start = sample.length;
  field.configure({ length: 30 }); const target = sample.targetLength;
  field.advance(.2, hero); assert(sample.length > start && sample.length < target, 'Growth changed instantly');
  for (let n = 0; n < 100; n++) field.advance(.1, hero);
  assert(Math.abs(sample.length - target) < .02, 'Growth never reached its target'); report.growthTransition = true;
  field.configure({ mode: 'sand', length: 20 }); hero.x = 200; hero.y = 285; field.lastHero = { ...hero };
  hero.x += 12; field.advance(.05, hero); assert(field.tracks.length > 0, 'No sand step');
  const track = field.tracks[0]; field.configure({ angle: Math.PI / 4 }); assert(field.tracks.includes(track), 'Wind reset sand deformation');
  const one = SurfaceMotion.sand(1, .35, 8), six = SurfaceMotion.sand(6, .35, 8), rest = SurfaceMotion.sand(8, .35, 8);
  assert(one.rim > 0 && one.scatter > .9 && six.indent === 0 && six.settle > 0 && rest.settle === 0, 'Sand stages are not ordered');
  for (let n = 0; n < 90; n++) field.advance(.1, hero);
  assert(field.tracks.length === 0 && field.dust.length === 0, 'Sand never returned to rest'); report.sandStages = { impact: true, rimAndScatter: true, softTailAfterPrint: true, settled: true };
  field.configure({ mode: 'blend', length: 20 });
  const stages = [];
  for (const t of [0, 1, 2.6, 4.2, 7, 13]) {
    field.seekSequence(t); stages.push({ at: t, phase: field.sequenceState.phase, growth: field.sequenceState.growth, bent: field.stats.bent, prints: field.stats.tracks, trails: field.stats.trails });
  }
  assert(stages.map(s => s.phase).join('/') === 'Growing/Growing/Trailing bend/Displacement/Settling/At rest', 'Sequence stage order');
  assert(stages.at(-1).bent === 0 && stages.at(-1).trails === 0, 'Sequence did not settle');
  field.seekSequence(4.2); const stamp = JSON.stringify([field.tracks, field.cells.map(c => [c.bend, c.flatten])]);
  field.seekSequence(4.2); assert(stamp === JSON.stringify([field.tracks, field.cells.map(c => [c.bend, c.flatten])]), 'Scrubbing is not reproducible'); report.sequence = stages;
  const image = document.createElement('canvas'); image.width = 512; image.height = 384; const g = image.getContext('2d');
  field.configure({ shade: 0 }); field.paint(g, SurfaceMotion.heroAt(4.2), () => {}, () => {}); const unlit = g.getImageData(0, 0, 512, 384).data;
  field.configure({ shade: 1 }); field.paint(g, SurfaceMotion.heroAt(4.2), () => {}, () => {}); const lit = g.getImageData(0, 0, 512, 384).data;
  let shaded = 0; for (let i = 0; i < lit.length; i += 4) if (lit[i] !== unlit[i] || lit[i + 1] !== unlit[i + 1]) shaded++;
  assert(shaded > 1000, 'Material shadows not visible'); report.shadingPixels = shaded;
  assert(field.bytes <= 4 * 1048576 && field.frames.size <= 768, 'Grass cache budget exceeded'); report.cache = { bytes: field.bytes, frames: field.frames.size };
  const c = document.querySelector('#terrain'), change = (id, value, type = 'input') => { const node = document.getElementById(id); node.value = value; node.dispatchEvent(new Event(type, { bubbles: true })); };
  change('palette', 'gold', 'change'); change('view', 'grey', 'change'); change('contrast', 145); change('shade', 80);
  await wait(() => c.dataset.palette === 'gold' && c.dataset.view === 'grey' && +c.dataset.shade === .8);
  assert(c.style.filter.includes('grayscale(1)') && c.style.filter.includes('1.45'), 'Look controls');
  change('view', 'ink', 'change'); assert(c.style.filter.includes('url('), 'Black/white mode'); report.lookControls = true;
  document.getElementById('sequence-play').click(); await wait(() => +c.dataset.sequenceAt > .15 && c.dataset.sequencePlaying === 'true');
  document.getElementById('sequence-play').click(); await pause(350); const frozen = c.dataset.sequenceAt; await pause(400); assert(c.dataset.sequenceAt === frozen, 'Sequence pause failed');
  document.getElementById('sequence-play').click(); await wait(() => +c.dataset.sequenceAt > +frozen + .1);
  change('sequence-time', 60); await wait(() => c.dataset.sequence === 'Settling' && c.dataset.sequencePlaying === 'false');
  change('sequence-time', 100); await wait(() => c.dataset.sequence === 'At rest'); report.playPauseScrub = true;
  change('recovery', 4); assert(document.getElementById('recovery-value').textContent === '4 s', 'Recovery control');
  change('recovery', 8); change('palette', 'coast', 'change'); change('view', 'colour', 'change'); change('contrast', 100); change('shade', 55);
  document.getElementById('clear').click(); await wait(() => c.dataset.sequence === 'Ready');
  report.noGameStores = typeof Store === 'undefined' && typeof Sync === 'undefined' && typeof Game === 'undefined';
  report.storageUnchanged = storage === JSON.stringify(Object.fromEntries(Object.entries(localStorage)));
  return report;
})()
