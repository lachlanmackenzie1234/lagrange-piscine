/* Visual ecology from Pixel Lab v5. No maintenance or player-state writes.
 * Weekly mowing offsets are illustrative per-pool art cycles, not real schedules.
 */
const QuestEcology = (() => {
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const seeded = seed => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; };

const TREE_SPECIES = {
  oak: { name: 'Chêne', plural: 'Chênes', size: [108, 120], sway: .8, rate: .63, bendTo: .66, column: 0 },
  pine: { name: 'Pin maritime', plural: 'Pins maritimes', size: [78, 137], sway: 1.05, rate: .78, bendTo: .68, column: 1 },
  umbrella: { name: 'Pin parasol', plural: 'Pins parasols', size: [116, 116], sway: .65, rate: .57, bendTo: .62, column: 2 },
  holm: { name: 'Chêne vert', plural: 'Chênes verts', size: [100, 111], sway: .72, rate: .69, bendTo: .68, column: 3 },
  birch: { name: 'Bouleau', plural: 'Bouleaux', size: [82, 132], sway: 1.5, rate: 1.07, bendTo: .87, column: 4 },
};

const FORESTS = {
  GP: { dominant: 'oak', rest: { pine: 8, umbrella: 4, holm: 12, birch: 6 } },
  EPP: { dominant: 'pine', rest: { oak: 5, umbrella: 15, holm: 8, birch: 2 } },
  AG: { dominant: 'umbrella', rest: { oak: 6, pine: 14, holm: 7, birch: 3 } },
  EP: { dominant: 'holm', rest: { oak: 12, pine: 8, umbrella: 6, birch: 4 } },
  EC: { dominant: 'birch', rest: { oak: 10, pine: 8, umbrella: 4, holm: 8 } },
};

const WATER_LOOKS = {
  clear: { label: 'Clear', bands: ['#64c0c2', '#6bc8ca', '#70ced0', '#82d9d5', '#94e2d8'], deep: '#347a8d', edge: '#478f9b', shine: '#f1ffe0', caustics: 52, clarity: 1, speed: 1 },
  treated: { label: 'Treated', bands: ['#65c6b5', '#72cbbd', '#82d3c7', '#94dfd1', '#a7e7d6'], deep: '#3b8781', edge: '#56a99d', shine: '#eafce5', caustics: 38, clarity: .7, speed: .85 },
  algae: { label: 'Algae', bands: ['#668a54', '#789859', '#85a35f', '#95ae68', '#a3b875'], deep: '#365c45', edge: '#50774b', shine: '#d0dea6', caustics: 27, clarity: .42, speed: .68 },
  murky: { label: 'Murky', bands: ['#344f43', '#3e5d49', '#486952', '#54775a', '#658465'], deep: '#213b35', edge: '#355344', shine: '#9fb8a0', caustics: 14, clarity: .2, speed: .5 },
};

function hashIdentity(value) { let h = 2166136261; for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function forestProfile(gardenId) { return FORESTS[gardenId.split('-')[0]] || FORESTS.EC; }

// Allocate an actual quota, then shuffle positions. Small maps visibly retain
// the requested majority instead of occasionally rolling an unrelated mix.
function treeRoster(gardenId, count, share = 70) {
  const profile = forestProfile(gardenId), dominance = clamp(share, 40, 100);
  const remainingWeight = Object.values(profile.rest).reduce((a, b) => a + b, 0);
  const weights = Object.keys(TREE_SPECIES).map(id => ({ id, weight: id === profile.dominant ? dominance : (100 - dominance) * (profile.rest[id] || 0) / remainingWeight }));
  const quotas = weights.map(x => ({ ...x, exact: x.weight / 100 * count, count: Math.floor(x.weight / 100 * count) }));
  let remaining = count - quotas.reduce((n, x) => n + x.count, 0);
  const ranked = quotas.slice().sort((a, b) => (b.exact - b.count) - (a.exact - a.count));
  for (let i = 0; remaining > 0; i++, remaining--) ranked[i % ranked.length].count++;
  const roster = quotas.flatMap(q => Array(q.count).fill(q.id)), random = seeded(hashIdentity(gardenId));
  for (let i = roster.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [roster[i], roster[j]] = [roster[j], roster[i]]; }
  return roster;
}

function canopyDisplacement(tree, time, wind, quiet = false) {
  if (quiet) return 0;
  const species = TREE_SPECIES[tree.species] || TREE_SPECIES.oak;
  const breeze = clamp(wind, 0, 1), amplitude = breeze === 0 ? 0 : (.28 + breeze * 2.7) * species.sway;
  const gust = .75 + Math.sin(time * .31 + tree.x * .008 + tree.y * .003) * .25;
  const wave = Math.sin(time * species.rate + tree.phase) + Math.sin(time * species.rate * .53 + tree.phase * .8) * .25;
  const rustle = tree.rustle > 0 ? Math.sin(tree.rustle * 19) * tree.rustle * 1.9 : 0;
  return clamp(Math.round(wave * amplitude * gust + rustle), -5, 5);
}

function passageImpulse(tuft, hero) {
  const dx = tuft.x - hero.x, dy = (tuft.y - hero.y) * 1.25;
  const radius = 10 + tuft.size * 2.3, distance = Math.hypot(dx, dy), influence = clamp(1 - distance / radius, 0, 1);
  const vx = clamp((hero.vx || 0) / 58, -1, 1), vy = clamp((hero.vy || 0) / 58, -1, 1);
  const speed = Math.min(1, Math.hypot(vx, vy));
  return { bend: influence * (1.6 + tuft.size) * (dx / Math.max(3, distance) * .75 + vx * .9), pressure: influence * (.5 + speed * .5) };
}

// A brief spring-back and a slower flattened wake. These are ephemeral visual
// states; they never affect the seven-day cut date or the garden's placement.
function advanceGrassMemory(state, impulse, dt, quiet = false) {
  if (quiet) { state.bend = 0; state.bendVelocity = 0; state.flatten = 0; return state; }
  const step = clamp(dt, 0, .05);
  state.bend ??= 0; state.bendVelocity ??= 0; state.flatten ??= 0;
  state.bendVelocity += ((impulse.bend - state.bend) * 82 - state.bendVelocity * 17) * step;
  state.bend = clamp(state.bend + state.bendVelocity * step, -8, 8);
  const rate = impulse.pressure > state.flatten ? 13 : 1.8;
  state.flatten += (impulse.pressure - state.flatten) * (1 - Math.exp(-rate * step));
  return state;
}


// Equal-area samples make this a ground-coverage mix, not a comparison between
// the number of tiny blades and the number of large rock sprites.
function createGroundCover({ width, height, seed = 9827, eligible, rockEligible = eligible, zoneAt = () => 'wild' }) {
  const random = seeded(seed), patches = [], tile = 32;
  for (let y = 0; y < height; y += tile) for (let x = 0; x < width; x += tile) {
    const samples = [];
    for (const dy of [4, 12, 20, 28]) for (const dx of [4, 12, 20, 28]) if (eligible(x + dx, y + dy)) samples.push([x + dx, y + dy]);
    if (!samples.length) continue;
    const cx = x + 16, cy = y + 16;
    const canRock = samples.length >= 14 && [[0, 0], [-14, -8], [14, -8], [-14, 8], [14, 8]].every(([dx, dy]) => rockEligible(cx + dx, cy + dy));
    patches.push({ id: `cover-${x}-${y}`, x, y, cx, cy, samples, weight: samples.length, kind: 'grass', canRock, rockRank: random(), rank: random(), tint: Math.floor(random() * 3) });
  }
  const area = patches.reduce((n, p) => n + p.weight, 0), target = area * .1;
  let rockArea = 0;
  for (const patch of patches.filter(p => p.canRock).sort((a, b) => a.rockRank - b.rockRank)) {
    if (Math.abs(target - rockArea - patch.weight) < Math.abs(target - rockArea)) { patch.kind = 'rock'; rockArea += patch.weight; }
  }
  patches.sort((a, b) => a.rank - b.rank);
  patches.forEach((p, i) => p.threshold = (i + 1) / patches.length * 100);
  const grass = [], rocks = [];
  for (const patch of patches) {
    if (patch.kind === 'rock') {
      rocks.push({ id: patch.id, kind: 6, groundCover: true, x: patch.cx, y: patch.cy + 5, scale: .76 + random() * .14, threshold: patch.threshold, phase: random() * Math.PI * 2, rustle: 0 });
      continue;
    }
    let made = 0;
    // Overlapping tall tufts give every planted patch a continuous canopy.
    for (const dy of [-7, 7, 18]) for (const dx of [-10, 7]) {
      const x = Math.round(patch.cx + dx + (random() - .5) * 4), y = Math.round(patch.cy + dy + (random() - .5) * 3);
      if (!eligible(x, y) || !eligible(x - 3, y) || !eligible(x + 3, y)) continue;
      grass.push({ x, y, size: random() < .22 ? 2 : 3, zone: zoneAt(x, y), variant: Math.floor(random() * 3), phase: random() * Math.PI * 2, threshold: patch.threshold, patchId: patch.id });
      made++;
    }
    if (!made) { const [x, y] = patch.samples[Math.floor(patch.samples.length / 2)]; grass.push({ x, y, size: 2, zone: zoneAt(x, y), variant: Math.floor(random() * 3), phase: random() * Math.PI * 2, threshold: patch.threshold, patchId: patch.id }); }
  }
  return { patches, grass, rocks, stats: { patchCount: patches.length, grassPatches: patches.filter(p => p.kind === 'grass').length, rockPatches: rocks.length, grassPercent: area ? Math.round((1 - rockArea / area) * 100) : 0, rockPercent: area ? Math.round(rockArea / area * 100) : 0 } };
}

const DAY = 86400000, MONDAY = Date.UTC(2026, 0, 5) / DAY;
const mod = (n, divisor) => ((n % divisor) + divisor) % divisor;
const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;

function parisClock(instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const p = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour + +p.minute / 60, time: `${p.hour}:${p.minute}` };
}
function dayNumber(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const n = Date.parse(date + 'T00:00:00Z');
  return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === date ? n / DAY : null;
}
function addDays(date, amount) { const n = dayNumber(date); return n === null ? null : new Date((n + amount) * DAY).toISOString().slice(0, 10); }

// A small, independent clock. These are sample weekly cut days, not real
// gardener schedules. A recorded visit becomes that garden's new cycle anchor.
function gardenCycle(gardenId, date, cuts = {}) {
  const garden = { id: gardenId, cutDay: hashIdentity(gardenId) % 7 };
  const today = dayNumber(date);
  if (today === null) throw new Error('A valid garden date is required');
  const recorded = dayNumber(cuts[garden.id]);
  const anchored = recorded !== null && recorded <= today;
  const anchor = anchored ? recorded : MONDAY + garden.cutDay;
  const age = mod(today - anchor, 7), growth = age / 6;
  return { gardenId: garden.id, age, growth, height: .18 + .82 * growth,
    lastCut: new Date((today - age) * DAY).toISOString().slice(0, 10),
    nextCut: new Date((today - age + 7) * DAY).toISOString().slice(0, 10),
    source: anchored ? 'gardener-visit' : 'sample-schedule' };
}
function overviewSnapshot(cache) {
  const c = cache?.current;
  if (!c || typeof c !== 'object') return null;
  const snapshot = { at: typeof cache.at === 'string' ? cache.at : null,
    temp: number(c.temperature_2m), wind: number(c.wind_speed_10m), uv: number(c.uv_index),
    precip: number(c.precipitation), code: number(c.weather_code) };
  return [snapshot.temp, snapshot.wind, snapshot.uv, snapshot.precip, snapshot.code].some(v => v !== null) ? snapshot : null;
}

// Normalize the existing Overview values into the renderer's 0–100 controls.
// Missing fields stay missing; a reported zero remains a genuine zero.
function weatherAppearance(snapshot, instant = new Date()) {
  if (!snapshot) return null;
  const clock = parisClock(instant), patch = {};
  patch.mood = clock.hour < 7 || clock.hour >= 20 ? 'dusk' : clock.hour < 9 || clock.hour >= 17 ? 'golden' : 'day';
  patch.sun = Math.round(clamp(165 - (clock.hour - 7) / 13 * 150, 15, 165));
  if (snapshot.wind !== null) {
    patch.breeze = Math.round(clamp(snapshot.wind / 60, 0, 1) * 100);
    patch.water = Math.round(clamp(30 + patch.breeze * .6 + (snapshot.precip === null ? 0 : clamp(snapshot.precip / 4, 0, 1) * 10), 0, 100));
  }
  const code = snapshot.code, rain = snapshot.precip === null ? 0 : clamp(snapshot.precip / 4, 0, 1);
  const cloud = code === null ? 0 : code === 0 ? .03 : code === 1 ? .2 : code === 2 ? .55 : .85;
  return { patch, clock, visual: { cloud: Math.max(cloud, rain * .9), rain,
    warmth: snapshot.temp === null ? .5 : clamp((snapshot.temp - 5) / 30, 0, 1),
    sunStrength: snapshot.uv === null ? .7 : clamp(.35 + snapshot.uv / 11 * .65, .35, 1) } };
}


function currentAppearance(now = new Date()) {
  let value = typeof window === 'undefined' ? null : window.Weather?.data;
  if (!value?.current && typeof localStorage !== 'undefined') { try { value = JSON.parse(localStorage.getItem('lagrange-piscine.weather') || 'null'); } catch {} }
  return weatherAppearance(overviewSnapshot(value) || { temp: null, wind: null, uv: null, precip: null, code: null }, now);
}
return { TREE_SPECIES, FORESTS, WATER_LOOKS, hashIdentity, forestProfile, treeRoster, canopyDisplacement, passageImpulse, advanceGrassMemory, createGroundCover, parisClock, dayNumber, addDays, gardenCycle, overviewSnapshot, weatherAppearance, currentAppearance };
})();
if (typeof window !== 'undefined') window.QuestEcology = QuestEcology;
if (typeof module !== 'undefined') module.exports = QuestEcology;
