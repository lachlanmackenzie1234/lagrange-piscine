import { seeded, clamp } from './engine.mjs';

export const TREE_SPECIES = {
  oak: { name: 'Chêne', plural: 'Chênes', size: [108, 120], sway: .8, rate: .63, bendTo: .66, column: 0 },
  pine: { name: 'Pin maritime', plural: 'Pins maritimes', size: [78, 137], sway: 1.05, rate: .78, bendTo: .68, column: 1 },
  umbrella: { name: 'Pin parasol', plural: 'Pins parasols', size: [116, 116], sway: .65, rate: .57, bendTo: .62, column: 2 },
  holm: { name: 'Chêne vert', plural: 'Chênes verts', size: [100, 111], sway: .72, rate: .69, bendTo: .68, column: 3 },
  birch: { name: 'Bouleau', plural: 'Bouleaux', size: [82, 132], sway: 1.5, rate: 1.07, bendTo: .87, column: 4 },
};

export const FORESTS = {
  GP: { dominant: 'oak', rest: { pine: 8, umbrella: 4, holm: 12, birch: 6 } },
  EPP: { dominant: 'pine', rest: { oak: 5, umbrella: 15, holm: 8, birch: 2 } },
  AG: { dominant: 'umbrella', rest: { oak: 6, pine: 14, holm: 7, birch: 3 } },
  EP: { dominant: 'holm', rest: { oak: 12, pine: 8, umbrella: 6, birch: 4 } },
  EC: { dominant: 'birch', rest: { oak: 10, pine: 8, umbrella: 4, holm: 8 } },
};

export const WATER_LOOKS = {
  clear: { label: 'Clear', bands: ['#64c0c2', '#6bc8ca', '#70ced0', '#82d9d5', '#94e2d8'], deep: '#347a8d', edge: '#478f9b', shine: '#f1ffe0', caustics: 52, clarity: 1, speed: 1 },
  treated: { label: 'Treated', bands: ['#65c6b5', '#72cbbd', '#82d3c7', '#94dfd1', '#a7e7d6'], deep: '#3b8781', edge: '#56a99d', shine: '#eafce5', caustics: 38, clarity: .7, speed: .85 },
  algae: { label: 'Algae', bands: ['#668a54', '#789859', '#85a35f', '#95ae68', '#a3b875'], deep: '#365c45', edge: '#50774b', shine: '#d0dea6', caustics: 27, clarity: .42, speed: .68 },
  murky: { label: 'Murky', bands: ['#344f43', '#3e5d49', '#486952', '#54775a', '#658465'], deep: '#213b35', edge: '#355344', shine: '#9fb8a0', caustics: 14, clarity: .2, speed: .5 },
};

export function hashIdentity(value) { let h = 2166136261; for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
export function forestProfile(gardenId) { return FORESTS[gardenId.split('-')[0]] || FORESTS.EC; }

// Allocate an actual quota, then shuffle positions. Small maps visibly retain
// the requested majority instead of occasionally rolling an unrelated mix.
export function treeRoster(gardenId, count, share = 70) {
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

export function canopyDisplacement(tree, time, wind, quiet = false) {
  if (quiet) return 0;
  const species = TREE_SPECIES[tree.species] || TREE_SPECIES.oak;
  const breeze = clamp(wind, 0, 1), amplitude = breeze === 0 ? 0 : (.28 + breeze * 2.7) * species.sway;
  const gust = .75 + Math.sin(time * .31 + tree.x * .008 + tree.y * .003) * .25;
  const wave = Math.sin(time * species.rate + tree.phase) + Math.sin(time * species.rate * .53 + tree.phase * .8) * .25;
  const rustle = tree.rustle > 0 ? Math.sin(tree.rustle * 19) * tree.rustle * 1.9 : 0;
  return clamp(Math.round(wave * amplitude * gust + rustle), -5, 5);
}

export function passageImpulse(tuft, hero) {
  const dx = tuft.x - hero.x, dy = (tuft.y - hero.y) * 1.25;
  const radius = 10 + tuft.size * 2.3, distance = Math.hypot(dx, dy), influence = clamp(1 - distance / radius, 0, 1);
  const vx = clamp((hero.vx || 0) / 58, -1, 1), vy = clamp((hero.vy || 0) / 58, -1, 1);
  const speed = Math.min(1, Math.hypot(vx, vy));
  return { bend: influence * (1.6 + tuft.size) * (dx / Math.max(3, distance) * .75 + vx * .9), pressure: influence * (.5 + speed * .5) };
}

// A brief spring-back and a slower flattened wake. These are ephemeral visual
// states; they never affect the seven-day cut date or the garden's placement.
export function advanceGrassMemory(state, impulse, dt, quiet = false) {
  if (quiet) { state.bend = 0; state.bendVelocity = 0; state.flatten = 0; return state; }
  const step = clamp(dt, 0, .05);
  state.bend ??= 0; state.bendVelocity ??= 0; state.flatten ??= 0;
  state.bendVelocity += ((impulse.bend - state.bend) * 82 - state.bendVelocity * 17) * step;
  state.bend = clamp(state.bend + state.bendVelocity * step, -8, 8);
  const rate = impulse.pressure > state.flatten ? 13 : 1.8;
  state.flatten += (impulse.pressure - state.flatten) * (1 - Math.exp(-rate * step));
  return state;
}
