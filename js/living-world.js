/* Living-world rendering from Pixel Lab v5, adapted to 23 pools and two NPC hubs.
 * Art, collision, gameplay, and maintenance records remain separate.
 */
const QuestWorld = (() => {
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
    const rand = seeded(hash(layout.id)), props = [], grass = [];
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
        x: (o.x + o.w / 2) * T, y: (o.y + o.h) * T - 2, scale: tree ? .66 + rand() * .15 : o.kind === 'villa' ? .94 : o.kind === 'shed' ? .9 : 1,
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
    for (let i = 0; i < 440; i++) {
      const x = Math.round(rand() * W), y = Math.round(rand() * H), size = Math.floor(rand() * 4), margin = 3 + size * 2;
      if (!clear(x, y, margin) || !clear(x - margin, y, 0) || !clear(x + margin, y, 0) || grass.some(t => Math.hypot(x - t.x, (y - t.y) * 1.4) < margin + 3)) continue;
      grass.push({ kind: 'grass', x, y, size, variant: Math.floor(rand() * 3), phase: rand() * TAU });
    }
    return { props, grass };
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
  let art = null, failure = null, hubFailure = null, battleBackdrop = null;
  const ready = typeof document === 'undefined' ? Promise.resolve(false) : (async () => {
    try {
      const base = new URL('../assets/quest-world/', document.currentScript.src);
      const [source, manifest] = await Promise.all([loadImage(new URL('foliage.png', base).href), fetch(new URL('foliage.json', base)).then(r => { if (!r.ok) throw new Error('Foliage manifest unavailable'); return r.json(); })]);
      const plants = manifest.regions.map(([x, y, w, h]) => { const c = surface(w, h), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(source, x, y, w, h, 0, 0, w, h); return c; });
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
      const all = [...plants, ...grass.flat(), ...Object.values(props), ...Object.values(hubProps)];
      const animated = new Set([...plants, ...grass.flat()]);
      art = { plants, grass, props, hubProps, frames: new Map(), shadows: new Map(), alpha: new Map() };
      all.forEach(c => { if (animated.has(c)) art.frames.set(c, bendFrames(c)); art.shadows.set(c, shadowSprite(c)); art.alpha.set(c, c.getContext('2d').getImageData(0, 0, c.width, c.height).data); });
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
    constructor(layout) {
      this.layout = layout; this.pool = layout.pool ? rect(layout.pool) : null; this.time = 0; this.leaves = [];
      [this.width, this.height] = layout.size || [W, H];
      this.interior = layout.id === 'bureau';
      const hub = !!layout.npcs, decoration = hub ? { props: layout.scenery, grass: window.QuestHubArt.grass(layout) } : plan(layout);
      if (hub) { const room = window.QuestHubArt.build(layout.id, art.plants); this.base = room.base; this.foreground = room.foreground; } else this.base = makeGround(layout);
      this.props = decoration.props.map((o, i) => ({ scale: 1, phase: i * 2.73, ...o, sprite: o.asset ? art.hubProps[o.asset] : o.plant == null ? art.props[o.kind] : art.plants[o.plant] }));
      this.scenery = [...this.props, ...decoration.grass.map(o => ({ ...o, scale: 1, sprite: art.grass[o.size][o.variant] }))].sort((a, b) => a.y - b.y);
      this.hitProps = this.props.slice().sort((a, b) => b.y - a.y);
      this.shadows = surface(this.width, this.height); const g = this.shadows.getContext('2d');
      this.props.forEach(o => { const sprite = art.shadows.get(o.sprite); g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = this.interior ? .13 : o.plant != null ? .2 : .25; g.translate(Math.round(o.x), Math.round(o.y)); g.transform(1, 0, this.interior ? -.3 : -.58, this.interior ? .25 : -.3, 0, 0); g.drawImage(sprite, -Math.round(sprite.width * o.scale / 2), -Math.round(sprite.height * o.scale), Math.round(sprite.width * o.scale), Math.round(sprite.height * o.scale)); g.restore(); });
      const pixels = g.getImageData(0, 0, this.width, this.height).data;
      this.shade = new Uint8Array(this.width * this.height); for (let i = 0; i < this.shade.length; i++) this.shade[i] = pixels[i * 4 + 3];
    }
    lightAt(x, y) {
      const shade = this.shade[clamp(Math.floor(y), 0, this.height - 1) * this.width + clamp(Math.floor(x), 0, this.width - 1)];
      return shade > 40 ? 'shade' : this.interior && !window.QuestHubArt.sunlit(this.layout.id, x, y) ? 'interior' : 'sun';
    }
    grassAt(x, y) {
      return this.pool ? this.layout.ground[Math.floor(y / T)]?.[Math.floor(x / T)] === 'grass' : window.QuestHubArt.isGrass(this.layout.id, x, y);
    }
    footGrass(g, actor, t) {
      const x = Math.round(actor.x * 2), y = Math.round(actor.y * 2);
      if (!this.grassAt(x, y) || actor.grass === false) return;
      // A few rooted blades overlap the soles rather than drawing a green halo.
      const sway = Math.round(Math.sin(t * 1.2 + x) * .5);
      for (const [dx, h] of [[-6, 2], [-3, 4], [2, 3], [5, 2]]) { box(g, '#5d8c61', x + dx, y - h + 1, 1, h); box(g, '#b1c77c', x + dx + sway, y - h + 1, 1, 1); }
    }
    hit(x, y) {
      x *= 2; y *= 2;
      return this.hitProps.find(o => {
        const w = o.sprite.width, h = o.sprite.height, sx = Math.floor((x - o.x) / o.scale + w / 2), sy = Math.floor((y - o.y) / o.scale + h);
        return sx >= 0 && sx < w && sy >= 0 && sy < h && art.alpha.get(o.sprite)[(sy * w + sx) * 4 + 3] > 0;
      });
    }
    rustle(o) {
      if (o.plant == null) return false;
      o.rustledAt = this.time;
      for (let i = 0; i < 6; i++) this.leaves.push({ x: o.x + (i * 13 % 35) - 17, y: o.y - o.sprite.height * o.scale * .6, phase: i * 1.7, start: this.time });
      this.leaves = this.leaves.slice(-36); return true;
    }
    water(g, condition, t) {
      const p = this.pool, state = condition.sunk ? 'sunk' : condition.state;
      const palette = ({ calme: ['#55b6bd', '#64c0c2', '#70ced0', '#94e2d8'], 'traité': ['#55bbae', '#62c7b2', '#71d0bf', '#94dfcb'], sauvage: ['#648f68', '#78a77b', '#95b98a', '#bdce9b'], critique: ['#455e4b', '#527355', '#6c8a60', '#8eaa74'], sunk: ['#172532', '#1c3040', '#283b4c', '#394557'] })[state] || ['#55b6bd', '#64c0c2', '#70ced0', '#94e2d8'];
      g.save(); g.beginPath(); g.rect(p.x, p.y, p.w, p.h); g.clip(); box(g, palette[0], p.x, p.y, p.w, p.h);
      for (let y = 0; y < p.h; y += 4) box(g, palette[Math.min(3, Math.floor(y / (p.h / 4)))], p.x, p.y + y, p.w, 4);
      box(g, '#356d79', p.x, p.y, p.w, 4); box(g, '#478f94', p.x, p.y + 4, p.w, 3);
      g.globalAlpha = .14;
      for (let x = p.x + 15; x < p.x + p.w; x += 20) line(g, '#ddf8dd', [[x, p.y + 10], [x - 3, p.y + p.h]]);
      for (let y = p.y + 15; y < p.y + p.h; y += 18) box(g, '#ebf8db', p.x, y, p.w, 1);
      for (let i = 0; i < 48; i++) {
        const x = p.x + i * 37 % p.w, y = p.y + i * 29 % p.h, shift = Math.round(Math.sin(t * .3 + i) * 2);
        g.globalAlpha = .12 + .07 * (Math.sin(t * .8 + i * 1.7) * .5 + .5);
        line(g, '#f3ffdd', [[x + shift, y], [x + 4 + shift, y - 2], [x + 8 + shift, y - 2], [x + 12 + shift, y]]);
        if (i % 3 === 0) line(g, '#ddf7dc', [[x + 4 + shift, y - 2], [x + 6, y - 7], [x + 10, y - 9]]);
      }
      g.globalAlpha = .12; polygon(g, '#daf2d5', [[p.x + 20, p.y], [p.x + 55, p.y], [p.x + p.w, p.y + p.h * .6], [p.x + p.w, p.y + p.h * .8]]);
      g.globalAlpha = .17; polygon(g, '#22575b', [[p.x, p.y], [p.x + 32, p.y], [p.x + 48, p.y + 13], [p.x + 30, p.y + 21], [p.x + 40, p.y + 32], [p.x, p.y + 29]]);
      g.globalAlpha = .75;
      for (let i = 0; i < (condition.s?.dirt || 0) * 16; i++) box(g, i % 3 ? '#849862' : '#b6a775', p.x + 5 + i * 37 % (p.w - 10), p.y + 6 + i * 53 % (p.h - 12), 3, 1);
      g.restore();
      const lx = clamp(this.layout.anchors.la.x * T + 12, p.x + 12, p.x + p.w - 22), ly = p.y + p.h - 10;
      line(g, '#477477', [[lx - 1, ly + 12], [lx - 1, ly - 11], [lx + 2, ly - 14], [lx + 6, ly - 14], [lx + 8, ly - 11], [lx + 8, ly + 4]], 2);
      for (const dx of [0, 12]) line(g, '#f8f0cf', [[lx + dx - 3, ly + 10], [lx + dx - 3, ly - 12], [lx + dx, ly - 15], [lx + dx + 4, ly - 15], [lx + dx + 6, ly - 12]], 2);
      for (let y = ly - 7; y < ly + 6; y += 6) box(g, '#c2e1cd', lx - 2, y, 12, 2);
    }
    paintObject(g, o, t, hero, quiet) {
      const grass = o.kind === 'grass', w = Math.round(o.sprite.width * o.scale), h = Math.round(o.sprite.height * o.scale);
      const brush = grass && !quiet ? Math.max(0, 1 - Math.hypot(hero[0] - o.x, hero[1] - o.y) / 17) * Math.sign(o.x - hero[0]) * 2 : 0;
      const rustle = o.rustledAt == null ? 0 : Math.max(0, 1.6 - (this.time - o.rustledAt));
      const sway = quiet || o.plant == null && !grass ? 0 : Math.sin(t * .9 + o.phase) * .7 + brush + Math.sin(rustle * 20) * rustle;
      const frame = art.frames.get(o.sprite)?.[clamp(Math.round(sway), -2, 2) + 2] || o.sprite;
      const behind = (o.occludes || o.plant != null && o.plant < 4) && hero[1] < o.y && hero[1] > o.y - h && Math.abs(hero[0] - o.x) < w * .4;
      g.save(); if (behind) g.globalAlpha = .58;
      g.drawImage(frame, Math.round(o.x - w / 2 - (frame.width - o.sprite.width) / 2 * o.scale), Math.round(o.y - h), Math.round(frame.width * o.scale), h); g.restore();
    }
    paint(ctx, condition, time, hero, actors = [], quiet = false) {
      this.time = time; const t = quiet ? 0 : time, foot = hero.map(n => n * 2);
      ctx.save(); ctx.scale(.5, .5); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.base, 0, 0); if (this.pool) this.water(ctx, condition, t); ctx.drawImage(this.shadows, 0, 0);
      actors = actors.slice().sort((a, b) => a.y - b.y);
      for (const actor of actors) {
        if (actor.castShadow) { ctx.save(); ctx.globalAlpha = this.interior ? .15 : .22; ctx.scale(2, 2); ctx.translate(actor.x, actor.y); ctx.transform(1, 0, this.interior ? -.35 : -.72, this.interior ? .26 : -.36, 0, 0); actor.castShadow(); ctx.restore(); }
        ctx.globalAlpha = this.interior ? .16 : .22; ellipse(ctx, '#254e43', actor.x * 2, actor.y * 2 - 1, actor.shadow || 7, 2);
      } ctx.globalAlpha = 1;
      const drawActor = a => { ctx.save(); ctx.scale(2, 2); a.draw({ light: this.lightAt(a.x * 2, a.y * 2) }); ctx.restore(); this.footGrass(ctx, a, t); };
      let next = 0;
      for (const o of this.scenery) { while (next < actors.length && actors[next].y * 2 <= o.y) drawActor(actors[next++]); this.paintObject(ctx, o, t, foot, quiet); }
      while (next < actors.length) drawActor(actors[next++]);
      if (condition?.filtre > condition?.interval) { const pump = this.props.find(o => o.kind === 'pump'); if (pump) box(ctx, '#e9ac6a', pump.x + 5, pump.y - 21, 3, 3); }
      this.leaves = this.leaves.filter(e => time - e.start < 2.2);
      if (!quiet) for (const e of this.leaves) { const age = time - e.start; ctx.globalAlpha = Math.min(1, (2.2 - age) * 2); box(ctx, '#d5cf79', e.x + age * 11 + Math.sin(age * 4 + e.phase) * 4, e.y + age * 14, 2, 2); }
      if (this.interior && !quiet) for (let i = 0; i < 7; i++) { const x = 72 + i * 30 + Math.sin(t * .25 + i) * 3, y = 74 + (i * 37 + t * 1.5) % 170; if (window.QuestHubArt.sunlit('bureau', x, y)) { ctx.globalAlpha = .18 + Math.sin(t * .5 + i) * .1; box(ctx, '#fff7d7', x, y); } }
      ctx.globalAlpha = 1; if (this.foreground) ctx.drawImage(this.foreground, 0, 0);
      ctx.globalAlpha = this.interior ? .025 : .045; box(ctx, '#ffc566', 0, 0, this.width, this.height);
      for (let i = 0; i < 4; i++) { ctx.globalAlpha = .03; const edge = i * 5; box(ctx, '#214e45', edge, edge, this.width - edge * 2, 5); box(ctx, '#214e45', edge, this.height - edge - 5, this.width - edge * 2, 5); box(ctx, '#214e45', edge, edge + 5, 5, this.height - edge * 2 - 10); box(ctx, '#214e45', this.width - edge - 5, edge + 5, 5, this.height - edge * 2 - 10); }
      ctx.restore();
    }
  }
  return { ready, plan, paintBattle, create: layout => art && (!layout.npcs || window.QuestHubArt && layout.scenery.every(p => !p.asset || art.hubProps[p.asset])) ? new Scene(layout) : null, get status() { return { loaded: !!art, hubsLoaded: !!art && !hubFailure && Object.keys(art.hubProps).length > 0, hubProps: art ? Object.keys(art.hubProps).length : 0, failure, hubFailure }; } };
})();
if (typeof window !== 'undefined') window.QuestWorld = QuestWorld;
if (typeof module !== 'undefined') module.exports = QuestWorld;
