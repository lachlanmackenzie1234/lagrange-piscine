export const WORLD = { width: 512, height: 384, tile: 32, nav: 16 };
export const DEFAULTS = { mood: 'golden', lushness: 72, breeze: 35, water: 55, sun: 42, keeper: 72, body: 50, treeBias: 70, poolState: 'clear', shadows: true, grid: false, quiet: false };
export function seeded(seed = 42) { let n = seed >>> 0; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }
export function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
export function inside(x, y, r, pad = 0) { return x >= r.x - pad && y >= r.y - pad && x < r.x + r.w + pad && y < r.y + r.h + pad; }
export function findPath(grid, from, to) {
  const h = grid.length, w = grid[0]?.length || 0;
  const valid = ([x, y]) => x >= 0 && y >= 0 && x < w && y < h;
  if (!valid(from) || !valid(to) || grid[to[1]][to[0]]) return [];
  const key = ([x, y]) => y * w + x, start = key(from), target = key(to);
  const prev = new Map([[start, null]]), queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i], k = key(cell);
    if (k === target) { const route = []; let p = k; while (p !== null) { route.push([p % w, Math.floor(p / w)]); p = prev.get(p); } return route.reverse(); }
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const next = [cell[0] + dx, cell[1] + dy]; if (valid(next) && !grid[next[1]][next[0]] && !prev.has(key(next))) { prev.set(key(next), k); queue.push(next); } }
  }
  return [];
}
export function reachablePath(grid, from, target) {
  const candidates = [];
  for (let y = 0; y < grid.length; y++) for (let x = 0; x < grid[0].length; x++) if (!grid[y][x]) candidates.push({ cell: [x, y], d: Math.hypot(x - target[0], y - target[1]) });
  candidates.sort((a, b) => a.d - b.d);
  for (const entry of candidates.slice(0, 24)) { const route = findPath(grid, from, entry.cell); if (route.length) return route; }
  return [];
}
export const MOVES = { net: { name: 'Skimmer sweep', power: 11, color: '#d8e7a0' }, brush: { name: 'Brushing arc', power: 17, color: '#f5d08c' }, robot: { name: 'Robot rush', power: 21, color: '#91ccdf' }, burst: { name: 'Chlorine burst', power: 28, color: '#bcf2e3' } };
const DURATIONS = { cast: .3, impact: .36, settle: .38, reply: .48, hit: .32, recover: .42 };
export class TurnBattle {
  constructor(onChange = () => {}) { this.onChange = onChange; this.hero = 72; this.enemy = 84; this.phase = 'choice'; this.elapsed = 0; this.turn = 1; this.move = null; this.outcome = null; this.message = 'A restless Algue verte emerges. What will you do?'; }
  choose(id) { if (this.phase !== 'choice' || !MOVES[id]) return false; this.move = id; this.message = `The keeper uses ${MOVES[id].name.toLowerCase()}!`; this.phase = 'cast'; this.elapsed = 0; this.onChange(this); return true; }
  tick(dt) {
    if (['choice', 'done', 'cancelled'].includes(this.phase)) return;
    this.elapsed += Math.max(0, dt);
    while (DURATIONS[this.phase] && this.elapsed >= DURATIONS[this.phase]) {
      this.elapsed -= DURATIONS[this.phase];
      if (this.phase === 'cast') { this.enemy = Math.max(0, this.enemy - MOVES[this.move].power); this.phase = 'impact'; }
      else if (this.phase === 'impact') this.phase = 'settle';
      else if (this.phase === 'settle') { if (!this.enemy) { this.finish('win'); return; } this.phase = 'reply'; this.message = 'Algue verte answers with a burst of overgrowth!'; }
      else if (this.phase === 'reply') { this.hero = Math.max(0, this.hero - 13); this.phase = 'hit'; }
      else if (this.phase === 'hit') this.phase = 'recover';
      else if (this.phase === 'recover') { if (!this.hero) { this.finish('lose'); return; } this.turn++; this.phase = 'choice'; this.elapsed = 0; this.message = 'The garden holds its breath. Your next move?'; }
      this.onChange(this);
    }
  }
  finish(outcome) { this.outcome = outcome; this.phase = 'done'; this.elapsed = 0; this.message = outcome === 'win' ? 'The algae settles. A little peace returns to the garden.' : 'Time to catch your breath. The garden will be here when you’re ready.'; this.onChange(this); }
  cancel() { this.phase = 'cancelled'; this.elapsed = 0; }
}
