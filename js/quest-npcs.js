/* Local ambient routines. Positions never enter player profiles or maintenance. */
const QuestNPCs = (() => {
  const point = cell => [cell[0] * 16 + 8, cell[1] * 16 + 15];
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  class Routine {
    constructor(layout, route) {
      this.layout = layout; this.route = route; this.time = 0;
      this.people = layout.npcs.map((n, i) => ({ ...n, home: n.cell.slice(), cell: n.cell.slice(), x: point(n.cell)[0], y: point(n.cell)[1],
        direction: n.direction || 'south', homeDirection: n.direction || 'south', path: [], progress: 0, moving: false, seated: !!n.seat, seatBlend: n.seat ? 1 : 0, wait: 5 + i * 4, returning: false, visits: 0, walkTime: 0 }));
    }
    get(id) { return this.people.find(p => p.id === id); }
    get moving() { return this.people.some(p => p.moving); }
    grid(except, heroCells = []) {
      const grid = this.layout.coll.map(row => row.slice());
      // NPCs can get out of, and return to, their reserved home/chair cells.
      if (except) grid[except.home[1]][except.home[0]] = 0;
      const block = c => { if (grid[c[1]]?.[c[0]] != null) grid[c[1]][c[0]] = 1; };
      this.people.forEach(p => { if (p !== except) { block(p.cell); if (p.path[1]) block(p.path[1]); } });
      heroCells.forEach(block); return grid;
    }
    playerGrid() {
      const grid = this.layout.coll.map(row => row.slice());
      this.people.forEach(p => { grid[p.cell[1]][p.cell[0]] = 1; if (p.path[1]) grid[p.path[1][1]][p.path[1][0]] = 1; });
      return grid;
    }
    update(dt, heroCells = [], pausedId = null, quiet = false) {
      this.time += dt;
      for (const p of this.people) {
        if (p.id === pausedId || quiet) { p.moving = false; continue; }
        if (p.path.length > 1) {
          if (p.seatBlend > 0) { p.seatBlend = Math.max(0, p.seatBlend - dt / .3); p.moving = true; continue; }
          const next = p.path[1], grid = this.grid(p, heroCells);
          if (grid[next[1]][next[0]]) { p.moving = false; p.blockedFor = (p.blockedFor || 0) + dt;
            if (p.blockedFor > 2 && !p.progress) { p.path = []; p.wait = 1; p.returning = !same(p.cell, p.home); } continue;
          }
          p.blockedFor = 0;
          p.moving = true; p.seated = false; p.walkTime += dt * 1000;
          const start = point(p.cell), target = point(next);
          p.direction = target[0] === start[0] ? target[1] > start[1] ? 'south' : 'north' : target[0] > start[0] ? 'east' : 'west';
          p.progress = Math.min(1, p.progress + dt / .65);
          p.x = start[0] + (target[0] - start[0]) * p.progress; p.y = start[1] + (target[1] - start[1]) * p.progress;
          if (p.progress >= 1) {
            p.cell = next.slice(); p.path.shift(); p.progress = 0;
            if (p.path.length === 1) { p.path = []; p.moving = false; p.wait = 5 + (p.visits * 7 + p.id.length * 3) % 12;
              if (same(p.cell, p.home)) { p.seated = !!p.seat; p.direction = p.homeDirection; }
            }
          }
          continue;
        }
        if (p.seated && p.seatBlend < 1) { p.seatBlend = Math.min(1, p.seatBlend + dt / .3); p.moving = true; continue; }
        p.moving = false; p.wait -= dt; if (p.wait > 0) continue;
        const stops = p.stroll || [];
        const destination = p.returning || !stops.length ? p.home : stops[p.visits % stops.length];
        const path = this.route(this.grid(p, heroCells), p.cell, destination);
        if (path.length > 1 && same(path.at(-1), destination)) { p.path = path; p.progress = 0; p.returning = !p.returning; p.visits++; }
        else { if (same(p.cell, p.home)) p.returning = false; p.wait = 2; }
      }
    }
    pose(id) {
      const p = this.get(id); if (!p) return null;
      return { ...p, drawX: p.x + p.seatBlend * (p.seatOffset?.[0] || 0) / 2, drawY: p.y + p.seatBlend * (p.seatOffset?.[1] || 0) / 2 };
    }
  }
  return { Routine };
})();
if (typeof window !== 'undefined') window.QuestNPCs = QuestNPCs;
if (typeof module !== 'undefined') module.exports = QuestNPCs;
