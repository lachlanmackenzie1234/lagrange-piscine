import { WORLD, DEFAULTS, seeded, clamp, inside, reachablePath, MOVES } from './engine.mjs';
import { TREE_SPECIES, WATER_LOOKS, forestProfile, treeRoster, hashIdentity, canopyDisplacement, passageImpulse, advanceGrassMemory } from './ecology.mjs';
import { createGroundCover } from './ground-cover.mjs';
import { ZONE_STYLES, TREE_SIZES, TREE_PLACEMENT_SIZES, zoneStyle, zoneAsset, treeAsset, grassStage } from './zone-art.mjs';
import { createMeadow, meadowHeight, meadowShape, foregroundRoots, meadowPalette, meadowSprite, meadowTile } from './meadow.mjs';

const { width: W, height: H, nav: N } = WORLD;
const TAU = Math.PI * 2;
const POOL = { x: 197, y: 156, w: 145, h: 94 };
const HOUSE = { x: 353, y: 105, w: 117, h: 59 };
const PUMP = { x: 402, y: 249, w: 54, h: 43 };
const GARDEN_PATH = [[100, 384], [145, 384], [150, 312], [186, 279], [375, 280], [398, 299], [430, 299], [430, 274], [383, 255], [367, 128], [410, 129], [412, 108], [336, 106], [284, 112], [206, 110], [164, 133], [129, 204], [131, 263], [113, 294]];
const MOODS = {
  day: { wash: '#f9ecbb', alpha: .025, shade: '#164f50', shadow: .24, length: .29, light: '#fff6bb' },
  golden: { wash: '#ffc566', alpha: .075, shade: '#12484a', shadow: .33, length: .67, light: '#fff2a5' },
  dusk: { wash: '#263662', alpha: .37, shade: '#182d48', shadow: .22, length: .52, light: '#b2dcd7' },
};

function surface(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function box(g, color, x, y, w = 1, h = 1) { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function polygon(g, color, points) { g.fillStyle = color; g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(Math.round(x), Math.round(y)) : g.moveTo(Math.round(x), Math.round(y))); g.closePath(); g.fill(); }
function quadPoint(points, u, v) { return [0,1].map(i => points[0][i]*(1-u)*(1-v)+points[1][i]*u*(1-v)+points[2][i]*u*v+points[3][i]*(1-u)*v); }
function ellipse(g, color, cx, cy, rx, ry) { g.fillStyle = color; for (let y = -Math.ceil(ry); y <= ry; y++) { const half = Math.sqrt(Math.max(0, 1 - (y / ry) ** 2)) * rx; g.fillRect(Math.round(cx - half), Math.round(cy + y), Math.max(1, Math.round(half * 2)), 1); } }
function line(g, color, points, width = 1) { g.strokeStyle = color; g.lineWidth = width; g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(Math.round(x), Math.round(y)) : g.moveTo(Math.round(x), Math.round(y))); g.stroke(); }
function loadImage(url) { return new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => reject(new Error(`Unable to load ${url}`)); im.src = url; }); }

// Runtime sampling keeps original exports intact. Alpha becomes binary at the
// chosen native pixel size, so animated edges stay crisp on the game canvas.
function sampleSprite(image, bounds, width, height, inset = 1) {
  const [sx, sy, sw, sh] = bounds || [0, 0, image.width, image.height];
  const source = surface(sw, sh), sg = source.getContext('2d', { willReadFrequently: true });
  sg.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  const px = sg.getImageData(0, 0, sw, sh).data;
  let x0 = sw, y0 = sh, x1 = 0, y1 = 0;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) if (px[(y * sw + x) * 4 + 3] > 155) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  if (x1 < x0 || y1 < y0) throw new Error('Empty sprite region');
  const c = surface(width, height), g = c.getContext('2d', { willReadFrequently: true });
  const factor = Math.min((width - inset * 2) / (x1 - x0 + 1), (height - inset * 2) / (y1 - y0 + 1));
  const dw = Math.round((x1 - x0 + 1) * factor), dh = Math.round((y1 - y0 + 1) * factor);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(source, x0, y0, x1 - x0 + 1, y1 - y0 + 1, Math.round((width - dw) / 2), height - dh - inset, dw, dh);
  const data = g.getImageData(0, 0, width, height);
  for (let i = 0; i < data.data.length; i += 4) { data.data[i + 3] = data.data[i + 3] > 130 ? 255 : 0; for (let k = 0; k < 3; k++) data.data[i + k] = Math.round(data.data[i + k] / 8) * 8; }
  g.putImageData(data, 0, 0); return c;
}
function shadowSprite(sprite) { const c = surface(sprite.width, sprite.height), g = c.getContext('2d'); g.drawImage(sprite, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#163f37'; g.fillRect(0, 0, c.width, c.height); return c; }
function nativeCanvas(image) { const c = surface(image.width, image.height); c.getContext('2d').drawImage(image, 0, 0); return c; }
function grassBank(image) {
  return [10, 16, 24, 32].map(width => [false, true].map(mirror => {
    const height = Math.max(2, Math.round(image.height * width / 32)), c = surface(width, height), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (mirror) { g.translate(width, 0); g.scale(-1, 1); }
    g.drawImage(image, 0, 0, width, height); return c;
  }));
}

async function loadZoneKit() {
  const [zones, trees] = await Promise.all([
    Promise.all(Object.keys(ZONE_STYLES).map(async zone => {
      const [house, pump, ...grass] = await Promise.all(['house', 'pump', 'cut', 'medium', 'tall'].map(kind => loadImage(zoneAsset(zone, kind))));
      return [zone, { house: nativeCanvas(house), pump: nativeCanvas(pump), grass: Object.fromEntries(['cut', 'medium', 'tall'].map((stage, i) => [stage, grassBank(grass[i])])) }];
    })),
    Promise.all(Object.keys(TREE_SPECIES).map(async species => [species, Object.fromEntries(await Promise.all(TREE_SIZES.map(async size => [size, nativeCanvas(await loadImage(treeAsset(species, size)))])))])),
  ]);
  return { zones: Object.fromEntries(zones), trees: Object.fromEntries(trees) };
}
function feetAnchor(sprite) {
  const data = sprite.getContext('2d').getImageData(0, 0, sprite.width, sprite.height).data;
  let bottom = sprite.height - 1;
  while (bottom > 0 && !Array.from({ length: sprite.width }, (_, x) => data[(bottom * sprite.width + x) * 4 + 3]).some(Boolean)) bottom--;
  let sum = 0, count = 0;
  for (let y = Math.max(0, bottom - 3); y <= bottom; y++) for (let x = 0; x < sprite.width; x++) if (data[(y * sprite.width + x) * 4 + 3]) { sum += x + .5; count++; }
  return { x: count ? sum / count : sprite.width / 2, y: bottom + 1 };
}

// Atlas gutters are irregular. Discard detached fragments of neighbouring
// trees, while grouping nearby leaf pixels across tiny transparent gaps.
function cleanTree(sprite) {
  const g = sprite.getContext('2d', { willReadFrequently: true }), { width: w, height: h } = sprite;
  const data = g.getImageData(0, 0, w, h), seen = new Uint8Array(w * h), groups = [];
  for (let i = 0; i < seen.length; i++) {
    if (seen[i] || !data.data[i * 4 + 3]) continue;
    const queue = [i]; seen[i] = 1;
    for (let p = 0; p < queue.length; p++) {
      const x = queue[p] % w, y = Math.floor(queue[p] / w);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx, ny = y + dy, j = ny * w + nx;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && !seen[j] && data.data[j * 4 + 3]) { seen[j] = 1; queue.push(j); }
      }
    }
    groups.push(queue);
  }
  const largest = Math.max(...groups.map(group => group.length));
  for (const group of groups) if (group.length < largest * .05) group.forEach(i => data.data[i * 4 + 3] = 0);
  g.putImageData(data, 0, 0); return sprite;
}

async function loadArt() {
  const base = '../v3-complete/exports/large/';
  const names = ['south', 'east', 'west', 'north'];
  const [sources, kit] = await Promise.all([Promise.all([loadImage('assets/coastal-foliage.png'), ...names.map(d => loadImage(base + `characters/EC-${d}.png`)), loadImage(base + 'monsters-base/monster-algue.png'), loadImage(base + 'species/species-EC.png')]), loadZoneKit()]);
  const atlas = sources[0];
  const regions = [[0, 0, 516, 626, 106, 122], [516, 0, 299, 626, 65, 130], [815, 0, 452, 626, 96, 113], [1267, 0, 269, 626, 54, 94], [0, 634, 400, 390, 46, 39], [400, 634, 403, 390, 39, 34], [803, 634, 390, 390, 46, 43], [1193, 634, 343, 390, 39, 34]];
  const plants = regions.map(([x, y, w, h, dw, dh], i) => { const sprite = sampleSprite(atlas, [x, y, w, h], dw, dh); return i < 4 ? cleanTree(sprite) : sprite; });
  const keeper = Object.fromEntries(names.map((d, i) => [d, sampleSprite(sources[i + 1], null, 48, 64, 2)]));
  const monster = sampleSprite(sources[5], null, 56, 48, 2), friend = sampleSprite(sources[6], null, 48, 48, 2);
  return { ...kit, plants, plantShadows: plants.map(shadowSprite), keeper, keeperAnchors: Object.fromEntries(names.map(d => [d, feetAnchor(keeper[d])])), monster, monsterShadow: shadowSprite(monster), friend };
}

function makeTrimmedSprite(form, variant = 0) {
  const w = form === 'hedge' ? 35 : form === 'pot' ? 24 : 26, h = form === 'pot' ? 34 : 23;
  const c = surface(w, h), g = c.getContext('2d'), r = seeded(137 + variant * 13 + w), base = form === 'pot' ? 23 : h - 2;
  if (form === 'pot') { box(g, '#67563e', 7, 24, 12, 9); box(g, '#ad7854', 6, 23, 14, 8); box(g, '#d5a16e', 5, 22, 16, 3); box(g, '#bd8a5a', 8, 26, 3, 4); }
  if (form === 'hedge') { box(g, '#315d44', 2, 9, w - 4, 12); box(g, '#477b4d', 2, 5, w - 4, 14); box(g, '#72a357', 4, 3, w - 8, 13); box(g, '#9dc069', 6, 2, w - 12, 3); }
  else { ellipse(g, '#315d44', w / 2, base - 7, w * .45, 8); ellipse(g, '#538848', w / 2 - 1, base - 9, w * .43, 9); ellipse(g, '#83ae57', w / 2 - 3, base - 12, w * .30, 6); }
  const silhouette = g.getImageData(0, 0, w, h).data;
  for (let i = 0; i < 100; i++) { const x = Math.floor(r() * w), y = Math.floor(r() * (base - 1)); if (!silhouette[(y * w + x) * 4 + 3]) continue; box(g, y < base - 12 ? i % 3 ? '#a5c470' : '#799f4e' : i % 3 ? '#477b45' : '#709951', x, y, 2, 1); }
  return c;
}
function trimmedPlanting() {
  return [
    { x: 357, y: 177, form: 'pot' }, { x: 469, y: 177, form: 'pot' },
    { x: 155, y: 146, form: 'ball' }, { x: 380, y: 146, form: 'ball' },
    { x: 161, y: 284, form: 'ball' }, { x: 375, y: 284, form: 'ball' },
    { x: 384, y: 224, form: 'hedge' }, { x: 479, y: 214, form: 'hedge' },
  ].map((o, i) => ({ ...o, id: `trimmed-${i}`, variant: i % 2, kind: 8, trimmed: true, scale: 1, phase: i * 1.6, rustle: 0 }));
}

function plantingZone(x, y) {
  if (inside(x, y, HOUSE, 29) || inside(x, y, PUMP, 25) || inside(x, y, { x: 159, y: 123, w: 218, h: 166 })) return 'trimmed';
  return Math.min(x, y, W - x, H - y) < 100 ? 'wild' : 'lawn';
}

function createGarden() {
  const fixed = [
    [0, 38, 117, 1.03], [1, 105, 89, .92], [2, 189, 74, .98], [1, 268, 86, .93], [3, 321, 55, .78],
    [1, 492, 105, 1.12], [0, 513, 189, 1.00], [2, 22, 255, 1.08], [3, 81, 186, .77],
    [0, 13, 357, 1.04], [1, 494, 334, .90], [2, 66, 427, 1.12], [0, 301, 441, 1.04], [2, 451, 419, 1.03],
  ].map(([kind, x, y, scale], i) => ({ id: `tree-${i}`, kind, x, y, scale, essential: true, phase: i * 2.73, rustle: 0 }));
  return fixed;
}

function inPolygon(x, y, points) {
  let result = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[i], [bx, by] = points[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) result = !result;
  }
  return result;
}
function lawnAt(x, y) {
  return x >= 0 && x < W && y >= 0 && y < H
    && !inPolygon(x, y, GARDEN_PATH)
    && !inside(x, y, { x: 168, y: 132, w: 199, h: 146 })
    && !inside(x, y, HOUSE) && !inside(x, y, PUMP);
}
export class LivingWorld {
  constructor(canvas, { onSelect = () => {}, onNotice = () => {}, onWaterChange = () => {}, onCue = () => {}, settings = {} } = {}) {
    this.canvas = canvas; this.g = canvas.getContext('2d'); this.g.imageSmoothingEnabled = false;
    this.settings = { ...DEFAULTS, ...settings }; this.onSelect = onSelect; this.onNotice = onNotice; this.onWaterChange = onWaterChange; this.onCue=onCue;
    this.objects = createGarden(); this.time = 0; this.ambient = 0; this.paused = false; this.suspended = false; this.disposed = false;
    this.trimmed = trimmedPlanting(); this.trimmedSprites = new Map();
    for (const form of ['pot', 'ball', 'hedge']) for (let v = 0; v < 2; v++) { const image = makeTrimmedSprite(form, v); this.trimmedSprites.set(`${form}/${v}`, { image, shadow: shadowSprite(image) }); }
    this.installGroundCover(9827);
    this.gardenId = 'EC-2'; this.cycle = null; this.grassHeight = 1; this.weather = null;
    this.theme = zoneStyle(this.gardenId);
    this.treeFrames = new Map(); this.grassTints = new Map(); this.meadowFrames = new Map(); this.footprints = []; this.footstepTime = 0; this.stepSide = 1;
    this.shadowLayer = surface(W, H); this.shadowG = this.shadowLayer.getContext('2d');
    this.shadowSample = surface(W / 4, H / 4); this.shadowSampleG = this.shadowSample.getContext('2d', { willReadFrequently: true });
    this.shadowPixels = null; this.heroShade = 0; this.heroShadeTarget = 0; this.keeperFrame = surface(64, 64);
    this.assignForest();
    this.hero = { x: 136, y: 312, dir: 'north', path: [], walk: 0 }; this.monster = { x: 147, y: 211, calm: false };
    this.effects = []; this.leaves = []; this.waterState = this.settings.poolState || 'clear'; this.door = 0; this.pumping = 0; this.hover = null; this.selected = null;
    this.base = this.makeGround(); this.nav = this.makeNavigation();
    this.lawnSurface = this.makeLawnSurface();
    this.coverMask = this.makeCoverMask(); this.coverFloor = surface(W, H);
    this.onClick = e => this.tap(e); this.onMove = e => this.pointer(e); this.onKey = e => this.key(e);
    canvas.addEventListener('click', this.onClick); canvas.addEventListener('pointermove', this.onMove); canvas.addEventListener('keydown', this.onKey);
    canvas.addEventListener('pointerleave', () => this.hover = null);
    this.ready = loadArt().then(art => { this.art = art; this.applyZoneArt(); return true; });
    let last = performance.now();
    const loop = now => { if (this.disposed) return; const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; if (!document.hidden && !this.suspended) { this.update(dt); this.draw(); } this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }
  setSettings(patch) { const oldLushness = this.settings.lushness, oldBias = this.settings.treeBias; this.settings = { ...this.settings, ...patch }; if (patch.poolState) this.setWaterState(patch.poolState); if (this.settings.treeBias !== oldBias) this.assignForest(); if (this.settings.lushness !== oldLushness) { this.coverFloorDirty = true; this.nav = this.makeNavigation(); const goal = this.hero.path.at(-1); if (goal) this.walkTo(goal.x, goal.y); } }
  setWaterState(state) { if (!WATER_LOOKS[state] || this.waterState === state) return; this.waterState = state; this.settings.poolState = state; this.onWaterChange(state); }
  setGarden(garden) { if (garden.id === this.gardenId) return; this.gardenId = garden.id; this.applyZoneArt(); this.installGroundCover(garden.seed); this.assignForest(); this.nav = this.makeNavigation(); this.reset(); }
  applyZoneArt() {
    this.theme = zoneStyle(this.gardenId); this.coverFloorDirty = true;
    if (!this.art) return;
    const zone = this.art.zones[this.theme.id];
    this.art.house = zone.house; this.art.pump = zone.pump; this.grassSprites = zone.grass;
    this.houseShadow = shadowSprite(zone.house); this.pumpShadow = shadowSprite(zone.pump); this.grassTints.clear(); this.meadowFrames.clear();
  }
  coverEligible(x, y) { return x > 5 && x < W-5 && y > 20 && y < H-4 && lawnAt(x, y) && Math.hypot(x-147,y-207)>23 && plantingZone(x, y) !== 'trimmed' && !this.trimmed.some(o => Math.abs(x - o.x) < (o.form === 'hedge' ? 20 : 16) && Math.abs(y - o.y + 2) < 10); }
  installGroundCover(seed) {
    const trees = this.objects.filter(o => o.essential);
    this.groundCover = createGroundCover({ width: W, height: H, seed, eligible: (x, y) => this.coverEligible(x, y), zoneAt: plantingZone,
      rockEligible: (x, y) => this.coverEligible(x, y) && !trees.some(t => Math.abs(x - t.x) < 12 && Math.abs(y - t.y) < 9) });
    // Detailed generated clumps become occasional accents over the fine lawn.
    const seen = new Set();
    this.grass = this.groundCover.grass.filter(t => { if (seen.has(t.patchId) || hashIdentity(t.patchId) % 4) return false; seen.add(t.patchId); return true; });
    this.meadow = createMeadow({ width: W, height: H, eligible: lawnAt, zoneAt: plantingZone });
    this.objects = [...trees, ...this.groundCover.rocks]; this.coverFloorDirty = true;
  }
  activeGrass() { return this.grass.filter(t => t.threshold <= this.settings.lushness); }
  assignForest() {
    const trees = this.objects.filter(o => o.kind < 4), roster = treeRoster(this.gardenId, trees.length, this.settings.treeBias);
    trees.forEach((tree, i) => { tree.species = roster[i]; tree.treeSize = TREE_PLACEMENT_SIZES[i]; tree.rustle = 0; });
  }
  forestSummary() {
    const trees = this.objects.filter(o => o.kind < 4), profile = forestProfile(this.gardenId);
    const counts = Object.fromEntries(Object.keys(TREE_SPECIES).map(id => [id, trees.filter(t => t.species === id).length]));
    return { dominant: profile.dominant, name: TREE_SPECIES[profile.dominant].plural, count: counts[profile.dominant], total: trees.length, counts, sizes: Object.fromEntries(TREE_SIZES.map(size => [size, trees.filter(t => t.treeSize === size).length])) };
  }
  setCycle(cycle) { this.cycle = cycle; if (this.grassHeight !== cycle.height) { this.coverFloorDirty = true; this.meadowFrames.clear(); } this.grassHeight = cycle.height; }
  setWeather(weather) { this.weather = weather; }
  cutFeedback() {
    this.grass.forEach(t => { t.bend = 0; t.bendVelocity = 0; t.flatten = 0; }); this.footprints = [];
    this.meadow.forEach(t => { t.bend = 0; t.bendVelocity = 0; t.flatten = 0; });
    const r = seeded(Math.round(this.time * 100));
    for (const tuft of this.activeGrass().slice(0, 22)) this.leaves.push({ x: tuft.x, y: tuft.y - 3, vx: (r() - .5) * 18, vy: 5 + r() * 7, spin: r() * TAU, life: .6 + r() * .8, start: this.time });
  }
  activePlants() { return this.objects.filter(o => o.essential || o.threshold <= this.settings.lushness); }
  makeNavigation() {
    const grid = Array.from({ length: H / N }, (_, y) => Array.from({ length: W / N }, (_, x) => {
      const px = x * N + N / 2, py = y * N + N / 2;
      if (x === 0 || x === W / N - 1 || y < 2 || y === H / N - 1) return 1;
      if (inside(px, py, POOL, 5) || inside(px, py, HOUSE, 3) || inside(px, py, PUMP, 3)) return 1;
      if (this.trimmed.some(o => Math.abs(px - o.x) < (o.form === 'hedge' ? 15 : 8) && Math.abs(py - o.y + 2) < 5)) return 1;
      if (this.activePlants().some(o => o.kind < 4 && Math.abs(px - o.x) < 8 && Math.abs(py - o.y + 3) < 8 || o.kind === 6 && Math.abs(px - o.x) < 10 * o.scale && Math.abs(py - o.y + 7) < 9 * o.scale)) return 1;
      return 0;
    })); return grid;
  }
  makeLawnSurface() {
    const mask = surface(W, H), mg = mask.getContext('2d'); box(mg, '#fff', 0, 0, W, H);
    mg.globalCompositeOperation = 'destination-out'; polygon(mg, '#000', GARDEN_PATH);
    box(mg, '#000', 168, 132, 200, 147); box(mg, '#000', HOUSE.x, HOUSE.y, HOUSE.w, HOUSE.h); box(mg, '#000', PUMP.x, PUMP.y, PUMP.w, PUMP.h);
    const c = surface(W, H), g = c.getContext('2d'), r = seeded(5063);
    for (let i = 0; i < 60; i++) {
      const x = r() * W, y = r() * H, rx = 15 + r() * 39, ry = 7 + r() * 18;
      g.globalAlpha = .10 + r() * .10;
      const color = i % 3 ? '#679e69' : '#c0d888';
      const edge = Array.from({ length: 18 }, (_, j) => { const a = j / 18 * TAU, jitter = .8 + r() * .3; return [x + Math.cos(a) * rx * jitter, y + Math.sin(a) * ry * jitter]; });
      polygon(g, color, edge);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; g.drawImage(mask, 0, 0); return c;
  }
  makeCoverMask() {
    const c=surface(W,H),g=c.getContext('2d'),data=g.createImageData(W,H);
    this.lawnPixels=new Uint8Array(W*H);
    for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(lawnAt(x,y)) {
      this.lawnPixels[y*W+x]=1;data.data[(y*W+x)*4+3]=255;
    }
    g.putImageData(data,0,0);return c;
  }
  rebuildCoverFloor() {
    const g=this.coverFloor.getContext('2d');g.globalCompositeOperation='source-over';g.clearRect(0,0,W,H);
    const tile=meadowTile(this.theme,this.grassHeight,false);
    g.fillStyle=g.createPattern(tile,'repeat');g.fillRect(0,0,W,H);
    g.globalCompositeOperation='destination-in';g.drawImage(this.coverMask,0,0);g.globalCompositeOperation='source-over';
    const floor=g.getImageData(0,0,W,H),ground=this.base.getContext('2d').getImageData(0,0,W,H).data;
    // A narrow pixel-dither fringe interleaves sand/stone with turf. The solid
    // terrace and path remain readable; there is no blurred edge or square seam.
    for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++) {
      const index=y*W+x;if(!this.lawnPixels[index])continue;
      let neighbour=-1,distance=0;
      for(let d=1;d<=3 && neighbour<0;d++) for(const [dx,dy] of [[-d,0],[d,0],[0,-d],[0,d]]) {
        const xx=x+dx,yy=y+dy;
        if(xx<0||yy<0||xx>=W||yy>=H)continue;
        const next=yy*W+xx;
        if(!this.lawnPixels[next]){neighbour=next;distance=d;break;}
      }
      const noise=((Math.imul(x,374761393)^Math.imul(y,668265263))>>>0)%100;
      if(neighbour>=0 && noise<65/distance) for(let k=0;k<3;k++) floor.data[index*4+k]=ground[neighbour*4+k];
    }
    g.putImageData(floor,0,0);this.coverFloorDirty=false;
  }
  makeGround() {
    const c = surface(W, H), g = c.getContext('2d'), rand = seeded(8437);
    box(g, '#a4bd70', 0, 0, W, H);
    // Broad irregular meadow patches make a quiet bed for the detailed props.
    for (let y = 0; y < H; y += 8) for (let x = 0; x < W; x += 8) {
      const value = Math.sin(x / 68 + y / 122) + Math.sin(y / 42 - x / 147) + Math.cos(x / 37) * .25;
      const colors = ['#7aa378', '#8ab07a', '#9abb78', '#abc779', '#b5cc7d'];
      box(g, colors[clamp(Math.floor(value + 2), 0, 4)], x, y, 8, 8);
    }
    for (let i = 0; i < 8500; i++) { const x = rand() * W, y = rand() * H; g.globalAlpha = .05 + rand() * .08; box(g, rand() < .5 ? '#3e8368' : '#eff1a9', x, y, 1 + rand() * 2, 1); } g.globalAlpha = 1;
    // An intentionally simple route from the garden gate, around the deck and
    // to the house. All apparent texture is deterministic, never frame noise.
    const path = GARDEN_PATH;
    polygon(g, '#91a66c', path.map(([x, y]) => [x + 2, y + 4])); polygon(g, '#d1c28b', path); polygon(g, '#dfce97', path.map(([x, y]) => [x + (x < 160 ? 3 : -2), y - 2]));
    for (let i = 0; i < 950; i++) { const x = rand() * W, y = rand() * H; const p = g.getImageData(Math.floor(x), Math.floor(y), 1, 1).data; if (p[0] > 190 && p[1] < 215) box(g, i % 3 ? '#c5b680' : '#eadcac', x, y, rand() > .8 ? 3 : 1, 1); }
    // Stone terrace: varied 32px slabs, faint joints and a raised front lip.
    box(g, '#7e9a77', 170, 135, 197, 147); box(g, '#c9bf99', 168, 132, 199, 145);
    for (let y = 135; y < 275; y += 24) for (let x = 171; x < 365; x += 24) { const shades = ['#e2d6ac', '#ded0a3', '#e7d9ae', '#d9cda3']; box(g, shades[Math.floor(rand() * shades.length)], x, y, Math.min(22, 364 - x), Math.min(22, 275 - y)); box(g, '#f2e6bf', x, y, Math.min(22, 364 - x), 1); box(g, '#c9c19c', x, y + 21, Math.min(22, 364 - x), 1); if (rand() > .6) box(g, '#ccc49d', x + 6, y + 13, 3, 1); }
    box(g, '#f0e2b4', 168, 132, 199, 2); box(g, '#c2ba93', 168, 275, 199, 3);
    // Uneven stepping stones nestle into the lawn at the entrance.
    for (let i = 0; i < 6; i++) { const x = 119 + Math.sin(i * .7) * 6, y = 365 - i * 12; polygon(g, '#a8ab85', [[x - 7, y], [x - 4, y - 4], [x + 9, y - 3], [x + 10, y + 3], [x - 4, y + 4]]); line(g, '#ebe0b5', [[x - 5, y - 3], [x + 8, y - 3]]); }
    // Coping belongs to the fixed layer; the water remains independently live.
    const p = POOL; box(g, '#8d9f89', p.x - 6, p.y - 6, p.w + 14, p.h + 15); box(g, '#f4e8c1', p.x - 6, p.y - 7, p.w + 12, p.h + 13); box(g, '#d0caa8', p.x - 4, p.y - 4, p.w + 8, p.h + 8); box(g, '#497d80', p.x - 1, p.y - 1, p.w + 2, p.h + 2);
    for (let x = p.x; x < p.x + p.w; x += 17) { box(g, '#bcbda0', x, p.y - 7, 1, 4); box(g, '#c9c5a2', x, p.y + p.h + 2, 1, 4); }
    for (let y = p.y; y < p.y + p.h; y += 17) { box(g, '#c4c5a1', p.x - 6, y, 4, 1); box(g, '#b1b9a2', p.x + p.w + 2, y, 4, 1); }
    // The garden fence sits in low relief along the right boundary.
    for (let y = 160; y < 244; y += 15) { box(g, '#79916e', 485, y + 1, 5, 14); box(g, '#d0b784', 485, y, 3, 13); box(g, '#f0d599', 485, y, 3, 1); } box(g, '#a28f68', 487, 158, 2, 83);
    return c;
  }
  update(dt) {
    this.time += dt; if (!this.paused && !this.settings.quiet) this.ambient += dt;
    const hero = this.hero, target = hero.path[0], previousX = hero.x, previousY = hero.y;
    if (target) { const dx = target.x - hero.x, dy = target.y - hero.y, distance = Math.hypot(dx, dy), step = 58 * dt; hero.dir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'east' : 'west' : dy > 0 ? 'south' : 'north'; hero.walk += dt;
      if (distance <= step) { hero.x = target.x; hero.y = target.y; hero.path.shift(); if (!hero.path.length && this.arrival) { const f = this.arrival; this.arrival = null; f(); } } else { hero.x += dx / distance * step; hero.y += dy / distance * step; }
    } else hero.walk = 0;
    hero.vx = dt ? (hero.x - previousX) / dt : 0; hero.vy = dt ? (hero.y - previousY) / dt : 0;
    const quiet = this.settings.quiet || this.paused;
    this.grass.forEach(tuft => advanceGrassMemory(tuft, passageImpulse(tuft, hero), dt, quiet));
    for (const cell of this.meadow) {
      if (Math.abs(cell.x-hero.x)<22 && Math.abs(cell.y-hero.y)<22) advanceGrassMemory(cell, passageImpulse(cell,hero),dt,quiet);
      else if (Math.abs(cell.bend)>.005 || cell.flatten>.005 || Math.abs(cell.bendVelocity)>.005) advanceGrassMemory(cell,{bend:0,pressure:0},dt,quiet);
      else { cell.bend=0;cell.flatten=0;cell.bendVelocity=0; }
    }
    if (Math.hypot(hero.vx, hero.vy) > 2) {
      this.footstepTime += dt;
      if (this.footstepTime >= .16) {
        this.footstepTime %= .16; this.stepSide *= -1;
        this.onCue(lawnAt(hero.x,hero.y)?'grass-step':'stone-step',{x:hero.x,y:hero.y});
        if (!quiet && lawnAt(hero.x, hero.y)) { const speed = Math.hypot(hero.vx, hero.vy), side = this.stepSide * 2; this.footprints.push({ x: hero.x - hero.vy / speed * side, y: hero.y + hero.vx / speed * side, vertical: Math.abs(hero.vy) > Math.abs(hero.vx), start: this.time }); }
      }
    } else this.footstepTime = 0;
    this.footprints = this.footprints.filter(p => this.time - p.start < 2.1);
    this.heroShade += (this.heroShadeTarget - this.heroShade) * (1 - Math.exp(-dt * 12));
    [...this.objects, ...this.trimmed].forEach(o => o.rustle = Math.max(0, o.rustle - dt)); this.door = Math.max(0, this.door - dt); this.pumping = Math.max(0, this.pumping - dt);
    this.effects = this.effects.filter(e => this.time - e.start < e.life);
    this.leaves = this.leaves.filter(e => this.time - e.start < e.life);
  }
  point(ev) { const r = this.canvas.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * W, (ev.clientY - r.top) / r.height * H]; }
  objectAt(x, y) {
    const hits = [];
    if (Math.hypot(x - this.monster.x, y - (this.monster.y - 13)) < 22) hits.push({ kind: 'monster', depth: this.monster.y });
    if (this.art) {
      const opaque = (sprite, sx, sy) => sx >= 0 && sy >= 0 && sx < sprite.width && sy < sprite.height && sprite.getContext('2d').getImageData(Math.floor(sx), Math.floor(sy), 1, 1).data[3] > 0;
      if (opaque(this.art.house, x - 337, y - 43)) hits.push({ kind: 'house', depth: 169 });
      if (opaque(this.art.pump, x - 394, y - 211)) hits.push({ kind: 'pump', depth: 294 });
      for (const o of this.activePlants()) { const sprite = o.kind < 4 ? this.treeFrame(o).image : this.art.plants[o.kind], w = sprite.width * o.scale, h = sprite.height * o.scale; if (inside(x, y, { x: o.x - w / 2, y: o.y - h, w, h })) { const sx = clamp(Math.floor((x - o.x + w / 2) / o.scale), 0, sprite.width - 1), sy = clamp(Math.floor((y - o.y + h) / o.scale), 0, sprite.height - 1); if (opaque(sprite, sx, sy)) hits.push({ kind: 'plant', object: o, depth: o.y }); } }
      for (const o of this.trimmed) { const sprite = this.trimmedSprites.get(`${o.form}/${o.variant}`).image; if (opaque(sprite, x - o.x + sprite.width / 2, y - o.y + sprite.height)) hits.push({ kind: 'plant', object: o, depth: o.y }); }
    }
    // Pick the foremost visible object, using the same depth as the painter.
    return hits.sort((a, b) => b.depth - a.depth)[0] || (inside(x, y, POOL, 5) ? { kind: 'pool' } : null);
  }
  pointer(ev) { if (!this.art) return; const [x, y] = this.point(ev); this.hover = this.objectAt(x, y); this.canvas.style.cursor = this.hover ? 'pointer' : 'crosshair'; }
  tap(ev) { if (!this.art) return; const [x, y] = this.point(ev), hit = this.objectAt(x, y); this.ripple(x, y, 'tap', .65); if (hit?.kind === 'plant') { this.rustle(hit.object); this.onSelect(null); return; } if (hit) { this.select(hit.kind); return; } this.onSelect(null); this.selected = null; this.walkTo(x, y); }
  select(kind) { this.selected = kind; this.onSelect(kind); const targets = { monster: [this.monster.x, this.monster.y], pool: [270, 201], pump: [430, 270], house: [416, 150] }; const p = targets[kind]; if (p) this.ripple(...p, 'select', .75); }
  key(ev) {
    if (['Enter', ' '].includes(ev.key)) { ev.preventDefault(); this.select('monster'); return; }
    const d = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[ev.key];
    if (d) { ev.preventDefault(); const h = this.hero, x = clamp(Math.floor(h.x / N) + d[0], 0, W / N - 1), y = clamp(Math.floor(h.y / N) + d[1], 0, H / N - 1); if (!this.nav[y][x]) this.walkTo(x * N + N / 2, y * N + N / 2); }
  }
  walkTo(x, y, done) {
    const from = [clamp(Math.floor(this.hero.x / N), 0, W / N - 1), clamp(Math.floor(this.hero.y / N), 0, H / N - 1)];
    const to = [clamp(Math.floor(x / N), 0, W / N - 1), clamp(Math.floor(y / N), 0, H / N - 1)];
    const path = reachablePath(this.nav, from, to);
    if (!path.length) { this.arrival = null; this.onNotice('That corner is a little overgrown. Try the clearing.'); return false; }
    this.hero.path = path.slice(1).map(([cx, cy]) => ({ x: cx * N + N / 2, y: cy * N + N / 2 })); this.arrival = done || null;
    if (!this.hero.path.length && done) { this.arrival = null; done(); } return true;
  }
  ripple(x, y, kind = 'tap', life = 1.4) { this.effects.push({ x, y, kind, life, start: this.time });const cue={select:'select',wash:'pump','garden-water':'hose',skim:'splash',treat:'splash',test:'select'}[kind];if(cue)this.onCue(cue,{x,y}); }
  rustle(o) { this.onCue(o.kind===6?'stone-step':'rustle',{x:o.x,y:o.y}); o.rustle = 1.6; const r = seeded(Math.round(o.x * o.y + this.time * 3)), height = o.kind < 4 ? this.art.trees[o.species][o.treeSize].height * .6 : 12; for (let i = 0; i < 8; i++) this.leaves.push({ x: o.x + (r() - .5) * Math.min(35, height), y: o.y - height * o.scale, vx: 8 + r() * 17, vy: 12 + r() * 9, spin: r() * TAU, life: 2 + r(), start: this.time }); this.onNotice(o.kind < 4 ? `${TREE_SPECIES[o.species].name} · a rustle passes through the canopy.` : o.trimmed ? 'A neatly clipped border, close to the pool and house.' : o.kind === 6 ? 'Warm stone, cool moss, and a few tiny flowers.' : 'The garden stirs around your feet.'); }
  action(kind) {
    this.onSelect(null); this.selected = null;
    if (kind === 'door') { const [x, , w] = this.theme.door; this.walkTo(337 + x + w / 2, 178, () => { this.hero.dir = 'north'; this.door = 4; this.onCue('door',{x:337+x+w/2,y:169}); this.onNotice('The depot door opens. Everything is ready for the next round.'); }); return; }
    if (kind === 'wash') { this.walkTo(392, 300, () => { this.pumping = 5; this.ripple(433, 281, 'wash', 3.6); this.onNotice('The pump hums. A clear stream runs through the filter.'); }); return; }
    if (kind === 'water-garden') { this.walkTo(392, 300, () => { this.hero.dir='north'; this.ripple(392,291,'garden-water',4); this.trimmed.find(o=>o.x===375&&o.y===284).rustle=1.5; this.onNotice('A gentle spray from the hose settles over the border.'); }); return; }
    const target = kind === 'skim' ? [184, 216] : [248, 268];
    this.walkTo(...target, () => { this.hero.dir = kind === 'skim' ? 'east' : 'north'; this.ripple(kind === 'skim' ? 218 : 255, kind === 'skim' ? 206 : 229, kind, 3.2); if (kind === 'treat') this.setWaterState('treated'); this.onNotice(kind === 'test' ? `${WATER_LOOKS[this.waterState].label} appearance · a simulated water check.` : kind === 'skim' ? 'A slow sweep. The leaves drift toward the skimmer.' : 'A soft cloud dissolves. The water catches the light.'); });
  }
  reset() { this.hero = { x: 136, y: 312, dir: 'north', path: [], walk: 0 }; this.monster.calm = false; this.effects = []; this.leaves = []; this.footprints = []; this.heroShade = 0; this.heroShadeTarget = 0; this.grass.forEach(t => { t.bend = 0; t.bendVelocity = 0; t.flatten = 0; }); this.meadow.forEach(t => { t.bend=0;t.bendVelocity=0;t.flatten=0; }); this.arrival = null; this.waterState = this.settings.poolState || 'clear'; this.door = 0; this.pumping = 0; this.selected = null; this.onSelect(null); }
  drawWater(g) {
    const p = POOL, look = WATER_LOOKS[this.waterState] || WATER_LOOKS.clear, t = this.ambient * look.speed, strength = this.settings.water / 100;
    g.save(); g.beginPath(); g.rect(p.x, p.y, p.w, p.h); g.clip();
    box(g, look.bands[0], p.x, p.y, p.w, p.h);
    for (let y = 0; y < p.h; y += 4) box(g, look.bands[Math.min(4, Math.floor(y / (p.h / 5)))], p.x, p.y + y, p.w, 4);
    // Deep edge and the submerged pool tiles give the water a physical volume.
    box(g, look.deep, p.x, p.y, p.w, 4); box(g, look.edge, p.x, p.y + 4, p.w, 3); box(g, look.edge, p.x, p.y + 7, 5, p.h - 7);
    g.globalAlpha = .14 * look.clarity;
    for (let x = p.x + 15; x < p.x + p.w; x += 20) line(g, '#ddf8dd', [[x, p.y + 13], [x - 3, p.y + p.h]], 1);
    for (let y = p.y + 15; y < p.y + p.h; y += 18) box(g, '#ebf8db', p.x, y, p.w, 1);
    // Disconnected caustic fragments drift slowly, avoiding a marching tile seam.
    for (let i = 0; i < look.caustics; i++) { const x = p.x + (i * 37 % p.w), y = p.y + (i * 29 % p.h), shift = Math.round(Math.sin(t * .5 * strength + i) * 4 * strength); g.globalAlpha = (.12 + .13 * (Math.sin(t * .8 + i * 1.7) * .5 + .5) * strength) * look.clarity; line(g, look.shine, [[x + shift, y], [x + 4 + shift, y - 2], [x + 8 + shift, y - 2], [x + 12 + shift, y]], 1); if (i % 3 === 0) line(g, look.shine, [[x + 4 + shift, y - 2], [x + 6, y - 7], [x + 10, y - 9]], 1); }
    if (this.waterState === 'treated') for (let i = 0; i < 12; i++) { const x = p.x + i * 31 % p.w + Math.sin(t * .25 + i) * 4, y = p.y + i * 19 % p.h; g.globalAlpha = .06 + Math.sin(t * .4 + i) * .025; ellipse(g, '#e0f5d9', x, y, 9 + i % 7, 3 + i % 3); }
    if (this.waterState === 'algae' || this.waterState === 'murky') for (let i = 0; i < 19; i++) {
      const x = p.x + 7 + i * 37 % (p.w - 14) + Math.sin(t * .25 + i) * strength * 3, y = p.y + 7 + i * 23 % (p.h - 14);
      g.globalAlpha = this.waterState === 'murky' ? .35 : .2; ellipse(g, i % 3 ? look.deep : '#a7a468', x, y, 2 + i % 5, 1 + i % 2);
    }
    g.globalAlpha = .1; polygon(g, '#daf2d5', [[p.x + 26, p.y], [p.x + 63, p.y], [p.x + p.w, p.y + 67], [p.x + p.w, p.y + 83]]);
    g.globalAlpha = .17; polygon(g, look.deep, [[p.x, p.y], [p.x + 32, p.y], [p.x + 48, p.y + 13], [p.x + 30, p.y + 21], [p.x + 40, p.y + 32], [p.x, p.y + 29]]); g.globalAlpha = 1;
    if (this.art) { const x = p.x + p.w * .68 + Math.sin(t * .32) * 9, y = p.y + p.h * .53 + Math.cos(t * .41) * 5; ellipse(g, look.bands[1], x, y + 4, 12, 4); g.globalAlpha = .8; g.drawImage(this.art.friend, Math.round(x - 12), Math.round(y - 20), 24, 24); g.globalAlpha = .55; line(g, look.shine, [[x - 15, y + 4], [x - 10, y + 6], [x + 9, y + 6], [x + 14, y + 4]]); g.globalAlpha = 1; }
    g.restore();
    // Ladder is foreground art, outside the water clip.
    const lx = p.x + 41, ly = p.y + p.h - 10;
    line(g, '#477477', [[lx - 2, ly + 12], [lx - 2, ly - 11], [lx + 1, ly - 14], [lx + 5, ly - 14], [lx + 7, ly - 11], [lx + 7, ly + 4]], 2);
    line(g, '#f8f0cf', [[lx - 3, ly + 10], [lx - 3, ly - 12], [lx, ly - 15], [lx + 4, ly - 15], [lx + 6, ly - 12]], 2);
    line(g, '#ecf0d2', [[lx + 9, ly + 10], [lx + 9, ly - 12], [lx + 12, ly - 15], [lx + 16, ly - 15], [lx + 18, ly - 12]], 2);
    for (let y = ly - 7; y < ly + 6; y += 6) box(g, '#c2e1cd', lx - 2, y, 12, 2);
  }
  castShadow(g, sprite, x, y, scale = 1, opacity = 1, anchor = null) {
    if (!this.settings.shadows) return;
    const mood = MOODS[this.settings.mood], angle = this.settings.sun * Math.PI / 180;
    g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = mood.shadow * opacity * (1 - (this.weather?.cloud || 0) * .7);
    g.translate(Math.round(x), Math.round(y)); g.transform(1, 0, -Math.cos(angle) * mood.length, -Math.sin(angle) * mood.length * .65, 0, 0);
    g.drawImage(sprite, -Math.round((anchor?.x ?? sprite.width/2)*scale), -Math.round((anchor?.y ?? sprite.height)*scale), Math.round(sprite.width * scale), Math.round(sprite.height * scale)); g.restore();
  }
  treeFrame(tree) {
    const pose = Math.round(canopyDisplacement(tree, this.ambient, this.settings.breeze / 100, this.settings.quiet || this.paused) * (tree.treeSize === 'small' ? .55 : tree.treeSize === 'medium' ? .8 : 1));
    const key = `${tree.species}/${tree.treeSize}/${pose}`;
    if (!this.treeFrames.has(key)) {
      const original = this.art.trees[tree.species][tree.treeSize], meta = TREE_SPECIES[tree.species];
      const image = surface(original.width + 10, original.height), g = image.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false;
      for (let y = 0; y < original.height; y += 3) {
        const h = Math.min(3, original.height - y), weight = Math.max(0, 1 - y / (original.height * meta.bendTo));
        g.drawImage(original, 0, y, original.width, h, 5 + Math.round(pose * weight ** 1.15), y, original.width, h);
      }
      this.treeFrames.set(key, { image, shadow: shadowSprite(image), pixels: g.getImageData(0, 0, image.width, image.height).data, pose });
      if (this.treeFrames.size > 120) this.treeFrames.delete(this.treeFrames.keys().next().value);
    }
    return this.treeFrames.get(key);
  }
  sampleShade(x, y) {
    if (!this.shadowPixels || !this.settings.shadows || x < 0 || y < 0 || x >= W || y >= H) return 0;
    const width = W / 4, height = H / 4, xx = Math.floor(x / 4), yy = Math.floor(y / 4);
    let total = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const sx = Math.min(width - 1, xx + dx), sy = Math.min(height - 1, yy + dy); total += this.shadowPixels[(sy * width + sx) * 4 + 3]; }
    return total / (4 * 255);
  }
  shadeGrass(sprite, tuft) {
    const level = clamp(Math.round(this.sampleShade(tuft.x, tuft.y) * 12), 0, 6);
    if (!level) return sprite;
    const key = `${grassStage(this.grassHeight)}/${tuft.size}/${tuft.variant % 2}/${level}`;
    if (!this.grassTints.has(key)) { const c = surface(sprite.width, sprite.height), g = c.getContext('2d'); g.drawImage(sprite, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = level / 12; box(g, '#255b55', 0, 0, c.width, c.height); this.grassTints.set(key, c); }
    return this.grassTints.get(key);
  }
  drawSurfacePassage(g) {
    if (this.settings.quiet) return;
    for (const p of this.footprints) {
      const fade = Math.max(0, 1 - (this.time - p.start) / 2.1);
      g.globalAlpha = fade * .14 * (.4 + this.grassHeight * .6);
      ellipse(g, '#4b885a', p.x, p.y, p.vertical ? 4 : 7, p.vertical ? 6 : 3);
      g.globalAlpha = fade * .17; box(g, '#366d50', p.x - 1, p.y - 1, p.vertical ? 2 : 3, p.vertical ? 3 : 1);
      g.globalAlpha = fade * .2; line(g, '#bed386', [[p.x - 4, p.y + 2], [p.x - 6, p.y], [p.x - 7, p.y - 2]]);
    }
    g.globalAlpha = 1;
  }
  drawDapple(g, trees) {
    if (!this.settings.shadows || this.settings.mood === 'dusk') return;
    const angle = this.settings.sun * Math.PI / 180, mood = MOODS[this.settings.mood], wind = this.settings.breeze / 100;
    const light = (1 - (this.weather?.cloud || 0)) * (this.weather?.sunStrength || 1);
    for (const tree of trees) {
      const image = this.treeFrame(tree).image;
      for (let i = 0; i < 5; i++) {
        const distance = image.height * tree.scale * (.45 + i * .09), wave = this.ambient * wind * .8 + tree.phase + i;
        const x = tree.x + Math.cos(angle) * mood.length * distance + Math.sin(i * 2.4 + tree.phase) * image.width * .17 + Math.sin(wave) * wind;
        const y = tree.y + Math.sin(angle) * mood.length * .65 * distance + Math.cos(i * 1.8) * 4;
        if (this.sampleShade(x, y) < .07) continue;
        g.globalAlpha = light * (.08 + (Math.sin(wave) * .5 + .5) * .08);
        box(g, '#f0e8ac', x, y, 3 + i % 2, 2); box(g, '#f0e8ac', x + 1, y - 1, 2, 1);
      }
    }
    g.globalAlpha = 1;
  }
  meadowMaximum() {
    const anchor=this.art?.keeperAnchors.south?.y || 60;
    return clamp(Math.round((anchor-31)*this.settings.keeper/100*this.settings.body/100*1.2),6,18);
  }
  drawMeadow(g, foreground=null) {
    const palette=meadowPalette(this.theme,this.grassHeight),maximum=this.meadowMaximum();
    const options={growth:this.grassHeight,lushness:this.settings.lushness,time:this.ambient,wind:this.settings.breeze/100,quiet:this.settings.quiet||this.paused,maximum};
    if(foreground){g.save();g.beginPath();g.rect(foreground.x0,foreground.y0,foreground.x1-foreground.x0,foreground.y1-foreground.y0);g.clip();}
    for(const cell of this.meadow){
      if(foreground && (cell.x+12<foreground.x0||cell.x-12>foreground.x1||cell.y+3<foreground.footY||cell.y-3>foreground.y1+maximum))continue;
      const shape=meadowShape(cell,options);
      if(foreground)shape.mask=foregroundRoots(cell,foreground.footY);
      if(!shape.mask)continue;
      const shade=foreground?Math.round(this.sampleShade(cell.x,cell.y)*8):0;
      const key=`${shape.height}/${shape.amount}/${shape.pose}/${shape.variant}/${shape.mask}/${shade}`;
      if(!this.meadowFrames.has(key)){
        const sprite=meadowSprite(shape,palette);
        if(shade){const sg=sprite.getContext('2d');sg.globalCompositeOperation='source-atop';sg.globalAlpha=shade/8;box(sg,'#255b55',0,0,24,28);}
        this.meadowFrames.set(key,sprite);
        if(this.meadowFrames.size>900)this.meadowFrames.delete(this.meadowFrames.keys().next().value);
      }
      g.drawImage(this.meadowFrames.get(key),cell.x-12,cell.y-22);
    }
    if(foreground)g.restore();
  }
  drawGrassTuft(g, tuft) {
    const source = this.grassSprites[grassStage(this.grassHeight)][tuft.size][tuft.variant % 2], sprite = this.shadeGrass(source, tuft);
    const height = Math.max(2, Math.round((4 + 20 * this.grassHeight) * sprite.width / 32 * (1 - (tuft.flatten || 0) * .42)));
    const x = Math.round(tuft.x - sprite.width / 2), y = tuft.y - height;
    const quiet = this.settings.quiet || this.paused, wind = this.settings.breeze / 100;
    const gust = .75 + Math.sin(this.ambient * .31 + tuft.x * .008 + tuft.y * .003) * .25;
    const sway = quiet ? 0 : (Math.sin(this.ambient * (1.05 + tuft.size * .14) + tuft.phase) * wind * gust * (1 + tuft.size * .6) + (tuft.bend || 0)) * this.grassHeight;
    if (tuft.size > 1) { g.globalAlpha = .17; ellipse(g, '#356c53', tuft.x + 2, tuft.y - 1, sprite.width * .34, 2); g.globalAlpha = 1; }
    for (let sy = 0; sy < sprite.height; sy += 2) {
      const sh = Math.min(2, sprite.height - sy), shift = Math.round(sway * (1 - sy / sprite.height) ** 1.2);
      const dy = Math.round(sy / sprite.height * height), dh = Math.round((sy + sh) / sprite.height * height) - dy;
      if (dh > 0) g.drawImage(sprite, 0, sy, sprite.width, sh, x + shift, y + dy, sprite.width, dh);
    }
  }
  drawPlant(g, o) {
    if (o.kind < 4) {
      const frame = this.treeFrame(o), image = frame.image, w = Math.round(image.width * o.scale), h = Math.round(image.height * o.scale);
      const size = this.settings.keeper / 100, neck = this.hero.dir === 'north' ? 30 : 31, anchor = this.art.keeperAnchors[this.hero.dir];
      const headY = this.hero.y - (anchor.y - neck) * size * this.settings.body / 100 - neck * size * .45;
      const x = Math.round(o.x - w / 2), y = Math.round(o.y - h), hx = Math.floor((this.hero.x - x) / o.scale), hy = Math.floor((headY - y) / o.scale);
      const covers = o.y > this.hero.y + 3 && hx >= 0 && hy >= 0 && hx < image.width && hy < image.height && frame.pixels[(hy * image.width + hx) * 4 + 3] > 0;
      o.drawAlpha ??= 1; o.drawAlpha += ((covers ? .7 : 1) - o.drawAlpha) * .22;
      g.save(); g.globalAlpha *= o.drawAlpha; g.drawImage(image, x, y, w, h); g.restore(); return;
    }
    const sprite = this.art.plants[o.kind], w = Math.round(sprite.width * o.scale), h = Math.round(sprite.height * o.scale), x = Math.round(o.x - w / 2), y = Math.round(o.y - h);
    const wind = this.settings.breeze / 100, quiet = this.settings.quiet || this.paused;
    const sway = quiet ? 0 : Math.sin(this.ambient * .85 + o.phase) * wind * (o.kind < 4 ? 1.4 : .8) + (o.rustle > 0 ? Math.sin(o.rustle * 20) * o.rustle * 1.8 : 0);
    if (Math.abs(sway) < .3 || o.kind === 6) { g.drawImage(sprite, x, y, w, h); return; }
    for (let sy = 0; sy < sprite.height; sy += 4) { const sh = Math.min(4, sprite.height - sy), weight = (1 - sy / sprite.height) ** 1.4, dy = Math.round(sy * o.scale), dh = Math.round((sy + sh) * o.scale) - dy; g.drawImage(sprite, 0, sy, sprite.width, sh, x + Math.round(sway * weight), y + dy, w, dh); }
  }
  drawTrimmed(g, o) {
    const sprite = this.trimmedSprites.get(`${o.form}/${o.variant}`).image, sway = this.settings.quiet || this.paused ? 0 : Math.round(Math.sin(this.ambient + o.phase) * this.settings.breeze / 100 * .7 + Math.sin(o.rustle * 17) * o.rustle);
    g.drawImage(sprite, Math.round(o.x - sprite.width / 2 + sway), o.y - sprite.height);
  }
  drawKeeper(g, x = this.hero.x, y = this.hero.y, options = {}) {
    if (!this.art) return;
    const dir = options.dir || this.hero.dir, size = options.scale ?? this.settings.keeper / 100, sprite = this.art.keeper[dir];
    // Keep the head at its existing native size. Only the region below the
    // neck is shortened; the net's shaft stays joined across the split.
    const neck = dir === 'north' ? 30 : 31, legs = 46, body = this.settings.body / 100;
    const w = Math.round(48 * size), headH = Math.round(neck * size), bodyH = Math.max(1, Math.round((64 - neck) * size * body));
    const h = headH + bodyH, moving = this.hero.path.length > 0 && !options.still;
    const bob = this.settings.quiet ? 0 : moving ? Math.round(Math.sin(this.hero.walk * 16)) : Math.round(Math.sin(this.ambient * 1.8) * .6);
    const anchor = this.art.keeperAnchors[dir], footY = headH + (anchor.y - neck) * size * body;
    const target = g, worldX = Math.round(x - anchor.x * size), worldY = Math.round(y - footY + bob), xx = 4, yy = 0;
    const frame = this.keeperFrame; if (frame.width !== w + 8 || frame.height !== h + 1) { frame.width = w + 8; frame.height = h + 1; }
    g = frame.getContext('2d'); g.imageSmoothingEnabled = false; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, frame.width, frame.height);
    g.drawImage(sprite, 0, 0, 48, neck, xx, yy, w, headH);
    if (moving && !this.settings.quiet) {
      const torsoH = Math.round((legs - neck) * size * body), legH = bodyH - torsoH;
      const stride = Math.round(Math.sin(this.hero.walk * 16) * size * (1 + body * .8));
      g.drawImage(sprite, 0, neck, 48, legs - neck, xx, yy + headH, w, torsoH);
      g.drawImage(sprite, 0, legs, 24, 64 - legs, xx - stride, yy + headH + torsoH, Math.round(w / 2), legH);
      g.drawImage(sprite, 24, legs, 24, 64 - legs, xx + Math.round(w / 2) + stride, yy + headH + torsoH, w - Math.round(w / 2), legH);
    } else g.drawImage(sprite, 0, neck, 48, 64 - neck, xx, yy + headH, w, bodyH);
    const shade = options.still ? 0 : clamp(Math.round(this.heroShade * 24) / 24, 0, .48);
    if (shade) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = shade; box(g, '#204f51', 0, 0, frame.width, frame.height); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
    if (options.prepareOnly) return { sprite:frame, anchor:{x:x-worldX+4,y:y-worldY} };
    target.drawImage(frame, worldX - 4, worldY);
    if (!options.still) this.drawMeadow(target, { x0: worldX, x1: worldX+w, y0: Math.max(worldY+headH, y-this.meadowMaximum()), y1: y+4, footY: y-1 });
  }
  drawMonster(g) {
    const m = this.monster, quiet = this.settings.quiet || this.paused, t = this.ambient;
    const sway = quiet ? 0 : Math.round(Math.sin(t * 2.2) * 1.5), breath = quiet ? 0 : Math.sin(t * 2) > .7 ? 1 : 0;
    const width = 42, height = 36 + breath;
    if (m.calm) { g.globalAlpha = .4; ellipse(g, '#e6f1bd', m.x, m.y - 3, 21, 7); g.globalAlpha = 1; }
    g.drawImage(this.art.monster, Math.round(m.x - width / 2 + sway), Math.round(m.y - height), width, height);
    if (this.hover?.kind === 'monster' || this.selected === 'monster') { line(g, '#f8efb4', [[m.x - 22, m.y + 1], [m.x - 16, m.y + 4], [m.x + 16, m.y + 4], [m.x + 22, m.y + 1]]); box(g, '#f8efb4', m.x - 1, m.y - 45 + sway, 3, 3); box(g, '#f8efb4', m.x, m.y - 42 + sway, 1, 2); }
  }
  drawEffects(g) {
    for (const e of this.effects) { const elapsed = this.time - e.start, p = elapsed / e.life;
      if (e.kind === 'tap' || e.kind === 'select') { const r = 3 + p * 13; g.globalAlpha = (1 - p) * .85; line(g, '#fff9d1', [[e.x - r, e.y], [e.x, e.y - r * .4], [e.x + r, e.y], [e.x, e.y + r * .4], [e.x - r, e.y]], 1); }
      else if (e.kind === 'wash') { for (let j = 0; j < 13; j++) { const k = (elapsed * 2 + j / 13) % 1; g.globalAlpha = 1 - k; box(g, '#c3e8d6', e.x + k * 18, e.y + Math.sin(k * Math.PI) * -10 + j % 3, 2, 2); } }
      else if (e.kind === 'garden-water') { line(g,'#487553',[[452,278],[452,296],[425,303],[e.x,e.y+4]],2); for(let j=0;j<25;j++){const k=(elapsed*.9+j/25)%1;g.globalAlpha=.65*(1-p*.6);box(g,'#c3e6d5',e.x-k*20+(j%3-1)*k*4,e.y-Math.sin(k*Math.PI)*15-k*5,1,2);} }
      else { g.save(); g.beginPath(); g.rect(POOL.x, POOL.y, POOL.w, POOL.h); g.clip();
        for (let i = 0; i < 4; i++) { const r = ((elapsed * 18 + i * 12) % 47); g.globalAlpha = (1 - r / 47) * .65 * (1 - p); line(g, e.kind === 'treat' ? '#e4ffe0' : '#e2f5ce', Array.from({ length: 19 }, (_, j) => [e.x + Math.cos(j / 18 * TAU) * r, e.y + Math.sin(j / 18 * TAU) * r * .48])); }
        if (e.kind === 'treat') for (let j = 0; j < 25; j++) { const a = j * 2.39, r = p * (15 + j % 9 * 3); g.globalAlpha = (1 - p) * .7; box(g, '#eefada', e.x + Math.cos(a) * r, e.y + Math.sin(a) * r * .5, 2, 2); }
        if (e.kind === 'skim') { g.globalAlpha = 1 - p; line(g, '#dddaba', [[e.x - 42, e.y + 8], [e.x + p * 62, e.y - 10]], 2); ellipse(g, '#b6e1cf', e.x + p * 62, e.y - 10, 5, 3); }
        g.restore();
      } g.globalAlpha = 1;
    }
    if (!this.settings.quiet) for (const e of this.leaves) { const age = this.time - e.start, x = e.x + age * e.vx + Math.sin(age * 4 + e.spin) * 4, y = e.y + age * e.vy; g.globalAlpha = Math.min(1, (e.life - age) * 1.8); box(g, e.spin > 3 ? '#d5cf79' : '#9fc777', x, y, age % .4 < .2 ? 3 : 1, 2); } g.globalAlpha = 1;
  }
  drawHouse(g) {
    g.drawImage(this.art.house, 337, 43);
    if (this.door) {
      const points=this.theme.doorShape.map(([x,y])=>[337+x,43+y]);polygon(g,'#293c32',points);
      polygon(g,'#956b41',[quadPoint(points,.8,0),points[1],points[2],quadPoint(points,.8,1)]);
    }
    if (this.settings.mood !== 'dusk') return;
    for (const window of this.theme.windows) {
      const points=window.map(([x,y])=>[337+x,43+y]),[x,y]=quadPoint(points,.5,.5);
      for (let r = 12; r > 0; r -= 4) { g.globalAlpha = .025; ellipse(g, '#ffe6a1', x, y, r, r * .65); }
      // Foreshortened panes follow the wall's slope and preserve the mullions.
      g.globalAlpha=.7;
      for(const [u0,u1] of [[0,.43],[.57,1]]) for(const [v0,v1] of [[0,.43],[.57,1]]) polygon(g,'#f1d68e',[quadPoint(points,u0,v0),quadPoint(points,u1,v0),quadPoint(points,u1,v1),quadPoint(points,u0,v1)]);
    }
    g.globalAlpha = 1;
  }
  lighting(g) {
    const mood = MOODS[this.settings.mood]; g.globalAlpha = mood.alpha; box(g, mood.wash, 0, 0, W, H); g.globalAlpha = 1;
    const sunshine = this.weather ? (1 - this.weather.cloud) * this.weather.sunStrength : 1;
    if (this.settings.mood === 'golden') { g.globalAlpha = .055 * sunshine; polygon(g, '#ffefa2', [[105, 0], [157, 0], [450, H], [367, H]]); g.globalAlpha = .035 * sunshine; polygon(g, '#fff0bb', [[190, 0], [214, 0], [W, 369], [W, H], [470, H]]); }
    if (this.weather) { g.globalAlpha = this.weather.cloud * .11; box(g, '#577985', 0, 0, W, H); if (this.settings.mood !== 'dusk') { g.globalAlpha = Math.abs(this.weather.warmth - .5) * .075; box(g, this.weather.warmth >= .5 ? '#f6d390' : '#87c3cb', 0, 0, W, H); } g.globalAlpha = 1; }
    // Layered, low-opacity edge shading rather than a blurred pixel-art vignette.
    for (let i = 0; i < 5; i++) { g.globalAlpha = .035; const edge = i * 5; box(g, '#214e45', edge, edge, W - edge * 2, 5); box(g, '#214e45', edge, H - edge - 5, W - edge * 2, 5); box(g, '#214e45', edge, edge + 5, 5, H - edge * 2 - 10); box(g, '#214e45', W - edge - 5, edge + 5, 5, H - edge * 2 - 10); } g.globalAlpha = 1;
    if (this.settings.mood === 'dusk') {
      if (!this.settings.quiet) for (let i = 0; i < 13; i++) { const x = 60 + (i * 37) % 410 + Math.sin(this.ambient * .23 + i) * 10, y = 86 + (i * 57) % 265 + Math.cos(this.ambient * .4 + i) * 4; g.globalAlpha = .2 + .6 * Math.max(0, Math.sin(this.ambient * .8 + i)); box(g, '#ebeda1', x, y, 1, 1); } g.globalAlpha = 1;
    }
  }
  drawWeather(g) {
    if (!this.weather?.rain) return;
    const rain = this.weather.rain, t = this.ambient, count = Math.ceil(rain * 48), drift = this.settings.breeze / 100;
    g.globalAlpha = .2 + rain * .15;
    for (let i = 0; i < count; i++) {
      const x = (i * 71 + t * drift * 25) % W, y = (i * 53 + t * 105) % H;
      line(g, '#d3e3d9', [[x, y], [x - 1 - drift * 3, y + 3 + rain * 4]]);
      if (i % 5 === 0) { const px = POOL.x + 9 + i * 23 % (POOL.w - 18), py = POOL.y + 9 + i * 17 % (POOL.h - 18), r = (t * 6 + i) % 6; line(g, '#d6eee0', [[px - r, py], [px, py - r * .3], [px + r, py], [px, py + r * .3], [px - r, py]]); }
    }
    g.globalAlpha = 1;
  }
  draw() {
    if (this.coverFloorDirty) this.rebuildCoverFloor();
    const g = this.g; g.imageSmoothingEnabled = false; g.clearRect(0, 0, W, H); g.drawImage(this.base, 0, 0); g.drawImage(this.lawnSurface, 0, 0); g.drawImage(this.coverFloor, 0, 0); this.drawWater(g); this.drawMeadow(g); this.drawSurfacePassage(g);
    if (!this.art) return;
    const objects = this.activePlants();
    const sg = this.shadowG; sg.clearRect(0, 0, W, H); sg.imageSmoothingEnabled = false;
    objects.forEach(o => this.castShadow(sg, o.kind < 4 ? this.treeFrame(o).shadow : this.art.plantShadows[o.kind], o.x, o.y - 1, o.scale, o.kind < 4 ? .82 : .7));
    this.trimmed.forEach(o => this.castShadow(sg, this.trimmedSprites.get(`${o.form}/${o.variant}`).shadow, o.x, o.y, 1, .65));
    this.castShadow(sg, this.houseShadow, 412, 169, 1, 1); this.castShadow(sg, this.pumpShadow, 431, 294, 1, .8);
    this.shadowSampleG.clearRect(0, 0, W / 4, H / 4); this.shadowSampleG.imageSmoothingEnabled = false; this.shadowSampleG.drawImage(this.shadowLayer, 0, 0, W / 4, H / 4);
    this.shadowPixels = this.shadowSampleG.getImageData(0, 0, W / 4, H / 4).data;
    g.drawImage(this.shadowLayer, 0, 0); this.drawDapple(g, objects.filter(o => o.kind < 4));
    this.heroShadeTarget = (this.sampleShade(this.hero.x, this.hero.y - 2) * .6 + this.sampleShade(this.hero.x - 4, this.hero.y - 2) * .2 + this.sampleShade(this.hero.x + 4, this.hero.y - 2) * .2) * 1.2;
    if(this.settings.shadows){
      const pose=this.drawKeeper(null,this.hero.x,this.hero.y,{prepareOnly:true});
      this.keeperShadow ??= surface(pose.sprite.width,pose.sprite.height);
      if(this.keeperShadow.width!==pose.sprite.width||this.keeperShadow.height!==pose.sprite.height){this.keeperShadow.width=pose.sprite.width;this.keeperShadow.height=pose.sprite.height;}
      const kg=this.keeperShadow.getContext('2d');kg.globalCompositeOperation='source-over';kg.clearRect(0,0,this.keeperShadow.width,this.keeperShadow.height);kg.drawImage(pose.sprite,0,0);kg.globalCompositeOperation='source-in';box(kg,'#163f37',0,0,this.keeperShadow.width,this.keeperShadow.height);
      this.castShadow(g,this.keeperShadow,this.hero.x,this.hero.y-1,1,.75,pose.anchor);
    }
    if (this.settings.shadows) { const bob = this.hero.path.length ? Math.sin(this.hero.walk * 16) * .45 : 0; g.globalAlpha = .28; ellipse(g, '#254e43', this.hero.x + 2, this.hero.y - 1, (8 + bob) * this.settings.keeper / 72, 3); ellipse(g, '#335f43', this.monster.x + 2, this.monster.y - 1, 15, 4); g.globalAlpha = 1; }
    const layers = [...objects.map(o => ({ y: o.y, draw: () => this.drawPlant(g, o) })),
      ...this.activeGrass().map(tuft => ({ y: tuft.y, draw: () => this.drawGrassTuft(g, tuft) })),
      ...this.trimmed.map(o => ({ y: o.y, draw: () => this.drawTrimmed(g, o) })),
      { y: 169, draw: () => this.drawHouse(g) },
      { y: 294, draw: () => g.drawImage(this.art.pump, 394, 211) },
      { y: this.hero.y, draw: () => this.drawKeeper(g) }, { y: this.monster.y, draw: () => this.drawMonster(g) },
      { y: 270, draw: () => { // A modest timber bench at the terrace edge.
        box(g, '#739176', 352, 258, 12, 18); box(g, '#a87d52', 351, 246, 12, 25); box(g, '#dfb879', 351, 247, 4, 21); box(g, '#cc9e62', 357, 247, 4, 21); box(g, '#7d6447', 351, 270, 3, 4); box(g, '#7d6447', 360, 270, 3, 4);
      } },
    ]; layers.sort((a, b) => a.y - b.y).forEach(o => o.draw());
    this.drawEffects(g); this.lighting(g); this.drawWeather(g);
    if (this.hero.path.length) { const end = this.hero.path.at(-1); g.globalAlpha = .6; line(g, '#fff6c5', [[end.x - 5, end.y], [end.x, end.y - 2], [end.x + 5, end.y], [end.x, end.y + 2], [end.x - 5, end.y]]); g.globalAlpha = 1; }
    if (this.settings.grid) { g.globalAlpha = .24; for (let x = 0; x <= W; x += 32) box(g, '#fff9cb', x, 0, 1, H); for (let y = 0; y <= H; y += 32) box(g, '#fff9cb', 0, y, W, 1); g.globalAlpha = 1; }
  }
  drawBattle(canvas, battle, time) {
    if (!this.art) return; const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false;
    const w = canvas.width, h = canvas.height;
    box(g, '#cee0b0', 0, 0, w, h); box(g, '#b8d39e', 0, 78, w, h - 78); box(g, '#c6dba2', 0, 135, w, h - 135);
    for (let y = 0; y < 120; y += 6) { g.globalAlpha = .06; box(g, '#f4f2c7', 0, y, w, 3); } g.globalAlpha = 1;
    // A clearing framed by distant, less saturated foliage.
    const dominant = forestProfile(this.gardenId).dominant, mature = this.art.trees[dominant].large, young = this.art.trees[dominant].medium;
    g.globalAlpha = .64; g.drawImage(mature, -18, 2, Math.round(mature.width / mature.height * 158), 158); g.drawImage(mature, 447, -22, Math.round(mature.width / mature.height * 180), 180);
    g.globalAlpha = .35; g.drawImage(young, 285, -39, Math.round(young.width / young.height * 146), 146); g.globalAlpha = 1;
    polygon(g, '#d8d4a1', [[0, 164], [168, 149], [249, 108], [405, 115], [512, 148], [512, 264], [0, 264]]);
    for (let i = 0; i < 70; i++) { const x = i * 43 % w, y = 154 + i * 29 % 110; box(g, i % 3 ? '#c3c99a' : '#e8dfb0', x, y, 2, 1); }
    ellipse(g, '#a1b78d', 368, 132, 71, 15); ellipse(g, '#bdd29d', 368, 128, 66, 14); ellipse(g, '#9db187', 119, 236, 88, 20); ellipse(g, '#b4c693', 116, 232, 82, 18);
    const phase = battle.phase, p = battle.elapsed, cast = phase === 'cast', foe = phase === 'reply', hit = phase === 'hit', impact = phase === 'impact';
    const enemyX = 368 + (foe ? -Math.sin(p / .48 * Math.PI) * 15 : impact && !this.settings.quiet ? Math.sin(p * 60) * 3 : 0);
    const enemyY = 133 + (this.settings.quiet ? 0 : Math.sin(time * 2) * 2);
    const dead = battle.outcome === 'win'; g.globalAlpha = dead ? .4 : impact ? .68 : 1; g.drawImage(this.art.monster, Math.round(enemyX - 47), Math.round(enemyY - 80), 94, 80); g.globalAlpha = 1;
    const heroX = 119 + (cast ? Math.sin(p / .3 * Math.PI) * 13 : hit && !this.settings.quiet ? Math.sin(p * 55) * 3 : 0);
    g.globalAlpha = battle.outcome === 'lose' ? .5 : hit ? .7 : 1; this.drawKeeper(g, heroX, 239, { dir: 'north', scale: 1.7, still: true }); g.globalAlpha = 1;
    if (cast || impact) { const progress = cast ? p / .3 : 1, color = MOVES[battle.move].color, x = 148 + (enemyX - 148) * progress, y = 176 + (92 - 176) * progress;
      if (battle.move === 'burst') { for (let i = 0; i < 16; i++) { const a = i * 2.39, r = impact ? 9 + p * 70 : 5 + (i % 4) * 2; g.globalAlpha = impact ? 1 - p / .4 : .8; box(g, color, x + Math.cos(a) * r, y + Math.sin(a) * r * .7, 3, 3); } }
      else if (battle.move === 'robot') { box(g, '#426877', x - 9, y - 4, 18, 11); box(g, '#aac9c0', x - 6, y - 7, 12, 9); box(g, '#42777b', x - 4, y - 6, 8, 2); box(g, '#416051', x - 11, y + 1, 4, 7); box(g, '#416051', x + 7, y + 1, 4, 7); }
      else { const radius = impact ? 22 + p * 15 : 12; g.globalAlpha = impact ? 1 - p / .4 : .9; line(g, color, Array.from({ length: 9 }, (_, i) => { const a = -.7 + i / 8 * 1.6; return [x + Math.cos(a) * radius, y + Math.sin(a) * radius]; }), 4); } g.globalAlpha = 1;
    }
    if (foe || hit) { const progress = foe ? p / .48 : 1, x = enemyX + (heroX - enemyX) * progress, y = 104 + (197 - 104) * progress; for (let i = 0; i < 8; i++) box(g, i % 2 ? '#548760' : '#86b775', x + Math.sin(i * 1.8 + time * 5) * 10, y + Math.cos(i * 1.8) * 8, 4, 2); }
    if (battle.outcome === 'win') for (let i = 0; i < 9; i++) { const x = 275 + i * 23, y = 60 + Math.sin(time + i) * 16; box(g, '#fbebad', x, y, 2, 5); box(g, '#fbebad', x - 2, y + 2, 6, 1); }
  }
  snapshot() {
    const grass = this.activeGrass(), patches = this.groundCover.patches.filter(p => p.threshold <= this.settings.lushness);
    return { hero: { x: this.hero.x, y: this.hero.y, moving: this.hero.path.length > 0, shade: +this.heroShade.toFixed(3) }, monster: { ...this.monster }, waterState: this.waterState, selected: this.selected, settings: { ...this.settings }, gardenId: this.gardenId, forest: this.forestSummary(), trimmedCount: this.trimmed.length,
      zoneArt: { zone: this.theme.id, colour: this.theme.colour, house: zoneAsset(this.theme.id, 'house'), pump: zoneAsset(this.theme.id, 'pump'), grass: zoneAsset(this.theme.id, grassStage(this.grassHeight)), doorOpen: this.door > 0, pumping: this.pumping > 0 },
      meadow: { cells: this.meadow.length, tileSize:32, maximumHeight: this.meadowMaximum(), growthHeight:meadowHeight(this.grassHeight,'wild',0,this.meadowMaximum()), keeperDepth:lawnAt(this.hero.x,this.hero.y)?meadowHeight(this.grassHeight,plantingZone(this.hero.x,this.hero.y),0,this.meadowMaximum()):0, accentClumps:grass.length, bentCells:this.meadow.filter(c=>Math.abs(c.bend)>.15).length, flattenedCells:this.meadow.filter(c=>c.flatten>.05).length },
      passage: { bentTufts: grass.filter(t => Math.abs(t.bend || 0) > .15).length, flattenedTufts: grass.filter(t => (t.flatten || 0) > .05).length, footprints: this.footprints.length },
      groundCover: { ...this.groundCover.stats, activePatches: patches.length, coveragePercent: Math.round(patches.reduce((n, p) => n + p.weight, 0) / this.groundCover.patches.reduce((n, p) => n + p.weight, 0) * 100) },
      grass: { count: grass.length, sizes: [0, 1, 2, 3].map(size => grass.filter(t => t.size === size).length), zones: { wild: grass.filter(t => t.zone === 'wild').length, lawn: grass.filter(t => t.zone === 'lawn').length }, cycle: this.cycle }, loaded: !!this.art };
  }
  dispose() { this.disposed = true; cancelAnimationFrame(this.raf); this.canvas.removeEventListener('click', this.onClick); this.canvas.removeEventListener('pointermove', this.onMove); this.canvas.removeEventListener('keydown', this.onKey); }
}
