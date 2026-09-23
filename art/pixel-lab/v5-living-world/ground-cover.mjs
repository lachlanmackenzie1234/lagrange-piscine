import { seeded } from './engine.mjs';

// Equal-area samples make this a ground-coverage mix, not a comparison between
// the number of tiny blades and the number of large rock sprites.
export function createGroundCover({ width, height, seed = 9827, eligible, rockEligible = eligible, zoneAt = () => 'wild' }) {
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
