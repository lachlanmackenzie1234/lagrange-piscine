/* A pool map as a continuous material field. Turns a PoolMaps layout (16x12
 * cells) into the five surface-lab materials with soft, distance-based edges,
 * so the lab's grass, sand, earth and gravel can be painted under the map's
 * terrace, basin and buildings. Pure geometry: no stores, no records. */
const PoolSurface = (() => {
  const W = 512, H = 384, T = 32, G = 4, CW = W / G, CH = H / G, FAR = 1e4;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const edge = (distance, blend) => blend ? smooth(-blend / 2, blend / 2, distance) : Number(distance >= 0);
  const types = ['grass', 'sand', 'earth', 'gravel', 'water'];
  function mix(base, kind, amount) { const out = {}; for (const t of types) out[t] = (base[t] || 0) * (1 - amount); out[kind] += amount; return out; }

  // Signed distance (in px) to a class mask sampled on a G-px grid: positive inside, negative outside.
  function distanceField(inside) {
    const outD = new Float32Array(CW * CH), inD = new Float32Array(CW * CH);
    for (let i = 0; i < CW * CH; i++) { outD[i] = inside[i] ? 0 : FAR; inD[i] = inside[i] ? FAR : 0; }
    for (const d of [outD, inD]) {
      // two-pass chamfer (3-4), cheap and good enough for soft edges
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const i = y * CW + x; let v = d[i];
        if (x > 0) v = Math.min(v, d[i - 1] + 3); if (y > 0) { v = Math.min(v, d[i - CW] + 3); if (x > 0) v = Math.min(v, d[i - CW - 1] + 4); if (x < CW - 1) v = Math.min(v, d[i - CW + 1] + 4); } d[i] = v; }
      for (let y = CH - 1; y >= 0; y--) for (let x = CW - 1; x >= 0; x--) { const i = y * CW + x; let v = d[i];
        if (x < CW - 1) v = Math.min(v, d[i + 1] + 3); if (y < CH - 1) { v = Math.min(v, d[i + CW] + 3); if (x < CW - 1) v = Math.min(v, d[i + CW + 1] + 4); if (x > 0) v = Math.min(v, d[i + CW - 1] + 4); } d[i] = v; }
    }
    const signed = new Float32Array(CW * CH);
    for (let i = 0; i < CW * CH; i++) signed[i] = (inside[i] ? inD[i] : -outD[i]) * G / 3 - (inside[i] ? G / 2 : -G / 2);
    return signed;
  }
  const sampleField = (d, x, y) => {
    const fx = clamp(x / G - .5, 0, CW - 1.001), fy = clamp(y / G - .5, 0, CH - 1.001), ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy, i = iy * CW + ix;
    return (d[i] * (1 - u) + d[i + 1] * u) * (1 - v) + (d[i + CW] * (1 - u) + d[i + CW + 1] * u) * v;
  };

  // Which surface class each map cell belongs to.
  function classify(L) {
    const cls = [], put = (x, y, c) => { if (x >= 0 && y >= 0 && x < 16 && y < 12) cls[y][x] = c; };
    for (let y = 0; y < 12; y++) { cls[y] = []; for (let x = 0; x < 16; x++) { const g = L.ground[y][x]; cls[y][x] = g === 'grass' ? 'grass' : g === 'sand' ? 'sand' : g === 'water' ? 'solid' : 'hard'; } }
    if (L.border === 'forest') for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) if ((x === 0 || y === 0 || x === 15 || y === 11) && cls[y][x] === 'grass') cls[y][x] = 'earth';
    for (const o of L.objects) {
      if (o.kind === 'villa' || o.kind === 'shed') { for (let yy = o.y; yy < o.y + o.h; yy++) for (let xx = o.x; xx < o.x + o.w; xx++) put(xx, yy, 'solid'); }
      if (o.kind === 'pump' || o.kind === 'shed') for (let yy = o.y - 1; yy <= o.y + o.h; yy++) for (let xx = o.x - 1; xx <= o.x + o.w; xx++) if (cls[yy]?.[xx] === 'grass') put(xx, yy, 'gravel');
      if (o.kind === 'pine' || o.kind === 'tree') for (let yy = o.y; yy < o.y + o.h; yy++) for (let xx = o.x; xx < o.x + o.w; xx++) if (cls[yy]?.[xx] === 'grass') put(xx, yy, 'earth');
    }
    const en = L.anchors.en; if (cls[en.y]?.[en.x] === 'grass' || cls[en.y]?.[en.x] === 'sand') put(en.x, en.y, 'gravel');
    return cls;
  }
  function masks(cls) {
    const out = {}; for (const c of ['sand', 'earth', 'gravel', 'hard', 'solid']) out[c] = new Uint8Array(CW * CH);
    for (let gy = 0; gy < CH; gy++) for (let gx = 0; gx < CW; gx++) { const c = cls[Math.floor(gy * G / T)][Math.floor(gx * G / T)]; if (out[c]) out[c][gy * CW + gx] = 1; }
    return out;
  }

  /* build(L) -> a SurfaceMaps sampler for this layout. Coordinates are scene px (512x384). */
  function build(L) {
    const cls = classify(L), m = masks(cls), d = {}; for (const c of Object.keys(m)) d[c] = distanceField(m[c]);
    const px = a => [a.x * T + 16, a.y * T + 26];
    function sample(x, y, blend = 12) {
      let w = { grass: 1, sand: 0, earth: 0, gravel: 0, water: 0 };
      w = mix(w, 'earth', edge(sampleField(d.earth, x, y), blend * 1.5) * .8);
      w = mix(w, 'gravel', edge(sampleField(d.gravel, x, y), blend) * .95);
      w = mix(w, 'sand', edge(sampleField(d.sand, x, y), blend));
      // hard ground (terrace) and solid volumes (basin, buildings) are painted by the map itself
      const cover = (1 - edge(sampleField(d.hard, x, y), Math.min(blend, 8))) * (1 - edge(sampleField(d.solid, x, y), 4));
      for (const t of types) w[t] *= cover;
      w.solid = sampleField(d.solid, x, y) > -2 ? 1 : 0;
      return w;
    }
    const tour = ['sk', 'la', 'pu', 'hd', 'sd', 'en'].filter(k => L.anchors[k]).map(k => px(L.anchors[k]));
    return { id: 'pool:' + L.id, sample, depth: () => 0, tour, spawn: (() => { const [x, y] = px(L.anchors.sp || L.anchors.en); return { x, y }; })(), classes: cls, cell: (x, y) => [Math.floor(x / T), Math.floor(y / T)], px: (cx, cy) => [cx * T + 16, cy * T + 26] };
  }
  return { build, classify, W, H, T };
})();
if (typeof window !== 'undefined') window.PoolSurface = PoolSurface;
if (typeof module !== 'undefined') module.exports = PoolSurface;
