/* World-anchored grain scale and a fixed-size, slowly recovering wear field. */
const SurfaceVariation = (() => {
  const COLS = 64, ROWS = 48, CELL = 8, types = ['sand', 'earth', 'gravel'];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const hash = (x, y, seed) => { let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1274126177); n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
  function noise(x, y, seed) { const ix = Math.floor(x), iy = Math.floor(y); let u = x - ix, v = y - iy; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v); const a = hash(ix, iy, seed) * (1-u) + hash(ix+1, iy, seed) * u, b = hash(ix, iy+1, seed) * (1-u) + hash(ix+1, iy+1, seed) * u; return a * (1-v) + b * v; }
  class Field {
    constructor() {
      this.wear = new Float32Array(COLS * ROWS); this.revision = 0; this.decayClock = 0;
      this.natural = {}; this.edges = {}; this.path = new Float32Array(COLS * ROWS);
      for (const type of types) { this.natural[type] = new Float32Array(COLS * ROWS); this.edges[type] = new Float32Array(COLS * ROWS); }
    }
    configure(options, materialAt) {
      this.options = options;
      const key = [options.layout, options.mode, options.blend].join('/');
      if (key !== this.key) {
        if (this.layout !== options.layout) this.wear.fill(0);
        this.key = key; this.layout = options.layout;
        const seed = [...options.layout].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) | 0, 417);
        const sum = Object.fromEntries(types.map(t => [t, 0])), weight = { ...sum };
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          const i = y * COLS + x, xx = x * CELL + 4, yy = y * CELL + 4, m = materialAt(xx, yy);
          const neighbours = [[-8,0],[8,0],[0,-8],[0,8]].map(([dx,dy]) => materialAt(xx+dx, yy+dy));
          // Existing earth/gravel path centres are smoother; worn traffic can
          // subsequently refine any granular surface, including isolated modes.
          this.path[i] = options.mode === 'blend' ? Math.max(m.earth, m.gravel) ** 4 * .3 : 0;
          for (let t = 0; t < types.length; t++) {
            const type = types[t], n = noise(xx / 63, yy / 63, seed + t*97) * .75 + noise(xx / 25, yy / 25, seed + t*97 + 13) * .25;
            this.natural[type][i] = n; sum[type] += n * m[type]; weight[type] += m[type];
            this.edges[type][i] = clamp(Math.max(4 * m[type] * (1-m[type]), ...neighbours.map(p => Math.abs(p[type]-m[type]) * 2)));
          }
        }
        this.means = Object.fromEntries(types.map(t => [t, weight[t] ? sum[t]/weight[t] : .5]));
      }
      this.revision++;
    }
    value(type, i) {
      const natural = 1 + (this.natural[type][i] - this.means[type]) * 2.5 * this.options.variation;
      const edge = 1 + this.edges[type][i] * this.options.edgeGrain * 1.6;
      const wear = 1 - Math.max(this.path[i], this.wear[i]) * this.options.pathWear * .72;
      return clamp(natural * edge * wear, .25, 3);
    }
    sample(type, x, y) {
      const xx = clamp(x / CELL - .5, 0, COLS - 1), yy = clamp(y / CELL - .5, 0, ROWS - 1), ix = Math.floor(xx), iy = Math.floor(yy), fx = xx-ix, fy = yy-iy;
      const at = (cx,cy) => this.value(type, Math.min(ROWS-1,cy)*COLS+Math.min(COLS-1,cx));
      return (at(ix,iy)*(1-fx)+at(ix+1,iy)*fx)*(1-fy)+(at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx)*fy;
    }
    step(x, y, pressure = 1) {
      if (!this.options.pathWear || pressure < .12) return;
      for (let yy = Math.max(0,Math.floor((y-16)/CELL)); yy <= Math.min(ROWS-1,Math.ceil((y+16)/CELL)); yy++) for (let xx = Math.max(0,Math.floor((x-16)/CELL)); xx <= Math.min(COLS-1,Math.ceil((x+16)/CELL)); xx++) {
        const i = yy*COLS+xx, d = Math.hypot((xx*CELL+4-x)/15,(yy*CELL+4-y)/12);
        if (d < 1) this.wear[i] = clamp(this.wear[i] + (1-d)**2 * .42 * pressure);
      }
      this.revision++;
    }
    advance(dt, rain = 0) {
      this.decayClock += dt;
      if (this.decayClock < 1) return;
      const decay = Math.exp(-this.decayClock * (.0015 + rain * .014)); this.decayClock = 0; let changed = false;
      for (let i = 0; i < this.wear.length; i++) if (this.wear[i]) { const before = Math.round(this.wear[i]*64); this.wear[i] *= decay; if (this.wear[i] < .002) this.wear[i] = 0; changed ||= before !== Math.round(this.wear[i]*64); }
      if (changed) this.revision++;
    }
    snapshot() { return Uint8Array.from(this.wear, v => Math.round(v*255)); }
    restore(bytes) { this.wear.fill(0); if (bytes?.length === this.wear.length) for (let i=0;i<bytes.length;i++) this.wear[i]=bytes[i]/255; this.decayClock=0; this.revision++; }
    clear() { this.restore(null); }
    get stats() {
      return { bytes: this.wear.byteLength + this.path.byteLength + types.reduce((n,t)=>n+this.natural[t].byteLength+this.edges[t].byteLength,0), wornCells: this.wear.reduce((n,v)=>n+(v>.02),0), revision: this.revision };
    }
  }
  return { Field, COLS, ROWS, CELL, types };
})();
if (typeof window !== 'undefined') window.SurfaceVariation = SurfaceVariation;
if (typeof module !== 'undefined') module.exports = SurfaceVariation;
