/*
 * Pocket Coast — the Quest's pixel art, hand-drawn and data-free.
 * Chunky square pixels, a 1-px ink outline on everything alive, flat fills
 * with one shade step, light from the top-left. Sizes are the game's pixel
 * budget: trainer 24×32, creatures 24×24, monsters 28×24, items 16×16,
 * tiles 16×16, stage 256×192. Sprites are row strings (one letter per pixel,
 * see C for the letters); symmetric ones give the left half only.
 */
const PixelArt = (() => {
  // ------------------------------------------------------------ palette
  const C = {
    i: '#20203a', w: '#fffbe9', c: '#f6f1dc', s: '#e9d59a', S: '#d9c284', z: '#f3e6b8',
    k: '#e8b88a', K: '#c68d5a', o: '#8a4a1e', O: '#c98a4a', d: '#cdb27a', D: '#a88d55',
    b: '#2f4fdf', B: '#1a1c5a', l: '#7ec8ff', g: '#2aa845', G: '#124d2a', L: '#b5f27a',
    a: '#e39b12', A: '#8a4a1e', y: '#f2c14e', p: '#7b3fc4', P: '#3a1a5a', v: '#c9b6e8',
    t: '#1f9e8a', T: '#0f4a42', m: '#8ee6d2', r: '#d82f2f', R: '#a81f1f', x: '#ff7aa8',
    q: '#4aa8ff', Q: '#2f7fd6', n: '#7a7a90', N: '#4a4a60', h: '#b8c4d6', e: '#c9c0a8', j: '#c96a3a', J: '#9a4a2a', u: '#b9b4a6', U: '#9a9588',
  };
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

  // ------------------------------------------------------------ the keeper (24×32, the figure itself 22×28: a 10×8 head, a 10×8 torso, arms at its sides, shorts straight onto the feet)
  // sets: { head, body, legs, feet, tool } → zone codes (or null for the plain kit); tool: 'perche' | 'balai' | null
  // o: { walk (number, alternates legs), crouch, back, skin, hair (1..4), hairColor, trim: { head, body, legs, feet } rarity colours }
  function trainer(g, x, y, sets, o) {
    sets = sets || {}; o = o || {}; const trim = o.trim || {};
    const skin = o.skin || C.k, skinD = shade(skin, .82); const hairC = o.hairColor || C.o; const I = C.i;
    const f = o.walk ? Math.floor(o.walk) % 2 : -1; const top = y + 2 + (o.crouch ? 3 : 0);
    const hy = top + 2, by = hy + 10, ly = by + 10;
    // shorts straight onto the feet (no legs)
    const lz = ZONE[sets.legs]; const short = lz ? { EC: C.d, AG: C.G, EP: C.d, EPP: C.y, GP: C.T }[sets.legs] : C.d; const shortD = shade(short, .8);
    px(g, I, x + 6, ly, 12, 5); px(g, short, x + 7, ly, 10, 4); px(g, shortD, x + 15, ly, 2, 4); px(g, shortD, x + 11, ly + 1, 2, 3);
    if (sets.legs === 'EPP') { px(g, C.w, x + 8, ly + 1, 1, 1); px(g, C.w, x + 14, ly + 2, 1, 1); } else { px(g, shortD, x + 8, ly + 1, 2, 2); px(g, shortD, x + 13, ly + 1, 2, 2); }
    if (trim.legs) px(g, trim.legs, x + 11, ly, 2, 1);
    const fz = sets.feet; const shoe = fz ? { EC: C.b, AG: C.g, EP: C.o, EPP: C.y, GP: C.t }[fz] : C.b;
    const fy1 = ly + 4 - (f === 1 ? 1 : 0), fy2 = ly + 4 - (f === 0 ? 1 : 0);
    px(g, I, x + 5, fy1, 7, 3); px(g, I, x + 12, fy2, 7, 3); px(g, shoe, x + 6, fy1 + 1, 5, 1); px(g, shoe, x + 13, fy2 + 1, 5, 1);
    if (fz === 'EP') { px(g, I, x + 5, fy1 - 1, 7, 1); px(g, I, x + 12, fy2 - 1, 7, 1); px(g, shoe, x + 6, fy1, 5, 1); px(g, shoe, x + 13, fy2, 5, 1); }   // boots
    else if (fz === 'EPP') { px(g, C.w, x + 8, fy1 + 1, 1, 1); px(g, C.w, x + 15, fy2 + 1, 1, 1); }                                                   // sandals
    else { px(g, shade(shoe, 1.4), x + 7, fy1 + 1, 1, 1); px(g, shade(shoe, 1.4), x + 9, fy1 + 1, 1, 1); px(g, shade(shoe, 1.4), x + 14, fy2 + 1, 1, 1); px(g, shade(shoe, 1.4), x + 16, fy2 + 1, 1, 1); } // clog holes
    if (trim.feet) { px(g, trim.feet, x + 6, fy1 + 1, 1, 1); px(g, trim.feet, x + 17, fy2 + 1, 1, 1); }
    // torso 10×8
    const bz = sets.body; const shirt = bz ? { EC: C.w, AG: C.g, EP: C.y, EPP: C.v, GP: C.t }[bz] : C.w; const shirtD = shade(shirt, .84);
    px(g, I, x + 6, by, 12, 10); px(g, shirt, x + 7, by + 1, 10, 8); px(g, shirtD, x + 15, by + 1, 2, 8);
    if (bz === 'EC' || !bz) { px(g, C.b, x + 10, by + 1, 4, 1); px(g, C.b, x + 10, by + 2, 1, 1); px(g, C.b, x + 13, by + 2, 1, 1); px(g, C.b, x + 11, by + 3, 2, 1); }   // polo collar
    if (bz === 'AG') { px(g, C.L, x + 8, by + 3, 8, 1); px(g, C.L, x + 11, by + 5, 2, 2); }                                                                       // surf tee
    if (bz === 'EP') { px(g, C.A, x + 7, by + 1, 2, 8); px(g, C.A, x + 15, by + 1, 2, 8); px(g, C.a, x + 7, by + 5, 1, 2); px(g, C.a, x + 16, by + 5, 1, 2); }       // vest
    if (bz === 'EPP') { [[8, 2], [11, 4], [14, 2], [9, 6], [13, 7]].forEach(([dx, dy]) => px(g, C.x, x + dx, by + dy, 2, 1)); px(g, C.w, x + 11, by + 1, 2, 8); }   // hawaiian
    if (bz === 'GP') { px(g, C.w, x + 7, by + 4, 10, 1); px(g, C.m, x + 10, by + 1, 4, 1); }                                                                      // keeper polo
    if (trim.body) px(g, trim.body, x + 11, by + 8, 2, 1);
    px(g, I, x + 8, by + 7, 8, 3); px(g, C.c, x + 9, by + 8, 6, 1); px(g, trim.body || C.S, x + 11, by + 8, 2, 1);   // pouch on the belt
    // arms: a shoulder of sleeve, then skin, a gap from the torso
    const sleeve = bz === 'AG' || bz === 'GP' ? shirt : (bz === 'EP' ? C.w : shirt);
    px(g, I, x + 3, by, 4, 8); px(g, I, x + 17, by, 4, 8); px(g, sleeve, x + 4, by + 1, 3, 2); px(g, sleeve, x + 17, by + 1, 3, 2);
    px(g, skin, x + 4, by + 3, 2, 4); px(g, skin, x + 18, by + 3, 2, 4); px(g, skinD, x + 19, by + 3, 1, 4);
    px(g, I, x + 6, by + 3, 1, 7); px(g, I, x + 17, by + 3, 1, 7);
    if (bz === 'EP') { px(g, C.A, x + 7, by + 1, 2, 2); px(g, C.A, x + 15, by + 1, 2, 2); }
    // head 10×8
    px(g, I, x + 6, hy, 12, 10); px(g, skin, x + 7, hy + 1, 10, 8); px(g, skinD, x + 15, hy + 2, 2, 7);
    if (!o.back) { px(g, I, x + 9, hy + 5, 1, 2); px(g, I, x + 14, hy + 5, 1, 2); px(g, skinD, x + 11, hy + 8, 2, 1); }
    // hair (what a hat leaves showing)
    px(g, hairC, x + 7, hy + 1, 10, 2); px(g, hairC, x + 7, hy + 3, 1, 1); px(g, hairC, x + 16, hy + 3, 1, 1);
    if ((o.hair || 1) === 3) { px(g, hairC, x + 6, hy + 3, 2, 6); px(g, hairC, x + 16, hy + 3, 2, 6); }
    if ((o.hair || 1) === 2 && !sets.head) { px(g, hairC, x + 8, hy - 1, 1, 1); px(g, hairC, x + 11, hy - 2, 1, 2); px(g, hairC, x + 14, hy - 1, 1, 1); }
    // hat by set, pulled down over the head (the trim takes the rarity colour)
    const hz = sets.head; const tr = trim.head;
    if (hz === 'EC') { px(g, I, x + 6, hy - 2, 12, 7); px(g, C.b, x + 7, hy - 1, 10, 5); px(g, C.B, x + 7, hy + 3, 10, 1); px(g, I, x + 1, hy + 1, 6, 3); px(g, C.b, x + 2, hy + 2, 5, 1); px(g, tr || C.l, x + 11, hy, 2, 1); }   // backward cap
    if (hz === 'AG') { px(g, I, x + 7, hy - 3, 10, 5); px(g, C.G, x + 8, hy - 2, 8, 4); px(g, I, x + 4, hy + 1, 16, 3); px(g, C.g, x + 5, hy + 2, 14, 1); px(g, tr || C.L, x + 8, hy + 1, 8, 1); }                              // bucket hat
    if (hz === 'EP') { px(g, I, x + 8, hy - 3, 8, 5); px(g, C.y, x + 9, hy - 2, 6, 4); px(g, I, x + 2, hy + 1, 20, 3); px(g, C.y, x + 3, hy + 2, 18, 1); px(g, tr || C.A, x + 9, hy + 1, 6, 1); }                                  // straw hat
    if (hz === 'EPP') { px(g, I, x + 6, hy + 3, 12, 4); px(g, C.P, x + 7, hy + 4, 4, 2); px(g, C.P, x + 13, hy + 4, 4, 2); px(g, tr || C.p, x + 11, hy + 4, 2, 1); px(g, C.w, x + 8, hy + 4, 1, 1); px(g, C.w, x + 14, hy + 4, 1, 1); } // oversized shades
    if (hz === 'GP') { px(g, I, x + 6, hy, 12, 3); px(g, C.t, x + 7, hy + 1, 10, 1); px(g, I, x + 4, hy + 2, 16, 2); px(g, tr || C.m, x + 5, hy + 2, 14, 1); }                                                              // visor
    // tool in the right hand
    const tz = sets.tool; const tc = o.toolColor;
    if (tz && sets.toolKind === 'balai') { px(g, I, x + 21, top + 2, 3, 20); px(g, tc || C.O, x + 22, top + 3, 1, 18); px(g, I, x + 18, top + 21, 8, 4); px(g, C.h, x + 19, top + 22, 6, 2); }
    else if (tz) {
      px(g, I, x + 21, top + 1, 3, 24); px(g, tc || C.n, x + 22, top + 2, 1, 22);
      if (tz === 'EC') { px(g, I, x + 17, top - 2, 7, 6); px(g, C.l, x + 18, top - 1, 5, 4); px(g, C.w, x + 19, top, 1, 1); px(g, C.w, x + 21, top + 1, 1, 1); px(g, C.w, x + 19, top + 2, 1, 1); }   // telescopic net
      if (tz === 'AG') { px(g, tc || C.y, x + 22, top - 2, 1, 27); px(g, C.A, x + 22, top + 4, 1, 1); px(g, C.A, x + 22, top + 12, 1, 1); px(g, C.A, x + 22, top + 20, 1, 1); }                          // bamboo
      if (tz === 'EP') { px(g, I, x + 17, top - 2, 7, 4); px(g, C.n, x + 18, top - 1, 5, 1); px(g, C.n, x + 18, top, 1, 1); px(g, C.n, x + 20, top, 1, 1); px(g, C.n, x + 22, top, 1, 1); }               // rake
      if (tz === 'EPP') { px(g, I, x + 18, top - 2, 6, 6); px(g, C.v, x + 19, top - 1, 4, 4); px(g, C.p, x + 20, top, 1, 1); px(g, C.p, x + 21, top + 1, 1, 1); }                                        // shrimp net
      if (tz === 'GP') { px(g, I, x + 19, top - 2, 5, 4); px(g, C.t, x + 20, top - 1, 3, 1); px(g, C.t, x + 20, top, 1, 1); }                                                                      // hook pole
    }
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
    sand: [['ssssssssssssssss', 'ssssSsssssssssss', 'ssssssssssssSsss', 'ssssssssssssssss', 'sSssssssssssssss', 'ssssssssSsssssss', 'ssssssssssssssss', 'ssssssssssssssSs', 'ssssssssssssssss', 'ssSsssssssssssss', 'ssssssssssSsssss', 'ssssssssssssssss', 'ssssssSsssssssss', 'ssssssssssssssss', 'sssSsssssssssSss', 'ssssssssssssssss'],
      ['ssssssssssssssss', 'ssssssssssSSssss', 'sSsssssssssssszs', 'ssssssssssssssss', 'sssssszzssssssss', 'ssssssssssssssss', 'ssssssssssssSsss', 'ssSSssssssssssss', 'ssssssssssssssss', 'ssssssssssSsssss', 'ssssssssssssssss', 'sSsssssszsssssss', 'ssssssssssssssSS', 'ssssssssssssssss', 'sssssSssssssssss', 'ssssssssssssssss'],
      ['ssssssssssssssss', 'ssssssssssssssss', 'ssssssssSsssssss', 'ssszzsssssssssss', 'sssssssssssscsss', 'ssssssssssscccss', 'sSssssssssssSsss', 'ssssssssssssssss', 'ssssssssssssssss', 'sssssssSSsssssss', 'ssssssssssssssss', 'sszssssssssssSss', 'ssssssssssssssss', 'ssssssssssssssss', 'ssssSsssssssssss', 'ssssssssssssssss']],
    grass: [['LLLLLLLLLLLLLLLL', 'LLGLLLLLLLLGLLLL', 'LLLLLLLLLLLLLLLL', 'LLLLLLLGLLLLLLLL', 'LLLLLLLLLLLLLLGL', 'LGLLLLLLLLLLLLLL', 'LLLLLLLLLLGLLLLL', 'LLLLLGLLLLLLLLLL', 'LLLLLLLLLLLLLLLL', 'LLLLLLLLLLLLGLLL', 'LLLGLLLLLLLLLLLL', 'LLLLLLLLGLLLLLLL', 'LLLLLLLLLLLLLLLL', 'LLLLLLLLLLLLLLLL', 'LGLLLLLLLLLLLGLL', 'LLLLLLLLLLLLLLLL'],
      ['LLLLLLLLLLLLLLLL', 'LLLLLLLLLLLLLLLL', 'LLLLLGLLLLLLLLLL', 'LLLLGgGLLLLLLLLL', 'LLLLLGLLLLLLLxLL', 'LLLLLLLLLLLLxwxL', 'LLLLLLLLLLLLLxLL', 'LLLLLLLLLLLLLGLL', 'LLGLLLLLLLLLLLLL', 'LLLLLLLLLLLLLLLL', 'LLLLLLLLGLLLLLLL', 'LLLLLLLGgGLLLLLL', 'LLLLLLLLGLLLLLLL', 'LLLLLLLLLLLLLLLL', 'LLLLLLLLLLLLLLLL', 'LLLLLLLLLLLLLLLL'],
      ['LLLLLLLLLLLLLLLL', 'LLLLLLLLggLLLLLL', 'LLLLLLLgggLLLLLL', 'LLLLLLLLggLLLLLL', 'LLLLLLLLLLLLLLLL', 'LLLLLLLLLLLLLLLL', 'LLLyLLLLLLLLLLLL', 'LLywyLLLLLLLLLLL', 'LLLyLLLLLLLLLLLL', 'LLLLLLLLLLLLLggL', 'LLLLLLLLLLLLggLL', 'LLLLLLLLLLLLLLLL', 'LLLLLLLLLLLLLLLL', 'LLLLLGLLLLLLLLLL', 'LLLLGgGLLLLLLLLL', 'LLLLLGLLLLLLLLLL']],
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
  // a villa (56×40): white walls, terracotta roof, blue shutters, a door and a step
  function villa(g, x, y) {
    px(g, C.i, x, y + 14, 56, 26); px(g, C.c, x + 1, y + 15, 54, 24); px(g, C.e, x + 1, y + 34, 54, 5);
    px(g, C.i, x - 2, y + 4, 60, 11); px(g, C.j, x - 1, y + 5, 58, 9); for (let ry = y + 6; ry < y + 14; ry += 2) for (let rx = x + (ry % 4 ? 0 : 3); rx < x + 57; rx += 6) px(g, C.J, rx, ry, 3, 1);
    px(g, C.i, x + 22, y, 12, 5); px(g, C.J, x + 23, y + 1, 10, 3);                                                             // chimney
    [[6, 18], [40, 18]].forEach(([wx, wy]) => { px(g, C.i, x + wx, y + wy, 12, 10); px(g, C.l, x + wx + 1, y + wy + 1, 10, 8); px(g, C.i, x + wx + 5, y + wy + 1, 2, 8); px(g, C.b, x + wx - 3, y + wy, 3, 10); px(g, C.b, x + wx + 12, y + wy, 3, 10); });
    px(g, C.i, x + 23, y + 20, 10, 20); px(g, C.o, x + 24, y + 21, 8, 18); px(g, C.y, x + 30, y + 30, 1, 1); px(g, C.i, x + 20, y + 39, 16, 1);   // door & step
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
    lay(g, 'grass', 0, 0, 256, 192); lay(g, 'sand', 0, 160, 256, 192);
    px(g, C.q, 0, 0, 256, 12); px(g, C.Q, 0, 10, 256, 2); for (let i = 0; i < 14; i++) px(g, C.w, (i * 19 + Math.floor(t * 6)) % 256, 2 + (i % 4) * 2, 5, 1);
    lay(g, 'slab', 32, 40, 224, 160);
    px(g, C.S, 32, 40, 192, 1); px(g, C.S, 32, 40, 1, 120); px(g, C.i, 32, 159, 192, 1);
    villa(g, 6, 2); [[74, 6], [98, 0], [124, 8], [152, 2], [180, 7], [236, 4], [240, 52], [2, 88], [238, 124]].forEach(([x, y]) => g.drawImage(pine(), x, y));
    shed(g, 222, 66, false, 0);
    const fence = cached('fence', 16, 8, (gg) => rows(gg, FENCE, 0, 0)); for (let tx = 0; tx < 256; tx += 16) g.drawImage(fence, tx, 184);
    const lounger = cached('lounger', 16, 16, (gg) => rows(gg, LOUNGER, 0, 0)); g.drawImage(lounger, 36, 66); g.drawImage(lounger, 36, 90);
    const pot = cached('pot', 8, 8, (gg) => rows(gg, POT, 0, 0)); [[36, 44], [212, 44], [212, 148], [36, 148], [8, 150], [244, 150]].forEach(([x, y]) => g.drawImage(pot, x, y));
    for (let i = 0; i < 10; i++) rows(g, ['.G.', 'GLG'], [8, 20, 236, 246, 14, 228, 4, 250, 12, 240][i], [120, 140, 100, 128, 168, 172, 176, 178, 60, 86][i]);
    lay(g, 'paving', 56, 56, 200, 136);
    px(g, C.S, 56, 56, 144, 1); px(g, C.S, 56, 135, 144, 1); px(g, C.S, 56, 56, 1, 80); px(g, C.S, 199, 56, 1, 80);
    const w = o.sunk ? WATER.sunk : WATER[o.state] || WATER.calme;
    px(g, C.i, 60, 60, 136, 72); px(g, w[0], 61, 61, 134, 70); px(g, w[2], 61, 122, 134, 9); px(g, w[1], 61, 61, 134, 3);
    for (let i = 0; i < 12; i++) px(g, w[1], 64 + ((i * 23 + Math.floor(t * 8)) % 124), 68 + (i * 11) % 50, 6, 1);
    if (o.sunk) for (let i = 0; i < 10; i++) px(g, '#3a2a5a', 66 + ((i * 29 + Math.floor(t * 5)) % 118), 66 + ((i * 13 + Math.floor(t * 3)) % 52), 4, 2);
    if (o.dirt) { let h = 7; for (let i = 0; i < o.dirt * 16; i++) { h = (h * 1103515245 + 12345) & 0x7fffffff; px(g, i % 3 ? C.A : C.O, 64 + (h % 124), 66 + ((h >> 8) % 52), 2, 1); } }
    if (o.creature && !o.sunk) { let h = 2166136261; for (const ch of String(o.seed || '')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } h >>>= 0; const cx = 70 + (h % 96) + Math.round(Math.sin(t * .6 + h % 7) * 6), cy = 66 + ((h >> 5) % 40) + Math.round(Math.sin(t * .9) * 2); px(g, w[1], cx - 4, cy + 20, 32, 1); g.drawImage(o.creature, cx, cy); }
    px(g, C.w, 66, 112, 2, 20); px(g, C.w, 74, 112, 2, 20); px(g, C.w, 66, 116, 10, 1); px(g, C.w, 66, 122, 10, 1); px(g, C.w, 66, 128, 10, 1);   // ladder
    px(g, C.i, 148, 130, 16, 7); px(g, C.c, 149, 131, 14, 5); px(g, C.i, 151, 134, 10, 1);                                                          // skimmer on the near coping
    px(g, C.i, 226, 102, 14, 14); px(g, C.n, 227, 103, 12, 12); px(g, C.w, 229, 105, 8, 6); px(g, o.pumpLate ? C.r : C.g, 232, 107, 2, 2); px(g, C.i, 228, 112, 10, 1); // pump by the shed
  }
  // encounter backdrop for the fight (same courtyard, the basin bigger in frame)
  const heroSets = (equip) => ({ head: equip['tête'] ? equip['tête'].res : null, body: equip.torse ? equip.torse.res : null, legs: equip.jambes ? equip.jambes.res : null, feet: equip.pieds ? equip.pieds.res : null, tool: equip.perche ? equip.perche.res : (equip.balai ? equip.balai.res : null), toolKind: equip.perche ? 'perche' : (equip.balai ? 'balai' : null) });
  const heroTrim = (equip) => { const t = {}; [['tête', 'head'], ['torse', 'body'], ['jambes', 'legs'], ['pieds', 'feet']].forEach(([sl, k]) => { if (equip[sl] && equip[sl].rar !== 'common') t[k] = RCOL[equip[sl].rar]; }); return t; };

  return { C, ZONE, RCOL, WATER, px, rows, mir, trainer, creature, monster, MON, SPECIES, item, ITEM, crate, tile, lay, TILE, shed, storage, villa, pine, courtyard, heroSets, heroTrim, TREE, PINE, LOUNGER, cached };
})();
window.PixelArt = PixelArt;
