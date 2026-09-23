/* Living-world rendering from Pixel Lab v5, adapted to 23 pools and two NPC hubs.
 * Art, collision, gameplay, and maintenance records remain separate.
 */
const QuestWorld = (() => {
  const Eco = typeof window === 'undefined' ? require('./quest-ecology.js') : window.QuestEcology;
  const Zones = typeof window === 'undefined' ? require('./quest-zones.js') : window.QuestZones;
  const W = 512, H = 384, T = 32, TAU = Math.PI * 2;
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const seeded = seed => { let n = seed >>> 0; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; };
  const hash = text => [...text].reduce((n, c) => Math.imul(n, 31) + c.charCodeAt(0) | 0, 17);
  const inside = (x, y, r, pad = 0) => x >= r.x - pad && y >= r.y - pad && x < r.x + r.w + pad && y < r.y + r.h + pad;
  const rect = r => ({ x: r.x * T, y: r.y * T, w: r.w * T, h: r.h * T });
function surface(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function box(g, color, x, y, w = 1, h = 1) { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function polygon(g, color, points) { g.fillStyle = color; g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(Math.round(x), Math.round(y)) : g.moveTo(Math.round(x), Math.round(y))); g.closePath(); g.fill(); }
function ellipse(g, color, cx, cy, rx, ry) { g.fillStyle = color; for (let y = -Math.ceil(ry); y <= ry; y++) { const half = Math.sqrt(Math.max(0, 1 - (y / ry) ** 2)) * rx; g.fillRect(Math.round(cx - half), Math.round(cy + y), Math.max(1, Math.round(half * 2)), 1); } }
function line(g, color, points, width = 1) { g.strokeStyle = color; g.lineWidth = width; g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(Math.round(x), Math.round(y)) : g.moveTo(Math.round(x), Math.round(y))); g.stroke(); }
function loadImage(url) { return new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => reject(new Error(`Unable to load ${url}`)); im.src = url; }); }

function shadowSprite(sprite) { const c = surface(sprite.width, sprite.height), g = c.getContext('2d'); g.drawImage(sprite, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#163f37'; g.fillRect(0, 0, c.width, c.height); return c; }

function makeHouse() {
  const c = surface(150, 126), g = c.getContext('2d'), rand = seeded(434);
  // Side wall, shaded front and raised stone foundations.
  polygon(g, '#7d9a84', [[130, 52], [143, 44], [143, 103], [130, 115]]);
  box(g, '#abb99a', 11, 69, 121, 47); box(g, '#e9dfb4', 12, 68, 118, 42);
  box(g, '#d0c9a5', 12, 74, 118, 9); box(g, '#bdc5a1', 12, 106, 118, 5); box(g, '#678e79', 10, 114, 126, 5);
  for (let x = 15; x < 130; x += 18) { box(g, '#a0af92', x, 112, 1, 4); box(g, '#eee5bf', x, 111, 14, 1); }
  // A broad pitched roof, with tightly spaced ribs and uneven tile glints.
  polygon(g, '#254f56', [[4, 28], [25, 9], [121, 9], [143, 30], [143, 68], [135, 74], [4, 74]]);
  polygon(g, '#649792', [[5, 29], [25, 11], [120, 11], [138, 30], [138, 67], [5, 67]]);
  polygon(g, '#78aaa0', [[5, 29], [25, 11], [120, 11], [138, 29]]);
  box(g, '#93b6a5', 26, 11, 92, 2); box(g, '#d6c797', 2, 69, 139, 4); box(g, '#365f62', 8, 74, 125, 3);
  for (let x = 10; x < 138; x += 6) { box(g, '#3f797f', x, 30, 2, 36); box(g, '#a2c3ac', x + 2, 30, 1, 36); if (x % 12) box(g, '#62978c', x + 3, 47, 3, 1); }
  for (let i = 0; i < 35; i++) box(g, rand() > .5 ? '#80afa1' : '#528782', 9 + rand() * 124, 32 + rand() * 31, 2 + rand() * 3, 1);
  // Chimney and its warm cap.
  polygon(g, '#37616b', [[105, 18], [125, 30], [134, 30], [115, 13]]);
  box(g, '#96a994', 103, 4, 12, 21); box(g, '#bec3a4', 102, 4, 8, 18); box(g, '#486c67', 101, 2, 16, 4); box(g, '#ded2a9', 103, 1, 12, 2);
  // Window frames, blue glass, reflection stripes and shutters.
  for (const x of [22, 100]) { box(g, '#526e63', x - 3, 82, 23, 23); box(g, '#fbebba', x - 1, 80, 19, 23); box(g, '#34798b', x + 1, 82, 15, 18); box(g, '#8fcbc0', x + 2, 83, 12, 6); box(g, '#d8ead0', x + 3, 83, 2, 5); box(g, '#e5ddaf', x + 8, 82, 1, 18); box(g, '#d5d1a6', x + 1, 90, 15, 1); box(g, '#6c9b85', x - 5, 83, 3, 18); box(g, '#6c9b85', x + 19, 83, 3, 18); box(g, '#ded3a3', x - 3, 102, 22, 3); }
  box(g, '#677f66', 60, 79, 26, 36); box(g, '#ead3a0', 61, 79, 23, 33); box(g, '#b86d43', 64, 83, 17, 30); box(g, '#ce8650', 65, 84, 11, 27); box(g, '#e9bb6e', 66, 85, 8, 1); box(g, '#784f38', 71, 87, 1, 21); box(g, '#f4d589', 77, 98, 2, 2); box(g, '#e0d5ad', 60, 113, 27, 4); box(g, '#b0b697', 58, 117, 30, 3);
  // Pots and climbing vine break the building's regular edges.
  for (const x of [16, 119]) { box(g, '#9b6549', x, 108, 10, 8); box(g, '#d39360', x - 1, 107, 12, 3); for (let j = 0; j < 12; j++) box(g, j % 3 ? '#51866a' : '#a8bc66', x + rand() * 11, 97 + rand() * 12, 3, 3); }
  for (let i = 0; i < 22; i++) { const y = 57 + rand() * 40, x = 8 + rand() * 9; box(g, i % 3 ? '#668f59' : '#a9bb68', x, y, 3, 2); }
  return c;
}
function makePump() {
  const c = surface(75, 83), g = c.getContext('2d');
  box(g, '#5c7560', 10, 42, 53, 36); box(g, '#d0ba87', 10, 40, 46, 34); box(g, '#9a9c72', 56, 40, 8, 33);
  for (let x = 11; x < 55; x += 7) { box(g, '#a8956a', x, 42, 1, 31); box(g, '#e2cea0', x + 1, 43, 1, 30); }
  polygon(g, '#3e655c', [[3, 36], [17, 17], [55, 17], [70, 36], [70, 44], [3, 44]]);
  polygon(g, '#ac7852', [[4, 34], [18, 19], [53, 19], [68, 35], [68, 39], [4, 39]]);
  for (let y = 23; y < 39; y += 5) { box(g, '#d6a36a', 17 - (y - 23) * .7, y, 40 + (y - 23) * 1.5, 1); }
  box(g, '#dabd87', 3, 40, 68, 3); box(g, '#71583f', 18, 47, 20, 29); box(g, '#bb8a54', 20, 49, 15, 25); box(g, '#f1da9b', 32, 61, 2, 2);
  box(g, '#547b70', 43, 48, 11, 14); box(g, '#a1c8ac', 45, 50, 7, 9); box(g, '#ded1a4', 42, 62, 13, 2);
  box(g, '#597d75', 57, 63, 14, 15); box(g, '#c7d1b5', 59, 65, 10, 8); box(g, '#76bd91', 62, 67, 3, 3); box(g, '#506b5d', 8, 76, 64, 3); return c;
}

function makeGrassSprite(size, variant) {
  const dimensions = [[9, 7], [15, 11], [22, 17], [31, 23]], [w, h] = dimensions[size];
  const sprite = surface(w, h), g = sprite.getContext('2d'), rand = seeded(701 + size * 37 + variant * 113);
  const palettes = [
    ['#386f51', '#568b55', '#79a457', '#afc772'],
    ['#427e62', '#5d9c69', '#8eb873', '#bdcf87'],
    ['#4c7d4f', '#699650', '#9ab25e', '#c4ca7a'],
  ];
  const [deep, shade, green, light] = palettes[variant % palettes.length], blades = 5 + size * 3;
  ellipse(g, shade, w / 2, h - 3, w * .36, 2);
  for (let i = 0; i < blades; i++) {
    const baseX = Math.round(w * (.23 + rand() * .55)), baseY = h - 2 - Math.round(rand() * 2);
    const height = Math.max(3, Math.round(h * (.35 + rand() * .58))), lean = (rand() - .5) * w * .55;
    const tipX = clamp(Math.round(baseX + lean), 1, w - 2), tipY = Math.max(0, baseY - height);
    const middleX = Math.round(baseX + lean * .65), middleY = Math.round(baseY - height * .52), bladeWidth = 1 + Math.floor(rand() * (size > 1 ? 3 : 2));
    polygon(g, i % 3 ? shade : deep, [[baseX - bladeWidth, baseY], [middleX - bladeWidth, middleY], [tipX, tipY], [middleX + 1, middleY], [baseX + 1, baseY]]);
    line(g, i % 3 ? green : light, [[baseX, baseY - 2], [middleX, middleY], [tipX, tipY]], 1);
    if (size > 1 && i % 4 === 0) box(g, light, tipX, tipY + 1, 1, Math.max(1, height * .16));
  }
  // Small broken highlights give each clump a root mass without a hard outline.
  for (let i = 0; i < size + 3; i++) box(g, i % 2 ? green : shade, w * .2 + rand() * w * .6, h - 2 - rand() * 3, 2, 1);
  return sprite;
}

  // The plan is deterministic and uses existing footprints. Decorative grass
  // never blocks a route, an interaction anchor, or the encounter clearing.
  function plan(layout) {
    const rand = seeded(hash(layout.id)), props = [];
    const clear = (x, y, margin = 0) => {
      const tx = Math.floor(x / T), ty = Math.floor(y / T);
      return x > margin && x < W - margin && y > margin && y < H - margin
        && layout.ground[ty]?.[tx] === 'grass' && !layout.coll[ty]?.[tx]
        && !inside(x, y, rect(layout.deck), margin)
        && !inside(x, y, rect(layout.arena), 12)
        && Object.values(layout.anchors).every(a => Math.hypot(x - (a.x + .5) * T, y - (a.y + .5) * T) > 22 + margin);
    };
    layout.objects.forEach(o => {
      const tree = o.kind === 'tree' || o.kind === 'pine';
      props.push({ kind: o.kind, plant: tree ? o.kind === 'pine' ? o.variant % 2 ? 3 : 1 : o.variant % 2 ? 2 : 0 : null,
        x: (o.x + o.w / 2) * T, y: (o.y + o.h) * T - 2, scale: o.kind === 'villa' ? .94 : o.kind === 'shed' ? .9 : 1, occludes: o.kind === 'villa' || o.kind === 'shed',
        phase: rand() * TAU, object: o });
    });
    // Edge trees frame the property without adding obstacles to open cells.
    for (const [x, y, plant] of [[5, 112, 0], [508, 118, 1], [4, 295, 2], [508, 350, 0], [100, 48, 1], [279, 44, 3], [66, 424, 2], [440, 424, 0]]) {
      if (Math.abs(x - (layout.anchors.en.x + .5) * T) < 44 && y > 350 || layout.border === 'canal' && x > 490) continue;
      props.push({ kind: 'foliage', plant, x, y, scale: .8 + rand() * .12, phase: rand() * TAU });
    }
    for (let i = 0; i < 85; i++) {
      const x = Math.round(12 + rand() * (W - 24)), y = Math.round(20 + rand() * (H - 30));
      if (!clear(x, y, 10) || props.some(p => Math.hypot(x - p.x, y - p.y) < 26)) continue;
      props.push({ kind: 'foliage', plant: [4, 5, 7][i % 3], x, y, scale: .5 + rand() * .24, phase: rand() * TAU });
    }
    const trees = props.filter(p => p.plant != null && p.plant < 4), roster = Eco.treeRoster(layout.id, trees.length);
    trees.forEach((p, i) => {
      p.species = roster[i]; p.scale = 1;
      p.treeSize = p.x < 12 || p.x > W - 12 || p.y > H ? 'large' : Zones.TREE_PLACEMENT_SIZES[i % 7];
    });
    const cover = Eco.createGroundCover({ width: W, height: H, seed: Eco.hashIdentity(layout.id),
      eligible: (x, y) => clear(x, y, 5), rockEligible: (x, y) => clear(x, y, 12) && props.every(p => Math.hypot(x - p.x, y - p.y) > 28) });
    cover.rocks.forEach(o => props.push({ ...o, kind: 'foliage', plant: 6 }));
    const used = new Set();
    const accents = cover.grass.filter(t => {
      if (used.has(t.patchId) || Eco.hashIdentity(layout.id + t.patchId) % 4) return false;
      used.add(t.patchId); return true;
    }).map(t => ({ ...t, zoneAccent: true }));
    return { props, grass: accents, coverage: cover };
  }

  function lawnEligibility(layout) {
    const occupied = new Set();
    // Small props sit in the lawn; excluding their whole tile would leave a
    // rectangular colour patch around pots, signs and filter controls.
    for (const o of layout.objects) if (['villa', 'shed'].includes(o.kind)) {
      for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) occupied.add(y * 16 + x);
    }
    const deck = rect(layout.deck), water = rect(layout.pool);
    return (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H || layout.border === 'canal' && x >= W - 34) return false;
      const tx = Math.floor(x / T), ty = Math.floor(y / T);
      return layout.ground[ty]?.[tx] === 'grass' && !occupied.has(ty * 16 + tx) && !inside(x, y, deck) && !inside(x, y, water);
    };
  }

  function makeGround(layout) {
    const c = surface(W, H), g = c.getContext('2d'), rand = seeded(hash(layout.id));
    const shift = rand() * 4;
    for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) {
      const v = Math.sin(x / 68 + y / 122 + shift) + Math.sin(y / 42 - x / 147) + Math.cos(x / 37) * .25 + rand() * .2;
      box(g, ['#84a97b', '#91b47b', '#9fbd7c', '#abc67e', '#b4cb83'][clamp(Math.floor(v + 2), 0, 4)], x, y, 4, 4);
    }
    for (let i = 0; i < 8000; i++) { g.globalAlpha = .05 + rand() * .09; box(g, rand() < .5 ? '#3e8368' : '#eff1a9', rand() * W, rand() * H, 1 + rand() * 2, 1); } g.globalAlpha = 1;
    // Soft edges join the authored sand cells into paths, rather than tile boxes.
    for (let pass = 0; pass < 3; pass++) layout.ground.forEach((row, y) => row.forEach((tile, x) => {
      if (tile !== 'sand') return;
      const color = ['#8ba46d', '#cdbd84', '#dece99'][pass], cx = x * T + 16, cy = y * T + 16 + (pass ? 0 : 2), radius = 20 - pass;
      ellipse(g, color, cx, cy, radius, radius);
      if (row[x + 1] === 'sand') box(g, color, cx, cy - radius, T, radius * 2 + 1);
      if (layout.ground[y + 1]?.[x] === 'sand') box(g, color, cx - radius, cy, radius * 2 + 1, T);
    }));
    layout.ground.forEach((row, y) => row.forEach((tile, x) => { if (tile === 'sand') for (let i = 0; i < 12; i++) box(g, i % 3 ? '#cbbb84' : '#eee1b0', x * T + 2 + rand() * 28, y * T + 2 + rand() * 28, i % 4 ? 1 : 3, 1); }));
    const d = rect(layout.deck), p = rect(layout.pool), wood = layout.deckTile === 'deck';
    box(g, '#839976', d.x, d.y + 3, d.w + 2, d.h + 2); box(g, wood ? '#8b7955' : '#c5bd99', d.x, d.y, d.w, d.h);
    const shades = wood ? ['#c0a776', '#cfb986', '#bca273', '#d4bc86'] : layout.res === 'EPP' ? ['#d8cec2', '#e2d7c8', '#d2c6b7', '#e7dccc'] : ['#e2d6ac', '#ded0a3', '#e7d9ae', '#d9cda3'];
    const step = wood ? 10 : 24;
    for (let y = d.y + 2; y < d.y + d.h - 2; y += step) for (let x = d.x + 2; x < d.x + d.w - 2; x += wood ? 48 : 24) {
      const w = Math.min(wood ? 46 : 22, d.x + d.w - x - 2), h = Math.min(step - 2, d.y + d.h - y - 2);
      box(g, shades[Math.floor(rand() * 4)], x, y, w, h); box(g, wood ? '#e1ca94' : '#f2e6bf', x, y, w, 1);
      if (rand() > .6) box(g, wood ? '#8e7c58' : '#c5c19d', x + 5, y + h / 2, 2, 1);
    }
    box(g, '#eee2b4', d.x, d.y, d.w, 2);
    box(g, '#8d9f89', p.x - 6, p.y - 5, p.w + 14, p.h + 14); box(g, '#f4e8c1', p.x - 6, p.y - 7, p.w + 12, p.h + 13);
    box(g, '#d0caa8', p.x - 4, p.y - 4, p.w + 8, p.h + 8); box(g, '#497d80', p.x - 1, p.y - 1, p.w + 2, p.h + 2);
    for (let x = p.x; x < p.x + p.w; x += 17) { box(g, '#bcbda0', x, p.y - 7, 1, 4); box(g, '#c9c5a2', x, p.y + p.h + 2, 1, 4); }
    for (let y = p.y; y < p.y + p.h; y += 17) { box(g, '#c4c5a1', p.x - 6, y, 4, 1); box(g, '#b1b9a2', p.x + p.w + 2, y, 4, 1); }
    if (layout.border === 'canal') { box(g, '#4b8d93', W - 32, 0, 32, H); for (let y = 0; y < H; y += 11) box(g, '#8cc4bd', W - 28 + y % 5, y, 16, 1); box(g, '#c9c4a0', W - 34, 0, 3, H); }
    if (layout.border === 'fence') for (let x = 12; x < W; x += 19) { box(g, '#658168', x, 19, 4, 13); box(g, '#c3b28a', x, 6, 3, 19); box(g, '#ddd1a5', x, 6, 1, 17); box(g, '#a49371', x, 12, 19, 2); }
    return c;
  }

  function makeProp(kind) {
    const c = surface(32, 38), g = c.getContext('2d');
    if (kind === 'pump') {
      box(g, '#456e66', 4, 11, 25, 25); box(g, '#98b8a1', 5, 12, 21, 22); box(g, '#d7dfbb', 7, 13, 17, 5);
      box(g, '#3d6968', 8, 21, 13, 8); box(g, '#9ad3ad', 10, 22, 8, 5); box(g, '#657860', 3, 34, 28, 3);
    } else if (kind === 'pot') {
      box(g, '#8e6147', 9, 25, 15, 11); box(g, '#c89261', 8, 24, 17, 4);
      for (let i = 0; i < 12; i++) ellipse(g, i % 3 ? '#53856a' : '#acc275', 7 + i * 7 % 18, 13 + i * 11 % 13, 4, 3);
    } else if (kind === 'sign') {
      box(g, '#766747', 15, 16, 4, 21); box(g, '#456758', 3, 7, 26, 16); box(g, '#e3d3a5', 5, 9, 22, 12); box(g, '#819d79', 9, 12, 14, 2); box(g, '#819d79', 10, 16, 11, 1);
    } else {
      const lounger = kind === 'lounger';
      box(g, '#735e43', 4, 29, 3, 8); box(g, '#735e43', 26, 29, 3, 8); box(g, '#987447', 3, 18, 27, 15);
      for (let y = 18; y < 32; y += 5) { box(g, lounger ? '#a7bcb2' : '#d2ac75', 4, y, 24, 4); box(g, lounger ? '#e5e1b9' : '#ebc691', 4, y, 24, 1); }
      if (lounger) { box(g, '#567c74', 4, 5, 24, 14); box(g, '#bad5c5', 6, 6, 20, 12); }
    }
    return c;
  }

  // Five integer sway poses are shared across scenes; no per-frame canvas work.
  function bendFrames(sprite) {
    return [-2, -1, 0, 1, 2].map(amount => {
      const c = surface(sprite.width + 4, sprite.height), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      for (let sy = 0; sy < sprite.height; sy += 2) { const sh = Math.min(2, sprite.height - sy), shift = Math.round(amount * (1 - sy / sprite.height) ** 1.4); g.drawImage(sprite, 0, sy, sprite.width, sh, 2 + shift, sy, sprite.width, sh); }
      return c;
    });
  }
  let art = null, failure = null, hubFailure = null, battleBackdrop = null; const contacts = new Map();
  const ready = typeof document === 'undefined' ? Promise.resolve(false) : (async () => {
    try {
      const base = new URL('../assets/quest-world/', document.currentScript.src);
      const zoneBase = new URL('../quest-zones/', base);
      const [source, manifest, zonePage, zoneManifest] = await Promise.all([loadImage(new URL('foliage.png', base).href), fetch(new URL('foliage.json', base)).then(r => { if (!r.ok) throw new Error('Foliage manifest unavailable'); return r.json(); }), loadImage(new URL('zones.png', zoneBase).href), fetch(new URL('manifest.json', zoneBase)).then(r => { if (!r.ok) throw new Error('Zone manifest unavailable'); return r.json(); })]);
      const plants = manifest.regions.map(([x, y, w, h]) => { const c = surface(w, h), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(source, x, y, w, h, 0, 0, w, h); return c; });
      const zones = Object.fromEntries(Object.entries(zoneManifest.regions).map(([id, meta]) => {
        const [x, y, w, h] = meta.r, c = surface(w, h), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(zonePage, x, y, w, h, 0, 0, w, h); return [id, c];
      }));
      const grass = Array.from({ length: 4 }, (_, size) => Array.from({ length: 3 }, (_, variant) => makeGrassSprite(size, variant)));
      const props = Object.fromEntries(['pump', 'pot', 'sign', 'bench', 'lounger'].map(kind => [kind, makeProp(kind)]));
      props.villa = makeHouse(); props.shed = makePump();
      const pot = props['interior-pot'] = surface(44, 58), pg = pot.getContext('2d'); pg.imageSmoothingEnabled = false;
      polygon(pg, '#7c5543', [[10, 38], [34, 38], [31, 56], [14, 56]]); polygon(pg, '#b97c52', [[12, 39], [32, 39], [29, 54], [15, 54]]);
      box(pg, '#ddae76', 10, 37, 24, 4); box(pg, '#ecd09a', 11, 37, 21, 1); box(pg, '#cf9b65', 16, 42, 3, 11);
      pg.drawImage(plants[5], 2, 1, 40, 40);
      const hubProps = {};
      try {
        const hubBase = new URL('../quest-hubs/', base);
        const [page, manifest] = await Promise.all([loadImage(new URL('props.png', hubBase).href), fetch(new URL('manifest.json', hubBase)).then(r => { if (!r.ok) throw new Error('Hub manifest unavailable'); return r.json(); })]);
        for (const [id, { r: [x, y, w, h] }] of Object.entries(manifest.props)) { const c = surface(w, h); c.getContext('2d').drawImage(page, x, y, w, h, 0, 0, w, h); hubProps[id] = c; }
      } catch (error) { hubFailure = error.message; }
      if (hubProps['boss-desk']) { const source = hubProps['boss-desk'], c = surface(source.width, source.height), g = c.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(source, 0, 0); hubProps['boss-desk-mirrored'] = c; }
      const all = [...plants, ...Object.values(zones), ...grass.flat(), ...Object.values(props), ...Object.values(hubProps)];
      const animated = new Set([...plants.filter((_, i) => i !== 6), ...Object.entries(zones).filter(([id]) => ['trees', 'grass'].includes(zoneManifest.regions[id].family)).map(([, image]) => image), ...grass.flat()]);
      art = { plants, zones, zoneMeta: zoneManifest.regions, grass, props, hubProps, frames: new Map(), shadows: new Map(), shadowFrames: new Map(), alpha: new Map() };
      all.forEach(c => { if (animated.has(c)) { const frames = bendFrames(c); art.frames.set(c, frames); art.shadowFrames.set(c, frames.map(shadowSprite)); } art.shadows.set(c, shadowSprite(c)); art.alpha.set(c, c.getContext('2d').getImageData(0, 0, c.width, c.height).data); });
      return true;
    } catch (error) { failure = error.message; return false; }
  })();

  function paintBattle(ctx) {
    if (!art) return false;
    if (!battleBackdrop) {
      battleBackdrop = surface(W, H); const g = battleBackdrop.getContext('2d'); g.imageSmoothingEnabled = false;
      box(g, '#cee0b0', 0, 0, W, H); box(g, '#b8d39e', 0, 108, W, H - 108); box(g, '#c6dba2', 0, 192, W, H - 192);
      for (let y = 0; y < 166; y += 6) { g.globalAlpha = .06; box(g, '#f4f2c7', 0, y, W, 3); }
      g.globalAlpha = .64; g.drawImage(art.plants[0], -20, 52, 139, 154); g.drawImage(art.plants[1], 432, 24, 97, 184);
      g.globalAlpha = .35; g.drawImage(art.plants[2], 282, -5, 123, 145); g.globalAlpha = 1;
      polygon(g, '#d8d4a1', [[0, 228], [168, 204], [249, 148], [405, 155], [W, 198], [W, H], [0, H]]);
      for (let i = 0; i < 130; i++) box(g, i % 3 ? '#c3c99a' : '#e8dfb0', i * 43 % W, 214 + i * 29 % 170, 2, 1);
      ellipse(g, '#a1b78d', 368, 190, 71, 15); ellipse(g, '#bdd29d', 368, 186, 66, 14);
      ellipse(g, '#9db187', 120, 336, 88, 20); ellipse(g, '#b4c693', 116, 332, 82, 18);
      for (const [x, y, kind] of [[10, 381, 5], [475, 390, 7], [47, 372, 4]]) { const plant = art.plants[kind]; g.drawImage(plant, x, y - plant.height); }
    }
    ctx.drawImage(battleBackdrop, 0, 0, 256, 192); return true;
  }

  class Scene {
    constructor(layout, options = {}) {
      this.layout = layout; this.pool = layout.pool ? rect(layout.pool) : null; this.time = 0; this.leaves = [];
      [this.width, this.height] = layout.size || [W, H];
      this.interior = layout.id === 'bureau';
      this.grassHeight = Number.isFinite(options.grassHeight) ? clamp(options.grassHeight, 1, 64) : Zones.MAX_GRASS_HEIGHT;
      this.theme = this.pool ? Zones.zoneStyle(layout.res || layout.id) : null;
      const hub = !!layout.npcs, decoration = hub ? { props: layout.scenery, grass: window.QuestHubArt.grass(layout) } : plan(layout);
      this.coverage = decoration.coverage; this.tracks = []; this.trackDistance = 0; this.refreshClimate();
      if (hub) { const room = window.QuestHubArt.build(layout.id, art.plants); this.base = room.base; this.foreground = room.foreground; } else this.base = makeGround(layout);
      this.props = decoration.props.map((o, i) => {
        const zoneAsset = o.species ? `${o.species}-${o.treeSize}` : null;
        const custom = options.sprite?.(o), sprite = custom || (zoneAsset ? art.zones[zoneAsset] : o.asset ? art.hubProps[o.flipX ? o.asset + '-mirrored' : o.asset] : o.plant == null ? art.props[o.kind] : art.plants[o.plant]);
        if (custom && !art.shadows.has(custom)) { art.shadows.set(custom, shadowSprite(custom)); art.alpha.set(custom, custom.getContext('2d').getImageData(0, 0, custom.width, custom.height).data); }
        return { scale: 1, phase: i * 2.73, ...o, zoneAsset, sprite, anchor: zoneAsset ? art.zoneMeta[zoneAsset].anchor : [sprite.width / 2, sprite.height] };
      });
      this.grass = decoration.grass.map(o => ({ ...o, kind: 'grass', scale: 1, sprite: o.zoneAccent ? art.zones[`${this.theme.id}-${Zones.grassStage(this.cycle.height)}`] : art.grass[o.size][o.variant], bend: 0, bendVelocity: 0, flatten: 0 }));
      this.scenery = [...this.props, ...this.grass].sort((a, b) => (a.depth ?? a.y) - (b.depth ?? b.y));
      this.hitProps = this.props.slice().sort((a, b) => b.y - a.y);
      this.shadows = surface(this.width, this.height); this.shadeSample = surface(Math.ceil(this.width / 4), Math.ceil(this.height / 4));
      this.meadowFrames = new Map(); this.meadowFrameBytes = 0; this.meadowDirty = true;
      this.surface = !!options.surface; // an external surface field paints lawn and meadow
      this.lawnAt = this.pool ? lawnEligibility(layout) : null;
      this.meadow = this.pool && !this.surface ? Zones.createMeadow({ width: this.width, height: this.height, eligible: this.lawnAt,
        zoneAt: (x, y) => inside(x, y, rect(layout.deck), 12) ? 'trimmed' : 'wild' }) : [];
      this.meadowIndex = new Map(this.meadow.map(c => [Math.floor(c.y / 8) * Math.ceil(this.width / 8) + Math.floor(c.x / 8), c]));
      this.meadowLayer = this.pool && !this.surface ? surface(this.width, this.height) : null;
      this.shade = new Uint8Array(this.shadeSample.width * this.shadeSample.height); if (!this.surface) this.makeLawn(); this.updateShadows(0, true);
    }
    refreshClimate() {
      const now = new Date(), atmosphere = Eco.currentAppearance(now);
      this.climate = { ...atmosphere, patch: { breeze: 22, water: 40, ...atmosphere.patch } };
      this.cycle = Eco.gardenCycle(this.layout.id, atmosphere.clock.date); this.nextClimate = Date.now() + 60000;
    }
    makeLawn() {
      if (!this.theme) return;
      const w = this.width, h = this.height;
      if (!this.lawnMask) {
        this.lawnMask = surface(w, h); this.lawnPixels = new Uint8Array(w * h);
        const g = this.lawnMask.getContext('2d'), pixels = g.createImageData(w, h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (this.lawnAt(x, y)) { this.lawnPixels[y * w + x] = 1; pixels.data[(y * w + x) * 4 + 3] = 255; }
        g.putImageData(pixels, 0, 0);
      }
      this.lawn = surface(w, h); const g = this.lawn.getContext('2d');
      g.fillStyle = g.createPattern(Zones.meadowTile(this.theme, this.cycle.height, false), 'repeat'); g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(this.lawnMask, 0, 0); g.globalCompositeOperation = 'source-over';
      const pixels = g.getImageData(0, 0, w, h), base = this.base.getContext('2d').getImageData(0, 0, w, h).data;
      // Interleave neighbouring sand/stone colours only on the grass side of
      // the boundary; pools, terraces and navigation remain exactly where they are.
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x; if (!this.lawnPixels[i]) continue;
        let neighbour = -1, distance = 0;
        for (let d = 1; d <= 3 && neighbour < 0; d++) for (const [dx, dy] of [[-d, 0], [d, 0], [0, -d], [0, d]]) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const next = yy * w + xx; if (!this.lawnPixels[next]) { neighbour = next; distance = d; break; }
        }
        const noise = ((Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0) % 100;
        if (neighbour >= 0 && noise < 65 / distance) for (let k = 0; k < 3; k++) pixels.data[i * 4 + k] = base[neighbour * 4 + k];
      }
      g.putImageData(pixels, 0, 0); this.meadowPalette = Zones.meadowPalette(this.theme, this.cycle.height);
      this.meadowFrames.clear(); this.meadowFrameBytes = 0; this.meadowDirty = true;
    }
    meadowSprite(cell, time, quiet, mask = cell.mask, shade = 0) {
      const shape = Zones.meadowShape(cell, { growth: this.cycle.height, lushness: 100, time: Math.floor(time * 8) / 8, wind: this.climate.patch.breeze / 100, quiet, maximum: this.grassHeight });
      shape.mask = mask;
      const key = `${shape.height}/${shape.amount}/${shape.pose}/${shape.variant}/${mask}/${shade}`;
      if (!this.meadowFrames.has(key)) {
        const image = Zones.meadowSprite(shape, this.meadowPalette);
        if (shade) { const g = image.getContext('2d'); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = shade / 8; box(g, '#255b55', 0, 0, image.width, image.height); }
        this.meadowFrames.set(key, image);
        this.meadowFrameBytes += image.width * image.height * 4;
        while (this.meadowFrames.size > 768 || this.meadowFrameBytes > 4 * 1048576) {
          const oldest = this.meadowFrames.keys().next().value, retired = this.meadowFrames.get(oldest);
          this.meadowFrameBytes -= retired.width * retired.height * 4; this.meadowFrames.delete(oldest);
        }
      }
      return this.meadowFrames.get(key);
    }
    paintMeadow(g, time, quiet) {
      if (!this.meadowLayer) return;
      const stamp = quiet ? -1 : Math.floor(time * 8);
      if (this.meadowDirty || stamp !== this.meadowStamp) {
        const target = this.meadowLayer.getContext('2d'); target.clearRect(0, 0, this.width, this.height); target.imageSmoothingEnabled = false;
        for (const cell of this.meadow) { const image = this.meadowSprite(cell, time, quiet); target.drawImage(image, cell.x - image.width / 2, cell.y - image.height + 6); }
        this.meadowStamp = stamp; this.meadowDirty = false;
      }
      g.drawImage(this.meadowLayer, 0, 0);
    }
    foregroundMeadow(g, actor, time, quiet) {
      const x = actor.x * 2, y = actor.y * 2, half = Math.max(12, (actor.shadow || 7) + 2), depth = this.grassHeight, reach = Math.max(12, depth * .9), columns = Math.ceil(this.width / 8);
      g.save(); g.beginPath(); g.rect(x - half, y - depth, half * 2, depth + 3); g.clip();
      for (let cy = Math.max(0, Math.floor((y - 3) / 8)); cy <= Math.floor((y + depth + 3) / 8); cy++) {
        for (let cx = Math.max(0, Math.floor((x - half - reach) / 8)); cx <= Math.min(columns - 1, Math.floor((x + half + reach) / 8)); cx++) {
          const cell = this.meadowIndex.get(cy * columns + cx); if (!cell) continue;
          const mask = Zones.foregroundRoots(cell, y - 1); if (!mask) continue;
          const shade = Math.round(this.shade[clamp(Math.floor(cell.y / 4), 0, this.shadeSample.height - 1) * this.shadeSample.width + clamp(Math.floor(cell.x / 4), 0, this.shadeSample.width - 1)] / 255 * 8);
          const image = this.meadowSprite(cell, time, quiet, mask, shade); g.drawImage(image, cell.x - image.width / 2, cell.y - image.height + 6);
        }
      }
      g.restore();
    }
    frameIndex(o, time, quiet) {
      if (quiet || !art.frames.has(o.sprite)) return 2;
      const rustle = o.rustledAt == null ? 0 : Math.max(0, 1.6 - (this.time - o.rustledAt));
      const wind = this.climate.patch.breeze / 100;
      const displacement = o.species ? Eco.canopyDisplacement({ ...o, rustle }, Math.floor(time * 4) / 4, wind) / 2 : Math.sin(Math.floor(time * 4) / 4 * .9 + o.phase) * (wind * 1.6) + Math.sin(rustle * 20) * rustle;
      return clamp(Math.round(displacement), -2, 2) + 2;
    }
    updateShadows(t, quiet) {
      const poses = this.props.map(o => this.frameIndex(o, t, quiet));
      const { patch, visual } = this.climate, key = poses.join(',') + '|' + Math.round(patch.sun / 5) + '|' + visual.cloud + '|' + visual.sunStrength;
      if (key === this.shadowKey) return; this.shadowKey = key;
      const g = this.shadows.getContext('2d'); g.clearRect(0, 0, this.width, this.height);
      this.shadowShear = this.interior ? -.3 : -Math.cos(patch.sun * Math.PI / 180) * .8;
      this.props.forEach((o, i) => { const sprite = art.shadowFrames.get(o.sprite)?.[poses[i]] || art.shadows.get(o.sprite);
        if (o.noShadow) return;
        g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = (this.interior ? .13 : o.plant != null ? .2 : .25) * (1 - visual.cloud * .55) * (.55 + .45 * visual.sunStrength);
        g.translate(Math.round(o.x), Math.round(o.y)); g.transform(1, 0, this.shadowShear, this.interior ? .25 : -.3, 0, 0);
        const padding = (sprite.width - o.sprite.width) / 2;
        g.drawImage(sprite, -Math.round((o.anchor[0] + padding) * o.scale), -Math.round(o.anchor[1] * o.scale), Math.round(sprite.width * o.scale), Math.round(sprite.height * o.scale)); g.restore();
      });
      const sample = this.shadeSample.getContext('2d', { willReadFrequently: true }); sample.clearRect(0, 0, this.shadeSample.width, this.shadeSample.height);
      sample.imageSmoothingEnabled = false; sample.drawImage(this.shadows, 0, 0, this.shadeSample.width, this.shadeSample.height);
      const pixels = sample.getImageData(0, 0, this.shadeSample.width, this.shadeSample.height).data;
      for (let i = 0; i < this.shade.length; i++) this.shade[i] = pixels[i * 4 + 3];
    }
    lightAt(x, y) {
      const w = this.shadeSample.width, h = this.shadeSample.height;
      const shade = this.shade[clamp(Math.floor(y / 4), 0, h - 1) * w + clamp(Math.floor(x / 4), 0, w - 1)];
      return shade > 28 || this.climate.patch.mood === 'dusk' ? 'shade' : this.interior && !window.QuestHubArt.sunlit(this.layout.id, x, y) ? 'interior' : 'sun';
    }
    grassAt(x, y) {
      return this.pool ? this.lawnAt(x, y) : window.QuestHubArt.isGrass(this.layout.id, x, y);
    }
    footGrass(g, actor, t, quiet) {
      const x = Math.round(actor.x * 2), y = Math.round(actor.y * 2);
      if (!this.grassAt(x, y) || actor.grass === false) return;
      if (this.onFootGrass) { this.onFootGrass(g, actor, t, quiet); return; }
      if (this.meadowLayer) { this.foregroundMeadow(g, actor, t, quiet); return; }
      // A few rooted blades overlap the soles rather than drawing a green halo.
      const sway = Math.round(Math.sin(t * 1.2 + x) * .5);
      for (const [dx, h] of [[-6, 2], [-3, 4], [2, 3], [5, 2]]) { box(g, '#5d8c61', x + dx, y - h + 1, 1, h); box(g, '#b1c77c', x + dx + sway, y - h + 1, 1, 1); }
    }
    // Where a prop touches the ground, read from its own alpha: the opaque
    // extent of its bottom rows. Item-agnostic; cached per sprite. Scene space.
    contact(o) {
      const sprite = o.sprite, w = sprite.width, h = sprite.height;
      if (!contacts.has(sprite)) {
        const alpha = art.alpha.get(sprite), rows = Math.max(2, Math.round(h * .08)); let min = w, max = -1;
        for (let y = h - rows; y < h; y++) for (let x = 0; x < w; x++) if (alpha[(y * w + x) * 4 + 3] > 40) { if (x < min) min = x; if (x > max) max = x; }
        contacts.set(sprite, max < 0 ? { centre: w / 2, width: w } : { centre: (min + max + 1) / 2, width: max - min + 1 });
      }
      const c = contacts.get(sprite);
      return { x: o.x + (c.centre - o.anchor[0]) * o.scale, y: o.y, w: c.width * o.scale, h: h * o.scale };
    }
    contacts() { return this.props.filter(o => o.kind !== 'grass' && this.grassAt(o.x, o.y)).map(o => this.contact(o)); }
    hit(x, y) {
      x *= 2; y *= 2;
      return this.hitProps.find(o => {
        const w = o.sprite.width, h = o.sprite.height, sx = Math.floor((x - o.x) / o.scale + o.anchor[0]), sy = Math.floor((y - o.y) / o.scale + o.anchor[1]);
        return sx >= 0 && sx < w && sy >= 0 && sy < h && art.alpha.get(o.sprite)[(sy * w + sx) * 4 + 3] > 0;
      });
    }
    rustle(o) {
      if (o.plant == null || o.plant === 6) return false;
      o.rustledAt = this.time;
      for (let i = 0; i < 6; i++) this.leaves.push({ x: o.x + (i * 13 % 35) - 17, y: o.y - o.sprite.height * o.scale * .6, phase: i * 1.7, start: this.time });
      this.leaves = this.leaves.slice(-36); return true;
    }
    water(g, condition, t) {
      const p = this.pool, state = condition.sunk ? 'sunk' : condition.state;
      const look = Eco.WATER_LOOKS[({ calme: 'clear', 'traité': 'treated', sauvage: 'algae', critique: 'murky', sunk: 'murky' })[state] || 'clear'];
      const palette = state === 'sunk' ? ['#172532', '#1c3040', '#283b4c', '#394557', '#3f4d56'] : look.bands;
      t *= look.speed * (.45 + this.climate.patch.water / 100);
      g.save(); g.beginPath(); g.rect(p.x, p.y, p.w, p.h); g.clip(); box(g, palette[0], p.x, p.y, p.w, p.h);
      for (let y = 0; y < p.h; y += 4) box(g, palette[Math.min(4, Math.floor(y / (p.h / 5)))], p.x, p.y + y, p.w, 4);
      box(g, look.deep, p.x, p.y, p.w, 4); box(g, look.edge, p.x, p.y + 4, p.w, 3);
      g.globalAlpha = .14 * look.clarity;
      for (let x = p.x + 15; x < p.x + p.w; x += 20) line(g, '#ddf8dd', [[x, p.y + 10], [x - 3, p.y + p.h]]);
      for (let y = p.y + 15; y < p.y + p.h; y += 18) box(g, '#ebf8db', p.x, y, p.w, 1);
      for (let i = 0; i < look.caustics; i++) {
        const x = p.x + i * 37 % p.w, y = p.y + i * 29 % p.h, shift = Math.round(Math.sin(t * .3 + i) * (1 + this.climate.patch.breeze / 35));
        g.globalAlpha = (.12 + .07 * (Math.sin(t * .8 + i * 1.7) * .5 + .5)) * look.clarity;
        line(g, look.shine, [[x + shift, y], [x + 4 + shift, y - 2], [x + 8 + shift, y - 2], [x + 12 + shift, y]]);
        if (i % 3 === 0) line(g, '#ddf7dc', [[x + 4 + shift, y - 2], [x + 6, y - 7], [x + 10, y - 9]]);
      }
      g.globalAlpha = .12; polygon(g, '#daf2d5', [[p.x + 20, p.y], [p.x + 55, p.y], [p.x + p.w, p.y + p.h * .6], [p.x + p.w, p.y + p.h * .8]]);
      g.globalAlpha = .17; polygon(g, '#22575b', [[p.x, p.y], [p.x + 32, p.y], [p.x + 48, p.y + 13], [p.x + 30, p.y + 21], [p.x + 40, p.y + 32], [p.x, p.y + 29]]);
      g.globalAlpha = .75;
      for (let i = 0; i < (condition.s?.dirt || 0) * 16; i++) box(g, i % 3 ? '#849862' : '#b6a775', p.x + 5 + i * 37 % (p.w - 10), p.y + 6 + i * 53 % (p.h - 12), 3, 1);
      if (look.clarity < .5) for (let i = 0; i < 12; i++) { g.globalAlpha = .2; ellipse(g, look.edge, p.x + i * 43 % p.w, p.y + i * 31 % p.h, 5 + i % 5, 2); }
      g.restore();
      const lx = clamp(this.layout.anchors.la.x * T + 12, p.x + 12, p.x + p.w - 22), ly = p.y + p.h - 10;
      line(g, '#477477', [[lx - 1, ly + 12], [lx - 1, ly - 11], [lx + 2, ly - 14], [lx + 6, ly - 14], [lx + 8, ly - 11], [lx + 8, ly + 4]], 2);
      for (const dx of [0, 12]) line(g, '#f8f0cf', [[lx + dx - 3, ly + 10], [lx + dx - 3, ly - 12], [lx + dx, ly - 15], [lx + dx + 4, ly - 15], [lx + dx + 6, ly - 12]], 2);
      for (let y = ly - 7; y < ly + 6; y += 6) box(g, '#c2e1cd', lx - 2, y, 12, 2);
    }
    paintObject(g, o, t, hero, quiet) {
      const grass = o.kind === 'grass', source = o.zoneAccent ? art.zones[`${this.theme.id}-${Zones.grassStage(this.cycle.height)}`] : grass ? art.grass[Math.min(o.size, Math.floor(o.size * this.cycle.height))][o.variant] : o.sprite;
      const w = Math.round(source.width * o.scale), h = Math.max(3, Math.round(source.height * o.scale * (grass ? (o.zoneAccent ? 1 : .75 + this.cycle.height * .25) * (1 - o.flatten * .55) : 1)));
      const sway = quiet ? 0 : Math.sin(t * 1.1 + o.phase) * this.climate.patch.breeze / 60 + (o.bend || 0);
      const frame = art.frames.get(source)?.[grass ? clamp(Math.round(sway), -2, 2) + 2 : this.frameIndex(o, t, quiet)] || source;
      const behind = (o.occludes || o.plant != null && o.plant < 4 || o.zoneAccent && o.y - h < hero[1] - Zones.MAX_GRASS_HEIGHT) && hero[1] < o.y && hero[1] > o.y - h && Math.abs(hero[0] - o.x) < w * .4;
      g.save(); if (behind) g.globalAlpha = .58;
      const anchor = grass ? [source.width / 2, source.height] : o.anchor;
      g.drawImage(frame, Math.round(o.x - (anchor[0] + (frame.width - source.width) / 2) * o.scale), Math.round(o.y - anchor[1] / source.height * h), Math.round(frame.width * o.scale), h); g.restore();
    }
    // Fresh footprints, actor shadows, then scenery and actors in depth order. Coordinates: scene space (512x384).
    paintScenery(ctx, condition, time, foot, actors, quiet = false) {
      const t = quiet ? 0 : time;
      for (const track of this.tracks) { ctx.globalAlpha = (1 - (time - track.at) / 2) * .2; ellipse(ctx, '#a7bd78', track.x, track.y, 5, 2); } ctx.globalAlpha = 1;
      actors = actors.slice().sort((a, b) => a.y - b.y);
      for (const actor of actors) {
        if (actor.castShadow) { ctx.save(); ctx.globalAlpha = (this.interior ? .15 : .22) * (1 - this.climate.visual.cloud * .55); ctx.scale(2, 2); ctx.translate(actor.x, actor.y); ctx.transform(1, 0, this.shadowShear, this.interior ? .26 : -.36, 0, 0); actor.castShadow(); ctx.restore(); }
        ctx.globalAlpha = this.interior ? .16 : .22; ellipse(ctx, '#254e43', actor.x * 2, actor.y * 2 - 1, actor.shadow || 7, 2);
      } ctx.globalAlpha = 1;
      const drawActor = a => { ctx.save(); ctx.scale(2, 2); a.draw({ light: this.lightAt(a.x * 2, a.y * 2) }); ctx.restore(); this.footGrass(ctx, a, t, quiet); };
      let next = 0;
      for (const o of this.scenery) { while (next < actors.length && actors[next].y * 2 <= (o.depth ?? o.y)) drawActor(actors[next++]); this.paintObject(ctx, o, t, foot, quiet); if (this.onObjectGrass && o.kind !== 'grass' && this.grassAt(o.x, o.y)) this.onObjectGrass(ctx, o, this.contact(o)); }
      while (next < actors.length) drawActor(actors[next++]);
      if (condition?.filtre > condition?.interval) { const pump = this.props.find(o => o.kind === 'pump'); if (pump) box(ctx, '#e9ac6a', pump.x + 5, pump.y - 21, 3, 3); }
      this.leaves = this.leaves.filter(e => time - e.start < 2.2);
      if (!quiet) for (const e of this.leaves) { const age = time - e.start; ctx.globalAlpha = Math.min(1, (2.2 - age) * 2); box(ctx, '#d5cf79', e.x + age * 11 + Math.sin(age * 4 + e.phase) * 4, e.y + age * 14, 2, 2); }
      if (this.interior && !quiet) for (let i = 0; i < 7; i++) { const x = 72 + i * 30 + Math.sin(t * .25 + i) * 3, y = 74 + (i * 37 + t * 1.5) % 170; if (window.QuestHubArt.sunlit('bureau', x, y)) { ctx.globalAlpha = .18 + Math.sin(t * .5 + i) * .1; box(ctx, '#fff7d7', x, y); } }
      ctx.globalAlpha = 1; if (this.foreground) ctx.drawImage(this.foreground, 0, 0);
    }
    // Time-of-day mood, cloud, rain and the vignette. Scene space.
    paintSky(ctx, t, quiet = false) {
      const { patch, visual } = this.climate;
      ctx.globalAlpha = patch.mood === 'dusk' ? .22 : patch.mood === 'golden' ? .1 : (.02 + visual.warmth * .04) * visual.sunStrength;
      box(ctx, patch.mood === 'dusk' ? '#263756' : '#ffc566', 0, 0, this.width, this.height);
      if (!this.interior) { ctx.globalAlpha = visual.cloud * .12; box(ctx, '#6d929e', 0, 0, this.width, this.height);
        if (!quiet && visual.rain > .01) { ctx.globalAlpha = .25; for (let i = 0; i < Math.ceil(visual.rain * 44); i++) { const x = (i * 97 + t * 22) % this.width, y = (i * 61 + t * 150) % this.height; line(ctx, '#d9eee7', [[x, y], [x - 2 - patch.breeze / 30, y + 7]]); } }
      }
      for (let i = 0; i < 4; i++) { ctx.globalAlpha = .03; const edge = i * 5; box(ctx, '#214e45', edge, edge, this.width - edge * 2, 5); box(ctx, '#214e45', edge, this.height - edge - 5, this.width - edge * 2, 5); box(ctx, '#214e45', edge, edge + 5, 5, this.height - edge * 2 - 10); box(ctx, '#214e45', this.width - edge - 5, edge + 5, 5, this.height - edge * 2 - 10); }
      ctx.globalAlpha = 1;
    }
    paint(ctx, condition, time, hero, actors = [], quiet = false) {
      const dt = Math.min(.25, Math.max(0, time - this.time)); this.time = time; const t = quiet ? 0 : time, foot = hero.map(n => n * 2);
      if (Date.now() >= this.nextClimate) { const previous = this.cycle.height; this.refreshClimate(); if (previous !== this.cycle.height && !this.surface) this.makeLawn(); }
      const vx = dt && this.lastFoot ? (foot[0] - this.lastFoot[0]) / dt : 0, vy = dt && this.lastFoot ? (foot[1] - this.lastFoot[1]) / dt : 0;
      for (const tuft of this.grass) { const impulse = Eco.passageImpulse(tuft, { x: foot[0], y: foot[1], vx, vy });
        for (let left = dt; left > 0; left -= .05) Eco.advanceGrassMemory(tuft, impulse, Math.min(.05, left), quiet);
      }
      for (const cell of this.meadow) {
        const near = Math.abs(cell.x - foot[0]) < 22 && Math.abs(cell.y - foot[1]) < 22;
        if (near || Math.abs(cell.bend) > .005 || cell.flatten > .005 || Math.abs(cell.bendVelocity) > .005) {
          const impulse = near ? Eco.passageImpulse(cell, { x: foot[0], y: foot[1], vx, vy }) : { bend: 0, pressure: 0 };
          const previous = [cell.bend, cell.flatten];
          for (let left = dt; left > 0; left -= .05) Eco.advanceGrassMemory(cell, impulse, Math.min(.05, left), quiet);
          if (Math.abs(previous[0] - cell.bend) > .001 || Math.abs(previous[1] - cell.flatten) > .001) this.meadowDirty = true;
        } else { cell.bend = 0; cell.flatten = 0; cell.bendVelocity = 0; }
      }
      if (!quiet && this.lastFoot && this.grassAt(...foot)) { this.trackDistance += Math.hypot(foot[0] - this.lastFoot[0], foot[1] - this.lastFoot[1]); if (this.trackDistance > 9) { this.tracks.push({ x: foot[0], y: foot[1], at: time }); this.trackDistance = 0; } }
      this.lastFoot = foot; this.tracks = quiet ? [] : this.tracks.filter(p => time - p.at < 2).slice(-32); this.updateShadows(t, quiet);
      ctx.save(); ctx.scale(.5, .5); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.base, 0, 0); if (this.lawn) ctx.drawImage(this.lawn, 0, 0); if (this.pool) this.water(ctx, condition, t); this.paintMeadow(ctx, t, quiet); ctx.drawImage(this.shadows, 0, 0);
      this.paintScenery(ctx, condition, time, foot, actors, quiet);
      this.paintSky(ctx, t, quiet);
      ctx.restore();
    }
  }
  return { ready, plan, lawnEligibility, paintBattle, create: (layout, options) => art && (!layout.npcs || window.QuestHubArt && layout.scenery.every(p => !p.asset || art.hubProps[p.asset])) ? new Scene(layout, options) : null, get status() { return { loaded: !!art, zoneAssets: art ? Object.keys(art.zones).length : 0, hubsLoaded: !!art && !hubFailure && Object.keys(art.hubProps).length > 0, hubProps: art ? Object.keys(art.hubProps).length : 0, failure, hubFailure }; } };
})();
if (typeof window !== 'undefined') window.QuestWorld = QuestWorld;
if (typeof module !== 'undefined') module.exports = QuestWorld;
