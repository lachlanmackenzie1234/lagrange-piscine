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
    q: '#4aa8ff', Q: '#2f7fd6', n: '#7a7a90', N: '#4a4a60', h: '#b8c4d6', e: '#c9c0a8',
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

  // ------------------------------------------------------------ the keeper (24×32, the figure itself 22×30: a 10×8 head, short legs)
  // sets: { head, body, legs, feet, tool } → zone codes (or null for the plain kit); tool: 'perche' | 'balai' | null
  // o: { walk (number, alternates legs), crouch, back, skin, hair (1..4), hairColor, trim: { head, body, legs, feet } rarity colours }
  function trainer(g, x, y, sets, o) {
    sets = sets || {}; o = o || {}; const trim = o.trim || {};
    const skin = o.skin || C.k, skinD = shade(skin, .82); const hairC = o.hairColor || C.o; const I = C.i;
    const f = o.walk ? Math.floor(o.walk) % 2 : -1; const top = y + 2 + (o.crouch ? 3 : 0);
    // shorts, short legs, feet
    const lz = ZONE[sets.legs]; const short = lz ? { EC: C.d, AG: C.G, EP: C.d, EPP: C.y, GP: C.T }[sets.legs] : C.d; const shortD = shade(short, .8);
    const ly = top + 20; const l1 = 3 - (f === 1 ? 1 : 0), l2 = 3 - (f === 0 ? 1 : 0);
    px(g, I, x + 5, ly, 14, 5); px(g, short, x + 6, ly, 12, 4); px(g, shortD, x + 16, ly, 2, 4); px(g, shortD, x + 11, ly + 1, 2, 3);
    if (sets.legs === 'EPP') { px(g, C.w, x + 8, ly + 1, 1, 1); px(g, C.w, x + 14, ly + 2, 1, 1); } else { px(g, shortD, x + 7, ly + 1, 2, 2); px(g, shortD, x + 15, ly + 1, 2, 2); }
    if (trim.legs) px(g, trim.legs, x + 11, ly, 2, 1);
    px(g, I, x + 6, ly + 4, 5, l1 + 1); px(g, I, x + 13, ly + 4, 5, l2 + 1); px(g, skin, x + 7, ly + 4, 3, l1); px(g, skin, x + 14, ly + 4, 3, l2);
    const fz = sets.feet; const shoe = fz ? { EC: C.b, AG: C.g, EP: C.o, EPP: C.y, GP: C.t }[fz] : C.b;
    const fy1 = ly + 4 + l1, fy2 = ly + 4 + l2;
    px(g, I, x + 5, fy1, 7, 3); px(g, I, x + 12, fy2, 7, 3); px(g, shoe, x + 6, fy1 + 1, 5, 1); px(g, shoe, x + 13, fy2 + 1, 5, 1);
    if (fz === 'EP') { px(g, shoe, x + 6, fy1 - 1, 5, 2); px(g, shoe, x + 13, fy2 - 1, 5, 2); px(g, I, x + 5, fy1 - 1, 1, 1); px(g, I, x + 18, fy2 - 1, 1, 1); }  // boots
    else if (fz === 'EPP') { px(g, C.w, x + 8, fy1 + 1, 1, 1); px(g, C.w, x + 15, fy2 + 1, 1, 1); }                                                       // sandals
    else { px(g, shade(shoe, 1.4), x + 7, fy1 + 1, 1, 1); px(g, shade(shoe, 1.4), x + 9, fy1 + 1, 1, 1); px(g, shade(shoe, 1.4), x + 14, fy2 + 1, 1, 1); px(g, shade(shoe, 1.4), x + 16, fy2 + 1, 1, 1); } // clog holes
    if (trim.feet) { px(g, trim.feet, x + 6, fy1, 5, 1); px(g, trim.feet, x + 13, fy2, 5, 1); }
    // torso
    const by = top + 10; const bz = sets.body; const shirt = bz ? { EC: C.w, AG: C.g, EP: C.y, EPP: C.v, GP: C.t }[bz] : C.w; const shirtD = shade(shirt, .84);
    px(g, I, x + 4, by, 16, 11); px(g, shirt, x + 5, by + 1, 14, 9); px(g, shirtD, x + 17, by + 1, 2, 9);
    if (bz === 'EC' || !bz) { px(g, C.b, x + 9, by + 1, 6, 1); px(g, C.b, x + 10, by + 2, 1, 1); px(g, C.b, x + 13, by + 2, 1, 1); px(g, C.b, x + 11, by + 3, 2, 1); }   // polo collar
    if (bz === 'AG') { px(g, C.L, x + 7, by + 3, 10, 1); px(g, C.L, x + 11, by + 5, 2, 2); }                                                                     // surf tee
    if (bz === 'EP') { px(g, C.A, x + 5, by + 1, 3, 9); px(g, C.A, x + 16, by + 1, 3, 9); px(g, C.a, x + 6, by + 6, 1, 2); px(g, C.a, x + 17, by + 6, 1, 2); }     // vest
    if (bz === 'EPP') { [[6, 2], [10, 4], [14, 2], [8, 7], [12, 8], [16, 6]].forEach(([dx, dy]) => px(g, C.x, x + dx, by + dy, 2, 1)); px(g, C.w, x + 11, by + 1, 2, 9); } // hawaiian
    if (bz === 'GP') { px(g, C.w, x + 5, by + 4, 14, 1); px(g, C.m, x + 9, by + 1, 6, 1); }                                                                     // keeper polo
    if (trim.body) px(g, trim.body, x + 11, by + 9, 2, 1);
    // pouch & belt
    px(g, I, x + 8, by + 8, 8, 3); px(g, C.c, x + 9, by + 9, 6, 1); px(g, trim.body || C.S, x + 11, by + 9, 2, 1);
    // arms (sleeves for AG/GP)
    const sleeve = bz === 'AG' || bz === 'GP' ? shirt : skin;
    px(g, I, x + 1, by + 1, 4, 8); px(g, I, x + 19, by + 1, 4, 8); px(g, sleeve, x + 2, by + 2, 2, 2); px(g, sleeve, x + 20, by + 2, 2, 2); px(g, skin, x + 2, by + 4, 2, 4); px(g, skin, x + 20, by + 4, 2, 4); px(g, skinD, x + 21, by + 4, 1, 4);
    // head 10×8
    const hy = top + 2;
    px(g, I, x + 6, hy, 12, 9); px(g, skin, x + 7, hy + 1, 10, 7); px(g, skinD, x + 15, hy + 2, 2, 6);
    if (!o.back) { px(g, I, x + 9, hy + 4, 1, 2); px(g, I, x + 14, hy + 4, 1, 2); px(g, skinD, x + 11, hy + 7, 2, 1); }
    // hair (visible under any hat)
    px(g, hairC, x + 7, hy + 1, 10, 2); px(g, hairC, x + 7, hy + 3, 1, 1); px(g, hairC, x + 16, hy + 3, 1, 1);
    if ((o.hair || 1) === 3) { px(g, hairC, x + 6, hy + 3, 2, 6); px(g, hairC, x + 16, hy + 3, 2, 6); }
    if ((o.hair || 1) === 2 && !sets.head) { px(g, hairC, x + 8, hy - 1, 1, 1); px(g, hairC, x + 11, hy - 2, 1, 2); px(g, hairC, x + 14, hy - 1, 1, 1); }
    // hat by set (the trim takes the rarity colour)
    const hz = sets.head; const tr = trim.head;
    if (hz === 'EC') { px(g, I, x + 6, hy - 3, 12, 4); px(g, C.b, x + 7, hy - 2, 10, 3); px(g, C.B, x + 7, hy, 10, 1); px(g, I, x + 1, hy - 1, 6, 3); px(g, C.b, x + 2, hy, 5, 1); px(g, tr || C.l, x + 11, hy - 2, 2, 1); }   // backward cap
    if (hz === 'AG') { px(g, I, x + 7, hy - 4, 10, 4); px(g, C.G, x + 8, hy - 3, 8, 3); px(g, I, x + 4, hy - 1, 16, 3); px(g, C.g, x + 5, hy, 14, 1); px(g, tr || C.L, x + 8, hy - 1, 8, 1); }                              // bucket hat
    if (hz === 'EP') { px(g, I, x + 8, hy - 4, 8, 4); px(g, C.y, x + 9, hy - 3, 6, 3); px(g, I, x + 2, hy - 1, 20, 3); px(g, C.y, x + 3, hy, 18, 1); px(g, tr || C.A, x + 9, hy - 1, 6, 1); }                                  // straw hat
    if (hz === 'EPP') { px(g, I, x + 6, hy + 3, 12, 4); px(g, C.P, x + 7, hy + 4, 4, 2); px(g, C.P, x + 13, hy + 4, 4, 2); px(g, tr || C.p, x + 11, hy + 4, 2, 1); px(g, C.w, x + 8, hy + 4, 1, 1); px(g, C.w, x + 14, hy + 4, 1, 1); } // oversized shades
    if (hz === 'GP') { px(g, I, x + 5, hy - 1, 14, 3); px(g, C.t, x + 6, hy, 12, 1); px(g, I, x + 4, hy + 1, 16, 2); px(g, tr || C.m, x + 5, hy + 1, 14, 1); }                                                            // visor
    // tool in the right hand
    const tz = sets.tool; const tc = o.toolColor;
    if (tz && sets.toolKind === 'balai') { px(g, I, x + 21, top + 3, 3, 21); px(g, tc || C.O, x + 22, top + 4, 1, 19); px(g, I, x + 18, top + 23, 8, 4); px(g, C.h, x + 19, top + 24, 6, 2); }
    else if (tz) {
      px(g, I, x + 21, top + 1, 3, 25); px(g, tc || C.n, x + 22, top + 2, 1, 23);
      if (tz === 'EC') { px(g, I, x + 17, top - 2, 7, 6); px(g, C.l, x + 18, top - 1, 5, 4); px(g, C.w, x + 19, top, 1, 1); px(g, C.w, x + 21, top + 1, 1, 1); px(g, C.w, x + 19, top + 2, 1, 1); }   // telescopic net
      if (tz === 'AG') { px(g, tc || C.y, x + 22, top - 2, 1, 28); px(g, C.A, x + 22, top + 4, 1, 1); px(g, C.A, x + 22, top + 12, 1, 1); px(g, C.A, x + 22, top + 20, 1, 1); }                          // bamboo
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
    sand: ['ssssssssssssssss', 'ssssSsssssssssss', 'ssssssssssssSsss', 'ssssssssssssssss', 'sSssssssssssssss', 'ssssssssSsssssss', 'ssssssssssssssss', 'ssssssssssssssSs', 'ssssssssssssssss', 'ssSsssssssssssss', 'ssssssssssSsssss', 'ssssssssssssssss', 'ssssssSsssssssss', 'ssssssssssssssss', 'sssSsssssssssSss', 'ssssssssssssssss'],
    grass: ['LLLLLLLLLLLLLLLL', 'LLGLLLLLLLLGLLLL', 'LLLLLLLLLLLLLLLL', 'LLLLLLLGLLLLLLLL', 'LLLLLLLLLLLLLLGL', 'LGLLLLLLLLLLLLLL', 'LLLLLLLLLLGLLLLL', 'LLLLLGLLLLLLLLLL', 'LLLLLLLLLLLLLLLL', 'LLLLLLLLLLLLGLLL', 'LLLGLLLLLLLLLLLL', 'LLLLLLLLGLLLLLLL', 'LLLLLLLLLLLLLLLL', 'LLLLLLLLLLLLLLLL', 'LGLLLLLLLLLLLGLL', 'LLLLLLLLLLLLLLLL'],
    paving: ['cccccccccccccccc', 'cccccccScccccccc', 'cccccccccccccccc', 'SSSSSSSSSSSSSSSS', 'cccccccccccccccc', 'ccccccccccccccSc', 'cccccccccccccccc', 'SSSSSSSSSSSSSSSS', 'cccccccccccccccc', 'ccSccccccccccccc', 'cccccccccccccccc', 'SSSSSSSSSSSSSSSS', 'cccccccccccccccc', 'cccccccccccScccc', 'cccccccccccccccc', 'SSSSSSSSSSSSSSSS'],
    hedge: ['gGggggGgggggGggg', 'gggggggggggggggg', 'ggLgggggggLggggg', 'gggggggggggggggg', 'ggggggGggggggggg', 'GgggggggggggggGg', 'gggggLgggggggggg', 'gggggggggggggggg', 'ggggggggggLggggg', 'gGgggggggggggggg', 'ggggggggggggGggg', 'GGGGGGGGGGGGGGGG', 'GGGGGGGGGGGGGGGG', 'GGGGGGGGGGGGGGGG', 'iiiiiiiiiiiiiiii', 'ssssssssssssssss'],
    deck: ['OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'oooooooooooooooo', 'OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'oooooooooooooooo', 'OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'oooooooooooooooo', 'OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'oooooooooooooooo'],
  };
  const tile = (name) => cached('tile|' + name, 16, 16, (g) => rows(g, TILE[name] || TILE.sand, 0, 0));
  // objects
  const TREE = ['......iiii......', '....iiGGGGii....', '...iGGgggGGGi...', '..iGgggLggggGi..', '..iGggggggggGi..', '.iGgggLgggggggGi', '.iGggggggggLggGi', '.iGGgggggggggGGi', '..iGGgggggggGGi.', '...iGGGgggGGGi..', '....iiGGGGii....', '......iooi......', '......iooi......', '......iooi......', '.....ioooi......', '.....iiii.......'];
  const LOUNGER = ['................', '..iiiiiiiiiiii..', '.ibwwbbwwbbwwbi.', '.ibwwbbwwbbwwbi.', '.ibwwbbwwbbwwbi.', '.iiiiiiiiiiiiii.', '..ibwwbbwwbbwbi.', '..ibwwbbwwbbwbi.', '..ibwwbbwwbbwbi.', '..ibwwbbwwbbwbi.', '..iiiiiiiiiiiii.', '...i.........i..', '...i.........i..', '................', '................', '................'];
  const POT = ['..iiii..', '.iLgLgi.', 'iGgLgGgi', '.iggGgi.', '..iiii..', '.iOOOOi.', '.iooooi.', '..iiii..'];
  const FENCE = ['.ii......ii.....', '.io......io.....', 'iiiiiiiiiiiiiiii', 'ioooooooooooooo', 'iiiiiiiiiiiiiiii', '.io......io.....', '.io......io.....', '.ii......ii.....'];
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
  // the courtyard (256×192): sea at the horizon, pines, the shed top-right, the basin with cream coping (48..208 × 44..140),
  // a lounger, pots, the skimmer on the near coping, the pump by the shed, the fence along the bottom
  // opts: { state, sunk, dirt, t (seconds, for the ripples), pumpLate }
  function courtyard(g, o) {
    o = o || {}; const t = o.t || 0;
    for (let ty = 0; ty < 192; ty += 16) for (let tx = 0; tx < 256; tx += 16) g.drawImage(tile('sand'), tx, ty);
    px(g, C.q, 0, 0, 256, 12); px(g, C.Q, 0, 10, 256, 2); for (let i = 0; i < 14; i++) px(g, C.w, (i * 19 + Math.floor(t * 6)) % 256, 2 + (i % 4) * 2, 5, 1);
    for (let tx = 0; tx < 256; tx += 16) g.drawImage(tile('hedge'), tx, 12);
    const tree = cached('tree', 16, 16, (gg) => rows(gg, TREE, 0, 0)); [[4, 8], [40, 6], [70, 9], [110, 5], [150, 8], [180, 10]].forEach(([x, y]) => g.drawImage(tree, x, y));
    shed(g, 214, 4, false, 0);
    const fence = cached('fence', 16, 8, (gg) => rows(gg, FENCE, 0, 0)); for (let tx = 0; tx < 256; tx += 16) g.drawImage(fence, tx, 184);
    const lounger = cached('lounger', 16, 16, (gg) => rows(gg, LOUNGER, 0, 0)); g.drawImage(lounger, 12, 64); g.drawImage(lounger, 12, 88);
    const pot = cached('pot', 8, 8, (gg) => rows(gg, POT, 0, 0)); [[30, 44], [226, 150], [14, 150], [236, 60]].forEach(([x, y]) => g.drawImage(pot, x, y));
    for (let i = 0; i < 14; i++) rows(g, ['.G.', 'GLG'], [8, 24, 232, 200, 14, 240, 120, 90, 60, 170, 210, 36, 246, 140][i], [150, 170, 100, 172, 40, 176, 160, 174, 36, 36, 90, 130, 130, 44][i]);
    for (let ty = 44; ty < 140; ty += 16) for (let tx = 48; tx < 208; tx += 16) g.drawImage(tile('paving'), tx, ty);
    px(g, C.S, 48, 44, 160, 1); px(g, C.S, 48, 139, 160, 1); px(g, C.S, 48, 44, 1, 96); px(g, C.S, 207, 44, 1, 96);
    const w = o.sunk ? WATER.sunk : WATER[o.state] || WATER.calme;
    px(g, C.i, 53, 48, 150, 84); px(g, w[0], 54, 49, 148, 82); px(g, w[2], 54, 121, 148, 10); px(g, w[1], 54, 49, 148, 3);
    for (let i = 0; i < 12; i++) px(g, w[1], 58 + ((i * 23 + Math.floor(t * 8)) % 136), 56 + (i * 11) % 60, 6, 1);
    if (o.sunk) for (let i = 0; i < 10; i++) px(g, '#3a2a5a', 60 + ((i * 29 + Math.floor(t * 5)) % 130), 56 + ((i * 13 + Math.floor(t * 3)) % 60), 4, 2);
    if (o.dirt) { let h = 7; for (let i = 0; i < o.dirt * 16; i++) { h = (h * 1103515245 + 12345) & 0x7fffffff; px(g, i % 3 ? C.A : C.O, 58 + (h % 136), 56 + ((h >> 8) % 60), 2, 1); } }
    px(g, C.w, 60, 114, 2, 20); px(g, C.w, 68, 114, 2, 20); px(g, C.w, 60, 118, 10, 1); px(g, C.w, 60, 124, 10, 1); px(g, C.w, 60, 130, 10, 1);   // ladder
    px(g, C.i, 156, 134, 16, 7); px(g, C.c, 157, 135, 14, 5); px(g, C.i, 159, 138, 10, 1);                                                          // skimmer on the near coping
    px(g, C.i, 214, 116, 14, 14); px(g, C.n, 215, 117, 12, 12); px(g, C.w, 217, 119, 8, 6); px(g, o.pumpLate ? C.r : C.g, 220, 121, 2, 2); px(g, C.i, 216, 126, 10, 1); // pump
  }
  // encounter backdrop for the fight (same courtyard, the basin bigger in frame)
  const heroSets = (equip) => ({ head: equip['tête'] ? equip['tête'].res : null, body: equip.torse ? equip.torse.res : null, legs: equip.jambes ? equip.jambes.res : null, feet: equip.pieds ? equip.pieds.res : null, tool: equip.perche ? equip.perche.res : (equip.balai ? equip.balai.res : null), toolKind: equip.perche ? 'perche' : (equip.balai ? 'balai' : null) });
  const heroTrim = (equip) => { const t = {}; [['tête', 'head'], ['torse', 'body'], ['jambes', 'legs'], ['pieds', 'feet']].forEach(([sl, k]) => { if (equip[sl] && equip[sl].rar !== 'common') t[k] = RCOL[equip[sl].rar]; }); return t; };

  return { C, ZONE, RCOL, WATER, px, rows, mir, trainer, creature, monster, MON, SPECIES, item, ITEM, crate, tile, TILE, shed, courtyard, heroSets, heroTrim, TREE, LOUNGER, cached };
})();
window.PixelArt = PixelArt;
