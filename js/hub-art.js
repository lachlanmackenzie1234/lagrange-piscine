/* Hub surfaces: 384×288 Bureau, 512×384 Dépôt. Props/actors/shadows are separate. */
const QuestHubArt = (() => {
  const W = 512, H = 384;
  const surface = (width = W, height = H) => { const c = document.createElement('canvas'); c.width = width; c.height = height; return c; };
  const seeded = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  function box(g, c, x, y, w = 1, h = 1) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function polygon(g, c, points) { g.fillStyle = c; g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); }
  function inside(x, y, points) {
    let yes = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [ax, ay] = points[i], [bx, by] = points[j];
      if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) yes = !yes;
    }
    return yes;
  }
  const yard = [[67, 111], [450, 113], [468, 263], [448, 309], [332, 333], [320, 384], [192, 384], [186, 336], [64, 320], [50, 226]];
  const beams = [
    [[24, 384], [488, 384], [488, 92], [178, 92]],
    [[24, 384], [168, 384], [302, 94], [244, 94]],
  ];
  const isGrass = (id, x, y) => id === 'depot' && !inside(x, y, yard);
  const sunlit = (id, x, y) => id !== 'bureau' || beams.some(b => inside(x / .75, y / .75, b));

  function bureau(plants) {
    const base = surface(), fg = surface(), g = base.getContext('2d'), f = fg.getContext('2d'), rand = seeded(5031);
    box(g, '#465b54', 0, 0, W, H);
    box(g, '#a6b3aa', 18, 64, 478, H - 64);
    // Pale grey-white stone: restrained mottling, worn corners, narrow grout.
    for (let y = 64; y < H; y += 24) for (let x = 24; x < 488; x += 24) {
      const col = ['#d4d9d2', '#dde0d8', '#ccd4cc', '#e1e3db'][Math.floor(rand() * 4)];
      box(g, col, x, y, 23, 23); box(g, '#f0eee3', x + 1, y + 1, 21, 1); box(g, '#b8c2b9', x + 1, y + 22, 21, 1);
      g.globalAlpha = .14;
      for (let n = 0; n < 5; n++) box(g, '#91a59a', x + 2 + rand() * 18, y + 3 + rand() * 16, 1 + rand() * 4, 1);
      g.globalAlpha = 1;
    }
    // Full back wall curtain. Individual folds have short broken highlights.
    box(g, '#a09e8b', 18, 7, 478, 66); box(g, '#887f64', 18, 5, 478, 5); box(g, '#d7c99f', 18, 5, 478, 2);
    for (let x = 23; x < 490; x += 12) {
      const bottom = 71 + Math.round(rand() * 4);
      box(g, '#e0ded0', x, 11, 12, bottom - 11); box(g, '#f0ecdd', x + 1, 13, 3, bottom - 16);
      box(g, '#c0c4b6', x + 7, 11, 3, bottom - 11); box(g, '#a4afa1', x + 10, 12, 2, bottom - 12);
      box(g, '#d0d2c4', x + 4, 13, 3, bottom - 13); box(g, '#aab4a8', x + 4, bottom - 2, 6, 2);
      box(g, '#dce0d2', x + 5, 25 + rand() * 19, 1, 15); box(g, '#bcbda9', x + 4, 14, 4, 2);
    }
    g.globalAlpha = .14; box(g, '#426057', 24, 75, 464, 4); box(g, '#426057', 24, 79, 464, 2); g.globalAlpha = 1;
    // Cutaway side walls and warm wood skirting keep the floor framed.
    for (const x of [8, 488]) { box(g, '#c3c5b4', x, 11, 16, H - 11); box(g, '#e1deca', x + 2, 14, 11, H - 14); box(g, '#83795e', x + (x < 100 ? 12 : 0), 68, 4, H - 68); }
    for (const beam of beams) { g.globalAlpha = .14; polygon(g, '#fff1b6', beam); g.globalAlpha = .055; polygon(g, '#fffbd4', beam.map(([x, y], i) => [x + (i % 3 ? 4 : -4), y])); }
    g.globalAlpha = 1;
    // A small threshold mat follows the bottom-right entrance.
    box(g, '#7b9086', 379, 300, 49, 24); box(g, '#a7b3a1', 381, 302, 45, 20);
    for (let x = 384; x < 424; x += 5) box(g, '#879c8d', x, 304, 1, 16);
    // The full glass frontage is cut away: its daylight remains on the tiles.
    // Only the bottom-right glass door and a fine floor threshold are visible.
    g.globalAlpha = .06; box(g, '#fff5d4', 24, 368, 464, 16); g.globalAlpha = 1;
    f.globalAlpha = .35; box(f, '#d9e7dd', 24, H - 2, 464, 1); f.globalAlpha = 1;
    f.globalAlpha = .15; box(f, '#a6d5d2', 377, 324, 56, 59);
    f.globalAlpha = .19; polygon(f, '#f5fff1', [[379, 329], [387, 329], [430, 372], [430, 383], [425, 383], [379, 337]]); f.globalAlpha = 1;
    box(f, '#79978f', 372, 320, 65, 3); box(f, '#d5e0d5', 374, 322, 2, 62); box(f, '#7c9991', 435, 322, 2, 62);
    box(f, '#edf0df', 376, 323, 1, 60); box(f, '#e0e8dc', 434, 323, 1, 60);
    box(f, '#63837d', 426, 351, 2, 13); box(f, '#d4c799', 427, 352, 2, 11); box(f, '#b4c2b6', 372, 381, 65, 3);
    // Reuse the authored surfaces at the smaller room size. Props, characters
    // and collision are placed independently at native coordinates afterward.
    const fit = source => { const c = surface(384, 288), ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.drawImage(source, 0, 0, 384, 288); return c; };
    return { base: fit(base), foreground: fit(fg) };
  }

  function depot() {
    const base = surface(), fg = surface(), g = base.getContext('2d'), f = fg.getContext('2d'), rand = seeded(9715);
    for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) {
      const n = Math.sin(x / 71 + y / 102) + Math.cos(y / 44) + rand() * .25;
      box(g, ['#84a77b', '#96b77c', '#a8c17c', '#b3c881'][Math.max(0, Math.min(3, Math.floor(n + 1.5)))], x, y, 4, 4);
    }
    polygon(g, '#84956b', yard.map(([x, y]) => [x + 3, y + 3])); polygon(g, '#babb91', yard); polygon(g, '#d1ccab', yard.map(([x, y]) => [x + (x < 250 ? 3 : -3), y]));
    for (let i = 0; i < 8400; i++) {
      const x = rand() * W, y = rand() * H, gravel = inside(x, y, yard);
      g.globalAlpha = gravel ? .2 + rand() * .2 : .11;
      box(g, gravel ? i % 3 ? '#96a58d' : '#f3e5b7' : i % 3 ? '#56866b' : '#d9dfa0', x, y, i % 8 ? 1 : 3, 1);
    }
    g.globalAlpha = 1;
    // Patches of compacted gravel and twin worn tyre tracks lead out of the pad.
    for (let i = 0; i < 15; i++) {
      const x = 103 + i * 8.8, y = 148 + i * 13.5;
      if (!inside(x, y, yard)) continue;
      g.globalAlpha = .10; box(g, '#849380', x, y, 8, 5); box(g, '#849380', x + 30, y + 1, 8, 5);
      g.globalAlpha = .12; box(g, '#f3e6bb', x - 1, y, 3, 1); box(g, '#f3e6bb', x + 29, y + 1, 3, 1);
    }
    g.globalAlpha = 1;
    // Worn service paving in front of the workshop, and a trailer standing pad.
    for (let y = 124; y < 174; y += 16) for (let x = 280; x < 478; x += 24) { box(g, '#b1b69b', x, y, 23, 15); box(g, '#e1dac0', x + 1, y + 1, 21, 1); }
    box(g, '#9ea992', 58, 116, 116, 35); box(g, '#bfbea0', 60, 117, 112, 32);
    for (let i = 0; i < 36; i++) box(g, '#9aab93', 62 + rand() * 108, 120 + rand() * 27, 2, 1);
    // Low stone borders and an open timber gate are a foreground layer.
    for (const [left, right] of [[12, 186], [330, 500]]) {
      box(f, '#56775c', left, 365, right - left, 19);
      for (let x = left; x < right - 8; x += 14) { const y = 359 + x % 3; box(f, '#8c9d83', x, y, 13, 11); box(f, '#cad0ac', x + 1, y, 10, 3); box(f, '#71866b', x + 2, y + 10, 10, 2); }
      for (let x = left + 5; x < right; x += 18) { box(f, '#655d40', x, 334, 4, 27); box(f, '#b89860', x + 1, 332, 4, 27); box(f, '#e2c888', x + 2, 334, 1, 20); }
      box(f, '#8c744b', left, 341, right - left, 4); box(f, '#d5b77c', left, 341, right - left, 1);
    }
    for (const x of [181, 327]) { box(f, '#635c41', x, 326, 9, 48); box(f, '#b08e55', x + 1, 324, 7, 47); box(f, '#e1c78e', x + 2, 325, 2, 43); }
    return { base, foreground: fg };
  }
  function grass(layout) {
    if (layout.id !== 'depot') return [];
    const rand = seeded(2216), result = [];
    for (let i = 0; i < 220; i++) {
      const x = Math.round(rand() * W), y = Math.round(90 + rand() * 280);
      if (!isGrass('depot', x, y) || result.some(t => Math.hypot(t.x - x, t.y - y) < 9)) continue;
      result.push({ kind: 'grass', x, y, size: Math.floor(rand() * 3), variant: i % 3, phase: rand() * Math.PI * 2 });
    }
    return result;
  }
  return { build: (id, plants) => id === 'bureau' ? bureau(plants) : depot(), grass, isGrass, sunlit };
})();
if (typeof window !== 'undefined') window.QuestHubArt = QuestHubArt;
if (typeof module !== 'undefined') module.exports = QuestHubArt;
