/*
 * Pocket Coast — the Quest's pixel art, hand-drawn and data-free.
 * Chunky square pixels, a 1-px ink outline on everything alive, flat fills
 * with one shade step, light from the top-left. Sizes are the game's pixel
 * budget: keeper 24×32 (legacy trainer 16×24), creatures 24×24, monsters 28×24, items 16×16,
 * tiles 16×16, stage 256×192. Sprites are row strings (one letter per pixel,
 * see C for the letters); symmetric ones give the left half only.
 */
const PixelArt = (() => {
  // ------------------------------------------------------------ palette
  const C = {
    i: '#20203a', w: '#fffbe9', c: '#f0eacf', s: '#ead796', S: '#c9b780', z: '#f2dfa8',
    k: '#e8b88a', K: '#c68d5a', o: '#8a4a1e', O: '#c98a4a', d: '#cdb27a', D: '#a88d55',
    b: '#2f4fdf', B: '#1a1c5a', l: '#7ec8ff', g: '#2aa845', G: '#124d2a', L: '#b5f27a',
    a: '#e39b12', A: '#8a4a1e', y: '#f2c14e', p: '#7b3fc4', P: '#3a1a5a', v: '#c9b6e8',
    t: '#1f9e8a', T: '#0f4a42', m: '#8ee6d2', r: '#d82f2f', R: '#a81f1f', x: '#ff7aa8',
    q: '#4aa8ff', Q: '#2f7fd6', n: '#7a7a90', N: '#4a4a60', h: '#b8c4d6', e: '#c9c0a8', j: '#c96a3a', J: '#9a4a2a', u: '#b9b4a6', U: '#9a9588', f: '#86c9a0', F: '#4b966e', E: '#c8ec9a',
  };
  const ROOF = { EC: ['#537daf', '#85b5d0', '#365271'], AG: ['#789e9d', '#a5c5ba', '#486e73'], EP: ['#bb8058', '#dfa96c', '#815346'], EPP: ['#8d7aa0', '#baabc8', '#625870'], GP: ['#4f928b', '#82b6a5', '#365d60'] };
  const ZONE = { EC: { n: 'Écume', base: 'l', dark: 'b', hat: 'cap' }, AG: { n: 'Oyatin', base: 'g', dark: 'G', hat: 'bucket' }, EP: { n: 'Pignotte', base: 'y', dark: 'a', hat: 'straw' }, EPP: { n: 'Gouémitte', base: 'v', dark: 'p', hat: 'shades' }, GP: { n: 'Glapot', base: 't', dark: 'T', hat: 'visor' } };
  const RCOL = { common: '#8a94a8', uncommon: '#2aa845', rare: '#2f4fdf', vrare: '#7b3fc4', epic: '#e39b12', legend: '#d82f2f' };
  const px = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w || 1, h || 1); };
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = (v) => Math.min(255, Math.max(0, Math.round(v * f))); return '#' + ((c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0'); };
  const mir = (rows) => rows.map((r) => r + [...r].reverse().join(''));
  // draw rows onto a context; map overrides letters (e.g. body colour per pool)
  function rows(g, art, x, y, map) {
    art.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) { const ch = row[rx]; if (ch === '.') continue; const col = (map && map[ch]) || C[ch] || ch; px(g, col, x + rx, y + ry, 1, 1); } });
  }
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const cache = new Map();
  const cached = (key, w, h, draw) => { if (!cache.has(key)) { const c = canvas(w, h); draw(c.getContext('2d')); cache.set(key, c); } return cache.get(key); };

  // ------------------------------------------------------------ the keeper (16×24, one tile wide like a GBA overworld sprite)
  // sets: { head, body, legs, feet, tool, toolKind } → zone codes (or null for the plain kit); toolKind: 'perche' | 'balai'
  // o: { walk (number, alternates feet), crouch, back, skin, hair (1..3), hairColor, trim: { head, body, legs, feet } rarity colours }
  function trainer(g, x, y, sets, o) {
    sets = sets || {}; o = o || {}; const trim = o.trim || {};
    const skin = o.skin || C.k, skinD = shade(skin, .82); const hairC = o.hairColor || C.o; const I = C.i;
    const f = o.walk ? Math.floor(o.walk) % 2 : -1; const top = y + 1 + (o.crouch ? 2 : 0);
    const hy = top + 1, by = hy + 9, ly = by + 7;
    // shorts straight onto the feet
    const short = sets.legs ? { EC: C.d, AG: C.G, EP: C.d, EPP: C.y, GP: C.T }[sets.legs] : C.d; const shortD = shade(short, .8);
    px(g, I, x + 3, ly, 10, 3); px(g, short, x + 4, ly, 8, 2); px(g, shortD, x + 10, ly, 2, 2); px(g, shortD, x + 7, ly + 1, 2, 1);
    if (sets.legs === 'EPP') px(g, C.w, x + 5, ly, 1, 1); if (trim.legs) px(g, trim.legs, x + 7, ly, 2, 1);
    const shoe = sets.feet ? { EC: C.b, AG: C.g, EP: C.o, EPP: C.y, GP: C.t }[sets.feet] : C.b;
    const fy1 = ly + 2 - (f === 1 ? 1 : 0), fy2 = ly + 2 - (f === 0 ? 1 : 0);
    px(g, I, x + 3, fy1, 5, 3); px(g, I, x + 8, fy2, 5, 3); px(g, shoe, x + 4, fy1 + 1, 3, 1); px(g, shoe, x + 9, fy2 + 1, 3, 1);
    if (sets.feet === 'EP') { px(g, shoe, x + 4, fy1, 3, 1); px(g, shoe, x + 9, fy2, 3, 1); }
    else if (sets.feet === 'EPP') { px(g, C.w, x + 5, fy1 + 1, 1, 1); px(g, C.w, x + 10, fy2 + 1, 1, 1); }
    else { px(g, shade(shoe, 1.4), x + 5, fy1 + 1, 1, 1); px(g, shade(shoe, 1.4), x + 10, fy2 + 1, 1, 1); }
    if (trim.feet) { px(g, trim.feet, x + 4, fy1 + 1, 1, 1); px(g, trim.feet, x + 11, fy2 + 1, 1, 1); }
    // torso 8×5
    const bz = sets.body; const shirt = bz ? { EC: C.w, AG: C.g, EP: C.y, EPP: C.v, GP: C.t }[bz] : C.w; const shirtD = shade(shirt, .84);
    px(g, I, x + 3, by, 10, 7); px(g, shirt, x + 4, by + 1, 8, 5); px(g, shirtD, x + 10, by + 1, 2, 5);
    if (bz === 'EC' || !bz) { px(g, C.b, x + 7, by + 1, 2, 1); px(g, C.b, x + 6, by + 2, 1, 1); px(g, C.b, x + 9, by + 2, 1, 1); }   // polo collar
    if (bz === 'AG') { px(g, C.L, x + 5, by + 2, 6, 1); }                                                                     // surf tee
    if (bz === 'EP') { px(g, C.A, x + 4, by + 1, 2, 5); px(g, C.A, x + 10, by + 1, 2, 5); px(g, C.w, x + 7, by + 1, 2, 5); }       // vest over a tee
    if (bz === 'EPP') { [[5, 1], [8, 2], [10, 1], [6, 4], [9, 4]].forEach(([dx, dy]) => px(g, C.x, x + dx, by + dy, 1, 1)); }     // hawaiian
    if (bz === 'GP') { px(g, C.w, x + 4, by + 3, 8, 1); }                                                                     // keeper polo
    if (trim.body) px(g, trim.body, x + 7, by + 5, 2, 1);
    px(g, I, x + 5, by + 5, 6, 2); px(g, trim.body || C.c, x + 6, by + 6, 4, 1);                                              // belt & pouch
    // arms at the sides
    const sleeve = bz === 'AG' || bz === 'GP' ? shirt : (bz === 'EP' ? C.w : shirt);
    px(g, I, x + 1, by, 3, 6); px(g, I, x + 12, by, 3, 6); px(g, sleeve, x + 2, by + 1, 1, 2); px(g, sleeve, x + 13, by + 1, 1, 2); px(g, skin, x + 2, by + 3, 1, 2); px(g, skinD, x + 13, by + 3, 1, 2);
    px(g, I, x + 3, by + 1, 1, 6); px(g, I, x + 12, by + 1, 1, 6);
    // head 8×7
    px(g, I, x + 3, hy, 10, 9); px(g, skin, x + 4, hy + 1, 8, 7); px(g, skinD, x + 10, hy + 2, 2, 6);
    if (!o.back) {
      if (o.direction === 'east') { px(g, I, x + 10, hy + 4, 1, 2); px(g, skin, x + 13, hy + 5, 1, 2); px(g, skinD, x + 10, hy + 7, 2, 1); }
      else { px(g, I, x + 6, hy + 4, 1, 2); px(g, I, x + 9, hy + 4, 1, 2); px(g, skinD, x + 7, hy + 7, 2, 1); }
    }
    px(g, hairC, x + 4, hy + 1, 8, 2); px(g, hairC, x + 4, hy + 3, 1, 1); px(g, hairC, x + 11, hy + 3, 1, 1);
    if ((o.hair || 1) === 3) { px(g, hairC, x + 3, hy + 3, 1, 5); px(g, hairC, x + 12, hy + 3, 1, 5); }
    if ((o.hair || 1) === 2 && !sets.head) { px(g, hairC, x + 5, hy, 1, 1); px(g, hairC, x + 8, hy - 1, 1, 2); px(g, hairC, x + 10, hy, 1, 1); }
    // hat by set, pulled down (trim in the rarity colour)
    const hz = sets.head; const tr = trim.head;
    if (hz === 'EC') { px(g, I, x + 3, hy - 1, 10, 5); px(g, C.b, x + 4, hy, 8, 3); px(g, C.B, x + 4, hy + 2, 8, 1); px(g, I, x + 0, hy + 1, 4, 2); px(g, C.b, x + 1, hy + 1, 3, 1); px(g, tr || C.l, x + 7, hy, 2, 1); }   // backward cap
    if (hz === 'AG') { px(g, I, x + 4, hy - 2, 8, 4); px(g, C.G, x + 5, hy - 1, 6, 3); px(g, I, x + 2, hy + 1, 12, 2); px(g, C.g, x + 3, hy + 1, 10, 1); px(g, tr || C.L, x + 5, hy, 6, 1); }                   // bucket hat
    if (hz === 'EP') { px(g, I, x + 5, hy - 2, 6, 4); px(g, C.y, x + 6, hy - 1, 4, 3); px(g, I, x + 1, hy + 1, 14, 2); px(g, C.y, x + 2, hy + 1, 12, 1); px(g, tr || C.A, x + 6, hy, 4, 1); }                     // straw hat
    if (hz === 'EPP') { px(g, I, x + 3, hy + 3, 10, 3); px(g, C.P, x + 4, hy + 4, 3, 1); px(g, C.P, x + 9, hy + 4, 3, 1); px(g, tr || C.p, x + 7, hy + 4, 2, 1); px(g, C.w, x + 5, hy + 4, 1, 1); px(g, C.w, x + 10, hy + 4, 1, 1); } // shades
    if (hz === 'GP') { px(g, I, x + 3, hy, 10, 2); px(g, C.t, x + 4, hy + 1, 8, 1); px(g, I, x + 2, hy + 2, 12, 1); px(g, tr || C.m, x + 3, hy + 2, 10, 1); }                                             // visor
    // tool in the right hand
    const tz = sets.tool;
    if (tz && sets.toolKind === 'balai') { px(g, I, x + 14, top + 3, 2, 15); px(g, C.O, x + 15, top + 4, 1, 13); px(g, I, x + 12, top + 17, 4, 3); px(g, C.h, x + 13, top + 18, 2, 1); }
    else if (tz) {
      px(g, I, x + 14, top + 1, 2, 17); px(g, o.toolColor || C.n, x + 15, top + 2, 1, 15);
      if (tz === 'EC') { px(g, I, x + 12, top - 2, 4, 4); px(g, C.l, x + 13, top - 1, 2, 2); }                                     // net
      if (tz === 'AG') { px(g, C.y, x + 15, top - 1, 1, 19); px(g, C.A, x + 15, top + 5, 1, 1); px(g, C.A, x + 15, top + 11, 1, 1); } // bamboo
      if (tz === 'EP') { px(g, I, x + 11, top - 1, 5, 2); px(g, C.n, x + 12, top - 1, 1, 1); px(g, C.n, x + 14, top - 1, 1, 1); }     // rake
      if (tz === 'EPP') { px(g, I, x + 12, top - 2, 4, 4); px(g, C.v, x + 13, top - 1, 2, 2); }                                    // shrimp net
      if (tz === 'GP') { px(g, I, x + 12, top - 1, 4, 2); px(g, C.t, x + 13, top - 1, 2, 1); }                                     // hook
    }
  }

  // Composable Pocket Coast keeper. Each worn slot paints its own layer over
  // the basic tee/shorts; no outfit is inferred from a single collected item.
  // The neutral frame is 24×32, feet at [12,31], with room for one-pixel poses.
  function keeper(g, ox, oy, equip = {}, avatar = {}, direction = 'south') {
    g.save(); g.translate(ox, oy);
    if (direction === 'west') { g.translate(24, 0); g.scale(-1, 1); direction = 'east'; }
    const side = direction === 'east', back = direction === 'north';
    const ink = '#202a40', skin = avatar.skin || '#e8b88a', skinD = shade(skin, .73), hair = avatar.hairColor || '#4a2e1a';
    const f = (c, x, y, w = 1, h = 1) => px(g, c, x, y, w, h);
    const box = (c, x, y, w, h) => {
      if (w >= 7 && h >= 5) { f(ink, x + 1, y, w - 2, h); f(ink, x, y + 1, w, h - 2); }
      else f(ink, x, y, w, h);
      if (w > 2 && h > 2) f(c, x + 1, y + 1, w - 2, h - 2);
    };
    const zone = slot => palette[equip[slot]?.res] ? equip[slot].res : null;
    const palette = { EC: ['#eee6ca', '#3061a1', '#729fcc'], AG: ['#287755', '#204937', '#9ebb61'], EP: ['#b58a46', '#766443', '#e4bd72'], EPP: ['#a779b0', '#674d83', '#e4b1dc'], GP: ['#308a87', '#284f5c', '#9bd7c1'] };
    const pal = slot => palette[zone(slot)] || ['#efe8cb', '#695641', '#c5b895'];
    const trim = slot => equip[slot]?.rar !== 'common' && RCOL[equip[slot]?.rar] || pal(slot)[2];
    const curse = (slot, x, y) => { if (equip[slot]?.cursed) { f('#bb5dde', x, y, 2); f('#f1b3ff', x + 1, y - 1); } };
    const long = avatar.hair === 3;
    if (long) { box(hair, side ? 6 : 5, 8, side ? 7 : 14, 13); f(shade(hair, 1.3), side ? 7 : 6, 10, 1, 8); }
    // Legs and shoes remain independent, including bare calves in basic wear.
    const pants = zone('jambes') ? { EC: '#32618b', AG: '#245743', EP: '#7a714d', EPP: '#dea951', GP: '#315763' }[zone('jambes')] : '#967a52';
    box(pants, side ? 9 : 7, 23, side ? 7 : 11, 5);
    f(shade(pants, .73), side ? 13 : 15, 24, 2, 3); f(ink, side ? 12 : 12, 26, 1, 2);
    const calves = ['AG', 'EP', 'GP'].includes(zone('jambes')) ? pants : skinD;
    f(calves, side ? 10 : 8, 26, 3, 3); f(calves, side ? 13 : 14, 26, 3, 3);
    const shoes = zone('pieds') ? { EC: '#3672b0', AG: '#204b40', EP: '#615b45', EPP: '#be8552', GP: '#78bbaa' }[zone('pieds')] : '#594b40';
    box(shoes, side ? 8 : 7, 28, 5, 3); box(shoes, 13, 28, 5, 3);
    f(zone('pieds') ? trim('pieds') : '#b29d79', side ? 10 : 8, 29, 2); f(zone('pieds') ? trim('pieds') : '#b29d79', 14, 29, 2);
    if (zone('jambes')) { f(trim('jambes'), 10, 24, 2); curse('jambes', 14, 25); }
    if (zone('pieds')) curse('pieds', 15, 29);
    // Tee, jacket and arms; the torso does not choose the rest of the outfit.
    const shirt = pal('torse')[0], shirtD = shade(shirt, .73), tx = side ? 9 : 7, tw = side ? 7 : 11;
    box(shirt, tx, 16, tw, 9); f(shirtD, tx + tw - 3, 17, 2, 6);
    if (!back) { f('#fcf1d7', tx + 2, 17, 3); f(ink, tx + 3, 18, 1, 2); }
    if (zone('torse') === 'AG') { f('#9ebb61', tx + 1, 19, tw - 3); f('#1e4d3b', tx + 1, 22, tw - 3); }
    if (zone('torse') === 'EP') { f('#f5e7bd', tx + 3, 17, 2, 6); f('#6c522f', tx + 1, 21, 2, 2); f('#6c522f', tx + tw - 3, 21, 2, 2); }
    if (zone('torse') === 'EPP') for (const [x, y] of [[9, 18], [13, 19], [10, 22], [15, 21]]) f('#ecc599', x, y);
    if (zone('torse') === 'GP') { f('#a6ddca', tx + 1, 19, tw - 3); f('#25546b', tx + 1, 21, tw - 3); }
    f(ink, tx, 24, tw); f(zone('torse') ? trim('torse') : '#b7a77e', tx + 3, 24, 2); curse('torse', tx + tw - 3, 22);
    if (!side) { box(shirt, 4, 17, 4, 6); f(skin, 5, 21, 2, 3); f(ink, 5, 24, 2); }
    box(shirt, side ? 14 : 17, 17, 4, 6); f(skin, side ? 15 : 18, 21, 2, 3); f(skinD, side ? 16 : 19, 22, 1, 2); f(ink, side ? 15 : 18, 24, 2);
    // Face and hair. North views show the back of the head, east a single eye.
    box(back ? hair : skin, side ? 7 : 6, 6, side ? 11 : 12, 11);
    if (back) { f(shade(hair, .73), 7, 12, 10, 4); f(shade(hair, 1.25), 8, 7, 7, 2); f(skinD, 10, 16, 4); }
    else {
      f(skinD, side ? 8 : 15, 9, 2, 7); f(skin, side ? 18 : 5, 11, 1, 3);
      if (side) { f(ink, 15, 11, 1, 2); f(skin, 18, 12); f(skinD, 15, 15, 2); }
      else { f(ink, 9, 11, 1, 2); f(ink, 14, 11, 1, 2); f('#fbe6b9', 11, 12, 2); f(skinD, 11, 15, 2); }
      f(hair, 8, 5, side ? 6 : 8, 2); f(hair, 7, 7, side ? 7 : 10, 2); f(hair, side ? 7 : 6, 9, 2, side ? 6 : 3); if (!side) f(hair, 16, 9, 2, 3);
      f(shade(hair, 1.3), 8, 6, 5); if (avatar.hair === 2) { f(ink, 8, 3, 2, 3); f(hair, 9, 4); f(ink, 12, 4, 3, 2); }
      if (long) { f(hair, 6, 12, 2, 6); if (!side) f(hair, 16, 12, 2, 6); }
    }
    if (back && avatar.hair === 2) { f(ink, 8, 3, 2, 3); f(hair, 9, 4); f(ink, 12, 4, 3, 2); }
    // Headwear overlays the chosen hair and skin.
    const hat = zone('tête');
    if (hat === 'EC') { box('#315faa', 6, 3, 12, 6); f('#78a0d6', 8, 4, 6); box('#315faa', side ? 13 : 3, 7, side ? 8 : 10, 3); f(trim('tête'), 10, 5, 3); }
    if (hat === 'AG') { box('#397552', 7, 2, 10, 7); box('#397552', 3, 7, 18, 3); f(trim('tête'), 8, 6, 8); }
    if (hat === 'EP') { box('#d0a763', 8, 3, 8, 5); box('#d0a763', 3, 7, 18, 3); f('#f5d497', 4, 8, 15); f(trim('tête'), 9, 6, 6); }
    if (hat === 'EPP' && !back) { f(ink, side ? 13 : 6, 10, side ? 6 : 12, 3); f(trim('tête'), side ? 14 : 7, 11, 3); if (!side) f(trim('tête'), 13, 11, 3); f('#f4e6cb', side ? 15 : 8, 11); }
    if (hat === 'GP') { f(ink, 6, 6, 12, 3); f('#2b807c', 7, 7, 10); f(ink, side ? 12 : 4, 9, side ? 9 : 14); f(trim('tête'), side ? 13 : 5, 8, side ? 7 : 12); }
    if (hat) curse('tête', 14, hat === 'EPP' ? 11 : 5);
    if (equip.amulette) { f(trim('amulette'), side ? 16 : 9, 17, back ? 6 : 1, back ? 1 : 3); if (!back) { f(trim('amulette'), side ? 16 : 14, 17, 1, 3); box(pal('amulette')[1], side ? 15 : 10, 19, 4, 4); f(trim('amulette'), side ? 16 : 11, 20, 2); } curse('amulette', side ? 16 : 11, back ? 17 : 21); }
    if (equip.robot) { const rx = back ? 9 : side ? 6 : 3; box(pal('robot')[1], rx, back ? 19 : 21, back ? 7 : 5, 5); f(trim('robot'), rx + 1, back ? 20 : 22, back ? 4 : 2); f('#e3f2ec', rx + 2, back ? 21 : 23); curse('robot', rx + 1, back ? 22 : 23); }
    if (equip.perche) {
      f(ink, 21, 3, 2, 25); f(zone('perche') === 'AG' ? '#72824b' : '#ad9067', 21, 5, 1, 22);
      const pole = zone('perche');
      if (pole === 'EC' || pole === 'EPP') { box(pole === 'EC' ? '#6a9fce' : '#c79cce', 17, 1, 6, 7); f('#dae9e2', 18, 3, 3); f(trim('perche'), 20, 4, 1, 3); }
      if (pole === 'AG') { f('#a8b468', 21, 2, 1, 25); for (const y of [5, 12, 19]) f(trim('perche'), 21, y); }
      if (pole === 'EP') { f(ink, 17, 3, 6, 3); for (const x of [17, 19, 21]) f(trim('perche'), x, 1, 1, 3); }
      if (pole === 'GP') { f(ink, 18, 1, 5, 4); f(trim('perche'), 19, 2, 3); f('#f1e8c7', 19, 3); }
      f(skin, 20, 20, 2, 2); curse('perche', 21, 13);
    }
    if (equip.balai) { f(ink, 2, 13, 2, 15); f('#ae8656', 3, 14, 1, 13); box(pal('balai')[1], 1, 26, 7, 3); for (const x of [1, 3, 5, 7]) f(trim('balai'), x, 29); f(skin, 3, 21, 2, 2); curse('balai', 4, 27); }
    g.restore();
  }

  // ------------------------------------------------------------ the five species (24×24), one per zone
  const ECUME = mir(['............', '..........ii', '.........iwl', '........iwll', '.......iwlll', '......iwllll', '.....illllll', '....illlllll', '....illwilll', '...illllllll', '...illlcccci', '...illcccccc', '...illcccxxc', '...illcccxxc', '...illlccccc', '...illllcccc', '....illllccc', '....illlllll', '.....illllll', '.....ibbbbll', '......ibbbbb', '.......iibbb', '........iiii', '............']);
  const OYATIN = ['........................', '........................', '..................iii...', '.................iLLLi..', '.................iLGLLi.', '..................iLGLLi', '...iiii...........iLLGi.', '..igggii.........igGGi..', '.igwiggggii.....iggGi...', '.iggggggggggiiiigggi....', '.iggigggggggggggggi.....', '..iggggggLLLgggggi......', '..iigggggLLLLgggi.......', '...iggggggggggggi.......', '...igGGgggggggGGi.......', '..iGGiggggggiiGGGi......', '.iGGi.iggggi..iGGi......', '.iGi...iiii....iGi......', '.ii.............ii......', '........................', '........................', '........................', '........................', '........................'];
  const PIGNOTTE = mir(['..........ig', '.........iLG', '..........ii', '.........iaa', '........iaya', '.......iayay', '......iayaya', '......iayaya', '.....iayayay', '.....iaywiya', '....iayayaya', '....iayayaya', '....iayayaii', '....iayayaya', '.....iayayay', '.....iAyayay', '......iAyaya', '......iAAyay', '.......iAAya', '........iAAy', '.........iAA', '..........ii', '............', '............']);
  const GOUEMITTE = mir(['..........i.', '.........ivi', '.........ivi', '.......iiiii', '......ivvvvv', '.....ivvwivv', '.....ivvvvvv', '.....ivvvvvi', '......ivvvvv', '.......ippvv', '..iiiiiiiiii', '.irrwwrrwwrr', 'irrwwrrwwrrw', 'irrwwrrwwrrw', 'iRRwwRRwwRRw', '.iRRRRRRRRRR', '..iiiiiiiiii', '.....ipvvpp.', '....ipp.iipp', '....ii...ii.', '............', '............', '............', '............']);
  const GLAPOT = mir(['............', '.......iiii.', '......itwwti', '......itwiti', '.....ittttti', '....ittttttt', '...itttttttt', '..itttttiiii', '..ittttttmmm', '..ittttmmmmm', '..ittttmmmmm', '..itttttmmmm', '..iTtttttmmm', '.iTTtttttttt', 'iTTiittttiii', 'iTi..ittti..', 'ii....iii...', '............', '............', '............', '............', '............', '............', '............']);
  const SPECIES = { EC: ECUME, AG: OYATIN, EP: PIGNOTTE, EPP: GOUEMITTE, GP: GLAPOT };
  // a pool's creature: its zone's species, tinted and marked by its own seed
  function creature(zone, seed) {
    const key = 'cr|' + zone + '|' + seed;
    return cached(key, 24, 24, (g) => {
      const z = ZONE[zone] || ZONE.EC; const art = SPECIES[zone] || ECUME; let h = 2166136261; for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } h >>>= 0;
      const tint = 0.92 + (h % 5) * 0.04; const map = {}; [z.base, z.dark].forEach((k) => { map[k] = shade(C[k], tint); });
      rows(g, art, 0, 0, map);
      // a marking: two or three spots in the shade colour, placed by the seed
      const spots = 2 + (h >> 3) % 2; for (let i = 0; i < spots; i++) { const sx = 6 + ((h >> (4 + i * 5)) % 12), sy = 9 + ((h >> (6 + i * 3)) % 8); const d = g.getImageData(sx, sy, 1, 1).data; if (d[3] > 0 && d[0] + d[1] + d[2] > 120) px(g, shade(C[z.dark], 1.1), sx, sy, 2, 1); }
    });
  }

  // ------------------------------------------------------------ the ten monsters (28×24)
  const MON = {
    algue: mir(['.......i...i..', '......iL..iL.i', '.....iLL.iLLiL', '....iLLLiLLLLL', '...iLLLLLLLLLL', '..iLggggggggLL', '.igggggggggggg', 'iggggwiggggggg', 'igggggggggggg.', 'iGggggggggiiii', 'iGGgggggggiwiw', '.iGGgggggggggg', '..iGGGGGGGGGGG', '...iiGGGGGGGGG', '.iii.iGGiiGGGi', 'iggi.iGi..iGi.', 'iggi..ii..ii..', '.ii...........', '..............', '..............', '..............', '..............', '..............', '..............']),
    moutarde: ['..........iiiiiiii..........', '.......iiiyyyyyyyyiii.......', '.....iiyyyyyyyyyyyyyyii.....', '....iyyyayyyyyyyyyayyyyi....', '...iyyyyyyyyyyyyyyyyyyyyi...', '..iyyyyyyyyyyyyyyyyyyyyyyi..', '..iyyyyyiii.....iiiyyyyyyi..', '.iyyyyyiwii....iwiiyyyyyyyi.', '.iyyyyyyyyyyyyyyyyyyyyyyyyi.', '.iyyyayyyyyyyyyyyyyyyayyyyi.', '.iyyyyyyyyyiiiiiiyyyyyyyyyi.', '.iyyyyyyyyyyyyyyyyiyyyyyyyi.', '.iyayyyyyyyyyyyyyyyyyyayyyi.', '..iyyyyyyyyyayyyyyyyyyyyyi..', '..iaayyyyyyyyyyyyyyyyyaaai..', '...iaaaayyyyyyyyyyyyaaaai...', '....iiaaaaaaaaaaaaaaaaii....', '.....i.iaaiaaaaiaai.i.......', '.......i..i....i..i.........', '............................', '............................', '............................', '............................', '............................'],
    feuilles: mir(['........i.....', '.......iai....', '......iaAai...', '.....iaaAaai..', '..i..iaaaaai..', '.iai.iayaaai.i', 'iaAaiiayyaaiia', 'iaaaaaayyaaaaa', '.iaaaaaaaaaaaa', '..iaaaawiaaaaa', '..iaaaaaaaaaaa', '...iaaaaaaaiii', '..iaaaaaaaaaaa', '.iaAaaaaaaaaaa', 'iaaaaiaaaaaaaa', 'iAaaiiaaaAaaaa', '.iii.iaaaaaaaa', '......iaaAaai.', '.......iaaai..', '........iai...', '.........i....', '..............', '..............', '..............']),
    aiguille: mir(['.....i....i...', '....iGi..iGi.i', '....iGi..iGiiG', '..i.iLi.iLi.iG', '.iGiiLiiLiiiLi', '..iLLLLLLLLLLL', 'iiiLLgggggggLL', '.iLLggggggggg.', 'iiLgggwigggggg', '.iLgggggggggg.', 'iiLggggggggiii', '.iLggggggggiwi', '..iLgggggggggg', '.iiiLGGGGGGGGG', '..iLGGGGGGGGGG', '.iiLiGGGGGGGGG', '..i.iiGGiiGGGi', '.....iGi..iGi.', '.....ii...ii..', '..............', '..............', '..............', '..............', '..............']),
    calcaire: ['............................', '........iiiiiiiiii..........', '......iieeeeeeeeeeii........', '.....ieeeewwwwwweeeei.......', '....ieeewwwiiiiwwweeei......', '...ieeewwiieeeeiiwwweei.....', '...ieewwiieewwweeiiweei.....', '...ieewwieewwwwweeiweei.....', '...ieewwieewwiwweeiweei.....', '...ieeewiieewwweeiiweei..ii.', '....ieeewiieeeeiiwweei..iwi.', '....ieeeewwiiiiwwweei...ii..', '.....ieeeeewwwwweeei....ii..', '......iieeeeeeeeeii....inni.', '......iinnnnnnnnnnii..innni.', '.....innnnnnnnnnnnnniinnnni.', '....innnwinnnnnnnnnnnnnnnni.', '....innnnnnnnnnnnnnnnnnnni..', '....innnnnnnnniiiinnnnnnni..', '.....innnnnnnnnnnnnnnnnni...', '......iiiiiiiiiiiiiiiiii....', '............................', '............................', '............................'],
    moustique: mir(['..............', '.....iii......', '....ivvvii....', '...ivvvvvvi...', '..ivvvvvvvvi..', '.ivvvvvvvvvvi.', '.ivvvvvvvvvvvi', '..iivvvvvvvvvi', '....iippppiiii', '.....ippppiwi.', '.....ipppppii.', '.....ipppppppi', '.....iPppppppi', '.....iPPpppppi', '......iPPppii.', '......iPPPi...', '.......iPi....', '.......ii.....', '.......ii.....', '.......ii.....', '.......i......', '..............', '..............', '..............']),
    filtre: mir(['.....iiiiiiiii', '....innnnnnnnn', '....ihhhhhhhhh', '...innnnnnnnnn', '...innnniiiiii', '...innniwwwwww', '...innniwwiwww', '...innniwwiiww', '...innniwwwwww', '...innnniiiiii', '...innnnnnnnnn', '...iNnnnnnnnnn', '...iNNnnnnnnnn', '...iNNNnnnnnnn', '....iNNNNNNNNN', '.....iiiiiiiii', '.....iNi..iNi.', '.....iNi..iNi.', '....iiiiiiiiii', '..............', '..............', '..............', '..............', '..............']),
    sable: mir(['..............', '.......iiiiiii', '.....iissssszz', '....isssszzzss', '...isszzzsssss', '..isssssswisss', '..issssssssssi', '.isSssssssssss', '.issssssssiiii', '.iSSsssssssiwi', '.iSSSsssssssss', '..iSSSSssssss.', '..iiiSSSSsssss', '.isSiiSSSSSSSS', 'issSi.iSSSSSSS', 'isSi..iiSSSSSS', '.ii....iiiiiii', '..............', '..............', '..............', '..............', '..............', '..............', '..............']),
    gland: mir(['.............i', '............iO', '...........iOo', '........iiiiii', '......iiooOooo', '.....ioooOoOoo', '....ioooooooOo', '....iooooooooo', '...iiiiiiiiiii', '...iOOOOOOOOOO', '..iOOOOwiOOOOO', '..iOOOOOOOOOOO', '..iOOOOOOOOOii', '..iOOOOOOOOOOO', '...ioOOOOOOOOO', '...ioooOOOOOOO', '....ioooooOOOO', '.....iooooooOO', '......iioooooo', '........iiiiii', '..............', '..............', '..............', '..............']),
    locataire: ['............................', '..........iiii..............', '.........iwwwwi.............', '........iwwwwwwi............', '........ixxxxxxi..iiii......', '.......ixxwixxxxiiwwwwi.....', '.......ixxxxxxxxxwwwwwwi....', '......ixxiixxxxxxxxxxxxi....', '......ixxxxxxxxxxxxxxxxi....', '.....iiiiiiiiiiiiiiiiiiiii..', '....irrrrrrrrrrrrrrrrrrrrri.', '...irrrwwrrrrrrrrrrrrrwwrrri', '...irrrwwrrrrrrrrrrrrrwwrrri', '...irrrrrrriiiiiiiiirrrrrrri', '...iRRrrrrrrrrrrrrrrrrrrRRri', '....iRRRrrrrrrrrrrrrrrRRRRi.', '.....iiRRRRRRRRRRRRRRRRii...', '.......iiiiiiiiiiiiiiii.....', '............................', '............................', '............................', '............................', '............................', '............................'],
  };
  const monster = (id) => cached('mo|' + id, 28, 24, (g) => rows(g, MON[id] || MON.algue, 0, 0));

  // ------------------------------------------------------------ items (16×16): shape by slot, hat & tool by set, colour by set, trim by rarity
  const ITEM = {
    head: {
      EC: ['................', '................', '....########....', '...##########...', '...#####++###...', '...##########...', '.####++++++++#..', '##+###########..', '.##.............', '................', '................', '................', '................', '................', '................', '................'],
      AG: ['................', '......####......', '.....######.....', '.....#++++#.....', '.....#++++#.....', '....########....', '..############..', '.##++++++++++##.', '.##############.', '................', '................', '................', '................', '................', '................', '................'],
      EP: ['................', '................', '......####......', '.....######.....', '.....#++++#.....', '################', '.##############.', '..############..', '................', '................', '................', '................', '................', '................', '................', '................'],
      EPP: ['................', '................', '................', '................', '.######..######.', '#++++++##++++++#', '#++++++##++++++#', '#++++++##++++++#', '.######..######.', '................', '................', '................', '................', '................', '................', '................'],
      GP: ['................', '................', '................', '..############..', '.##++++++++++##.', '#++++++++++++++#', '.##############.', '................', '................', '................', '................', '................', '................', '................', '................', '................'],
    },
    body: ['................', '...##......##...', '..####++++####..', '.######++######.', '.##+##++++##+##.', '.##.###++###.##.', '.#...######...#.', '.....######.....', '.....##++##.....', '.....##++##.....', '.....##++##.....', '.....######.....', '.....++++++.....', '................', '................', '................'],
    legs: ['................', '....########....', '....#++++++#....', '....########....', '....###..###....', '....###..###....', '....###..###....', '....#+#..#+#....', '....###..###....', '....+++..+++....', '................', '................', '................', '................', '................', '................'],
    feet: ['................', '................', '................', '................', '..####....####..', '.#++++#..#++++#.', '.#+##+#..#+##+#.', '.#++++#..#++++#.', '.######..######.', '..####....####..', '................', '................', '................', '................', '................', '................'],
    charm: ['................', '.......#........', '......#.#.......', '.....#...#......', '....#.....#.....', '....#.....#.....', '.....#...#......', '....#######.....', '...##+++++##....', '...#+++#+++#....', '...#+++++++#....', '....#######.....', '.....#####......', '................', '................', '................'],
    pole: {
      EC: ['..........#####.', '.........##+++#.', '.........#+#+##.', '.........#####..', '........#.......', '.......#........', '......#.........', '.....#..........', '....#...........', '...#............', '..#.............', '.#..............', '##..............', '#+..............', '................', '................'],
      AG: ['..............##', '.............##.', '............##..', '...........#+...', '..........##....', '.........##.....', '........##......', '.......#+.......', '......##........', '.....##.........', '....##..........', '...#+...........', '..##............', '.##.............', '##..............', '................'],
      EP: ['..........#.#.#.', '..........######', '.........#+++++.', '........#.......', '.......#........', '......#.........', '.....#..........', '....#...........', '...#............', '..#.............', '.#..............', '##..............', '#+..............', '................', '................', '................'],
      EPP: ['...........####.', '..........#++++#', '..........#+##+#', '..........#++++#', '...........####.', '..........#.....', '.........#......', '........#.......', '.......#........', '......#.........', '.....#..........', '....#...........', '...#............', '..#.............', '.#..............', '##..............'],
      GP: ['.........####...', '........#....#..', '........#.......', '........#.......', '.......#........', '......#.........', '.....#..........', '....#...........', '...#............', '..#.............', '.#..............', '##..............', '#+..............', '................', '................', '................'],
    },
    robot: ['................', '................', '....########....', '...##++++++##...', '..##########++#.', '..#.#####.###+#.', '..#.#..#..#.#+#.', '..#############.', '..#++++++++++++.', '...##########...', '..#.#......#.#..', '..###......###..', '..#+#......#+#..', '...#........#...', '................', '................'],
    broom: ['..............##', '.............##.', '............##..', '...........##...', '..........##....', '.........##.....', '........##......', '.......##.......', '......##........', '.....##.........', '...####.........', '..##+###........', '.##++++##.......', '.#+++++##.......', '.+++++++........', '................'],
  };
  const SLOTMAP = { 'tête': 'head', torse: 'body', jambes: 'legs', pieds: 'feet', amulette: 'charm', perche: 'pole', robot: 'robot', balai: 'broom' };
  function item(slot, zone, rar) {
    const key = 'it|' + slot + '|' + zone + '|' + rar;
    return cached(key, 16, 16, (g) => {
      const k = SLOTMAP[slot] || 'charm'; let art = ITEM[k]; if (!Array.isArray(art)) art = art[zone] || art.EC;
      const z = ZONE[zone] || ZONE.EC; const main = C[z.base], dark = C[z.dark]; const trimc = RCOL[rar] || RCOL.common;
      art.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch === '#') px(g, main, x, y, 1, 1); else if (ch === '+') px(g, dark, x, y, 1, 1); } });
      // the rarity lives in the clasp: two pixels of trim, and a frame for épique and légendaire
      px(g, trimc, 12, 13, 2, 1); if (rar === 'epic' || rar === 'legend') { px(g, trimc, 0, 0, 16, 1); px(g, trimc, 0, 15, 16, 1); px(g, trimc, 0, 0, 1, 16); px(g, trimc, 15, 0, 1, 16); }
    });
  }
  const crate = (rar) => cached('crate|' + rar, 16, 16, (g) => { rows(g, ['................', '.iiiiiiiiiiiiii.', '.iOOOOOOOOOOOOi.', '.iOooooooooooOi.', '.iOoiiiiiiiioOi.', '.iOoiOOOOOOioOi.', '.iOoiOooooOioOi.', '.iOoiOoooooioOi.', '.iOoiOooooOioOi.', '.iOoiOOOOOOioOi.', '.iOoiiiiiiiioOi.', '.iOooooooooooOi.', '.iOOOOOOOOOOOOi.', '.iiiiiiiiiiiiii.', '................', '................'], 0, 0); px(g, RCOL[rar] || RCOL.common, 6, 6, 4, 4); });

  // ------------------------------------------------------------ tiles (16×16) and the courtyard (128×96)
  const TILE = {
    sand: [['ssssssssssssssss', 'ssSsssssssSsssss', 'ssssssssssssssss', 'ssssssSsssssssss', 'ssssssssssssssSs', 'sszsssssssssssss', 'ssssssssssssssss', 'ssssSsssssSsssss', 'ssssssssssssssss', 'sSssssssssssssss', 'ssssssssSsssssss', 'ssssssssssssssss', 'sssssSsssssssSss', 'ssssssssssssssss', 'sszsssssszssssss', 'ssssssssssssssss'],
      ['ssssssssssssssss', 'ssssSsssssssSsss', 'ssssssssssssssss', 'sSssssssssssssss', 'ssssssssssSsssss', 'ssssssssssssssss', 'sssssssSsssssszs', 'ssssssssssssssss', 'ssSsssssssssssss', 'ssssssssssssSsss', 'sssssszsssssssss', 'ssssssssssssssss', 'ssssSsssssSsssss', 'ssssssssssssssss', 'sssssssssssssSss', 'ssssssssssssssss'],
      ['ssssssssssssssss', 'ssssssssssssssss', 'ssssssSsssssssss', 'ssSsssssssssssss', 'sssssssssssscsss', 'ssssssssssscccss', 'ssssssssssssSsss', 'ssssssssssssssss', 'ssSsssssssssssss', 'sssssssSsssssSss', 'ssssssssssssssss', 'sszsssssssssssss', 'ssssssssssssssss', 'ssssssssSsssssss', 'ssssSsssssssssss', 'ssssssssssssssss']],
    grass: [['ffffffffffffffff', 'ffffffffffffffff', 'fFfFffffffffffff', 'ffFfffffffFfFfff', 'fffffffffffFffff', 'ffffffffffffffff', 'ffffffffffffffff', 'ffffffFfFfffffff', 'fffffffFffffffff', 'ffffffffffffffff', 'fFfFffffffffffff', 'ffFfffffffffffff', 'ffffffffffffFfFf', 'fffffffffffffFff', 'ffffffffffffffff', 'ffffffffffffffff'],
      ['ffffffffffffffff', 'fffffffffffFfFff', 'ffffffffffffFfff', 'ffffffffffffffff', 'fffFfFffffffffff', 'ffffFfffffffffff', 'ffffffffffffffff', 'ffffffffffffffff', 'ffffffffffffffff', 'ffffffffffffffff', 'ffffffffffffffff', 'fffffffffFfFffff', 'ffffffffffFfffff', 'fFfFffffffffffff', 'ffFfffffffffffff', 'ffffffffffffffff'],
      ['ffffffffffffffff', 'fFfFfFfFfFfFfFfF', 'ffFfFfFfFfFfFfFf', 'fFfFfFfFfFfFfFfF', 'ffFfFfFfFfFfFfFf', 'fFfFfFfFfFfFfFfF', 'ffFfFfFfFfFfFfFf', 'fFfFfFfFfFfFfFfF', 'ffFfFfFfFfFfFfFf', 'fFfFfFfFfFfFfFfF', 'ffFfFfFfFfFfFfFf', 'fFfFfFfFfFfFfFfF', 'ffFfFfFfFfFfFfFf', 'fFfFfFfFfFfFfFfF', 'ffFfFfFfFfFfFfFf', 'ffffffffffffffff'],
      ['ffffffffffffffff', 'ffffffffffffffff', 'ffffffffffffffff', 'ffffFfFfffffffff', 'fffffFffffffffff', 'ffffffffffffffff', 'ffffffffffffffff', 'fffffffffffffFff', 'ffffffffffffxwxf', 'fffffffffffffxff', 'ffffffffffffffff', 'fFfFffffffffffff', 'ffFfffffffffffff', 'ffffffffffffffff', 'ffffffffffffffff', 'ffffffffffffffff']],
    paving: [['cccccccccccccccc', 'cccccccScccccccc', 'cccccccccccccccc', 'SSSSSSSSSSSSSSSS', 'cccccccccccccccc', 'ccccccccccccccSc', 'cccccccccccccccc', 'SSSSSSSSSSSSSSSS', 'cccccccccccccccc', 'ccSccccccccccccc', 'cccccccccccccccc', 'SSSSSSSSSSSSSSSS', 'cccccccccccccccc', 'cccccccccccScccc', 'cccccccccccccccc', 'SSSSSSSSSSSSSSSS']],
    slab: [['zzzzzzzzzzzzzzzS', 'zzzzzzzzzzzzzzzS', 'zzzzzzzSzzzzzzzS', 'zzzzzzzzzzzzzzzS', 'zzzzzzzzzzzzzzzS', 'zzSzzzzzzzzzzzzS', 'zzzzzzzzzzzzzzzS', 'SSSSSSSSSSSSSSSS', 'zzzzzzzzzzzzzzzS', 'zzzzzzzzzzzzSzzS', 'zzzzzzzzzzzzzzzS', 'zzzzzzzzzzzzzzzS', 'zzzzSzzzzzzzzzzS', 'zzzzzzzzzzzzzzzS', 'zzzzzzzzzzzzzzzS', 'SSSSSSSSSSSSSSSS'],
      ['zzzzzzzzzzzzzzzS', 'zzzzzzzzzzzSzzzS', 'zzzzzzzzzzSzzzzS', 'zzzzzzzzzSzzzzzS', 'zzzzzzzzzzzzzzzS', 'zzzzzzzzzzzzzzzS', 'zSzzzzzzzzzzzzzS', 'SSSSSSSSSSSSSSSS', 'sssssssssssssssS', 'sssssssssssssssS', 'sssssssSsssssssS', 'sssssssssssssssS', 'sssssssssssssssS', 'ssssssssssssSssS', 'sssssssssssssssS', 'SSSSSSSSSSSSSSSS'],
      ['sssssssssssssssS', 'sssssssssssssssS', 'sssSsssssssssssS', 'sssssssssssssssS', 'sssssssssssssssS', 'sssssssssssSsssS', 'sssssssssssssssS', 'SSSSSSSSSSSSSSSS', 'zzzzzzzzzzzzzzzS', 'zzzzzzzzzzzzzzzS', 'zzzzzzzzzzzzzzzS', 'zzzSzzzzzzzzzzzS', 'zzzzSzzzzzzzzzzS', 'zzzzzSzzzzzzzzzS', 'zzzzzzzzzzzzzzzS', 'SSSSSSSSSSSSSSSS']],
    gravel: [['uuuuuuuuuuuuuuuu', 'uuUuuuuuuuuUuuuu', 'uuuuuuuUuuuuuuuu', 'uuuuuuuuuuuuuuUu', 'uUuuuuuuuuuuuuuu', 'uuuuuuuuuuUuuuuu', 'uuuuuUuuuuuuuuuu', 'uuuuuuuuuuuuuUuu', 'uuuuuuuUuuuuuuuu', 'uuUuuuuuuuuuuuuu', 'uuuuuuuuuuuuUuuu', 'uuuuuuUuuuuuuuuu', 'uuuuuuuuuuuuuuuu', 'uuuUuuuuuuUuuuuu', 'uuuuuuuuuuuuuuuU', 'uuuuuuuUuuuuuuuu'],
      ['uuuuuuuuuuuuuuuu', 'uuuuuuuuuuuuuuuu', 'uuuuNNuuuuuuuuuu', 'uuuuNNuuuuuuUuuu', 'uuuuuuuuuuuuuuuu', 'uuUuuuuuuuuuuuuu', 'uuuuuuuuuuhuuuuu', 'uuuuuuuuuuuuuuuu', 'uuuuuuuuuuuuuuuu', 'uuuuuuuuuuuuNNuu', 'uUuuuuuuuuuuNNuu', 'uuuuuuuuuuuuuuuu', 'uuuuuuhuuuuuuuuu', 'uuuuuuuuuuuuuuuu', 'uuuuuuuuuuUuuuuu', 'uuuuuuuuuuuuuuuu'],
      ['uuuuuuuuuuuuuuuu', 'uuuuuuuuhuuuuuuu', 'uuuuuuuuuuuuuuuu', 'uUuuuuuuuuuuuhuu', 'uuuuuuuuuuuuuuuu', 'uuuuuuuuuuuuuuuu', 'uuuuuuUuuuuuuuuu', 'uuuuuuuuuuuuuuuu', 'uuhuuuuuuuuuuuuu', 'uuuuuuuuuuuuuuuu', 'uuuuuuuuuuUuuuuu', 'uuuuuuuuuuuuuuuu', 'uuuuuuuuuuuuuuhu', 'uuuuUuuuuuuuuuuu', 'uuuuuuuuuuuuuuuu', 'uuuuuuuuuuuuuuuu']],
    hedge: [['gGggggGgggggGggg', 'gggggggggggggggg', 'ggLgggggggLggggg', 'gggggggggggggggg', 'ggggggGggggggggg', 'GgggggggggggggGg', 'gggggLgggggggggg', 'gggggggggggggggg', 'ggggggggggLggggg', 'gGgggggggggggggg', 'ggggggggggggGggg', 'GGGGGGGGGGGGGGGG', 'GGGGGGGGGGGGGGGG', 'GGGGGGGGGGGGGGGG', 'iiiiiiiiiiiiiiii', 'ssssssssssssssss']],
    deck: [['OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'oooooooooooooooo', 'OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'oooooooooooooooo', 'OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'oooooooooooooooo', 'OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'oooooooooooooooo']],
  };
  // a tile by name; v picks one of its variants (the ground is laid with (tx*7 + ty*3) so the pattern never repeats in a row)
  const tile = (name, v) => { const vs = TILE[name] || TILE.sand; const i = ((v || 0) % vs.length + vs.length) % vs.length; return cached('tile|' + name + '|' + i, 16, 16, (g) => rows(g, vs[i], 0, 0)); };
  const lay = (g, name, x0, y0, x1, y1) => { for (let ty = y0; ty < y1; ty += 16) for (let tx = x0; tx < x1; tx += 16) { const ix = Math.floor(tx / 16), iy = Math.floor(ty / 16); g.drawImage(tile(name, ix * 7 + iy * 3 + (ix * iy) % 5), tx, ty); } };
  // objects
  const TREE = ['......iiii......', '....iiGGGGii....', '...iGGgggGGGi...', '..iGgggLggggGi..', '..iGggggggggGi..', '.iGgggLgggggggGi', '.iGggggggggLggGi', '.iGGgggggggggGGi', '..iGGgggggggGGi.', '...iGGGgggGGGi..', '....iiGGGGii....', '......iooi......', '......iooi......', '......iooi......', '.....ioooi......', '.....iiii.......'];
  const LOUNGER = ['................', '..iiiiiiiiiiii..', '.ibwwbbwwbbwwbi.', '.ibwwbbwwbbwwbi.', '.ibwwbbwwbbwwbi.', '.iiiiiiiiiiiiii.', '..ibwwbbwwbbwbi.', '..ibwwbbwwbbwbi.', '..ibwwbbwwbbwbi.', '..ibwwbbwwbbwbi.', '..iiiiiiiiiiiii.', '...i.........i..', '...i.........i..', '................', '................', '................'];
  const POT = ['..iiii..', '.iLgLgi.', 'iGgLgGgi', '.iggGgi.', '..iiii..', '.iOOOOi.', '.iooooi.', '..iiii..'];
  const FENCE = ['.ii......ii.....', '.io......io.....', 'iiiiiiiiiiiiiiii', 'ioooooooooooooo', 'iiiiiiiiiiiiiiii', '.io......io.....', '.io......io.....', '.ii......ii.....'];
  const PINE = ['.......ii.......', '......iGGi......', '......iGLi......', '.....iGGGGi.....', '.....iLGGGi.....', '....iGGGGGGi....', '.....iGGLGi.....', '....iGGGGGGi....', '...iGLGGGGGGi...', '....iGGGGGGi....', '...iGGGGLGGGi...', '..iGGGGGGGGGGi..', '...iGGLGGGGGi...', '..iGGGGGGGGGGi..', '.iGGGGGGGGGLGGi.', '..iiiGGGGGGiii..', '.....iGGGGi.....', '......iooi......', '......iooi......', '......iOoi......', '......iooi......', '......iOoi......', '......iooi......', '......iooi......', '.....iOooi......', '.....ioooi......', '.....iiiii......', '................', '................', '................', '................', '................'];
  const pine = () => cached('pine', 16, 32, (gg) => rows(gg, PINE, 0, 0));
  const ROUND = ['.....iiiiii.....', '...iiGGggGGii...', '..iGgggLLgggGi..', '.iGggLLggggggGi.', '.iGgggggggLgggi.', 'iGggLggggggggGGi', 'iGgggggggLggGGGi', 'iGgLggggggggGGGi', 'iGGgggggLgggGGGi', 'iGGGggggggggGGGi', '.iGGGgggggGGGGi.', '.iGGGGggggGGGGi.', '..iGGGGGGGGGGi..', '...iiGGGGGGii...', '.....iiooii.....', '......iooi......', '......iooi......', '......iOoi......', '.....ioooi......', '.....iiiii......'];
  const roundTree = () => cached('round', 16, 20, (gg) => rows(gg, ROUND, 0, 0));
  // a house (56×40) the GBA way: a striped roof block, light walls with a darker base, framed windows with a sill, a door under a small awning
  function villa(g, x, y, roof) {
    const [rf, rl, rd] = roof || [C.j, C.c, C.J];
    px(g, rd, x - 2, y + 2, 60, 16); for (let ry = y + 3; ry < y + 17; ry += 2) px(g, rf, x - 1, ry, 58, 1); px(g, C.i, x - 2, y + 17, 60, 1); px(g, rl, x - 1, y + 2, 58, 1);
    px(g, rd, x + 22, y - 2, 10, 5); px(g, C.i, x + 22, y - 3, 10, 1);
    px(g, C.c, x, y + 18, 56, 22); px(g, C.e, x, y + 36, 56, 4); px(g, C.i, x, y + 39, 56, 1); px(g, C.e, x, y + 18, 1, 22); px(g, C.e, x + 55, y + 18, 1, 22);
    [[6, 22], [40, 22]].forEach(([wx, wy]) => { px(g, C.b, x + wx - 1, y + wy - 1, 12, 10); px(g, C.l, x + wx, y + wy, 10, 8); px(g, C.w, x + wx + 1, y + wy + 1, 3, 2); px(g, C.b, x + wx + 4, y + wy, 2, 8); px(g, C.e, x + wx - 2, y + wy + 9, 14, 1); });
    px(g, C.i, x + 22, y + 24, 12, 16); px(g, C.o, x + 23, y + 25, 10, 14); px(g, C.y, x + 30, y + 32, 1, 1);
    for (let i = 0; i < 4; i++) px(g, i % 2 ? C.j : C.c, x + 20 + i * 4, y + 21, 4, 3); px(g, C.i, x + 20, y + 24, 16, 1);
  }
  // the storage yard (256×192): gravel, a corrugated hangar with the roll-up gate on the right and a door on the left,
  // a trailer seen from behind in front, the day crates by the gate; open when you are there
  function storage(g, at, n, t) {
    px(g, '#bfe3ff', 0, 0, 256, 100); px(g, '#d4ecff', 0, 60, 256, 40); [[20, 18], [150, 10], [210, 30], [90, 34]].forEach(([x, y]) => { px(g, C.w, x, y + 2, 18, 4); px(g, C.w, x + 4, y, 10, 2); });
    lay(g, 'gravel', 0, 96, 256, 192);
    px(g, C.g, 0, 92, 256, 5); px(g, C.G, 0, 96, 256, 1); [[4, 62], [22, 56], [206, 60], [232, 54]].forEach(([x, y]) => g.drawImage(pine(), x, y));
    // the hangar 40..200 × 36..108
    px(g, C.i, 40, 36, 160, 72); px(g, C.h, 41, 37, 158, 70); for (let rx = 45; rx < 199; rx += 6) px(g, C.n, rx, 37, 1, 70);
    px(g, C.i, 36, 30, 168, 8); px(g, C.N, 37, 31, 166, 6); px(g, C.n, 37, 31, 166, 1);                                            // roof
    px(g, C.i, 120, 52, 64, 56);                                                                                                  // the gate frame
    if (at) {
      px(g, C.N, 121, 53, 62, 54); px(g, C.n, 121, 53, 62, 8); for (let rx = 122; rx < 182; rx += 4) px(g, C.h, rx, 55, 2, 1);          // rolled up
      [[88], [104]].forEach(([sy]) => px(g, C.o, 124, sy, 56, 2));
      for (let i = 0; i < 6; i++) { const dx = 125 + i * 9, dy = 78; px(g, C.i, dx, dy, 7, 10); px(g, i % 2 ? C.w : C.l, dx + 1, dy + 1, 5, 8); px(g, i % 2 ? C.b : C.r, dx + 2, dy + 4, 3, 2); }   // drums of chemicals
      for (let i = 0; i < 4; i++) { const dx = 126 + i * 8; px(g, C.O, dx, 92, 1, 12); px(g, C.h, dx - 1, 92, 3, 3); }               // brooms and poles
      px(g, C.i, 162, 96, 12, 8); px(g, C.b, 163, 97, 10, 6); px(g, C.w, 165, 98, 2, 2); px(g, C.i, 163, 103, 3, 1); px(g, C.i, 170, 103, 3, 1);   // the robot
    } else { px(g, C.n, 121, 53, 62, 54); for (let ry = 56; ry < 106; ry += 5) px(g, C.N, 121, ry, 62, 1); px(g, C.h, 121, 54, 62, 1); px(g, C.i, 148, 80, 8, 2); }   // slats, a handle
    px(g, C.i, 60, 68, 18, 40); px(g, C.b, 61, 69, 16, 38); px(g, C.i, 65, 73, 8, 8); px(g, C.l, 66, 74, 6, 6); px(g, C.y, 63, 90, 2, 2);        // the door
    px(g, C.i, 84, 46, 30, 12); px(g, C.b, 85, 47, 28, 10); for (let i = 0; i < 5; i++) px(g, C.w, 88 + i * 5, 51, 3, 2);              // the sign
    // the trailer from behind, 56..110 × 112..152: rear doors, tail lights, wheels either side
    px(g, C.i, 62, 112, 44, 30); px(g, C.n, 63, 113, 42, 28); px(g, C.h, 63, 113, 42, 3); px(g, C.i, 83, 116, 2, 25); px(g, C.N, 66, 118, 1, 20); px(g, C.N, 101, 118, 1, 20);
    px(g, C.h, 79, 128, 3, 2); px(g, C.h, 86, 128, 3, 2); px(g, C.r, 64, 136, 4, 3); px(g, C.r, 100, 136, 4, 3); px(g, C.w, 79, 136, 10, 4); px(g, C.i, 81, 138, 6, 1);   // latches, lights, plate
    px(g, C.i, 56, 138, 8, 4); px(g, C.i, 104, 138, 8, 4); [[54, 140], [102, 140]].forEach(([wx, wy]) => { px(g, C.i, wx, wy, 12, 12); px(g, C.N, wx + 2, wy + 2, 8, 8); px(g, C.h, wx + 5, wy + 5, 2, 2); });
    for (let i = 0; i < Math.min(n || 0, 6); i++) { const cx = 200 + (i % 3) * 11, cy = 128 - Math.floor(i / 3) * 11; px(g, C.i, cx, cy, 11, 11); px(g, C.o, cx + 1, cy + 1, 9, 9); px(g, C.O, cx + 1, cy + 1, 9, 1); px(g, C.y, cx + 4, cy + 4, 3, 3); }   // the day crates
  }
  // the blue maintenance shed (32×32): roof, wall with planks, door (open shows shelves), hose ring
  function shed(g, x, y, open, crates) {
    px(g, C.i, x, y + 6, 32, 26); px(g, C.b, x + 1, y + 7, 30, 24); for (let py = y + 9; py < y + 30; py += 4) px(g, C.B, x + 1, py, 30, 1);
    px(g, C.i, x - 1, y + 2, 34, 5); px(g, C.B, x, y + 3, 32, 3); px(g, C.h, x, y + 3, 32, 1);
    px(g, C.i, x + 4, y + 14, 10, 18); if (open) { px(g, C.N, x + 5, y + 15, 8, 16); [18, 23, 28].forEach((sy, i) => { px(g, C.o, x + 5, y + sy, 8, 1); for (let j = 0; j < 2; j++) px(g, Object.values(RCOL)[(i * 2 + j) % 6], x + 6 + j * 4, y + sy - 3, 3, 3); }); } else { px(g, C.o, x + 5, y + 15, 8, 16); px(g, C.A, x + 9, y + 15, 1, 16); px(g, C.y, x + 11, y + 23, 1, 1); }
    px(g, C.i, x + 18, y + 12, 10, 10); px(g, C.g, x + 19, y + 13, 8, 8); px(g, C.b, x + 21, y + 15, 4, 4); px(g, C.G, x + 20, y + 14, 6, 1);   // hose ring
    px(g, C.i, x + 20, y + 25, 6, 7); px(g, C.w, x + 21, y + 26, 4, 5); px(g, C.r, x + 22, y + 27, 2, 1);                                    // a bottle
    for (let i = 0; i < Math.min(crates || 0, 6); i++) { const cx = x + 34 + (i % 3) * 9, cy = y + 24 - Math.floor(i / 3) * 9; px(g, C.i, cx, cy, 9, 9); px(g, C.o, cx + 1, cy + 1, 7, 7); px(g, C.O, cx + 1, cy + 1, 7, 1); px(g, C.y, cx + 3, cy + 3, 3, 3); }
  }
  const WATER = { calme: ['#4aa8ff', '#8ed4ff', '#2f7fd6'], 'traité': ['#39c9d6', '#9ff2f5', '#22a3b0'], sauvage: ['#5faa4a', '#a3d66e', '#3f7d2a'], critique: ['#35603a', '#4f8a4a', '#24422a'], sunk: ['#101828', '#1c2740', '#0a1020'] };
  // the courtyard (256×192): sea at the horizon, grass with a villa and pines, a slab deck (32..224 × 40..160) around the basin
  // with its cream coping (56..200 × 56..136), the shed and pump at the right, loungers, pots, the fence along the bottom
  // opts: { state, sunk, dirt, t (seconds, for the ripples), pumpLate, creature (a 24×24 canvas swimming in the pool), seed }
  function courtyard(g, o) {
    o = o || {}; const t = o.t || 0;
    lay(g, 'grass', 0, 0, 256, 192); lay(g, 'sand', 0, 160, 256, 192); px(g, C.z, 0, 160, 256, 1); px(g, C.S, 0, 161, 256, 1);
    px(g, C.q, 0, 0, 256, 12); px(g, C.Q, 0, 10, 256, 2); for (let i = 0; i < 14; i++) px(g, C.w, (i * 19 + Math.floor(t * 6)) % 256, 2 + (i % 4) * 2, 5, 1);
    lay(g, 'slab', 32, 40, 224, 160);
    px(g, C.S, 32, 40, 192, 1); px(g, C.S, 32, 40, 1, 120); px(g, C.i, 32, 159, 192, 1);
    villa(g, 6, 2); [[74, 6], [124, 8], [180, 7], [240, 52], [238, 124]].forEach(([x, y]) => g.drawImage(pine(), x, y)); [[98, 16], [152, 14], [236, 18], [2, 100], [4, 128]].forEach(([x, y]) => g.drawImage(roundTree(), x, y));
    shed(g, 222, 66, false, 0);
    const fence = cached('fence', 16, 8, (gg) => rows(gg, FENCE, 0, 0)); for (let tx = 0; tx < 256; tx += 16) g.drawImage(fence, tx, 184);
    const lounger = cached('lounger', 16, 16, (gg) => rows(gg, LOUNGER, 0, 0)); g.drawImage(lounger, 36, 66); g.drawImage(lounger, 36, 90);
    const pot = cached('pot', 8, 8, (gg) => rows(gg, POT, 0, 0)); [[36, 44], [212, 44], [212, 148], [36, 148], [8, 150], [244, 150]].forEach(([x, y]) => g.drawImage(pot, x, y));
    for (let i = 0; i < 10; i++) rows(g, ['.G.', 'GLG'], [8, 20, 236, 246, 14, 228, 4, 250, 12, 240][i], [120, 140, 100, 128, 168, 172, 176, 178, 60, 86][i]);
    lay(g, 'paving', 56, 56, 200, 136);
    px(g, C.S, 56, 56, 144, 1); px(g, C.S, 56, 135, 144, 1); px(g, C.S, 56, 56, 1, 80); px(g, C.S, 199, 56, 1, 80);
    const w = o.sunk ? WATER.sunk : WATER[o.state] || WATER.calme;
    px(g, C.i, 60, 60, 136, 72); px(g, w[0], 61, 61, 134, 70); px(g, w[2], 61, 122, 134, 9); px(g, w[1], 61, 61, 134, 3);
    for (let ry = 0; ry < 8; ry++) for (let rx = 0; rx < 9; rx++) { const wx = 62 + rx * 16 + (ry % 2) * 8 + (Math.floor(t * 2) % 4) * 2, wy = 66 + ry * 8; if (wx + 5 < 195) { px(g, w[1], wx, wy, 4, 1); px(g, w[1], wx + 4, wy + 1, 2, 1); } }
    if (o.sunk) for (let i = 0; i < 10; i++) px(g, '#3a2a5a', 66 + ((i * 29 + Math.floor(t * 5)) % 118), 66 + ((i * 13 + Math.floor(t * 3)) % 52), 4, 2);
    if (o.dirt) { let h = 7; for (let i = 0; i < o.dirt * 16; i++) { h = (h * 1103515245 + 12345) & 0x7fffffff; px(g, i % 3 ? C.A : C.O, 64 + (h % 124), 66 + ((h >> 8) % 52), 2, 1); } }
    if (o.creature && !o.sunk) { let h = 2166136261; for (const ch of String(o.seed || '')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } h >>>= 0; const cx = 70 + (h % 96) + Math.round(Math.sin(t * .6 + h % 7) * 6), cy = 66 + ((h >> 5) % 40) + Math.round(Math.sin(t * .9) * 2); px(g, w[1], cx - 4, cy + 20, 32, 1); g.drawImage(o.creature, cx, cy); }
    px(g, C.w, 66, 112, 2, 20); px(g, C.w, 74, 112, 2, 20); px(g, C.w, 66, 116, 10, 1); px(g, C.w, 66, 122, 10, 1); px(g, C.w, 66, 128, 10, 1);   // ladder
    px(g, C.i, 148, 130, 16, 7); px(g, C.c, 149, 131, 14, 5); px(g, C.i, 151, 134, 10, 1);                                                          // skimmer on the near coping
    px(g, C.i, 226, 102, 14, 14); px(g, C.n, 227, 103, 12, 12); px(g, C.w, 229, 105, 8, 6); px(g, o.pumpLate ? C.r : C.g, 232, 107, 2, 2); px(g, C.i, 228, 112, 10, 1); // pump by the shed
  }
  // ---------------------------------------------------------------- a pool's map (256×192) from its layout (js/maps.js)
  // o: { state, sunk, dirt, t, pumpLate, drawWater, open }. Actors are drawn separately.
  const SIGN = ['..iiiiiiii..', '.iwwwwwwwwi.', '.iwbbwwbbwi.', '.iwwwwwwwwi.', '..iiiiiiii..', '.....ii.....', '.....io.....', '.....io.....', '.....io.....', '....iiii....'];
  const BENCH = ['iiiiiiiiiiiiii', 'iOOOOOOOOOOOOi', 'iooooooooooooi', 'iiiiiiiiiiiiii', '.io........oi.', '.io........oi.', '.ii........ii.'];
  function map(g, L, o) {
    o = o || {}; const t = o.t || 0; const T = 16;
    for (let y = 0; y < L.ground.length; y++) for (let x = 0; x < L.ground[y].length; x++) { const k = L.ground[y][x]; if (k === 'water') continue; g.drawImage(tile(k, x * 7 + y * 3 + (x * y) % 5), x * T, y * T); }
    // the border: a hedge along the top, the fence along the bottom; pines for a forest; the canal down the right
    if (L.border !== 'canal') { for (let x = 0; x < 16; x++) { if (L.border === 'forest') g.drawImage(pine(), x * T, -14); else g.drawImage(tile('hedge'), x * T, 0); } }
    else { for (let x = 0; x < 16; x++) g.drawImage(tile('hedge'), x * T, 0); px(g, C.Q, 240, 0, 16, 192); px(g, C.q, 242, 0, 12, 192); for (let i = 0; i < 12; i++) px(g, C.l, 244 + (i % 2) * 4, (i * 16 + Math.floor(t * 6)) % 192, 4, 1); px(g, C.S, 239, 0, 1, 192); }
    if (L.border !== 'canal') { const fence = cached('fence', 16, 8, (gg) => rows(gg, FENCE, 0, 0)); for (let x = 0; x < 16; x++) g.drawImage(fence, x * T, 184); }
    // the basin
    const w = o.sunk ? WATER.sunk : WATER[o.state] || WATER.calme; const P = L.pool; const bx = P.x * T, by = P.y * T, bw = P.w * T, bh = P.h * T;
    px(g, C.i, bx - 1, by - 1, bw + 2, bh + 2); px(g, w[0], bx, by, bw, bh); px(g, w[2], bx, by + bh - 8, bw, 8); px(g, w[1], bx, by, bw, 2);
    const animatedWater = !o.sunk && o.drawWater?.(g, o.state, t * 1000, bx, by, bw, bh);
    if (!animatedWater) for (let ry = 0; ry < bh / 8; ry++) for (let rx = 0; rx < bw / 16 + 1; rx++) { const wx = bx + 2 + rx * 16 + (ry % 2) * 8 + (Math.floor(t * 2) % 4) * 2, wy = by + 5 + ry * 8; if (wx + 6 < bx + bw && wy < by + bh - 2) { px(g, w[1], wx, wy, 4, 1); px(g, w[1], wx + 4, wy + 1, 2, 1); } }
    if (o.sunk) for (let i = 0; i < 8; i++) px(g, '#3a2a5a', bx + 4 + ((i * 29 + Math.floor(t * 5)) % (bw - 8)), by + 4 + ((i * 13 + Math.floor(t * 3)) % (bh - 8)), 3, 2);
    if (o.dirt) { let h = 7; for (let i = 0; i < o.dirt * 10; i++) { h = (h * 1103515245 + 12345) & 0x7fffffff; px(g, i % 3 ? C.A : C.O, bx + 3 + (h % (bw - 6)), by + 3 + ((h >> 8) % (bh - 6)), 2, 1); } }
    // ladder on the pool edge nearest its anchor, skimmer on its coping cell
    const la = L.anchors.la; const sk = L.anchors.sk;
    if (la.y >= P.y + P.h) { px(g, C.w, la.x * T + 5, by + bh - 12, 2, 13); px(g, C.w, la.x * T + 10, by + bh - 12, 2, 13); px(g, C.w, la.x * T + 5, by + bh - 9, 7, 1); px(g, C.w, la.x * T + 5, by + bh - 4, 7, 1); }
    else if (la.x >= P.x + P.w) { px(g, C.w, bx + bw - 12, la.y * T + 5, 13, 2); px(g, C.w, bx + bw - 12, la.y * T + 10, 13, 2); px(g, C.w, bx + bw - 9, la.y * T + 5, 1, 7); px(g, C.w, bx + bw - 4, la.y * T + 5, 1, 7); }
    else if (la.x < P.x) { px(g, C.w, bx - 1, la.y * T + 5, 13, 2); px(g, C.w, bx - 1, la.y * T + 10, 13, 2); px(g, C.w, bx + 8, la.y * T + 5, 1, 7); px(g, C.w, bx + 3, la.y * T + 5, 1, 7); }
    else { px(g, C.w, la.x * T + 5, by - 1, 2, 13); px(g, C.w, la.x * T + 10, by - 1, 2, 13); px(g, C.w, la.x * T + 5, by + 3, 7, 1); px(g, C.w, la.x * T + 5, by + 8, 7, 1); }
    if (!(sk.x === la.x && sk.y === la.y)) { px(g, C.i, sk.x * T + 1, sk.y * T + 1, 14, 6); px(g, C.c, sk.x * T + 2, sk.y * T + 2, 12, 4); px(g, C.i, sk.x * T + 4, sk.y * T + 4, 8, 1); }
    else { px(g, C.i, sk.x * T + 1, sk.y * T + 9, 14, 6); px(g, C.c, sk.x * T + 2, sk.y * T + 10, 12, 4); px(g, C.i, sk.x * T + 4, sk.y * T + 12, 8, 1); }
    // objects, painted from the back
    const objs = L.objects.slice().sort((p, q) => (p.y + p.h) - (q.y + q.h));
    objs.forEach((ob) => {
      const x = ob.x * T, y = ob.y * T;
      if (ob.kind === 'villa') villa(g, x + 4, y + 8, ROOF[L.res]);
      else if (ob.kind === 'shed') shed(g, x, y, !!o.open, 0);
      else if (ob.kind === 'pump') { px(g, C.i, x + 1, y + 2, 14, 13); px(g, C.n, x + 2, y + 3, 12, 11); px(g, C.w, x + 4, y + 5, 8, 5); px(g, o.pumpLate ? C.r : C.g, x + 7, y + 7, 2, 2); px(g, C.i, x + 3, y + 11, 10, 1); if (ob.salt) px(g, C.l, x + 4, y + 12, 3, 2); }
      else if (ob.kind === 'lounger') g.drawImage(cached('lounger', 16, 16, (gg) => rows(gg, LOUNGER, 0, 0)), x, y);
      else if (ob.kind === 'tree') g.drawImage(roundTree(), x, y - 4);
      else if (ob.kind === 'pine') g.drawImage(pine(), x, y);
      else if (ob.kind === 'sign') rows(g, SIGN, x + 2, y + 3);
      else if (ob.kind === 'pot') g.drawImage(cached('pot', 8, 8, (gg) => rows(gg, POT, 0, 0)), x + 4, y + 6);
      else if (ob.kind === 'bench') rows(g, BENCH, x + 1, y + 6);
    });
    // a few grass tufts and flowers on the lawn, seeded by the pool
    let h = 11; for (let i = 0; i < 10; i++) { h = (h * 1103515245 + 12345) & 0x7fffffff; const cx = 1 + (h % 14), cy = 1 + ((h >> 8) % 10); if (L.ground[cy][cx] === 'grass' && !L.coll[cy][cx]) rows(g, i % 3 ? ['.G.', 'GLG'] : ['.x.', 'xwx', '.G.'], cx * T + 4 + (h >> 16) % 8, cy * T + 4 + (h >> 20) % 8); }
  }
  // encounter backdrop for the fight (same courtyard, the basin bigger in frame)
  const heroSets = (equip) => ({ head: equip['tête'] ? equip['tête'].res : null, body: equip.torse ? equip.torse.res : null, legs: equip.jambes ? equip.jambes.res : null, feet: equip.pieds ? equip.pieds.res : null, tool: equip.perche ? equip.perche.res : (equip.balai ? equip.balai.res : null), toolKind: equip.perche ? 'perche' : (equip.balai ? 'balai' : null) });
  const heroTrim = (equip) => { const t = {}; [['tête', 'head'], ['torse', 'body'], ['jambes', 'legs'], ['pieds', 'feet']].forEach(([sl, k]) => { if (equip[sl] && equip[sl].rar !== 'common') t[k] = RCOL[equip[sl].rar]; }); return t; };

  return { C, ZONE, RCOL, ROOF, WATER, px, rows, mir, trainer, keeper, creature, monster, MON, SPECIES, item, ITEM, crate, tile, lay, TILE, shed, storage, villa, pine, roundTree, courtyard, map, heroSets, heroTrim, TREE, PINE, ROUND, LOUNGER, cached };
})();
window.PixelArt = PixelArt;
