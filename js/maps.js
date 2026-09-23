/*
 * One stable map per pool — the Pocket Coast layout trial, carried into the
 * app. Each entry is a fictional 16×12 tile property (no surveyed plan):
 * the basin, its deck, a clear encounter area, named anchors and the
 * objects. Ground, collision and paths are derived here from those few
 * numbers, so the whole catalogue fits in a screenful. Pools that have no
 * entry borrow the first map of their residence.
 *
 * Entry: [id, residence, archetype, mirrored, pool[x,y,w,h], deck[x,y,w,h],
 *         arena[x,y,w,h], anchors, objects[[kind, x, y, variant]]]
 * Anchors: en entrance · hd house door · sd shed door · la ladder · sk skimmer ·
 *          pu pump access · ar encounter · sp player spawn (tile coordinates).
 */
const PoolMaps = (() => {
  const W = 16, H = 12;
  const M = [
    ['EC-2', 'EC', 'side-court', 1, [4, 4, 5, 4], [3, 3, 7, 6], [12, 4, 3, 3], { en: [6, 11], hd: [11, 4], sd: [13, 9], la: [5, 8], sk: [7, 8], pu: [12, 9], ar: [13, 5], sp: [6, 9] },
      [['villa', 10, 1], ['shed', 13, 7], ['pump', 12, 8, 0], ['lounger', 3, 5, 1], ['tree', 6, 2, 2], ['tree', 2, 5, 0], ['tree', 2, 7, 2], ['tree', 8, 10, 2], ['tree', 1, 6, 1], ['tree', 6, 1, 2], ['tree', 7, 1, 0], ['pine', 14, 1, 0], ['sign', 13, 10, 2], ['pot', 7, 2, 0], ['pot', 14, 10, 0]]],
    ['EC-5', 'EC', 'service-lane', 0, [6, 5, 5, 3], [5, 4, 7, 5], [1, 6, 3, 3], { en: [7, 11], hd: [3, 4], sd: [11, 3], la: [7, 8], sk: [9, 8], pu: [13, 3], ar: [2, 7], sp: [7, 9] },
      [['villa', 2, 1], ['shed', 11, 1], ['pump', 13, 2, 0], ['pine', 1, 9, 1], ['pine', 2, 9, 2], ['pine', 4, 9, 0], ['tree', 6, 3, 1], ['pine', 10, 1, 2], ['tree', 13, 4, 1], ['pine', 14, 8, 1], ['tree', 13, 8, 1], ['sign', 6, 1, 0], ['pot', 10, 4, 0], ['bench', 6, 10, 0]]],
    ['EC-12', 'EC', 'side-court', 0, [8, 4, 6, 3], [7, 3, 8, 5], [3, 5, 3, 3], { en: [6, 11], hd: [3, 4], sd: [1, 9], la: [9, 7], sk: [12, 7], pu: [3, 9], ar: [4, 6], sp: [6, 9] },
      [['villa', 2, 1], ['shed', 1, 7], ['pump', 3, 8, 0], ['lounger', 14, 6, 0], ['lounger', 14, 5, 2], ['tree', 14, 10, 1], ['tree', 7, 2, 1], ['pine', 13, 1, 2], ['tree', 7, 1, 0], ['tree', 13, 9, 2], ['tree', 12, 2, 0], ['tree', 12, 1, 0], ['pine', 14, 1, 1], ['sign', 13, 10, 0], ['bench', 10, 3, 0], ['pot', 2, 6, 2]]],
    ['EC-18', 'EC', 'long-basin', 1, [4, 3, 3, 5], [3, 2, 5, 7], [8, 4, 3, 3], { en: [7, 11], hd: [12, 4], sd: [12, 10], la: [5, 8], sk: [5, 8], pu: [14, 10], ar: [9, 5], sp: [7, 9] },
      [['villa', 11, 1], ['shed', 12, 8], ['pump', 14, 9, 0], ['lounger', 3, 4, 1], ['pine', 1, 6, 2], ['tree', 6, 10, 1], ['tree', 12, 5, 2], ['pine', 2, 2, 0], ['pine', 1, 3, 2], ['tree', 11, 7, 2], ['tree', 2, 9, 2], ['tree', 12, 7, 0], ['sign', 4, 2, 1], ['bench', 2, 6, 1], ['pot', 14, 5, 1]]],
    ['EC-22', 'EC', 'south-terrace', 1, [7, 6, 6, 3], [6, 5, 8, 5], [10, 2, 3, 3], { en: [13, 11], hd: [5, 4], sd: [3, 7], la: [8, 9], sk: [11, 9], pu: [5, 7], ar: [11, 3], sp: [13, 9] },
      [['villa', 4, 1], ['shed', 3, 5], ['pump', 5, 6, 0], ['pine', 2, 3, 2], ['pine', 13, 1, 1], ['pine', 4, 8, 0], ['tree', 2, 2, 0], ['tree', 4, 10, 2], ['pine', 3, 1, 0], ['tree', 10, 1, 2], ['tree', 3, 3, 0], ['sign', 8, 1, 1], ['bench', 2, 9, 0], ['bench', 2, 6, 1]]],
    ['AG-7', 'AG', 'long-basin', 1, [3, 3, 3, 5], [2, 2, 5, 7], [12, 5, 3, 3], { en: [9, 11], hd: [11, 4], sd: [12, 10], la: [4, 8], sk: [4, 8], pu: [14, 10], ar: [13, 6], sp: [9, 9] },
      [['villa', 10, 1], ['shed', 12, 8], ['pump', 14, 9, 0], ['lounger', 6, 4, 2], ['lounger', 2, 4, 0], ['tree', 1, 9, 1], ['pine', 9, 2, 1], ['tree', 14, 1, 2], ['tree', 1, 10, 0], ['sign', 8, 4, 2], ['pot', 5, 2, 0], ['bench', 7, 6, 1]]],
    ['AG-8', 'AG', 'long-basin', 1, [3, 3, 3, 5], [2, 2, 5, 7], [7, 4, 3, 3], { en: [8, 11], hd: [11, 4], sd: [12, 10], la: [4, 8], sk: [4, 8], pu: [14, 10], ar: [8, 5], sp: [8, 9] },
      [['villa', 10, 1], ['shed', 12, 8], ['pump', 14, 9, 0], ['lounger', 6, 7, 1], ['lounger', 6, 4, 0], ['tree', 2, 9, 0], ['pine', 4, 9, 0], ['tree', 4, 1, 1], ['tree', 1, 4, 0], ['sign', 7, 9, 1], ['pot', 10, 9, 1], ['pot', 13, 5, 2]]],
    ['AG-9', 'AG', 'garden-court', 1, [9, 4, 5, 4], [8, 3, 7, 6], [5, 5, 3, 3], { en: [7, 11], hd: [4, 4], sd: [2, 10], la: [10, 8], sk: [12, 8], pu: [4, 10], ar: [6, 6], sp: [7, 9] },
      [['villa', 3, 1], ['shed', 2, 8], ['pump', 4, 9, 0], ['lounger', 14, 7, 1], ['tree', 5, 9, 1], ['pine', 3, 4, 0], ['tree', 12, 2, 0], ['pine', 2, 5, 1], ['sign', 1, 3, 0], ['bench', 4, 6, 2], ['pot', 11, 10, 0]]],
    ['AG-21', 'AG', 'garden-court', 0, [2, 4, 6, 4], [1, 3, 8, 6], [12, 4, 3, 3], { en: [6, 11], hd: [11, 4], sd: [12, 10], la: [3, 8], sk: [6, 8], pu: [14, 10], ar: [13, 5], sp: [6, 9] },
      [['villa', 10, 1], ['shed', 12, 8], ['pump', 14, 9, 0], ['tree', 11, 5, 1], ['tree', 4, 1, 2], ['tree', 3, 1, 1], ['tree', 2, 9, 2], ['sign', 6, 3, 2], ['bench', 1, 7, 1], ['bench', 1, 6, 1]]],
    ['AG-32', 'AG', 'garden-court', 1, [9, 4, 5, 4], [8, 3, 7, 6], [3, 5, 3, 3], { en: [7, 11], hd: [3, 4], sd: [3, 10], la: [10, 8], sk: [12, 8], pu: [5, 10], ar: [4, 6], sp: [7, 9] },
      [['villa', 2, 1], ['shed', 3, 8], ['pump', 5, 9, 0], ['lounger', 14, 5, 2], ['tree', 7, 2, 2], ['tree', 2, 10, 1], ['pine', 6, 5, 2], ['tree', 1, 6, 2], ['sign', 12, 1, 1], ['pot', 10, 3, 1], ['pot', 6, 3, 0]]],
    ['EP-6B-75', 'EP', 'south-terrace', 1, [6, 6, 7, 3], [5, 5, 9, 5], [2, 2, 3, 3], { en: [14, 11], hd: [6, 4], sd: [3, 7], la: [7, 9], sk: [11, 9], pu: [5, 7], ar: [3, 3], sp: [14, 9] },
      [['villa', 5, 1], ['shed', 3, 5], ['pump', 5, 6, 0], ['lounger', 13, 7, 2], ['tree', 10, 10, 2], ['pine', 10, 1, 1], ['tree', 13, 10, 0], ['pine', 2, 7, 2], ['pine', 1, 2, 2], ['sign', 1, 5, 0], ['pot', 1, 4, 0], ['bench', 12, 5, 0]]],
    ['EP-19B-90', 'EP', 'garden-court', 0, [2, 4, 5, 4], [1, 3, 7, 6], [10, 5, 3, 3], { en: [8, 11], hd: [11, 4], sd: [11, 10], la: [3, 8], sk: [5, 8], pu: [13, 10], ar: [11, 6], sp: [8, 9] },
      [['villa', 10, 1], ['shed', 11, 8], ['pump', 13, 9, 0], ['lounger', 1, 5, 1], ['lounger', 7, 7, 1], ['pine', 9, 1, 1], ['pine', 13, 6, 1], ['tree', 5, 10, 1], ['tree', 7, 2, 0], ['tree', 6, 1, 2], ['sign', 5, 1, 0], ['bench', 1, 4, 0], ['bench', 7, 1, 2]]],
    ['EP-30B-63', 'EP', 'side-court', 0, [7, 4, 6, 3], [6, 3, 8, 5], [2, 4, 3, 3], { en: [7, 11], hd: [3, 4], sd: [2, 9], la: [8, 7], sk: [11, 7], pu: [4, 9], ar: [3, 5], sp: [7, 9] },
      [['villa', 2, 1], ['shed', 2, 7], ['pump', 4, 8, 1], ['lounger', 13, 6, 1], ['lounger', 13, 5, 1], ['pine', 14, 3, 2], ['pine', 12, 8, 0], ['tree', 13, 2, 0], ['tree', 5, 10, 0], ['pine', 7, 1, 2], ['sign', 10, 9, 0], ['pot', 8, 2, 0], ['pot', 11, 10, 2]]],
    ['EP-27B-94', 'EP', 'south-terrace', 1, [6, 6, 7, 3], [5, 5, 9, 5], [10, 2, 3, 3], { en: [13, 11], hd: [7, 4], sd: [3, 7], la: [7, 9], sk: [11, 9], pu: [5, 7], ar: [11, 3], sp: [13, 9] },
      [['villa', 6, 1], ['shed', 3, 5], ['pump', 5, 6, 1], ['tree', 5, 10, 1], ['tree', 4, 10, 0], ['tree', 4, 1, 0], ['tree', 1, 10, 1], ['tree', 1, 3, 2], ['sign', 11, 1, 2], ['pot', 14, 2, 0], ['bench', 14, 1, 0]]],
    ['EP-40B-52', 'EP', 'long-basin', 0, [10, 3, 3, 5], [9, 2, 5, 7], [1, 7, 3, 3], { en: [7, 11], hd: [4, 4], sd: [4, 10], la: [11, 8], sk: [11, 8], pu: [6, 10], ar: [2, 8], sp: [7, 9] },
      [['villa', 3, 1], ['shed', 4, 8], ['pump', 6, 9, 0], ['lounger', 13, 4, 0], ['lounger', 13, 7, 0], ['tree', 14, 5, 1], ['tree', 11, 10, 0], ['pine', 1, 1, 2], ['pine', 2, 5, 1], ['tree', 13, 9, 1], ['sign', 1, 3, 2], ['pot', 14, 10, 1], ['bench', 13, 5, 1]]],
    ['EP-31B-96', 'EP', 'south-terrace', 0, [3, 6, 7, 3], [2, 5, 9, 5], [12, 2, 3, 3], { en: [1, 11], hd: [9, 4], sd: [11, 7], la: [4, 9], sk: [8, 9], pu: [13, 7], ar: [13, 3], sp: [1, 9] },
      [['villa', 8, 1], ['shed', 11, 5], ['pump', 13, 6, 0], ['tree', 12, 9, 0], ['tree', 1, 2, 2], ['pine', 13, 9, 0], ['tree', 7, 3, 0], ['pine', 14, 5, 1], ['sign', 1, 1, 2], ['bench', 6, 1, 2], ['bench', 10, 6, 1]]],
    ['EP-52B-46', 'EP', 'garden-court', 1, [8, 4, 6, 4], [7, 3, 8, 6], [2, 4, 3, 3], { en: [7, 11], hd: [3, 4], sd: [2, 10], la: [9, 8], sk: [12, 8], pu: [4, 10], ar: [3, 5], sp: [7, 9] },
      [['villa', 2, 1], ['shed', 2, 8], ['pump', 4, 9, 0], ['lounger', 14, 7, 0], ['tree', 1, 8, 0], ['tree', 10, 9, 2], ['pine', 5, 8, 0], ['tree', 6, 6, 0], ['tree', 13, 10, 1], ['sign', 6, 9, 2], ['pot', 12, 10, 0], ['pot', 9, 1, 0]]],
    ['EP-6E-99', 'EP', 'service-lane', 1, [5, 5, 5, 3], [4, 4, 7, 5], [11, 5, 3, 3], { en: [12, 11], hd: [11, 4], sd: [3, 3], la: [6, 8], sk: [8, 8], pu: [5, 3], ar: [12, 6], sp: [12, 9] },
      [['villa', 10, 1], ['shed', 3, 1], ['pump', 5, 2, 0], ['lounger', 4, 6, 0], ['lounger', 10, 7, 0], ['tree', 7, 2, 0], ['tree', 4, 10, 1], ['pine', 8, 9, 2], ['pine', 2, 1, 1], ['tree', 14, 6, 1], ['sign', 11, 10, 0], ['pot', 10, 5, 2], ['pot', 3, 4, 2]]],
    ['EPP-3', 'EPP', 'service-lane', 1, [4, 5, 6, 3], [3, 4, 8, 5], [12, 5, 3, 3], { en: [8, 11], hd: [12, 4], sd: [3, 3], la: [5, 8], sk: [8, 8], pu: [5, 3], ar: [13, 6], sp: [8, 9] },
      [['villa', 11, 1], ['shed', 3, 1], ['pump', 5, 2, 0], ['tree', 14, 9, 0], ['tree', 4, 9, 2], ['pine', 1, 5, 2], ['tree', 6, 9, 0], ['sign', 2, 7, 0], ['bench', 2, 4, 1], ['bench', 1, 1, 1]]],
    ['EPP-4', 'EPP', 'service-lane', 1, [3, 5, 6, 3], [2, 4, 8, 5], [12, 4, 3, 3], { en: [9, 11], hd: [11, 4], sd: [3, 3], la: [4, 8], sk: [7, 8], pu: [5, 3], ar: [13, 5], sp: [9, 9] },
      [['villa', 10, 1], ['shed', 3, 1], ['pump', 5, 2, 1], ['tree', 11, 9, 1], ['tree', 5, 9, 0], ['pine', 12, 8, 0], ['tree', 7, 9, 2], ['sign', 11, 8, 2], ['pot', 4, 10, 2], ['pot', 1, 8, 1]]],
    ['EPP-7', 'EPP', 'south-terrace', 1, [5, 6, 7, 3], [4, 5, 9, 5], [9, 2, 3, 3], { en: [14, 11], hd: [6, 4], sd: [2, 7], la: [6, 9], sk: [10, 9], pu: [4, 7], ar: [10, 3], sp: [14, 9] },
      [['villa', 5, 1], ['shed', 2, 5], ['pump', 4, 6, 0], ['lounger', 12, 7, 1], ['lounger', 12, 8, 0], ['pine', 14, 1, 2], ['tree', 13, 7, 0], ['tree', 4, 2, 0], ['tree', 4, 10, 2], ['sign', 2, 3, 2], ['pot', 14, 3, 2], ['bench', 4, 5, 2]]],
    ['GP-18', 'GP', 'long-basin', 1, [4, 3, 3, 5], [3, 2, 5, 7], [9, 4, 3, 3], { en: [7, 11], hd: [11, 4], sd: [10, 10], la: [5, 8], sk: [5, 8], pu: [12, 10], ar: [10, 5], sp: [7, 9] },
      [['villa', 10, 1], ['shed', 10, 8], ['pump', 12, 9, 0], ['lounger', 3, 4, 2], ['tree', 1, 10, 2], ['tree', 4, 1, 0], ['pine', 14, 5, 2], ['tree', 2, 8, 2], ['tree', 3, 9, 2], ['tree', 2, 9, 1], ['pine', 13, 6, 2], ['tree', 1, 4, 2], ['tree', 12, 8, 0], ['tree', 1, 2, 2], ['sign', 9, 9, 0], ['pot', 11, 7, 0], ['bench', 3, 8, 1]]],
    ['GP-39', 'GP', 'garden-court', 0, [2, 4, 5, 3], [1, 3, 7, 5], [11, 5, 3, 3], { en: [9, 11], hd: [11, 4], sd: [11, 10], la: [3, 7], sk: [5, 7], pu: [13, 10], ar: [12, 6], sp: [9, 9] },
      [['villa', 10, 1], ['shed', 11, 8], ['pump', 13, 9, 0], ['lounger', 7, 5, 1], ['lounger', 1, 5, 2], ['tree', 1, 9, 0], ['tree', 7, 8, 0], ['tree', 1, 10, 0], ['pine', 8, 2, 2], ['pine', 6, 8, 2], ['pine', 9, 1, 1], ['tree', 5, 1, 2], ['tree', 3, 9, 1], ['pine', 6, 1, 0], ['tree', 8, 6, 1], ['sign', 4, 3, 2], ['bench', 1, 8, 1], ['bench', 2, 9, 2]]],
  ];
  const BORDER = { EC: 'hedge', AG: 'canal', EP: 'fence', EPP: 'hedge', GP: 'forest' };
  const DECK = { EC: 'slab', AG: 'deck', EP: 'slab', EPP: 'paving', GP: 'deck' };
  const SIZE = { villa: [4, 3], shed: [2, 2], pump: [1, 1], lounger: [1, 1], tree: [1, 1], pine: [1, 2], sign: [1, 1], pot: [1, 1], bench: [1, 1] };
  const byId = {}; M.forEach((m) => { byId[m[0]] = m; });
  const key = (x, y) => y * W + x;

  // breadth-first route over walkable cells (the pool's deck counts as walkable)
  function route(coll, from, to) {
    if (from[0] === to[0] && from[1] === to[1]) return [from];
    const prev = new Map(); const q = [from]; prev.set(key(from[0], from[1]), null);
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = key(nx, ny); if (prev.has(k) || coll[ny][nx]) continue;
        prev.set(k, [x, y]); if (nx === to[0] && ny === to[1]) { const path = [[nx, ny]]; let c = [x, y]; while (c) { path.unshift(c); c = prev.get(key(c[0], c[1])); } return path; }
        q.push([nx, ny]);
      }
    }
    return [from];
  }
  // expand an entry into ground, collision, objects with footprints, anchors and routes
  function expand(m) {
    const [id, res, arch, mirrored, pool, deck, arena, A, objs] = m;
    const border = BORDER[res] || 'hedge'; const deckTile = DECK[res] || 'slab';
    const ground = []; const coll = [];
    for (let y = 0; y < H; y++) { ground[y] = []; coll[y] = []; for (let x = 0; x < W; x++) { ground[y][x] = 'grass'; coll[y][x] = (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? 1 : 0; } }
    if (border === 'canal') for (let y = 0; y < H; y++) ground[y][W - 1] = 'water';
    for (let y = deck[1]; y < deck[1] + deck[3]; y++) for (let x = deck[0]; x < deck[0] + deck[2]; x++) ground[y][x] = deckTile;
    for (let y = pool[1]; y < pool[1] + pool[3]; y++) for (let x = pool[0]; x < pool[0] + pool[2]; x++) { ground[y][x] = 'water'; coll[y][x] = 1; }
    const objects = objs.map(([kind, x, y, v]) => { const [w, h] = SIZE[kind] || [1, 1]; for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (yy < H && xx < W) coll[yy][xx] = 1; return { kind, x, y, w, h, variant: kind === 'pump' ? 0 : (v || 0), salt: kind === 'pump' ? !!v : false }; });
    // anchors are walkable; the entrance opens the border
    const anchors = {}; Object.entries(A).forEach(([k, [x, y]]) => { anchors[k] = { x, y }; if (k !== 'hd' && k !== 'sd') coll[y][x] = 0; });
    coll[anchors.en.y][anchors.en.x] = 0;
    // sand lanes: the routes from the entrance to the house, the shed, the pump and the deck
    const paths = {}; ['hd', 'sd', 'pu', 'la', 'sk'].forEach((k) => { const a = anchors[k]; const target = coll[a.y][a.x] ? nearestOpen(coll, a) : [a.x, a.y]; paths[k] = route(coll, [anchors.en.x, anchors.en.y], target); });
    Object.values(paths).forEach((p) => p.forEach(([x, y]) => { if (ground[y][x] === 'grass') ground[y][x] = 'sand'; }));
    return { id, res, arch, mirrored: !!mirrored, border, deckTile, pool: { x: pool[0], y: pool[1], w: pool[2], h: pool[3] }, deck: { x: deck[0], y: deck[1], w: deck[2], h: deck[3] }, arena: { x: arena[0], y: arena[1], w: arena[2], h: arena[3] }, anchors, objects, ground, coll, paths };
  }
  function nearestOpen(coll, a) { for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) { const x = a.x + dx, y = a.y + dy; if (x >= 0 && y >= 0 && x < W && y < H && !coll[y][x]) return [x, y]; } return [a.x, a.y]; }
  function nearestReachable(coll, from, target) {
    if (coll[from[1]]?.[from[0]] !== 0) return null;
    const queue = [from.slice()], seen = new Set([key(...from)]);
    let closest = queue[0], distance = Infinity;
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i], d = (x - target[0]) ** 2 + (y - target[1]) ** 2;
      if (d < distance) { closest = queue[i]; distance = d; if (!d) break; }
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (nx < 0 || nx >= W || ny < 0 || ny >= H || coll[ny][nx] || seen.has(k)) continue;
        seen.add(k); queue.push([nx, ny]);
      }
    }
    return closest;
  }
  const cache = new Map();
  function get(id, res) {
    const k = id + '|' + res; if (cache.has(k)) return cache.get(k);
    const m = byId[id] || M.find((x) => x[1] === res) || M[0];
    const L = expand(m); L.borrowed = !byId[id]; cache.set(k, L); return L;
  }
  // Hub collision uses logical 16px cells; layered art positions use native pixels.
  function makeHub(id, open, blocked, anchors, npcs, hotspots, exit) {
    const coll = Array.from({ length: H }, () => Array(W).fill(1));
    const fill = (rect, value) => { const [x, y, w, h] = rect; for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) coll[yy][xx] = value; };
    open.forEach(r => fill(r, 0)); blocked.forEach(r => fill(r, 1));
    npcs.forEach(n => { coll[n.cell[1]][n.cell[0]] = 1; });
    return { id, size: id === 'bureau' ? [384, 288] : [512, 384], coll, anchors, npcs, hotspots, exit };
  }
  const hubs = {
    depot: makeHub('depot', [[1, 4, 14, 7], [6, 11, 4, 1]],
      [[14, 4, 1, 7], [13, 4, 2, 1], [12, 6, 2, 4], [2, 9, 3, 2], [4, 7, 2, 2], [11, 10, 3, 1]],
      { sp: { x: 8, y: 10 }, bench: { x: 11, y: 4 }, sale: { x: 3, y: 5 }, potions: { x: 10, y: 8 }, lockers: { x: 8, y: 9 } },
      [{ id: 'matt', cell: [3, 4], stroll: [[5, 5], [6, 7], [7, 8]] }, { id: 'karine', cell: [12, 4], stroll: [[10, 5], [9, 7], [8, 5]] }, { id: 'jojo', cell: [11, 8], stroll: [[10, 9], [8, 8], [7, 6]] }],
      [{ kind: 'sale', npc: 'matt', rect: [28, 26, 50, 45], anchor: 'sale' }, { kind: 'craft', npc: 'karine', rect: [136, 50, 108, 28], anchor: 'bench' }, { kind: 'potions', npc: 'jojo', rect: [191, 90, 55, 54], anchor: 'potions' }],
      { rect: [98, 165, 67, 27], to: 'bureau' }),
    bureau: makeHub('bureau', [[1, 1, 10, 7]],
      [[3, 2, 1, 2], [1, 5, 2, 3], [7, 4, 4, 1], [10, 1, 1, 2], [10, 7, 1, 1], [3, 7, 3, 1]],
      { sp: { x: 9, y: 6 }, rewards: { x: 4, y: 4 }, quest: { x: 8, y: 5 }, partner: { x: 5, y: 6 } },
      [{ id: 'pj', cell: [2, 3], direction: 'east', seat: 'east', seatOffset: [12, -23], stroll: [[4, 2], [4, 4], [5, 5]] }, { id: 'jp', cell: [7, 3], direction: 'south', seat: 'south', seatOffset: [0, -21], stroll: [[6, 3], [6, 5], [8, 6]] }, { id: 'partner', cell: [4, 6], direction: 'west', stroll: [[5, 6], [5, 4], [7, 6]] }],
      [{ kind: 'rewards', npc: 'pj', rect: [40, 33, 31, 47], anchor: 'rewards' }, { kind: 'quest', npc: 'jp', rect: [107, 36, 59, 44], anchor: 'quest' }],
      { rect: [137, 119, 30, 25], to: 'depot' }),
  };
  hubs.bureau.scenery = [
    { asset: 'chair-east', x: 92, y: 126, depth: 122, npc: 'pj' },
    { asset: 'boss-desk', x: 114, y: 141, scale: .8, flipX: true, npc: 'pj', occludes: true },
    { asset: 'chair-south', x: 240, y: 124, depth: 122, npc: 'jp' },
    { asset: 'reception-counter', x: 280, y: 154, npc: 'jp', occludes: true },
    { asset: 'cabinet', x: 348, y: 90, scale: .65 },
    { asset: 'sofa', x: 48, y: 278, npc: 'partner', occludes: true },
    { asset: 'coffee-table', x: 108, y: 254, npc: 'partner' },
    { asset: 'broadleaf-pot', x: 184, y: 279, occludes: true },
    { asset: 'coffee-table', x: 350, y: 280, scale: .65 },
  ];
  hubs.depot.scenery = [
    { asset: 'gardener-van', x: 112, y: 136, npc: 'matt' },
    { asset: 'karine-van', x: 224, y: 136, npc: 'karine' },
    { asset: 'jojo-van', x: 426, y: 266, npc: 'jojo' },
    { asset: 'workshop', x: 390, y: 154, npc: 'karine', occludes: true },
    { asset: 'potions', x: 430, y: 316, scale: .75, npc: 'jojo' },
    { asset: 'storage', x: 160, y: 274, scale: .65 },
    { asset: 'scenic-black', x: 109, y: 337, action: 'depot-pass' },
    { kind: 'foliage', plant: 0, x: 18, y: 152, scale: .95 },
    { kind: 'foliage', plant: 1, x: 30, y: 309, scale: .82 },
    { kind: 'foliage', plant: 3, x: 268, y: 46, scale: .62 },
    { kind: 'foliage', plant: 1, x: 508, y: 204, scale: .82 },
    { kind: 'foliage', plant: 0, x: 498, y: 351, scale: .85 },
    { kind: 'foliage', plant: 2, x: 50, y: 421, scale: .85 },
    { kind: 'foliage', plant: 4, x: 161, y: 357, scale: .8 },
    { kind: 'foliage', plant: 5, x: 70, y: 226, scale: .65 },
    { kind: 'foliage', plant: 7, x: 416, y: 353, scale: .8 },
    { kind: 'foliage', plant: 5, x: 478, y: 288, scale: .65 },
  ];
  return { get, route, nearestReachable, depot: () => hubs.depot, hub: id => hubs[id] || hubs.depot, ids: () => M.map((m) => m[0]), W, H };

})();
window.PoolMaps = PoolMaps;
