/*
 * Lagrange Quest — the Pixel style's game layer. Loaded only when the style
 * is Pixel (app.js adds the script tag), and it never invents data: every
 * creature stat is read from the store, and an "encounter" is simply a pool
 * page visit — the app's own buttons are the moves. Leaving the page settles
 * it: real actions logged during the visit earn XP, coins and a chance of a
 * loot crate. Game state (bag, coins, avatar) is device-local, game only.
 */
const Game = (() => {
  const KEY = 'lagrange-piscine.quest';
  const t = (k, p) => window.I18n ? I18n.t(k, p) : k;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (h) => { const tp = document.createElement('template'); tp.innerHTML = h.trim(); return tp.content.firstElementChild; };
  const day = (iso) => Store.localDate(iso);
  const daysSince = (iso) => iso ? (Date.now() - new Date(iso).getTime()) / 864e5 : 999;
  const CL = { 'hth-stick': 300, 'hth-galet': 200, 'hypomen-pro': 1 }; // grams of chlorine product per unit

  // ---------------------------------------------------------------- state
  let G = null;
  function load() {
    if (G) return G;
    try { G = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { G = null; }
    if (!G) G = { xp: 0, coins: 0, wins: 0, fights: 0, bag: [], bagTier: 0, equip: {}, calmed: {}, avatar: { size: 1, hair: 1, hairColor: '#4a2e1a', skin: '#e8b88a', eyes: '#2f4fdf' }, pending: null, enc: null };
    if (!Array.isArray(G.bag)) G.bag = [];
    return G;
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch (_) {} };
  const BAG_SIZES = [8, 16, 32, 64, 128];
  const bagSize = () => BAG_SIZES[Math.min(load().bagTier, BAG_SIZES.length - 1)];
  const upgradeCost = () => Math.pow(10, load().bagTier + 1);
  const level = () => Math.floor(Math.sqrt(load().xp / 12)) + 1;

  // ---------------------------------------------------------------- pixels
  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
  // one line per residence — the zone is the type
  const LINES = {
    EC: { n: 'Eden', pal: ['#7ec8ff', '#2f4fdf', '#1a1c5a'] },
    AG: { n: 'Atlantic', pal: ['#b5f27a', '#2aa845', '#124d2a'] },
    EP: { n: 'Parc', pal: ['#f2c14e', '#e39b12', '#8a4a1e'] },
    EPP: { n: 'Pitch', pal: ['#c9b6e8', '#7b3fc4', '#3a1a5a'] },
    GP: { n: 'Green', pal: ['#8ee6d2', '#1f9e8a', '#0f4a42'] },
  };
  const lineOf = (p) => LINES[p.res] || { n: p.res, pal: ['#c9c9c9', '#7a7a90', '#20203a'] };
  const spriteCache = new Map();
  function sprite(p) {
    const k = p.id;
    if (!spriteCache.has(k)) {
      const r = rng(hash(p.id)); const W = 12, H = 12, half = 6; const cells = [];
      for (let y = 0; y < H; y++) { cells[y] = []; for (let x = 0; x < half; x++) { const cy = Math.abs(y - 6) / 6, cx = (half - x) / half; cells[y][x] = r() < 0.72 - 0.45 * (cy * cy + cx * cx * .6) ? 1 : 0; } }
      for (let y = 4; y < 9; y++) cells[y][half - 1] = 1;
      // legs: two feet at the bottom row
      cells[H - 1][1] = 1; cells[H - 1][2] = 1; cells[H - 2][1] = 1; cells[H - 1][4] = 0;
      const eyeY = 3 + Math.floor(r() * 3), eyeX = 1 + Math.floor(r() * 3);
      const pal = lineOf(p).pal, dark = '#20203a';
      const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
      const on = (x, y) => y >= 0 && y < H && x >= 0 && x < W && cells[y][x < half ? x : W - 1 - x];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (on(x, y)) { const sh = (y + (x < half ? x : W - 1 - x)) % 3; g.fillStyle = pal[sh === 1 ? 0 : 1]; if (y > 8) g.fillStyle = pal[2]; g.fillRect(x, y, 1, 1); }
        else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) { g.fillStyle = dark; g.fillRect(x, y, 1, 1); }
      }
      g.fillStyle = '#fff'; g.fillRect(eyeX, eyeY, 1, 1); g.fillRect(W - 1 - eyeX, eyeY, 1, 1);
      g.fillStyle = dark; g.fillRect(eyeX, eyeY + 1, 1, 1); g.fillRect(W - 1 - eyeX, eyeY + 1, 1, 1);
      spriteCache.set(k, c.toDataURL());
    }
    const img = document.createElement('img'); img.src = spriteCache.get(k); img.className = 'q-sprite'; img.alt = ''; return img;
  }
  // the trainer: 12×16, from the avatar settings
  function avatar(a) {
    const c = document.createElement('canvas'); c.width = 12; c.height = 16; const g = c.getContext('2d');
    const dark = '#20203a', shirt = '#2f4fdf', pants = '#20203a';
    const size = a.size || 1; const top = size === 0 ? 3 : size === 2 ? 0 : 1;
    // head
    g.fillStyle = a.skin; g.fillRect(4, top + 1, 4, 4);
    g.fillStyle = a.eyes; g.fillRect(5, top + 2, 1, 1); g.fillRect(7, top + 2, 1, 1);
    // hair styles: 1 flat, 2 spiky, 3 long, 4 cap
    g.fillStyle = a.hairColor;
    if (a.hair === 1) g.fillRect(4, top, 4, 1);
    if (a.hair === 2) { g.fillRect(4, top, 4, 1); g.fillRect(3, top - 1 < 0 ? 0 : top - 1, 1, 1); g.fillRect(6, top - 1 < 0 ? 0 : top - 1, 1, 1); g.fillRect(8, top - 1 < 0 ? 0 : top - 1, 1, 1); }
    if (a.hair === 3) { g.fillRect(4, top, 4, 1); g.fillRect(3, top + 1, 1, 4); g.fillRect(8, top + 1, 1, 4); }
    if (a.hair === 4) { g.fillStyle = '#d82f2f'; g.fillRect(3, top, 6, 1); g.fillRect(4, top - 1 < 0 ? 0 : top - 1, 4, 1); }
    // body
    g.fillStyle = shirt; g.fillRect(3, top + 5, 6, 4);
    g.fillStyle = a.skin; g.fillRect(2, top + 5, 1, 3); g.fillRect(9, top + 5, 1, 3);
    g.fillStyle = pants; g.fillRect(4, top + 9, 2, 4 - (size === 0 ? 1 : 0)); g.fillRect(6, top + 9, 2, 4 - (size === 0 ? 1 : 0));
    g.fillStyle = dark; g.fillRect(3, top + 13 - (size === 0 ? 1 : 0), 3, 1); g.fillRect(6, top + 13 - (size === 0 ? 1 : 0), 3, 1);
    const img = document.createElement('img'); img.src = c.toDataURL(); img.className = 'q-avatar'; img.alt = ''; return img;
  }
  const SLOTS = ['tête', 'torse', 'jambes', 'pieds', 'amulette', 'perche', 'robot', 'balai'];
  const PIECE = { 'tête': 'Casquette', 'torse': 'Veste', 'jambes': 'Short', 'pieds': 'Bottes', 'amulette': 'Amulette', 'perche': 'Perche', 'robot': 'Robot', 'balai': 'Balai' };
  const GLYPH = { 'tête': ['..####..', '.######.', '########', '#.####.#', '........', '........', '........', '........'],
    'torse': ['#.####.#', '########', '.######.', '.######.', '.######.', '.##..##.', '........', '........'],
    'jambes': ['.######.', '.######.', '.##..##.', '.##..##.', '.##..##.', '........', '........', '........'],
    'pieds': ['........', '.##..##.', '.##..##.', '###..###', '###..###', '........', '........', '........'],
    'amulette': ['..#..#..', '.#....#.', '#......#', '.#....#.', '..####..', '..####..', '...##...', '........'],
    'perche': ['#.......', '.#......', '..#.....', '...#....', '....#...', '.....#..', '......##', '......##'],
    'robot': ['.######.', '#..##..#', '#.####.#', '#......#', '########', '.#....#.', '.#....#.', '........'],
    'balai': ['......##', '.....##.', '....##..', '...##...', '.####...', '#####...', '####....', '........'] };
  const RAR = [['common', 'Commun', .20], ['uncommon', 'Peu commun', .10], ['rare', 'Rare', .05], ['vrare', 'Très rare', .01], ['epic', 'Épique', .001], ['legend', 'Légendaire', .0001]];
  const RCOL = { common: '#6b7a87', uncommon: '#2aa845', rare: '#2f4fdf', vrare: '#7b3fc4', epic: '#e39b12', legend: '#d82f2f' };
  const SETS = { common: "de l'Écumeur", uncommon: 'du Skimmer', rare: 'de la Marée', vrare: "de l'Électrolyseur", epic: 'des Dunes', legend: 'du Trident de Lacanau' };
  const rarName = (k) => (RAR.find((x) => x[0] === k) || RAR[0])[1];
  function glyph(slot, rar, cls) {
    const rows = GLYPH[slot] || GLYPH['amulette']; const c = document.createElement('canvas'); c.width = 8; c.height = 8; const g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') { g.fillStyle = RCOL[rar] || RCOL.common; g.fillRect(x, y, 1, 1); } }));
    const img = document.createElement('img'); img.src = c.toDataURL(); img.className = cls || 'q-glyph'; img.alt = ''; return img;
  }
  function crateGlyph(rar) {
    const rows = ['########', '#......#', '#.####.#', '#.#..#.#', '#.####.#', '#......#', '########', '........'];
    const c = document.createElement('canvas'); c.width = 8; c.height = 8; const g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') { g.fillStyle = RCOL[rar]; g.fillRect(x, y, 1, 1); } }));
    const img = document.createElement('img'); img.src = c.toDataURL(); img.className = 'q-glyph'; img.alt = ''; return img;
  }

  // ---------------------------------------------------------------- creature from the log
  function creature(p) {
    const R = Store.readingsFor(p.id), V = Store.visitsFor(p.id);
    const last = R[0] || null;
    const lastVisit = V[0] ? V[0].at : (last ? last.at : null);
    const lvl = new Set(V.map((v) => day(v.at)).concat(R.map((r) => day(r.at)))).size;
    const vol = p.volM3 || 40;
    const cl28 = V.filter((v) => v.type === 'treatment' && daysSince(v.at) <= 28 && CL[v.productId]).reduce((a, v) => a + (v.qty || 0) * CL[v.productId], 0);
    const faim = cl28 / vol / 4;
    const lastWash = V.find((v) => v.type === 'backwash');
    const washes = V.filter((v) => v.type === 'backwash').map((v) => v.at).sort();
    let interval = 10; if (washes.length > 2) { const gaps = []; for (let i = 1; i < washes.length; i++) gaps.push((new Date(washes[i]) - new Date(washes[i - 1])) / 864e5); gaps.sort((a, b) => a - b); interval = Math.max(4, gaps[Math.floor(gaps.length / 2)]); }
    const filtre = lastWash ? daysSince(lastWash.at) : 30;
    const sable = p.sandDate ? daysSince(p.sandDate) / 365.25 : null;
    const humeur = daysSince(lastVisit);
    const s = state(last, humeur, V, vol);
    const H = hp(s, filtre);
    return { p, id: p.id, name: `${p.res} ${p.unit}`, line: lineOf(p), level: lvl, vol, last, humeur, faim, filtre, interval, sable, s, hp: H, wild: humeur > 5 || H < 60 };
  }
  function state(last, humeur, V, vol) {
    const d = Math.min(14, last ? daysSince(last.at) : 7);
    let cl = last && last.chlorine != null ? last.chlorine - 0.12 * d : 0.5;
    V.filter((v) => v.type === 'treatment' && (!last || v.at > last.at) && CL[v.productId]).forEach((v) => { const g = (v.qty || 0) * CL[v.productId]; cl += (g / vol) * 0.045 * Math.max(0.25, 1 - daysSince(v.at) / 8); });
    cl = Math.max(0.1, Math.min(4, cl));
    const ph = last && last.ph != null ? last.ph + 0.02 * d : 7.5;
    const cleanedToday = V.some((v) => v.type === 'service' && v.task && daysSince(v.at) < 1);
    return { cl: +cl.toFixed(2), ph: +ph.toFixed(2), dirt: cleanedToday ? 0 : Math.min(3, Math.floor((humeur + 1) / 2.5)) };
  }
  function hp(s, filtre) {
    let pen = 0;
    if (s.cl < 1) pen += (1 - s.cl) * 45; else if (s.cl > 3) pen += (s.cl - 3) * 12;
    if (s.ph < 7.0) pen += (7.0 - s.ph) * 60; else if (s.ph > 7.6) pen += (s.ph - 7.6) * 60;
    pen += s.dirt * 9; pen += Math.max(0, filtre - 14) * 2;
    return Math.max(0, Math.min(100, Math.round(100 - pen)));
  }
  const maintained = () => Store.pools().filter((p) => !p.nonPool && !(Store.residence(p.res) || {}).nonPool && !Store.isWintered(p));

  // ---------------------------------------------------------------- encounters: a pool page visit
  const countFor = (poolId, since) => Store.load().visits.filter((v) => v.poolId === poolId && !v.deleted && v.at >= since).length + Store.load().readings.filter((r) => r.poolId === poolId && !r.deleted && r.at >= since).length;
  const kindsFor = (poolId, since) => {
    const V = Store.load().visits.filter((v) => v.poolId === poolId && !v.deleted && v.at >= since);
    const R = Store.load().readings.filter((r) => r.poolId === poolId && !r.deleted && r.at >= since);
    return { chem: V.filter((v) => v.type === 'treatment').length, clean: V.filter((v) => v.type === 'service' && v.task).length, filt: V.filter((v) => v.type === 'backwash').length, mes: R.length };
  };
  function enter(poolId) {
    const g = load();
    if (g.enc && g.enc.poolId !== poolId) settle();
    if (!g.enc) { g.enc = { poolId, since: new Date().toISOString() }; save(); }
  }
  // Settle the open encounter: real actions → XP, coins, maybe a crate. Nothing done → the creature stays wild, no loot.
  function settle() {
    const g = load(); const e = g.enc; if (!e) return null;
    g.enc = null;
    const p = Store.pool(e.poolId); if (!p) { save(); return null; }
    const acts = kindsFor(e.poolId, e.since); const n = acts.chem + acts.clean + acts.filt + acts.mes;
    g.fights++;
    let out = { pool: `${p.res} ${p.unit}`, n, xp: 0, coins: 0, crate: null };
    if (n) {
      const c = creature(p);
      out.xp = 8 + c.level + n * 2; out.coins = 3 + Math.floor(Math.random() * 6) + n * 2;
      g.xp += out.xp; g.coins += out.coins; g.wins++; g.calmed[p.id] = new Date().toISOString();
      const r = Math.random(); let acc = 0, tier = null;
      for (let i = RAR.length - 1; i >= 0; i--) { acc += RAR[i][2]; if (r < acc) { tier = RAR[i][0]; break; } }
      if (tier) {
        const crate = { id: 'cr-' + Date.now() + '-' + Math.floor(Math.random() * 1e6), crate: true, rar: tier, from: out.pool, acts, at: new Date().toISOString() };
        if (g.bag.length < bagSize()) { g.bag.push(crate); out.crate = crate; } else out.crate = { lost: true, rar: tier };
      }
    }
    g.pending = out; save();
    return out;
  }
  function openCrate(i) {
    const g = load(); const cr = g.bag[i]; if (!cr || !cr.crate) return null;
    const a = cr.acts || { chem: 0, clean: 0, filt: 0, mes: 0 };
    const pool = [].concat(Array(1 + a.mes * 3).fill('tête'), Array(1 + a.chem * 2).fill('amulette'), Array(1 + a.chem).fill('torse'), Array(1 + a.clean * 2).fill('balai'), Array(1 + a.clean).fill('pieds'), Array(1 + a.clean).fill('jambes'), Array(1 + a.filt * 2).fill('perche'), Array(1 + a.filt + a.clean).fill('robot'));
    const slot = pool[Math.floor(Math.random() * pool.length)];
    // a crate opens at its own rarity, one tier better one time in ten
    let ri = RAR.findIndex((x) => x[0] === cr.rar); if (Math.random() < 0.1 && ri < RAR.length - 1) ri++;
    const rar = RAR[ri][0];
    const it = { id: 'it-' + Date.now() + '-' + Math.floor(Math.random() * 1e6), slot, rar, name: `${PIECE[slot]} ${SETS[rar]}`, from: cr.from, at: new Date().toISOString() };
    g.bag[i] = it; g.coins += 1; save();
    return it;
  }

  // ---------------------------------------------------------------- UI: pool section (the encounter card)
  const bar = (label, v, max, txt) => `<div class="q-stat"><span>${esc(label)}</span><span class="q-bar"><i style="width:${Math.min(100, Math.round(v / max * 100))}%"></i></span><span class="q-v">${esc(txt)}</span></div>`;
  function poolSection(p) {
    enter(p.id);
    const c = creature(p); const g = load(); const acts = kindsFor(p.id, g.enc ? g.enc.since : new Date().toISOString()); const n = acts.chem + acts.clean + acts.filt + acts.mes;
    const box = el(`<div class="q-card">
      <div class="q-head"><div class="q-grow"><b>${esc(c.name)}</b> <span class="q-tag">${esc(c.line.n)}</span><span class="q-tag">Nv ${c.level}</span>${c.wild ? '<span class="q-tag wild">sauvage</span>' : (g.calmed[p.id] && daysSince(g.calmed[p.id]) < 5 ? '<span class="q-tag calm">apaisée</span>' : '')}
        <div class="q-hp ${c.hp < 40 ? 'low' : c.hp < 75 ? 'mid' : ''}"><i style="width:${c.hp}%"></i></div>
        <div class="q-hint">PV ${c.hp}/100 · ${n ? n + ' geste' + (n > 1 ? 's' : '') + ' ce passage' : 'aucun geste encore — chaque saisie compte'}</div></div>
      </div>
      <div class="q-stats">
        ${bar('Faim', c.faim, 40, c.faim.toFixed(0) + ' g/m³/sem')}
        ${bar('Chlore', c.s.cl, 4, c.s.cl.toFixed(1) + ' ppm')}
        ${bar('pH', Math.abs(c.s.ph - 7.3) * 2, 1.2, c.s.ph.toFixed(2))}
        ${bar('Saleté', c.s.dirt, 3, ['propre', 'feuilles', 'sale', 'très sale'][c.s.dirt])}
        ${bar('Filtre', c.filtre, Math.max(c.interval * 2, 1), c.filtre.toFixed(0) + ' j · rythme ' + c.interval.toFixed(0))}
        ${c.sable != null ? bar('Sable', c.sable, 6, c.sable.toFixed(1) + ' ans') : ''}
      </div></div>`);
    box.querySelector('.q-head').appendChild(sprite(p));
    return box;
  }
  // toast after an encounter settles (shown on the next page)
  function toast() {
    const g = load(); const o = g.pending; if (!o) return; g.pending = null; save();
    const parts = o.n ? [`${o.pool} apaisée`, `+${o.xp} XP`, `+${o.coins} pièces`] : [`${o.pool} reste sauvage — rien de saisi`];
    if (o.crate) parts.push(o.crate.lost ? `caisse ${rarName(o.crate.rar).toLowerCase()} perdue (sac plein)` : `caisse ${rarName(o.crate.rar).toLowerCase()} !`);
    const tst = el(`<div class="q-toast ${o.n ? 'win' : ''}"><b>${o.n ? '★' : '…'}</b> ${esc(parts.join(' · '))}</div>`);
    document.body.appendChild(tst);
    setTimeout(() => tst.classList.add('show'), 20); setTimeout(() => { tst.classList.remove('show'); setTimeout(() => tst.remove(), 400); }, 4200);
  }

  // ---------------------------------------------------------------- UI: Quête tab (créatures · sac · dresseur)
  let sub = 'dex';
  function view(render) {
    const g = load();
    const wrap = document.createElement('div');
    wrap.appendChild(el(`<div class="page-head"><h1>Quête</h1><p class="sub">Nv ${level()} · ${g.xp} XP · ${g.coins} pièces · ${g.wins} apaisées</p></div>`));
    const seg = el(`<div class="q-seg">${[['dex', 'Créatures'], ['bag', 'Sac'], ['me', 'Dresseur']].map(([k, l]) => `<button type="button" data-k="${k}" class="${sub === k ? 'on' : ''}">${l}</button>`).join('')}</div>`);
    seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { sub = b.dataset.k; render(); }));
    wrap.appendChild(seg);
    ({ dex: viewDex, bag: viewBag, me: viewMe })[sub](wrap, render);
    return wrap;
  }
  function viewDex(wrap) {
    const g = load();
    const cs = maintained().map(creature).sort((a, b) => b.level - a.level);
    wrap.appendChild(el(`<p class="q-hint">${cs.filter((c) => c.wild).length} sauvages sur ${cs.length} · ouvrir une piscine = la rencontrer</p>`));
    const grid = el('<div class="q-grid"></div>');
    cs.forEach((c) => {
      const card = el(`<a class="q-crea${c.wild ? ' wild' : ''}" href="#/pool/${c.id}"></a>`);
      card.appendChild(sprite(c.p));
      card.appendChild(el(`<div><b>${esc(c.name)}</b><small>Nv ${c.level} · ${esc(c.line.n)}</small>${c.wild ? '<small class="q-wild">sauvage</small>' : g.calmed[c.id] ? '<small class="q-calm">apaisée</small>' : '<small>&nbsp;</small>'}</div>`));
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
  }
  function viewBag(wrap, render) {
    const g = load();
    const eq = el('<div class="q-card"><b>Équipement</b><div class="q-equip"></div></div>');
    SLOTS.forEach((sl) => {
      const it = g.equip[sl];
      const d = el(`<div class="q-slot${it ? '' : ' empty'}"><span>${sl}</span></div>`);
      if (it) { d.insertBefore(glyph(it.slot, it.rar), d.firstChild); d.appendChild(el(`<span class="q-rr" style="background:${RCOL[it.rar]}"></span>`)); d.title = it.name;
        d.addEventListener('click', () => { if (g.bag.length < bagSize()) { g.bag.push(it); delete g.equip[sl]; save(); render(); } }); }
      eq.querySelector('.q-equip').appendChild(d);
    });
    wrap.appendChild(eq);
    const counts = {}; Object.values(g.equip).forEach((it) => { counts[it.rar] = (counts[it.rar] || 0) + 1; });
    const sets = el('<div class="q-card"><b>Panoplies</b><div class="q-sets"></div></div>');
    RAR.forEach(([k, n, rate]) => sets.querySelector('.q-sets').appendChild(el(`<div><span style="color:${RCOL[k]}">${n}</span><br>${counts[k] || 0} / 8 portées<br><small class="q-hint">${(rate * 100).toFixed(2).replace('.', ',')} % par passage</small></div>`)));
    wrap.appendChild(sets);
    const size = bagSize(); const cost = upgradeCost();
    const bag = el(`<div class="q-card"><div class="q-head"><b>Sac</b> <span class="q-hint">${g.bag.length} / ${size}</span><span class="q-grow"></span>${g.bagTier < BAG_SIZES.length - 1 ? `<button type="button" class="btn q-up${g.coins >= cost ? '' : ' dis'}">+${BAG_SIZES[g.bagTier + 1] - size} places · ${cost} pièces</button>` : ''}</div><div class="q-slots"></div></div>`);
    const up = bag.querySelector('.q-up'); if (up) up.addEventListener('click', () => { if (g.coins >= cost) { g.coins -= cost; g.bagTier++; save(); render(); } });
    for (let i = 0; i < size; i++) {
      const it = g.bag[i];
      const d = el(`<div class="q-slot${it ? '' : ' empty'}"></div>`);
      if (it && it.crate) { d.appendChild(crateGlyph(it.rar)); d.appendChild(el('<span>caisse</span>')); d.appendChild(el(`<span class="q-rr" style="background:${RCOL[it.rar]}"></span>`)); d.title = `Caisse ${rarName(it.rar).toLowerCase()} · ${it.from}`;
        d.addEventListener('click', () => { const got = openCrate(i); if (got) { render(); const tst = el(`<div class="q-toast win show"><b>📦</b> ${esc(got.name)} · ${esc(rarName(got.rar))} · +1 pièce</div>`); document.body.appendChild(tst); setTimeout(() => tst.remove(), 3500); } }); }
      else if (it) { d.appendChild(glyph(it.slot, it.rar)); d.appendChild(el(`<span>${esc(it.slot)}</span>`)); d.appendChild(el(`<span class="q-rr" style="background:${RCOL[it.rar]}"></span>`)); d.title = `${it.name} · ${it.from}`;
        d.addEventListener('click', () => { const prev = g.equip[it.slot]; g.equip[it.slot] = it; g.bag.splice(i, 1); if (prev) g.bag.push(prev); save(); render(); }); }
      bag.querySelector('.q-slots').appendChild(d);
    }
    wrap.appendChild(bag);
    wrap.appendChild(el('<p class="q-hint">Une caisse tombe après un passage où quelque chose a été saisi ; tape-la pour l\'ouvrir. Tape un objet pour l\'équiper, une pièce portée pour la ranger. Le sac grandit avec les pièces : 8 · 16 · 32 · 64 · 128.</p>'));
  }
  function viewMe(wrap, render) {
    const g = load(); const a = g.avatar;
    const card = el(`<div class="q-card"><div class="q-head"><div class="q-grow"><b style="font-size:1.2rem">${esc(Store.operator() || 'Dresseur')}</b> <span class="q-tag">Nv ${level()}</span><div class="q-hint">${g.xp} XP · ${g.coins} pièces · ${g.wins} apaisées / ${g.fights} passages</div></div></div></div>`);
    card.querySelector('.q-head').appendChild(avatar(a));
    wrap.appendChild(card);
    // avatar settings
    const set = el('<div class="q-card"><b>Personnage</b><div class="q-opts"></div></div>');
    const opts = set.querySelector('.q-opts');
    const row = (label, html) => { const r = el(`<div class="q-opt"><span>${label}</span><span class="q-optv"></span></div>`); r.querySelector('.q-optv').innerHTML = html; opts.appendChild(r); return r; };
    const r1 = row('Taille', ['S', 'M', 'L'].map((l, i) => `<button type="button" data-v="${i}" class="q-pick${a.size === i ? ' on' : ''}">${l}</button>`).join(''));
    r1.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { a.size = +b.dataset.v; save(); render(); }));
    const r2 = row('Cheveux', [1, 2, 3, 4].map((h) => `<button type="button" data-v="${h}" class="q-pick${a.hair === h ? ' on' : ''}">${['—', 'court', 'hérissé', 'long', 'casquette'][h]}</button>`).join(''));
    r2.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { a.hair = +b.dataset.v; save(); render(); }));
    const sw = (key, colors) => { const r = row({ hairColor: 'Couleur', skin: 'Peau', eyes: 'Yeux' }[key], colors.map((c) => `<button type="button" data-v="${c}" class="q-sw${a[key] === c ? ' on' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')); r.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { a[key] = b.dataset.v; save(); render(); })); };
    sw('hairColor', ['#20203a', '#4a2e1a', '#a8672a', '#e6c35c', '#d82f2f', '#e6e6ff']);
    sw('skin', ['#f6dcc1', '#e8b88a', '#c68d5a', '#8d5a3a', '#5a3a26']);
    sw('eyes', ['#20203a', '#4a2e1a', '#2f4fdf', '#2aa845', '#7b3fc4']);
    wrap.appendChild(set);
    // arènes: a residence is held when none of its pools is wild
    const ar = el('<div class="q-card"><b>Arènes</b><div class="q-sets"></div></div>');
    Store.residences().filter((r) => !r.nonPool && !r.poi).forEach((r) => { const cs = maintained().filter((p) => p.res === r.code).map(creature); if (!cs.length) return; const wild = cs.filter((c) => c.wild).length; ar.querySelector('.q-sets').appendChild(el(`<div><b>${esc(r.code)}</b> ${esc(r.name)}<br><span class="${wild ? 'q-hint' : 'q-calm'}">${wild ? wild + ' sauvage' + (wild > 1 ? 's' : '') : 'badge tenu'}</span></div>`)); });
    wrap.appendChild(ar);
    // season scoreboard from the by-tags (the data both phones already share)
    const by = {}; Store.load().visits.filter((v) => !v.deleted && Store.inSeason(v)).forEach((v) => { const k = v.by || ''; if (!k) return; by[k] = by[k] || { d: new Set(), tr: 0, bw: 0 }; by[k].d.add(v.poolId + day(v.at)); if (v.type === 'treatment') by[k].tr++; if (v.type === 'backwash') by[k].bw++; });
    const sc = el('<div class="q-card"><b>Tableau de la saison</b><div class="q-kvs"></div></div>');
    Object.entries(by).sort((x, y) => y[1].d.size - x[1].d.size).forEach(([k, v]) => sc.querySelector('.q-kvs').appendChild(el(`<div class="q-kv"><span>${esc(k)}</span><span>${v.d.size} passages · ${v.tr} doses · ${v.bw} lavages</span></div>`)));
    wrap.appendChild(sc);
  }

  // settle an open encounter when the pool page is left (route change) or the app is hidden
  function onRoute(name, poolId) {
    const g = load();
    if (g.enc && !(name === 'pool' && poolId === g.enc.poolId)) settle();
    if (name !== 'pool') setTimeout(toast, 50);
  }
  window.addEventListener('pagehide', () => { if (load().enc) settle(); });

  return { poolSection, view, onRoute, settle, creature, sprite, get state() { return load(); } };
})();
window.Game = Game;
