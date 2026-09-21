/*
 * Lagrange Quest — the Pixel style's game layer. Loaded only when the style
 * is Pixel (app.js adds the script tag), and it never invents data: every
 * creature stat is read from the store, and an "encounter" is simply a pool
 * page visit — the app's own buttons are the moves. Leaving the page settles
 * it: real actions logged during the visit earn XP, coins and a chance of a
 * loot crate. Game state (bag, coins, avatar) is device-local, game only.
 * The art is js/pixelart.js (Pocket Coast) on js/maps.js (one map per pool): the pool
 * page, in the fight and at the dépôt plays back what was recorded, and the
 * keeper wears what it has equipped — each piece with its own set's shape.
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
    if (!G.res || typeof G.res !== 'object') G.res = {};
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
  const PA = window.PixelArt;
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = (v) => Math.min(255, Math.max(0, Math.round(v * f))); return '#' + ((c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0'); };
  // a pool's creature: its zone's species (Écume, Oyatin, Pignotte, Gouémitte, Glapot), tinted and marked by its own id
  function sprite(p) { const c = Motion.creaturePortrait(p.id, PA.ZONE[p.res] ? p.res : 'EC'); c.className = 'q-sprite'; return c; }
  // The keeper wears independently collected items over its basic clothes.
  let avatarDirection = 'south';
  function avatar(a) {
    const c = Motion.portrait(48, 48, (ctx, elapsed) => {
      const equip = load().equip;
      Motion.setAura(ctx, equip, 'back', elapsed, 24, 40);
      Motion.keeper(ctx, 24, 40, a, equip, { direction: avatarDirection, elapsed });
      Motion.setAura(ctx, equip, 'front', elapsed, 24, 40);
    }); c.className = 'q-avatar'; return c;
  }
  const SLOTS = ['tête', 'torse', 'jambes', 'pieds', 'amulette', 'perche', 'robot', 'balai'];
  // The catalogue. One panoplie per zone (the creature's line decides which
  // set its crates hold), six rarities each, eight pieces: 240 items with a
  // name and a line of flavour. Rarity is the epithet; the set is the wardrobe.
  const ZSETS = {
    EC: { n: 'Pool Boy', aura: '#2f4fdf', legend: 'du Pool Boy Éternel', epic: 'du Grand Skimmer', base: {
      'tête': ['Casquette', 'f', 'vissée à l’envers depuis 2019.'], 'torse': ['Polo', 'm', 'col relevé, taches de chlore portées en médailles.'], 'jambes': ['Short cargo', 'm', 'douze poches, aucune ne ferme.'],
      'pieds': ['Crocs', 'fp', 'mode sport enclenché, toujours.'], 'amulette': ['Sifflet', 'm', 'personne n’a jamais su pourquoi.'], 'perche': ['Perche télescopique', 'f', 'bloquée à 3,80 m depuis juin.'],
      'robot': ['Robot Dolphin', 'm', 'il connaît le bassin mieux que toi.'], 'balai': ['Balai de fond', 'm', 'les poils penchent à gauche, comme son propriétaire.'] } },
    AG: { n: 'Surfeur des dunes', aura: '#2aa845', legend: 'de la Vague Parfaite', epic: 'de l’Océan', base: {
      'tête': ['Bob', 'm', 'délavé par trois étés de Lacanau.'], 'torse': ['Combinaison 3/2', 'f', 'sent la marée basse, même sèche.'], 'jambes': ['Boardshort', 'm', 'le cordon a rendu l’âme, pas lui.'],
      'pieds': ['Chaussons néoprène', 'mp', 'sable garanti dans chaque orteil.'], 'amulette': ['Dent de requin', 'f', 'authentique, dit le vendeur de la plage.'], 'perche': ['Perche en bambou', 'f', 'coupée dans la dune, plie sans rompre.'],
      'robot': ['Robot Longboard', 'm', 'glisse plus qu’il n’aspire.'], 'balai': ['Balai wax', 'm', 'laisse une trace brillante, bizarrement.'] } },
    EP: { n: 'Jardinier du golf', aura: '#e39b12', legend: 'du Green Impeccable', epic: 'du Golfeur Fantôme', base: {
      'tête': ['Chapeau de paille', 'm', 'un trou pile au-dessus de l’œil droit.'], 'torse': ['Gilet à poches', 'm', 'gants, tees, un sachet de floc oublié.'], 'jambes': ['Pantalon kaki', 'm', 'genoux verts à vie.'],
      'pieds': ['Bottes de jardin', 'fp', 'boueuses à l’intérieur, mystère.'], 'amulette': ['Trèfle à quatre feuilles', 'm', 'plastifié, donc éternel.'], 'perche': ['Râteau-perche', 'm', 'ramasse feuilles ET balles perdues.'],
      'robot': ['Robot tondeuse égaré', 'm', 'a pris le bassin pour un fairway.'], 'balai': ['Balai brosse', 'm', 'coupe l’algue au ras du gazon.'] } },
    EPP: { n: 'Locataire', aura: '#7b3fc4', legend: 'du Locataire de la Semaine 33', epic: 'de la Caution Récupérée', base: {
      'tête': ['Lunettes de soleil', 'fp', 'oubliées sur le transat, adoptées.'], 'torse': ['Marcel', 'm', 'blanc à l’origine.'], 'jambes': ['Slip de bain', 'm', 'le fameux. On ne pose pas de questions.'],
      'pieds': ['Tongs', 'fp', 'échouées au skimmer, dépareillées.'], 'amulette': ['Bracelet all-inclusive', 'm', 'expiré depuis samedi, toujours porté.'], 'perche': ['Épuisette à crevettes', 'f', 'inefficace, mais quelle allure.'],
      'robot': ['Robot gonflable', 'm', 'flotte. C’est tout.'], 'balai': ['Balai du placard', 'm', 'emprunté, jamais rendu.'] } },
    GP: { n: 'Gardien du Green', aura: '#1f9e8a', legend: 'du Dernier Gardien', epic: 'des Clés Perdues', base: {
      'tête': ['Visière', 'f', 'protège du soleil et des regards.'], 'torse': ['Coupe-vent', 'm', 'fait du bruit à chaque pas, on te sait là.'], 'jambes': ['Jogging', 'm', 'les poches sont pleines de galets, littéralement.'],
      'pieds': ['Baskets', 'fp', 'lacées une fois, pour toujours.'], 'amulette': ['Clé du local', 'f', 'ouvre tout, sauf le local.'], 'perche': ['Perche du gardien', 'f', 'sert aussi à pointer.'],
      'robot': ['Robot de garde', 'm', 'surveille la piscine la nuit, parle à personne.'], 'balai': ['Balai de ronde', 'm', 'un tour, pas deux.'] } },
  };
  const EPI = { common: { m: 'échoué', f: 'échouée', mp: 'échoués', fp: 'échouées' }, uncommon: { m: 'dépareillé', f: 'dépareillée', mp: 'dépareillés', fp: 'dépareillées' }, rare: 'de compétition', vrare: 'de la marée haute' };
  const RLINE = { common: 'Ça fait le boulot. Parfois.', uncommon: 'Il en manque une partie, mais laquelle ?', rare: 'Vu une fois sur un vrai pro.', vrare: 'Remonté par la marée haute, sec en une heure.', epic: 'On en parle encore au dépôt.', legend: 'Une légende à Lacanau. Personne ne l’a jamais vu deux fois.' };
  // affixes: what a piece does for the trainer, rolled at opening
  const AFFIX = { xp: 'XP', gold: 'pièces', drop: 'caisses', luck: 'chance' };
  const RANGE = { common: [3, 8], uncommon: [5, 12], rare: [8, 18], vrare: [12, 24], epic: [18, 30], legend: [25, 35] };
  const NAFF = { common: 1, uncommon: 1, rare: 2, vrare: 2, epic: 3, legend: 3 };
  const SELL = { common: 2, uncommon: 6, rare: 15, vrare: 50, epic: 200, legend: 1000 };
  // the workshop: resources of any kind + coins → a piece of the chosen set, slot and rarity
  const CRAFT = { common: [4, 10], uncommon: [8, 50], rare: [16, 200], vrare: [32, 800], epic: [64, 3000], legend: [128, 10000] };
  function makeItem(res, slot, rar, from) {
    const set = ZSETS[res] || ZSETS.EC; const [base, gender, flavour] = set.base[slot];
    const e = EPI[rar]; const epi = rar === 'legend' ? set.legend : rar === 'epic' ? set.epic : (typeof e === 'string' ? e : e[gender] || e.m);
    const keys = Object.keys(AFFIX).sort(() => Math.random() - 0.5).slice(0, NAFF[rar]);
    const [lo, hi] = RANGE[rar];
    const affixes = keys.map((k) => ({ k, v: lo + Math.floor(Math.random() * (hi - lo + 1)) }));
    // one piece in six from Peu commun up is cursed: one bonus doubled, another stat halved
    let cursed = false;
    if (rar !== 'common' && Math.random() < 1 / 6) { cursed = true; affixes[0].v *= 2; const other = Object.keys(AFFIX).filter((k) => !keys.includes(k))[0] || keys[keys.length - 1]; affixes.push({ k: other, v: -Math.round(affixes[0].v / 2) }); }
    return { id: 'it-' + Date.now() + '-' + Math.floor(Math.random() * 1e6), res: set === ZSETS[res] ? res : 'EC', slot, rar, name: `${base} ${epi}`, desc: `${flavour} ${RLINE[rar]}`, affixes, cursed, from, at: new Date().toISOString() };
  }
  const setName = (res) => (ZSETS[res] || ZSETS.EC).n;
  // everything worn, summed: item affixes + set bonuses (2 / 4 / 6 / 8 pieces of one zone)
  function bonuses() {
    const g = load(); const b = { xp: 0, gold: 0, drop: 0, luck: 0, aura: null, sets: {} };
    Object.values(g.equip).forEach((it) => { (it.affixes || []).forEach((a) => { b[a.k] += a.v; }); b.sets[it.res] = (b.sets[it.res] || 0) + 1; });
    Object.entries(b.sets).forEach(([res, n]) => { if (n >= 2) b.xp += 5; if (n >= 4) b.gold += 10; if (n >= 6) b.drop += 10; if (n >= 8) { b.aura = res; b.xp += 25; b.gold += 25; b.drop += 25; b.luck += 25; } });
    return b;
  }
  const RAR = [['common', 'Commun', .20], ['uncommon', 'Peu commun', .10], ['rare', 'Rare', .05], ['vrare', 'Très rare', .01], ['epic', 'Épique', .001], ['legend', 'Légendaire', .0001]];
  const RCOL = { common: '#6b7a87', uncommon: '#2aa845', rare: '#2f4fdf', vrare: '#7b3fc4', epic: '#e39b12', legend: '#d82f2f' };
  const rarName = (k) => (RAR.find((x) => x[0] === k) || RAR[0])[1];
  function glyph(slot, rar, cls, res) {
    const img = document.createElement('img'); img.src = PA.item(slot, res || 'EC', rar).toDataURL(); img.className = cls || 'q-glyph'; img.alt = ''; return img;
  }
  function crateGlyph(rar) { const img = document.createElement('img'); img.src = PA.crate(rar).toDataURL(); img.className = 'q-glyph'; img.alt = ''; return img; }

  // ---------------------------------------------------------------- bestiary: what haunts a neglected pool
  // Each monster is a real pool problem. It spawns from the pool's actual
  // condition (low chlorine breeds Algue, high pH grows Calcaire…), and the
  // move that hurts it most is the real remedy. The fight itself is game-only.
  const MON = {
    algue: { n: 'Algue verte', el: 'Algue', pal: ['#b5f27a', '#2aa845', '#124d2a'], hp: 60, when: (c) => (c.s.cl < 1 ? 3 : 0) + (c.fade > 1 ? 2 : 0), weak: { choc: 2.2, balai: 1.4, robot: 1.2, phm: .6, floc: .8, perche: .6, lavage: .5 },
      atk: [['BLOOM', 9, 'le bassin verdit à vue d’œil'], ['PAROI GLUANTE', 6, 'le fond glisse sous tes bottes']], desc: 'Naît d’un chlore qui a rendu l’âme. Vert le matin, olive le soir, propriétaire de la piscine dès le troisième jour.' },
    moutarde: { n: 'Algue moutarde', el: 'Algue', pal: ['#f5e27a', '#c9a227', '#6b4e10'], hp: 65, when: (c) => (c.s.cl < 1.2 ? 2 : 0) + (c.s.dirt >= 1 ? 1 : 0) + (c.s.ph > 7.6 ? 1 : 0), weak: { balai: 2.2, choc: 1.8, phm: 1.1, robot: .7, perche: .5, floc: .6, lavage: .8 },
      atk: [['DOUTE', 8, 'du sable ? du pollen ? … non'], ['REPOUSSE', 6, 'brossée le matin, revenue le soir']], desc: 'Son plus grand pouvoir est le doute. Es-tu sûr que c’est elle ? Non, car elle sème le doute.' },
    feuilles: { n: 'Nuée de feuilles', el: 'Air', pal: ['#f2c14e', '#e39b12', '#8a4a1e'], hp: 45, when: (c) => c.s.dirt * 1.5, weak: { perche: 2.2, balai: 1.6, robot: 1.5, choc: .5, phm: .4, floc: .7, lavage: .5 },
      atk: [['TOURBILLON', 7, 'les paniers se remplissent en une rafale'], ['DÉPÔT', 5, 'une couche de plus au fond']], desc: 'Les pins de Lacanau ne perdent jamais leurs aiguilles, sauf dans les skimmers. Elle revient chaque vent d’ouest.' },
    aiguille: { n: 'Aiguille de pin', el: 'Air', pal: ['#9fd36a', '#3f7d2a', '#2a3a1a'], hp: 40, when: (c) => (c.s.dirt >= 1 ? 2 : 0) + (c.filtre > c.interval ? 1 : 0), weak: { robot: 2.2, perche: 1.7, balai: .4, choc: .4, phm: .4, floc: .8, lavage: 1.2 },
      atk: [['PIQUE', 9, 'aïe aïe, ça pique !'], ['PANIER', 6, 'le skimmer déborde en silence']], desc: 'Sa proie ? Ton skimmer. Aïe aïe, ça pique ! Balai ? Tu parles. Seul le robot y tentera sa chance, ou une perche dextre et patiente.' },
    calcaire: { n: 'Calcaire', el: 'Terre', pal: ['#f4efe0', '#c9c0a8', '#7a7a90'], hp: 70, when: (c) => (c.s.ph > 7.7 ? 3 : 0) + (c.s.ph > 8 ? 2 : 0), weak: { phm: 2.4, balai: 1.3, robot: 1.1, choc: .5, perche: .6, floc: .6, lavage: .5 },
      atk: [['CROÛTE', 8, 'la ligne d’eau blanchit'], ['pH+', 6, 'l’eau vire au basique, doucement, sûrement']], desc: 'Un pH qui monte et ne redescend pas. Il s’installe sur la ligne d’eau et considère que c’est chez lui.' },
    moustique: { n: 'Moustique-tigre', el: 'Air', pal: ['#c9b6e8', '#7b3fc4', '#20203a'], hp: 35, when: (c) => (c.filtre > c.interval * 1.5 ? 3 : 0) + (c.humeur > 5 ? 1 : 0), weak: { robot: 2.0, floc: 1.6, choc: 1.3, lavage: 1.4, perche: .8, balai: .8, phm: .5 },
      atk: [['PIQÛRE', 10, 'trois sur la cheville, une sur la nuque'], ['LARVES', 5, 'l’eau stagnante lui plaît beaucoup']], desc: 'Adore une filtration en retard et une eau qui ne bouge plus. Repart dès que la pompe reprend son souffle.' },
    filtre: { n: 'Filtre saturé', el: 'Terre', pal: ['#b8c4d6', '#5a6b8a', '#26304a'], hp: 90, when: (c) => (c.filtre > c.interval * 1.3 ? 3 : 0) + (c.filtre > c.interval * 2 ? 2 : 0), weak: { lavage: 2.6, robot: .9, floc: .8, balai: .5, perche: .5, choc: .4, phm: .4 },
      atk: [['PRESSION', 11, 'le manomètre grimpe dans le rouge'], ['NIVEAU BAS', 7, 'la pompe aspire de l’air et tousse']], desc: 'Hélas. Ou le niveau d’eau ou ton skimmer est tombé dans les ténèbres, mon ami. À toi d’affronter les conséquences !' },
    sable: { n: 'Golem de sable', el: 'Terre', pal: ['#e9d59a', '#c9a55a', '#8a4a1e'], hp: 80, when: (c) => (c.sable != null && c.sable > 3 ? 3 : 0) + (c.s.dirt >= 2 ? 1 : 0), weak: { robot: 2.0, balai: 1.8, lavage: 1.7, floc: 1.4, perche: .9, choc: .4, phm: .4 },
      atk: [['VENT DE DUNE', 8, 'le fond se couvre d’une pellicule fine'], ['FILTRE COLMATÉ', 7, 'la pression grimpe, le débit tombe']], desc: 'Le vieux sable du filtre qui rêve de redevenir dune. Un lavage l’assomme, un sable neuf l’exile.' },
    gland: { n: 'Le Gland', el: 'Terre', pal: ['#c98a4a', '#8a5a2a', '#3a2a1a'], hp: 50, when: (c) => (c.s.dirt >= 1 ? 1.5 : 0) + (c.level > 10 ? .5 : 0), weak: { perche: 2.5, robot: 1.3, balai: 1.1, choc: .3, phm: .3, floc: .5, lavage: .4 },
      atk: [['CHUTE', 7, 'un ploc, puis un deuxième'], ['TACHE', 5, 'un rond brun au fond, en souvenir']], desc: 'Au nom d’une piscine verte ! Un gland est tombé dans la piscine, pisciniste. Ne panique pas. Demande-toi plutôt qui est le vrai gland dans l’histoire ?' },
    locataire: { n: 'Locataire nocturne', el: 'Feu', pal: ['#ffb3a7', '#d82f2f', '#5a1a1a'], hp: 55, when: (c) => (c.humeur > 4 ? 2 : 0) + (c.s.cl < 0.6 ? 2 : 0), weak: { choc: 1.8, floc: 1.5, phm: 1.2, perche: .9, balai: .9, robot: .8, lavage: .7 },
      atk: [['BAIGNADE DE 14 H', 12, 'douze personnes, une bouée licorne, zéro douche'], ['CRÈME SOLAIRE', 6, 'un film gras sur toute la surface']], desc: 'On ne le voit jamais, on ne voit que ses traces : le chlore plonge, l’eau mousse, la bouée reste.' },
  };
  const SPAWN = { calme: .06, 'traité': .10, sauvage: .48, critique: .78 };
  // monster tiers: rarer is tougher, hits harder, and drops more
  const MTIER = [['common', 'commun', .60, 1, 1], ['uncommon', 'peu commun', .25, 1.3, 1.15], ['rare', 'rare', .10, 1.7, 1.3], ['vrare', 'très rare', .04, 2.2, 1.5], ['epic', 'épique', .009, 3, 1.8], ['legend', 'légendaire', .001, 4, 2.2]];
  const mtierIdx = (t) => Math.max(0, MTIER.findIndex((x) => x[0] === t));
  // what a beaten monster leaves behind — the raw material of the dépôt's workshop
  const RES = { algue: 'Algue séchée', moutarde: 'Poudre moutarde', feuilles: 'Feuilles mortes', aiguille: 'Aiguilles de pin', calcaire: 'Écaille de calcaire', moustique: 'Aile de moustique', filtre: 'Manomètre rouillé', sable: 'Sable fin', gland: 'Gland verni', locataire: 'Tube de crème solaire' };
  const RESCOL = { algue: '#2aa845', moutarde: '#c9a227', feuilles: '#e39b12', aiguille: '#3f7d2a', calcaire: '#c9c0a8', moustique: '#7b3fc4', filtre: '#5a6b8a', sable: '#c9a55a', gland: '#8a5a2a', locataire: '#d82f2f' };
  function spawn(c) {
    const g = load(); const e = g.enc; if (!e || e.monster !== undefined) return;
    e.monster = null;
    if (Math.random() < SPAWN[c.state]) {
      const w = Object.entries(MON).map(([k, m]) => [k, 0.3 + m.when(c)]); const tot = w.reduce((a, x) => a + x[1], 0);
      let r = Math.random() * tot, id = w[0][0]; for (const [k, v] of w) { r -= v; if (r <= 0) { id = k; break; } }
      let tr = Math.random(), tier = MTIER[0]; for (const t of MTIER) { if (tr < t[2]) { tier = t; break; } tr -= t[2]; }
      // level 1–50: the pool's level and how far its Vie has drained
      const lvl = Math.max(1, Math.min(50, Math.round(c.level * 0.6 + (100 - c.vie) / 5 + (Math.random() * 10 - 5))));
      const hp = Math.round(MON[id].hp * (1 + lvl / 40) * tier[3]);
      e.monster = { id, lvl, hp, maxHp: hp, tier: tier[0], tierN: tier[1], dmg: tier[4], pool: c.name };
      g.bestiary = g.bestiary || {}; g.bestiary[id] = g.bestiary[id] || { seen: 0, beaten: 0 }; g.bestiary[id].seen++;
    }
    save();
  }
  function monsterSprite(id) { const c = Motion.monsterPortrait(id); c.className = 'q-sprite mon'; return c; }
  // moves: your tools (a worn piece of the tool makes it hit harder) and the chemistry you'd actually reach for
  const MOVES = { perche: ['Perche', 14], balai: ['Balai', 13], robot: ['Robot', 12], choc: ['Choc', 16], phm: ['pH−', 12], floc: ['Floc', 11], lavage: ['Lavage', 13] };
  const RTIER = { common: 1, uncommon: 2, rare: 3, vrare: 4, epic: 5, legend: 6 };
  function toolBonus(k) { const it = load().equip[k]; return it ? 1 + RTIER[it.rar] * 0.1 : 1; }
  let B = null;
  let poolStage = null;
  let depotStage = null;
  const Motion = window.QuestMotion;
  const fleeOdds = (mo) => { const d = mo.lvl - level(); return d < 0 ? 1 : Math.max(.2, 1 / 3 - d / 75); };
  function releaseBattle(battle) {
    battle.st?.dispose(); battle.ov?.remove();
    (battle.inert || []).forEach(([node, was]) => { node.inert = was; });
  }
  function abandon() {
    if (!B) return;
    const battle = B; B = null; releaseBattle(battle);
    if (!battle.over && battle.e?.monster) { battle.e.escaped = MON[battle.e.monster.id].n; battle.e.monster = null; save(); }
  }
  function openBattle(render) {
    if (B) return;
    const g = load(), e = g.enc; if (!e?.monster) return;
    closeMapMenu(poolStage);
    const m = MON[e.monster.id], c = creature(Store.pool(e.poolId));
    const armour = ['tête', 'torse', 'jambes', 'pieds'].reduce((n, slot) => n + (g.equip[slot] ? 8 + RTIER[g.equip[slot].rar] * 4 : 0), 0);
    const maxP = 100 + 4 * (level() - 1) + armour;
    const battle = B = { e, m, c, php: maxP, maxP, log: [{ k: 'foe', t: `${m.n} (Nv ${e.monster.lvl}) surgit de ${c.name} !` }], over: false, busy: false, menu: 'main', turn: 0, enemyVisible: true, playerVisible: true };
    e.monster.engaged = true; save();
    battle.ov = el('<div class="q-battle" role="dialog" aria-modal="true" aria-label="Combat" tabindex="-1"></div>'); document.body.appendChild(battle.ov);
    battle.inert = [...document.querySelectorAll('#app, .tabbar')].map((node) => { const was = node.inert; node.inert = true; return [node, was]; });
    const st = battle.st = stage((ctx, t, sc, a, progress) => drawBattle(ctx, t, sc, c, e.monster || battle.lastMo, g, battle, a, progress));
    st.lay = PoolMaps.get(c.p.id, c.p.res);
    st.hc = poolStage?.poolId === e.poolId ? poolStage.hc.slice() : [st.lay.anchors.sp.x, st.lay.anchors.sp.y];
    const valid = () => B === battle && !st.disposed;
    const draw = () => {
      if (!valid()) return;
      const mo = e.monster || battle.lastMo; if (!mo) return;
      battle.ov.replaceChildren(); battle.ov.dataset.phase = battle.busy ? 'resolving' : battle.over ? 'finished' : 'ready';
      battle.ov.dataset.turn = battle.turn; battle.ov.setAttribute('aria-busy', String(battle.busy));
      const hpP = Math.round(mo.hp / mo.maxHp * 100);
      battle.ov.appendChild(el(`<div class="q-bside foe"><div class="q-bname"><b>${esc(m.n)}</b> <span class="q-tag">Nv ${mo.lvl}</span><span class="q-tag">${esc(m.el)}</span>${mo.tier && mo.tier !== 'common' ? `<span class="q-tag" style="background:${RCOL[mo.tier]};color:#fff">${esc(mo.tierN)}</span>` : ''}<div class="q-hp ${hpP < 40 ? 'low' : hpP < 75 ? 'mid' : ''}"><i style="width:${hpP}%"></i></div><div class="q-hint" data-enemy-hp>${mo.hp}/${mo.maxHp}</div></div></div>`));
      battle.ov.appendChild(st.c);
      battle.ov.appendChild(el(`<div class="q-bside me"><div class="q-bname"><b>${esc(Store.operator() || 'Dresseur')}</b> <span class="q-tag">Nv ${level()}</span><div class="q-hp ${battle.php / maxP < .4 ? 'low' : battle.php / maxP < .75 ? 'mid' : ''}"><i style="width:${Math.round(battle.php / maxP * 100)}%"></i></div><div class="q-hint" data-player-hp>${battle.php}/${maxP}</div></div></div>`));
      const log = el('<div class="q-card q-blog" role="log" aria-live="polite"></div>'); battle.log.slice(-3).forEach((l) => log.appendChild(el(`<p class="${l.k}">${esc(l.t)}</p>`))); battle.ov.appendChild(log);
      const menu = el('<div class="q-bmenu"></div>');
      const btn = (label, fn, cls = '') => { const node = el(`<button type="button" class="q-bbtn ${cls}">${label}</button>`); node.disabled = battle.busy; node.addEventListener('click', () => { if (valid() && !battle.busy) fn(); }); return node; };
      if (battle.over && !battle.busy) menu.appendChild(btn('Continuer', () => { B = null; releaseBattle(battle); render(); poolStage?.c.focus({ preventScroll: true }); }, 'p'));
      else if (battle.menu === 'main') {
        ['perche', 'balai', 'robot'].forEach((k) => menu.appendChild(btn(`${MOVES[k][0]}${toolBonus(k) > 1 ? ' ★' : ''}`, () => act(k))));
        menu.appendChild(btn('Autre ▸', () => { battle.menu = 'chem'; draw(); }));
        menu.appendChild(btn(`Fuir · ${Math.round(fleeOdds(mo) * 100)} %`, flee));
      } else { ['choc', 'phm', 'floc', 'lavage'].forEach((k) => menu.appendChild(btn(MOVES[k][0], () => act(k)))); menu.appendChild(btn('◂ retour', () => { battle.menu = 'main'; draw(); })); }
      battle.ov.appendChild(menu);
      if (battle.busy) battle.ov.appendChild(el('<p class="q-busy" role="status">Tour en cours…</p>'));
    };
    function finishTurn() { if (!valid()) return; battle.busy = false; draw(); battle.ov.querySelector('.q-bbtn:not(:disabled)')?.focus({ preventScroll: true }); }
    function rewardWin(mo) {
      if (battle.over) return;
      const b = bonuses(), tier = mtierIdx(mo.tier); battle.over = true; battle.won = true;
      const xp = Math.round(mo.lvl * 4 * (1 + tier * .5) * c.mult * (1 + b.xp / 100));
      const coins = Math.round((2 + Math.floor(Math.random() * 5) + Math.round(mo.lvl / 4)) * (1 + tier * .3) * (1 + b.gold / 100));
      g.xp += xp; g.coins += coins; g.bestiary ||= {}; g.bestiary[mo.id] ||= { seen: 1, beaten: 0 }; g.bestiary[mo.id].beaten++;
      const qty = 1 + tier + Math.floor(mo.lvl / 15); g.res[mo.id] = (g.res[mo.id] || 0) + qty;
      let text = ` · ${qty} × ${RES[mo.id]}`;
      if (Math.random() < .12 * (1 + tier * .6) * (1 + b.drop / 100)) {
        let ti = tier; if (ti < RAR.length - 1 && Math.random() < b.luck / 100) ti++;
        const crate = { id: 'cr-' + Date.now(), crate: true, rar: RAR[ti][0], res: c.p.res, from: m.n, acts: { chem: m.weak.choc >= 1.5 ? 2 : 0, clean: m.weak.balai >= 1.5 ? 2 : 0, filt: m.weak.lavage >= 1.5 ? 2 : 0, mes: 0 }, at: new Date().toISOString() };
        if (g.bag.length < bagSize()) { g.bag.push(crate); text += ` · caisse ${rarName(crate.rar).toLowerCase()} !`; } else text += ' · caisse perdue (sac plein)';
      }
      battle.log.push({ k: 'win', t: `${m.n} vaincu ! +${xp} XP · +${coins} pièces${text}` });
      battle.lastMo = { ...mo }; e.monster = null; save();
    }
    function enemyTurn() {
      if (!valid() || battle.over || !e.monster) return;
      const mo = e.monster, attack = m.atk[Math.floor(Math.random() * m.atk.length)];
      const damage = Math.round(attack[1] * (1 + mo.lvl / 60) * (mo.dmg || 1) * (.85 + Math.random() * .3));
      st.q.push({ k: 'foe', dur: .8, impactAt: .32,
        onStart() { if (valid()) { battle.log.push({ k: 'foe', t: `${m.n} prépare ${attack[0]}…` }); draw(); } },
        onImpact() { if (!valid()) return; battle.php = Math.max(0, battle.php - damage); battle.heroHit = st.time; battle.log.push({ k: 'foe', t: `${attack[0]} — ${attack[2]} · −${damage}` });
          if (!battle.php) { battle.over = true; battle.lost = true; g.coins = Math.max(0, g.coins - 3); mo.hp = mo.maxHp; mo.engaged = false; battle.log.push({ k: 'foe', t: 'Tu es assommé. Il reste là, remis à neuf, jusqu’au prochain passage. −3 pièces' }); save(); } draw(); },
        onEnd() { if (!valid()) return; if (battle.lost) st.q.push({ k: 'player-defeat', dur: .6, onEnd() { if (valid()) { battle.playerVisible = false; finishTurn(); } } }); else finishTurn(); },
      });
    }
    function act(k) {
      if (!valid() || battle.busy || battle.over || !e.monster) return;
      const mo = e.monster, eff = m.weak[k] || 1;
      const damage = Math.round(MOVES[k][1] * eff * toolBonus(k) * (.85 + Math.random() * .3));
      battle.busy = true; battle.turn++; battle.menu = 'main'; battle.log.push({ k: 'me', t: `${MOVES[k][0].toUpperCase()}…` }); draw();
      st.q.push({ k: 'player-action', move: k, dur: .8, impactAt: .4,
        onImpact() { if (!valid() || e.monster !== mo) return; mo.hp = Math.max(0, mo.hp - damage); battle.enemyHit = st.time; battle.log.push({ k: 'me', t: `${MOVES[k][0].toUpperCase()} · −${damage}${eff >= 1.8 ? ' — c’est super efficace !' : eff <= .6 ? ' — ça ne lui fait pas grand-chose.' : ''}` }); if (!mo.hp) rewardWin(mo); save(); draw(); },
        onEnd() { if (!valid()) return; if (battle.won) st.q.push({ k: 'dissolve', dur: .6, onEnd() { if (!valid()) return; battle.enemyVisible = false; st.q.push({ k: 'victory', dur: .68, onEnd: finishTurn }); } }); else enemyTurn(); },
      });
    }
    function flee() {
      if (!valid() || battle.busy || battle.over || !e.monster) return;
      const mo = e.monster, success = Math.random() < fleeOdds(mo); battle.busy = true; battle.turn++; battle.log.push({ k: 'me', t: 'Tu tentes de fuir…' }); draw();
      st.q.push({ k: 'flee', dur: .52, onEnd() { if (!valid()) return; if (success) { battle.over = true; battle.fled = true; battle.lastMo = { ...mo }; e.monster = null; battle.playerVisible = false; battle.enemyVisible = false; battle.log.push({ k: 'foe', t: `Tu files. ${m.n} disparaît dans ${c.name} — son butin avec.` }); save(); finishTurn(); } else { battle.log.push({ k: 'foe', t: 'Impossible de fuir !' }); draw(); enemyTurn(); } } });
    }
    draw(); battle.ov.querySelector('.q-bbtn')?.focus({ preventScroll: true });
  }

  // One persistent map stage per visited pool; repainting the app does not reset it.
  function stage(draw) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 192; c.className = 'q-stage';
    const host = el('<div class="q-map-stage"></div>'); host.appendChild(c);
    const timeline = new Motion.Timeline();
    const sc = { c, host, timeline, q: timeline.jobs, time: 0, hc: [8, 9], hx: 128, hy: 136, direction: 'south', moving: false, disposed: false, created: performance.now() };
    let previous = performance.now(), accumulated = 0, connected = false, raf;
    sc.dispose = () => { if (sc.disposed) return; sc.disposed = true; timeline.cancel(); cancelAnimationFrame(raf); closeMapMenu(sc, false); sc.cleanup?.(); };
    const loop = (now) => {
      if (sc.disposed) return;
      const dt = Math.min(.1, Math.max(0, (now - previous) / 1000)); previous = now;
      if (c.isConnected) connected = true; else if (connected || now - sc.created > 3000) { sc.dispose(); return; }
      if (!document.hidden && !(sc === poolStage && B)) {
        accumulated += dt;
        if (accumulated >= .075) {
          const step = accumulated; accumulated = 0; sc.time += step;
          const { action, progress } = timeline.advance(step); sc.action = action; sc.progress = progress;
          if (sc.disposed) return;
          const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false; draw(ctx, sc.time, sc, action, progress); timeline.finish();
          host.dataset.moving = String(sc.moving); host.dataset.queued = String(sc.q.length);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return sc;
  }
  const T = 16;
  const cellPx = (cx, cy) => [cx * T, cy * T - 8];
  function queueWalk(sc, to) {
    const job = { k: 'walk', to: to.slice(), dur: .08,
      onStart() { job.path = PoolMaps.route(sc.lay.coll, sc.hc, job.to); job.dur = Math.max(.08, (job.path.length - 1) * .16); },
      onEnd() { sc.hc = (job.path?.at(-1) || sc.hc).slice(); sc.moving = false; },
    };
    sc.q.push(job);
  }
  const HABITAT = { algue: 'water', moutarde: 'water', locataire: 'water', calcaire: 'deck', feuilles: 'grass', aiguille: 'grass', gland: 'grass', moustique: 'shed', filtre: 'shed', sable: 'sand' };
  function habitatCells(L, hab) {
    const out = [], fallback = [];
    const near = (x, y) => L.objects.some((o) => ['shed', 'pump'].includes(o.kind) && x >= o.x - 1 && x <= o.x + o.w && y >= o.y - 1 && y <= o.y + o.h);
    for (let y = 0; y < PoolMaps.H; y++) for (let x = 0; x < PoolMaps.W; x++) {
      const ground = L.ground[y][x], blocked = L.coll[y][x]; if (!blocked) fallback.push([x, y]);
      if (hab === 'water' && ground === 'water' && x < PoolMaps.W - 1 || !blocked && (hab === 'deck' && ground === L.deckTile || hab === 'grass' && ground === 'grass' || hab === 'sand' && ground === 'sand' || hab === 'shed' && near(x, y))) out.push([x, y]);
    }
    return out.length ? out : fallback;
  }
  function drawPoolBg(ctx, c, t, sc) {
    PA.map(ctx, sc.lay, { state: c.state, sunk: c.sunk, dirt: c.s?.dirt, t, pumpLate: c.filtre > c.interval, drawWater: (...args) => Motion.water(...args) });
  }
  function drawHero(ctx, sc, a, progress, options = {}) {
    const g = load();
    if (a?.k === 'walk' && a.path?.length > 1) {
      const f = progress * (a.path.length - 1), i = Math.min(a.path.length - 2, Math.floor(f)), part = f - i;
      const [ax, ay] = cellPx(...a.path[i]), [bx, by] = cellPx(...a.path[i + 1]);
      sc.hx = Math.round(ax + (bx - ax) * part); sc.hy = Math.round(ay + (by - ay) * part); sc.hc = a.path[i].slice(); sc.moving = true;
      sc.direction = bx > ax ? 'east' : bx < ax ? 'west' : by < ay ? 'north' : 'south';
    } else { [sc.hx, sc.hy] = cellPx(...sc.hc); sc.moving = false; }
    const motion = options.motion || (sc.moving ? 'walk' : a && ['test', 'wash'].includes(a.k) ? 'crouch' : a && a.k !== 'walk' ? 'cast' : 'idle');
    const elapsed = options.elapsed ?? (motion === 'idle' || motion === 'walk' ? sc.time * 1000 : sc.timeline.elapsed * 1000);
    const foot = [sc.hx + 8, sc.hy + 23], active = motion === 'idle' && options.alive !== false;
    if (active) Motion.setAura(ctx, g.equip, 'back', sc.time * 1000, ...foot);
    Motion.keeper(ctx, ...foot, g.avatar, g.equip, { motion, direction: options.direction || sc.direction, elapsed, offset: options.offset, applyOffset: !!options.applyOffset });
    if (active) Motion.setAura(ctx, g.equip, 'front', sc.time * 1000, ...foot);
  }
  function drawMonster(ctx, t, sc, e) {
    const mo = e?.monster; if (!mo) { sc.moPos = null; return; }
    const L = sc.lay, hab = HABITAT[mo.id] || 'grass', cells = habitatCells(L, hab); if (!cells.length) return;
    if (!mo.cell || !cells.some(([x, y]) => x === mo.cell[0] && y === mo.cell[1])) { mo.cell = cells[Math.floor(Math.random() * cells.length)]; save(); }
    if (sc.monsterRef !== mo) { sc.monsterRef = mo; sc.moSpawnTime = t; sc.moFrom = null; sc.nextMove = t + 2 + Math.random() * 3; }
    if (t >= sc.nextMove) { sc.nextMove = t + 3 + Math.random() * 4; const adjacent = cells.filter(([x, y]) => Math.abs(x - mo.cell[0]) + Math.abs(y - mo.cell[1]) === 1); if (adjacent.length) { sc.moFrom = mo.cell.slice(); sc.moT = t; mo.cell = adjacent[Math.floor(Math.random() * adjacent.length)]; save(); } }
    let [cx, cy] = mo.cell; const moving = !!sc.moFrom && t - sc.moT < .5;
    if (moving) { const f = (t - sc.moT) / .5; cx = sc.moFrom[0] + (cx - sc.moFrom[0]) * f; cy = sc.moFrom[1] + (cy - sc.moFrom[1]) * f; }
    let x = cx * T + 8, y = cy * T + 15;
    if (hab === 'water') { const p = L.pool; x = Math.max(p.x * T + 14, Math.min((p.x + p.w) * T - 14, x)); y = Math.max(p.y * T + 23, Math.min((p.y + p.h) * T - 1, y)); }
    const motion = t - sc.moSpawnTime < .54 ? 'spawn' : 'idle';
    const tier = Motion.tiers.includes(mo.tier) ? mo.tier : 'common', auraOptions = { moving, action: motion !== 'idle' };
    Motion.aura(ctx, 'rarity-' + tier, 'back', t * 1000, x, y, auraOptions);
    Motion.monster(ctx, mo.id, motion, motion === 'spawn' ? (t - sc.moSpawnTime) * 1000 : t * 1000, x, y, { offset: [0, 0] });
    Motion.aura(ctx, 'rarity-' + tier, 'front', t * 1000, x, y, auraOptions);
    sc.moPos = [x - 14, y - 23]; sc.moMoving = moving;
  }
  function drawPool(ctx, t, sc, a, progress, c, e) {
    drawPoolBg(ctx, c, t, sc); drawMonster(ctx, t, sc, e); drawHero(ctx, sc, a, progress);
    if (a && a.k !== 'walk') {
      const pool = sc.lay.pool, anchor = a.k === 'wash' ? sc.lay.anchors.pu : a.k === 'test' ? sc.lay.anchors.la : a.k === 'drop' ? sc.lay.anchors.sk : null;
      const point = anchor ? [anchor.x * T + 8, anchor.y * T + 4] : [pool.x * T + pool.w * 8, pool.y * T + pool.h * 8];
      Motion.draw(ctx, 'fx/service/' + a.k, sc.timeline.elapsed * 1000, ...point);
    }
    if (a?.k === 'walk') { const [x, y] = a.path?.at(-1) || sc.hc; ctx.strokeStyle = '#fffbe9'; ctx.lineWidth = 1; ctx.strokeRect(x * T + 3, y * T + 3, 10, 10); }
  }
  function drawBattle(ctx, t, sc, c, mo, g, battle, a, progress) {
    if (!mo) return; drawPoolBg(ctx, c, t, sc);
    const p = sc.lay.pool, foot = [p.x * T + p.w * 8, p.y * T + p.h * 8 + 21], elapsed = sc.timeline.elapsed * 1000;
    const k = a?.k;
    let enemyMotion = k === 'dissolve' ? 'defeat' : k === 'foe' ? 'attack' : battle.enemyHit != null && t - battle.enemyHit < .36 ? 'hit' : 'idle';
    const enemyTime = enemyMotion === 'hit' ? (t - battle.enemyHit) * 1000 : enemyMotion === 'idle' ? t * 1000 : elapsed;
    if (battle.enemyVisible) {
      const tier = Motion.tiers.includes(mo.tier) ? mo.tier : 'common';
      if (enemyMotion === 'idle' && mo.hp > 0) Motion.aura(ctx, 'rarity-' + tier, 'back', t * 1000, ...foot, { scale: 2 });
      Motion.monster(ctx, mo.id, enemyMotion, enemyTime, ...foot, { scale: 2 });
      if (enemyMotion === 'idle' && mo.hp > 0) Motion.aura(ctx, 'rarity-' + tier, 'front', t * 1000, ...foot, { scale: 2 });
    }
    if (battle.playerVisible) {
      const hit = battle.heroHit != null && t - battle.heroHit < .36;
      const motion = k === 'player-defeat' ? 'defeat' : k === 'flee' ? 'flee' : k === 'victory' ? 'victory' : hit ? 'hit' : k === 'player-action' ? 'cast' : 'idle';
      drawHero(ctx, sc, null, 0, { motion, direction: k === 'flee' ? 'east' : 'north', elapsed: hit ? (t - battle.heroHit) * 1000 : motion === 'idle' ? t * 1000 : elapsed, applyOffset: true, alive: battle.php > 0 });
    }
    if (k === 'player-action' && elapsed >= 80) Motion.draw(ctx, 'fx/action/' + a.move, elapsed - 80, foot[0], foot[1] - 23, { scale: 1 });
    if (k === 'foe' && elapsed >= 260 && elapsed < 680) Motion.draw(ctx, 'fx/event/impact', elapsed - 260, sc.hx + 8, sc.hy + 12);
  }

  function closeMapMenu(sc, focus = true) {
    if (!sc?.menu) return;
    sc.menuRestore?.(); sc.menuRestore = null; sc.menu.remove(); sc.menu = null;
    if (focus && sc.c.isConnected) sc.c.focus({ preventScroll: true });
  }
  function positionMenu(sc) {
    if (!sc.menu || !sc.c.isConnected) return;
    const canvas = sc.c.getBoundingClientRect(), host = sc.host.getBoundingClientRect();
    const x = canvas.left - host.left + sc.menuPoint[0] / 256 * canvas.width, y = canvas.top - host.top + sc.menuPoint[1] / 192 * canvas.height;
    sc.menu.style.maxHeight = Math.max(100, canvas.height - 12) + 'px';
    const width = sc.menu.offsetWidth, height = sc.menu.offsetHeight;
    const left = Math.max(5, Math.min(canvas.width - width - 5, x + 8));
    const top = Math.max(5, Math.min(canvas.height - height - 5, y + 8));
    sc.menu.style.left = left + 'px'; sc.menu.style.top = top + 'px';
  }
  function showMapMenu(sc, title, rows, point, back) {
    closeMapMenu(sc, false); if (sc.disposed) return;
    sc.menuPoint = point || sc.menuPoint || [128, 96];
    const menu = sc.menu = el(`<div class="q-map-menu" role="dialog" aria-label="${esc(title)}"><div class="q-map-menu-head"><span>${esc(title)}</span><button type="button" class="q-map-close" aria-label="Fermer le menu">×</button></div><div class="q-map-menu-body"></div></div>`);
    menu.querySelector('.q-map-close').addEventListener('click', () => closeMapMenu(sc));
    const body = menu.querySelector('.q-map-menu-body');
    if (back) rows = [{ label: '◂ Retour', run: back }, ...rows];
    rows.forEach((row) => {
      if (row.node) { body.appendChild(row.node); return; }
      const button = el(`<button type="button" class="q-map-option">${esc(row.label)}${row.next ? '<span aria-hidden="true">▸</span>' : ''}</button>`);
      button.disabled = !!row.disabled; if (row.id) button.dataset.mapAction = row.id;
      button.addEventListener('click', () => { if (!button.disabled && sc.menu === menu && !sc.disposed) { if (!row.next) button.disabled = true; row.run?.(); if (sc.menu === menu && !row.disabled) button.disabled = false; } }); body.appendChild(button);
    });
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeMapMenu(sc); }
      if (['ArrowDown', 'ArrowUp'].includes(event.key) && event.target.tagName === 'BUTTON') { const buttons = [...menu.querySelectorAll('button:not(:disabled)')]; const i = buttons.indexOf(document.activeElement); event.preventDefault(); buttons[(i + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus(); }
    });
    sc.host.appendChild(menu); positionMenu(sc);
    (menu.querySelector('.q-map-option:not(:disabled)') || menu.querySelector('input, textarea, button'))?.focus({ preventScroll: true });
  }
  function runMapControl(sc, selector) {
    const poolId = sc.poolId; closeMapMenu(sc, false);
    if (sc.disposed || load().enc?.poolId !== poolId) return;
    const control = document.querySelector(selector); if (!control || control.disabled) return;
    control.click(); poolStage?.c.focus({ preventScroll: true });
  }
  function mapMenu(sc, kind, point) {
    const { p, render } = sc.context; const root = () => mapMenu(sc, kind, sc.menuPoint);
    if (kind === 'monster') {
      const mo = sc.context.e?.monster; if (!mo) return;
      showMapMenu(sc, `${MON[mo.id].n} · Nv ${mo.lvl}`, [{ label: 'Attaquer', id: 'attack', run: () => { closeMapMenu(sc, false); openBattle(render); } }], point); return;
    }
    if (kind === 'pool') {
      showMapMenu(sc, `${p.res} ${p.unit} · Bassin`, [
        { label: 'Nettoyage', id: 'cleaning', next: true, run: () => {
          const rows = [...document.querySelectorAll('.clean-btn')].map((b) => ({ label: (b.classList.contains('done') ? '✓ ' : '') + b.textContent.trim(), disabled: b.classList.contains('done'), id: 'clean-' + b.dataset.task, run: () => runMapControl(sc, `.clean-btn[data-task="${b.dataset.task}"]`) }));
          showMapMenu(sc, 'Nettoyage', rows, null, root);
        } },
        { label: 'Chimie', id: 'chemistry', next: true, run: () => {
          const quantity = el('<label class="q-map-quantity"><span>Quantité</span><input type="text" inputmode="decimal" pattern="[0-9.,]*" aria-label="Quantité de produit"></label>');
          const input = quantity.querySelector('input'); input.value = document.querySelector('.treat-qty')?.value || '1';
          const rows = [...document.querySelectorAll('.treat-btn')].map((b) => ({ label: b.querySelector('span').textContent, id: 'treat-' + b.dataset.productId, run: () => { if (!input.checkValidity()) { input.reportValidity(); return; } const q = document.querySelector('.treat-qty'); if (q) q.value = input.value; runMapControl(sc, `.treat-btn[data-product-id="${b.dataset.productId}"]`); } }));
          showMapMenu(sc, 'Chimie', [{ node: quantity }, ...rows], null, root);
        } },
        { label: 'Actions', id: 'actions', next: true, run: () => showMapMenu(sc, 'Actions', [{ label: 'Saisir une mesure', id: 'reading', next: true, run: () => mapReading(sc, root) }, { label: 'Filtration', id: 'filter', next: true, run: () => mapMenu(sc, 'filter', sc.menuPoint) }], null, root) },
      ], point); return;
    }
    if (kind === 'filter' || kind === 'shed') {
      showMapMenu(sc, kind === 'filter' ? 'Filtre' : 'Local technique', [
        { label: 'Laver le filtre', id: 'backwash', run: () => runMapControl(sc, '[data-pool-action="backwash"]') },
        { label: 'Sable du filtre', id: 'sand', next: true, run: () => mapSand(sc, root) },
        { label: 'Note du local', id: 'pump-note', next: true, run: () => mapPumpNote(sc, root) },
      ], point); return;
    }
    showMapMenu(sc, `${p.res} ${p.unit}`, [{ label: 'Volets fermés', disabled: true }], point);
  }
  function mapReading(sc, back) {
    const form = document.querySelector('.reading-form'); if (!form) return;
    const parent = form.parentNode, next = form.nextSibling, poolId = sc.poolId;
    const before = Store.readingsFor(poolId).length;
    showMapMenu(sc, 'Mesure de l’eau', [{ node: form }], null, back);
    const submitted = () => { queueMicrotask(() => { if (Store.readingsFor(poolId).length > before) closeMapMenu(sc); }); };
    form.addEventListener('submit', submitted);
    sc.menuRestore = () => { form.removeEventListener('submit', submitted); if (parent.isConnected) parent.insertBefore(form, next?.parentNode === parent ? next : null); else form.remove(); };
    positionMenu(sc); form.querySelector('input')?.focus({ preventScroll: true });
  }
  function mapPumpNote(sc, back) {
    const box = el('<form class="q-map-form"><label>Note du local<textarea rows="3" aria-label="Note du local"></textarea></label><button type="submit" class="q-map-option">Enregistrer</button></form>');
    box.querySelector('textarea').value = document.querySelector('.pump-notes')?.value || '';
    box.addEventListener('submit', (event) => { event.preventDefault(); const original = document.querySelector('.pump-notes'); if (original) { original.value = box.querySelector('textarea').value; original.dispatchEvent(new Event('change', { bubbles: true })); } closeMapMenu(sc); });
    showMapMenu(sc, 'Note du local', [{ node: box }], null, back);
  }
  function mapSand(sc, back) {
    const button = document.querySelector('[data-pool-action="sand"]'); if (!button) return;
    button.click(); const legacy = document.querySelector('.sheet-back:last-of-type'), original = legacy?.querySelector('input[type="date"]');
    if (!original) { legacy?.remove(); return; }
    const form = el('<form class="q-map-form"><label>Sable changé le<input type="date" aria-label="Date du sable"></label><button type="submit" class="q-map-option">Enregistrer</button></form>');
    form.querySelector('input').value = original.value; legacy.remove();
    form.addEventListener('submit', (event) => { event.preventDefault(); original.value = form.querySelector('input').value; original.dispatchEvent(new Event('change', { bubbles: true })); closeMapMenu(sc); sc.context.render(); });
    showMapMenu(sc, 'Sable du filtre', [{ node: form }], null, back);
  }
  function tapStage(sc, ev) {
    if (sc.menu) { closeMapMenu(sc); return; }
    if (B || sc.disposed) return;
    const r = sc.c.getBoundingClientRect(), mx = (ev.clientX - r.left) / r.width * 256, my = (ev.clientY - r.top) / r.height * 192;
    const L = sc.lay, point = [mx, my], inRect = (x, y, w, h) => mx >= x && mx < x + w && my >= y && my < y + h;
    if (sc.context.e?.monster && sc.moPos && inRect(sc.moPos[0] - 3, sc.moPos[1] - 3, 34, 30)) { mapMenu(sc, 'monster', point); return; }
    const tx = Math.floor(mx / T), ty = Math.floor(my / T);
    const object = L.objects.find((o) => ['pump', 'shed', 'villa'].includes(o.kind) && tx >= o.x && tx < o.x + o.w && ty >= o.y && ty < o.y + o.h);
    if (object) { mapMenu(sc, object.kind === 'pump' ? 'filter' : object.kind, point); return; }
    const d = L.deck;
    if (tx >= d.x && tx < d.x + d.w && ty >= d.y && ty < d.y + d.h) { mapMenu(sc, 'pool', point); return; }
    if (L.coll[ty]?.[tx] === 0) queueWalk(sc, [tx, ty]);
  }
  function configurePoolStage(sc) {
    const depot = sc.kind === 'depot';
    sc.c.tabIndex = 0; sc.c.setAttribute('aria-label', depot ? 'Carte du dépôt. Touchez l’atelier, les caisses ou les casiers. Flèches pour marcher, Entrée pour les actions.' : 'Carte interactive. Touchez le bassin, le filtre ou un monstre. Flèches pour marcher, Entrée pour les actions.');
    sc.c.addEventListener('click', (event) => depot ? tapDepotStage(sc, event) : tapStage(sc, event));
    sc.c.addEventListener('keydown', (event) => {
      if (B || sc.disposed) return;
      if (event.key === 'Escape') { closeMapMenu(sc); return; }
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); const point = [sc.hc[0] * T + 8, sc.hc[1] * T]; if (depot) depotMenu(sc, 'root', point); else mapMenu(sc, 'pool', point); return; }
      const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[event.key];
      if (d && !B) { event.preventDefault(); const to = [sc.hc[0] + d[0], sc.hc[1] + d[1]]; if (!sc.q.length && sc.lay.coll[to[1]]?.[to[0]] === 0) queueWalk(sc, to); }
    });
    // The shortcut handles its own toggle on click; closing on pointerdown would reopen it.
    const outside = (event) => { if (sc.menu && !sc.host.contains(event.target) && !sc.shortcut?.contains(event.target)) closeMapMenu(sc, false); };
    const escape = (event) => { if (sc.menu && event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); closeMapMenu(sc); } };
    const resize = () => positionMenu(sc); document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape); window.addEventListener('resize', resize);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize); observer?.observe(sc.c);
    sc.cleanup = () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('resize', resize); observer?.disconnect(); };
  }
  function drawDepot(ctx, t, sc, action, progress) {
    if (!Motion.draw(ctx, 'scene/depot', 0, 0, 0)) {
      PA.lay(ctx, 'slab', 0, 0, 256, 192);
      sc.lay.coll.forEach((row, y) => row.forEach((blocked, x) => { if (blocked) { ctx.fillStyle = '#527990'; ctx.fillRect(x * 16, y * 16, 16, 16); } }));
    }
    drawHero(ctx, sc, action, progress);
    if (sc.context.nCr && action?.k !== 'reward') Motion.draw(ctx, 'loot/common/drop', 650, 159, 77, { offset: [0, 0] });
    if (action?.k === 'reward') Motion.draw(ctx, 'loot/' + (action.rarity || 'common') + '/drop', sc.timeline.elapsed * 1000, sc.hx + 8, sc.hy - 6);
    if (action?.k === 'craft') Motion.draw(ctx, 'fx/event/critical', sc.timeline.elapsed * 1000, 106, 53);
    if (action?.k === 'sell') Motion.draw(ctx, 'fx/event/coin', sc.timeline.elapsed * 1000, sc.hx + 8, sc.hy);
    if (action?.k === 'walk') { const [x, y] = action.to; ctx.strokeStyle = '#fffbe9'; ctx.strokeRect(x * 16 + 3, y * 16 + 3, 10, 10); }
  }

  function depotCelebrate(kind, rarity) {
    const sc = depotStage; if (!sc || sc.disposed) return;
    const a = sc.lay.anchors[kind === 'craft' ? 'bench' : kind === 'sell' ? 'sale' : 'rewards'];
    queueWalk(sc, [a.x, a.y]); sc.q.push({ k: kind, rarity, dur: .8 });
  }

  function mapPanel(sc, title, node, back) {
    const parent = node.parentNode, next = node.nextSibling;
    showMapMenu(sc, title, [{ node }], null, back);
    sc.menuRestore = () => { if (parent.isConnected) parent.insertBefore(node, next?.parentNode === parent ? next : null); else node.remove(); };
    positionMenu(sc);
  }

  function depotMenu(sc, kind, point) {
    const root = () => depotMenu(sc, 'root', sc.menuPoint), g = load();
    const control = selector => { closeMapMenu(sc, false); document.querySelector(selector)?.click(); };
    if (kind === 'root') {
      showMapMenu(sc, 'Dépôt', [{ label: 'Atelier', next: true, id: 'depot-craft', run: () => depotMenu(sc, 'craft') }, { label: 'Récompenses', next: true, id: 'depot-rewards', run: () => depotMenu(sc, 'rewards') }, { label: 'Vendre un objet', next: true, id: 'depot-sale', run: () => depotMenu(sc, 'sale') }, { label: 'Mon équipement', next: true, id: 'depot-bag', run: () => depotMenu(sc, 'bag') }], point); return;
    }
    if (kind === 'bag') {
      closeMapMenu(sc, false); location.hash = '#/quest/bag'; return;
    }
    if (!depotState.at) {
      showMapMenu(sc, 'Dépôt', [{ node: el('<p class="q-hint q-map-note">Rends-toi au dépôt pour récupérer, fabriquer ou vendre.</p>') }, { label: 'Vérifier ma position', id: 'depot-check', run: () => control('[data-depot-check]') }], point, root); return;
    }
    if (kind === 'craft') {
      const form = document.querySelector('[data-depot-craft]'); if (form) { sc.menuPoint = point || sc.menuPoint; mapPanel(sc, 'Atelier', form, root); } return;
    }
    if (kind === 'rewards') {
      const n = rewardDays().reduce((sum, day) => sum + day.crates, 0), room = bagSize() - g.bag.length;
      showMapMenu(sc, 'Récompenses', [{ node: el(`<p class="q-hint q-map-note">${n ? n + ' caisse' + (n > 1 ? 's' : '') + ' en attente · ' + room + ' place' + (room > 1 ? 's' : '') + ' libre' + (room > 1 ? 's' : '') : 'Aucune caisse en attente.'}</p>`) }, { label: 'Récupérer', id: 'depot-claim', disabled: !n || room <= 0, run: () => control('[data-depot-claim]') }], point, root); return;
    }
    const items = g.bag.filter(it => !it.crate);
    showMapMenu(sc, 'Revente', items.length ? items.map(it => ({ label: it.name + ' · ' + (SELL[it.rar] || 1) + ' pièces', id: 'sell-' + it.id, run: () => { const index = load().bag.findIndex(item => item.id === it.id); if (index < 0) return; const coins = sell(index); closeMapMenu(sc, false); if (coins) { sc.context.render(); depotCelebrate('sell'); } } })) : [{ node: el('<p class="q-hint q-map-note">Aucun équipement à vendre dans le sac.</p>') }], point, root);
  }

  function tapDepotStage(sc, event) {
    if (sc.menu) { closeMapMenu(sc); return; } if (sc.disposed) return;
    const r = sc.c.getBoundingClientRect(), x = (event.clientX - r.left) / r.width * 256, y = (event.clientY - r.top) / r.height * 192;
    const spot = sc.lay.hotspots.find(({ rect: [rx, ry, w, h] }) => x >= rx && x < rx + w && y >= ry && y < ry + h);
    if (spot) { depotMenu(sc, spot.kind, [x, y]); return; }
    const to = [Math.floor(x / 16), Math.floor(y / 16)]; if (sc.lay.coll[to[1]]?.[to[0]] === 0) queueWalk(sc, to);
  }

  function monsterBanner(render) {
    const g = load(); const e = g.enc; if (!e || !e.monster) return null;
    const m = MON[e.monster.id];
    const b = el(`<div class="q-card q-mon"><div class="q-head"><div class="q-grow"><b>${esc(m.n)}</b> <span class="q-tag">Nv ${e.monster.lvl}</span><span class="q-tag">${esc(m.el)}</span>${e.monster.tier && e.monster.tier !== 'common' ? `<span class="q-tag" style="background:${RCOL[e.monster.tier]};color:#fff">${esc(e.monster.tierN)}</span>` : ''}<div class="q-hint">rôde dans le bassin — ${esc(m.desc.split('.')[0])}.</div></div></div><button type="button" class="btn q-fight">⚔ Combattre</button></div>`);
    b.querySelector('.q-head').appendChild(monsterSprite(e.monster.id));
    b.querySelector('.q-fight').addEventListener('click', () => openBattle(render));
    return b;
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
    // the state is a gradient of time: the last chlorine dose fades at the
    // product's own pace (stick ~4 d, galet ~3 d, choc ~1.5 d), the visit
    // ages, the filter overruns — the wilder it gets, the more it's worth
    const lastCl = V.find((v) => v.type === 'treatment' && CL[v.productId]);
    const life = lastCl ? ({ 'hth-stick': 4, 'hth-galet': 3, 'hypomen-pro': 1.5 })[lastCl.productId] : 3;
    const fade = lastCl ? daysSince(lastCl.at) / life : 3;
    // Vie: a week without a passage drains it to zero (−100 over 7 days:
    // 4/7 → 43 %, 5/7 → 29 %, 7/7 → sombrée). Calme and traité are the
    // recovering states, sauvage and critique the draining ones.
    const vie = Math.max(0, Math.min(100, Math.round(100 - 100 * humeur / 7)));
    const sunk = vie === 0;
    const st = sunk || vie <= 30 || fade > 2 ? 'critique' : vie <= 57 || fade > 1.2 ? 'sauvage' : (lastCl && fade < 1) ? 'traité' : 'calme';
    const mult = sunk ? 4 : { calme: 1, traité: 1.2, sauvage: 2, critique: 3 }[st];
    return { p, id: p.id, name: `${p.res} ${p.unit}`, line: lineOf(p), level: lvl, vol, last, humeur, faim, filtre, interval, sable, s, hp: H, lastCl, fade, vie, sunk, state: st, mult, wild: st === 'sauvage' || st === 'critique' };
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
    if (!g.enc) { const c0 = creature(Store.pool(poolId)); g.enc = { poolId, since: new Date().toISOString(), state: c0 ? c0.state : 'calme', mult: c0 ? c0.mult : 1, vie: c0 ? c0.vie : 100, seen: { chem: 0, clean: 0, filt: 0, mes: 0 } }; if (g.lurk && g.lurk[poolId]) { g.enc.monster = g.lurk[poolId]; delete g.lurk[poolId]; } save(); }
    // a fight left open (app closed, page changed) — the monster slipped away with its loot
    if (g.enc.monster && g.enc.monster.engaged && !B) { g.enc.escaped = MON[g.enc.monster.id].n; g.enc.monster = null; save(); }
  }
  // Settle the open encounter: real actions → XP, coins, maybe a crate. Nothing done → the creature stays wild, no loot.
  function settle() {
    const g = load(); const e = g.enc; if (!e) return null;
    if (e.monster) { g.bestiary = g.bestiary || {}; g.lurk = g.lurk || {}; g.lurk[e.poolId] = e.monster; } else if (g.lurk) delete g.lurk[e.poolId];
    g.enc = null;
    const p = Store.pool(e.poolId); if (!p) { save(); return null; }
    const acts = kindsFor(e.poolId, e.since); const n = acts.chem + acts.clean + acts.filt + acts.mes;
    g.fights++;
    let out = { pool: `${p.res} ${p.unit}`, n, xp: 0, coins: 0, crate: null };
    const vie0 = e.vie != null ? e.vie : 100;
    if (n && vie0 === 0 && n < 2) { out.n = 0; out.sunk = true; }     // one gesture doesn't raise the dead
    if (out.n) {
      const c = creature(p); const b = bonuses(); const mult = e.mult || c.mult;
      out.state = e.state || c.state; out.mult = mult; out.resurrected = vie0 === 0;
      out.xp = Math.round((8 + c.level + n * 2) * mult * (1 + b.xp / 100));
      out.coins = Math.round((3 + Math.floor(Math.random() * 6) + n * 2) * (1 + b.gold / 100));
      g.xp += out.xp; g.coins += out.coins; g.wins++; g.calmed[p.id] = new Date().toISOString();
      // a pool kept full drops better crates (×1.3 at 100 % Vie, ×0.7 when found empty)
      const r = Math.random() / (1 + b.drop / 100) / (0.7 + 0.6 * vie0 / 100); let acc = 0, ti = -1;
      for (let i = RAR.length - 1; i >= 0; i--) { acc += RAR[i][2]; if (r < acc) { ti = i; break; } }
      if (ti >= 0 && ti < RAR.length - 1 && Math.random() < b.luck / 100) ti++;
      const tier = ti >= 0 ? RAR[ti][0] : null;
      if (tier) {
        const crate = { id: 'cr-' + Date.now() + '-' + Math.floor(Math.random() * 1e6), crate: true, rar: tier, res: p.res, from: out.pool, acts, at: new Date().toISOString() };
        if (g.bag.length < bagSize()) { g.bag.push(crate); out.crate = crate; } else out.crate = { lost: true, rar: tier };
      }
    }
    if (!n && g.calmed[p.id] && daysSince(g.calmed[p.id]) < 0.1) out.quiet = true; // just calmed, came back — no nag
    if (e.escaped) { out.escaped = e.escaped; out.quiet = false; }
    g.pending = out; save();
    return out;
  }
  function openCrate(i) {
    const g = load(); const cr = g.bag[i]; if (!cr || !cr.crate) return null;
    const a = cr.acts || { chem: 0, clean: 0, filt: 0, mes: 0 };
    const pool = [].concat(Array(1 + a.mes * 3).fill('tête'), Array(1 + a.chem * 2).fill('amulette'), Array(1 + a.chem).fill('torse'), Array(1 + a.clean * 2).fill('balai'), Array(1 + a.clean).fill('pieds'), Array(1 + a.clean).fill('jambes'), Array(1 + a.filt * 2).fill('perche'), Array(1 + a.filt + a.clean).fill('robot'));
    const slot = pool[Math.floor(Math.random() * pool.length)];
    // a crate opens at its own rarity, one tier better one time in ten (+ luck)
    let ri = RAR.findIndex((x) => x[0] === cr.rar); if (Math.random() < 0.1 + bonuses().luck / 100 && ri < RAR.length - 1) ri++;
    const res = cr.res || Object.keys(ZSETS)[Math.floor(Math.random() * 5)];
    const it = makeItem(res, slot, RAR[ri][0], cr.from);
    g.bag[i] = it; g.coins += 1; save();
    return it;
  }
  // pre-catalogue items (v0.80) get a wardrobe and affixes on first load
  function migrateItems() {
    const g = load(); let changed = false;
    const fix = (it) => { if (it && !it.crate && !it.affixes) { const n = makeItem(it.res || Object.keys(ZSETS)[Math.floor(Math.random() * 5)], it.slot, it.rar, it.from); Object.assign(it, n, { id: it.id }); changed = true; } };
    g.bag.forEach(fix); Object.values(g.equip).forEach(fix);
    if (changed) save();
  }
  // ---------------------------------------------------------------- daily rewards: steady maintenance pays out at the dépôt
  // Every past day with four or more pools seen (a visit or a reading, by
  // anyone) leaves one crate at the dépôt, two from twelve pools. The dépôt
  // keeps a week of them; the fleet's average Vie on the day you collect
  // decides how good they are.
  function rewardDays() {
    const g = load(); const today = day(new Date().toISOString()); const weekAgo = day(new Date(Date.now() - 7 * 864e5).toISOString());
    const from = (g.rewardFrom || '') > weekAgo ? g.rewardFrom : weekAgo; const days = {}; const D = Store.load();
    const add = (r) => { if (r.deleted) return; const d = day(r.at); if (d >= from && d < today) { days[d] = days[d] || new Set(); days[d].add(r.poolId); } };
    D.visits.forEach(add); D.readings.forEach(add);
    // a bigger day leaves a better crate: 8 pools → at least peu commun, 12 → at least rare (and two crates)
    return Object.entries(days).filter(([, s]) => s.size >= 4).map(([d, s]) => ({ d, n: s.size, crates: Math.max(0, (s.size >= 12 ? 2 : 1) - (g.rewardClaims?.[d] || 0)), floor: s.size >= 12 ? 2 : s.size >= 8 ? 1 : 0 })).filter(d => d.crates).sort((a, b) => (a.d < b.d ? -1 : 1));
  }
  function claimRewards() {
    const g = load(); if (!depotState.at) return []; const got = []; const b = bonuses();
    const cs = maintained().map(creature); const avg = cs.length ? cs.reduce((a, c) => a + c.vie, 0) / cs.length : 50;
    g.rewardClaims ||= {};
    days: for (const dd of rewardDays()) { for (let i = 0; i < dd.crates; i++) {
      if (g.bag.length >= bagSize()) break days;
      const r = Math.random() / (0.7 + 0.6 * avg / 100) / (1 + b.drop / 100); let acc = 0, ti = 0;
      for (let k = RAR.length - 1; k >= 1; k--) { acc += RAR[k][2]; if (r < acc) { ti = k; break; } }
      ti = Math.max(ti, dd.floor || 0);
      const crate = { id: 'cr-' + Date.now() + '-' + Math.floor(Math.random() * 1e6), crate: true, rar: RAR[ti][0], res: Object.keys(ZSETS)[Math.floor(Math.random() * 5)], from: 'dépôt · ' + dd.d, acts: { chem: 1, clean: 1, filt: 1, mes: 1 }, at: new Date().toISOString() };
      g.bag.push(crate); got.push(crate); g.rewardClaims[dd.d] = (g.rewardClaims[dd.d] || 0) + 1;
    } }
    // Keep unclaimed crates available when only part of the reward fits.
    const oldest = day(new Date(Date.now() - 7 * 864e5).toISOString());
    Object.keys(g.rewardClaims).filter(d => d < oldest).forEach(d => delete g.rewardClaims[d]);
    save(); return got;
  }
  // ---------------------------------------------------------------- the dépôt: the only place that buys
  const depot = () => (Store.residences() || []).find((r) => r.poi && r.lat != null);
  function distanceM(a, b) { const R = 6371000, toR = (x) => x * Math.PI / 180; const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng); const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
  let depotState = { at: false, dist: null, checked: false, err: null };
  function checkDepot(cb) {
    const d = depot();
    if (!d || !navigator.geolocation) { depotState = { at: false, dist: null, checked: true, err: 'nogps' }; cb(); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const dist = distanceM({ lat: pos.coords.latitude, lng: pos.coords.longitude }, d);
      depotState = { at: dist <= 250, dist, checked: true, err: null }; cb();
    }, () => { depotState = { at: false, dist: null, checked: true, err: 'denied' }; cb(); }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
  }
  function sell(i) { const g = load(); const it = g.bag[i]; if (!it || it.crate || !depotState.at) return 0; const price = SELL[it.rar] || 1; g.bag.splice(i, 1); g.coins += price; save(); return price; }
  // small bottom sheet (the app's classes, so the Pixel frames apply)
  function sheet(title, nodes) {
    const back = el('<div class="sheet-back"></div>'); const sh = el('<div class="sheet"></div>');
    sh.appendChild(el(`<h3>${esc(title)}</h3>`)); nodes.filter(Boolean).forEach((n) => sh.appendChild(n)); back.appendChild(sh);
    back.addEventListener('click', (e) => { if (e.target === back) back.remove(); }); document.body.appendChild(back); return back;
  }
  function itemSheet(it, i, render) {
    const g = load(); const nodes = [];
    const head = el(`<div class="q-item-head"></div>`); head.appendChild(glyph(it.slot, it.rar, 'q-glyph big', it.res));
    head.appendChild(el(`<div><b style="color:${RCOL[it.rar]}">${esc(it.name)}</b><div class="q-hint">${esc(rarName(it.rar))} · ${esc(it.slot)} · panoplie ${esc(setName(it.res))}${it.cursed ? ' · <span style="color:var(--high)">maudit</span>' : ''}</div><div class="q-hint">${esc(it.from ? 'tombé de ' + it.from : '')}</div></div>`));
    nodes.push(head);
    nodes.push(el(`<p class="q-desc">${esc(it.desc || '')}</p>`));
    const aff = el('<div class="q-aff"></div>'); (it.affixes || []).forEach((a) => aff.appendChild(el(`<span class="${a.v < 0 ? 'neg' : ''}">${a.v > 0 ? '+' : ''}${a.v} % ${esc(AFFIX[a.k])}</span>`))); nodes.push(aff);
    if (i != null) {
      const eq = el(`<button class="sheet-item">${esc('Équiper')}</button>`); eq.addEventListener('click', () => { const prev = g.equip[it.slot]; g.equip[it.slot] = it; g.bag.splice(i, 1); if (prev) g.bag.push(prev); save(); back.remove(); render(); }); nodes.push(eq);
      const sl = el(`<button class="sheet-item${depotState.at ? '' : ' dis'}">${depotState.at ? 'Vendre · ' + SELL[it.rar] + ' pièces' : 'Vendre — au dépôt seulement'}</button>`); if (depotState.at) sl.addEventListener('click', () => { sell(i); back.remove(); render(); }); nodes.push(sl);
    } else {
      const un = el('<button class="sheet-item">Ranger dans le sac</button>'); un.addEventListener('click', () => { if (g.bag.length < bagSize()) { g.bag.push(it); delete g.equip[it.slot]; save(); back.remove(); render(); } }); nodes.push(un);
    }
    const back = sheet(it.slot, nodes);
  }

  // ---------------------------------------------------------------- UI: pool section (the encounter card)
  const bar = (label, v, max, txt) => `<div class="q-stat"><span>${esc(label)}</span><span class="q-bar"><i style="width:${Math.min(100, Math.round(v / max * 100))}%"></i></span><span class="q-v">${esc(txt)}</span></div>`;
  function poolSection(p, render) {
    enter(p.id);
    const c = creature(p);
    spawn(c); const g = load(); const acts = kindsFor(p.id, g.enc ? g.enc.since : new Date().toISOString()); const n = acts.chem + acts.clean + acts.filt + acts.mes;
    const STATES = ['calme', 'traité', 'sauvage', 'critique'];
    const box = el(`<div class="q-card${c.sunk ? ' sunk' : ''}">
      <div class="q-head"><div class="q-grow"><b>${esc(c.name)}</b> <span class="q-tag">${esc(c.line.n)}</span><span class="q-tag">Nv ${c.level}</span>
        <div class="q-lbl">Vie <span>${c.vie} %</span></div>
        <div class="q-hp ${c.vie < 30 ? 'low' : c.vie < 58 ? 'mid' : ''}"><i style="width:${c.vie}%"></i></div>
        <div class="q-lbl">État <span>XP ×${c.mult}</span></div>
        <div class="q-state">${STATES.map((k) => `<span class="st-${k}${k === c.state ? ' on' : ''}">${k}</span>`).join('')}</div>
        <div class="q-hint">${c.humeur < 900 ? c.humeur.toFixed(1) + ' j sans passage · −14 %/j' : 'jamais vue'} · ${c.lastCl ? 'chlore il y a ' + daysSince(c.lastCl.at).toFixed(0) + ' j (' + (c.fade > 1 ? 'épuisé' : 'actif') + ')' : 'jamais dosée'} · ${n ? n + ' geste' + (n > 1 ? 's' : '') + ' ce passage' : 'aucun geste'}</div></div>
      </div>
      ${c.sunk ? `<div class="q-sunk">Tu as laissé ${esc(c.name)} sombrer dans les ténèbres. Ressusciter ? — deux gestes réels, XP ×4.</div>` : ''}
      <div class="q-stats">
        ${bar('Faim', c.faim, 40, c.faim.toFixed(0) + ' g/m³/sem')}
        ${bar('Chlore', c.s.cl, 4, c.s.cl.toFixed(1) + ' ppm')}
        ${bar('pH', Math.abs(c.s.ph - 7.3) * 2, 1.2, c.s.ph.toFixed(2))}
        ${bar('Saleté', c.s.dirt, 3, ['propre', 'feuilles', 'sale', 'très sale'][c.s.dirt])}
        ${bar('Filtre', c.filtre, Math.max(c.interval * 2, 1), c.filtre.toFixed(0) + ' j · rythme ' + c.interval.toFixed(0))}
        ${c.sable != null ? bar('Sable', c.sable, 6, c.sable.toFixed(1) + ' ans') : ''}
      </div></div>`);
    box.querySelector('.q-head').appendChild(sprite(p));
    // Reuse the same canvas and queue through normal logging/sync/weather renders.
    const e = g.enc;
    if (!poolStage || poolStage.poolId !== p.id || poolStage.disposed) {
      poolStage?.dispose();
      poolStage = stage((ctx, t, sc, a, pp) => { const data = sc.context; if (data) drawPool(ctx, t, sc, a, pp, data.c, data.e); });
      poolStage.poolId = p.id; poolStage.host.dataset.poolId = p.id;
      poolStage.lay = PoolMaps.get(p.id, p.res); const spawn = poolStage.lay.anchors.sp; poolStage.hc = [spawn.x, spawn.y];
      configurePoolStage(poolStage);
    }
    const st = poolStage, A = st.lay.anchors;
    st.context = { p, c, e, render: render || (() => window.dispatchEvent(new Event('hashchange'))) };
    if (e) {
      const seen = e.seen || { chem: 0, clean: 0, filt: 0, mes: 0 };
      if (acts.chem > seen.chem) { const tr = Store.load().visits.filter((v) => v.poolId === p.id && !v.deleted && v.type === 'treatment' && v.at >= e.since).sort((x, y) => (x.at < y.at ? 1 : -1))[0]; const sticks = tr && CL[tr.productId] && CL[tr.productId] > 1; queueWalk(st, [A.sk.x, A.sk.y]); st.q.push({ k: sticks ? 'drop' : 'scatter', dur: .8 }); }
      if (acts.mes > seen.mes) { queueWalk(st, [A.la.x, A.la.y]); st.q.push({ k: 'test', dur: .8 }); }
      if (acts.clean > seen.clean) { queueWalk(st, [A.la.x, A.la.y]); st.q.push({ k: 'sweep', dur: .8 }); }
      if (acts.filt > seen.filt) { const pu = st.lay.paths.pu; const last = pu[pu.length - 1]; queueWalk(st, last); st.q.push({ k: 'wash', dur: .8 }); }
      e.seen = { ...acts }; save();
    }
    box.insertBefore(st.host, box.querySelector('.q-stats'));
    const hint = el('<div class="q-hint q-maphint"><span>Touche le bassin, le filtre ou un monstre. Touche ailleurs pour fermer.</span><button type="button" class="q-map-shortcut" aria-haspopup="dialog">Actions</button></div>');
    st.shortcut = hint.querySelector('button');
    st.shortcut.addEventListener('click', () => { if (st.menu) closeMapMenu(st); else mapMenu(st, 'pool', [220, 170]); });
    box.insertBefore(hint, box.querySelector('.q-stats'));
    if (e && e.escaped && !e.monster) box.insertBefore(el(`<div class="q-hint">${esc(e.escaped)} s’est enfui pendant que tu avais le dos tourné — son butin avec.</div>`), box.querySelector('.q-stats'));
    const mb = monsterBanner(render || (() => window.dispatchEvent(new Event('hashchange'))));
    if (mb) { const w = document.createElement('div'); w.appendChild(box); w.appendChild(mb); return w; }
    return box;
  }
  // toast after an encounter settles (shown on the next page)
  function toast() {
    const g = load(); const o = g.pending; if (!o) return; g.pending = null; save();
    if (o.quiet) return;
    const parts = o.n ? [`${o.pool} ${o.resurrected ? 'ressuscitée ! (×4)' : 'apaisée' + (o.mult > 1 ? ' (' + o.state + ' ×' + o.mult + ')' : '')}`, `+${o.xp} XP`, `+${o.coins} pièces`] : [o.sunk ? `${o.pool} reste dans les ténèbres — il faut au moins deux gestes` : `${o.pool} reste sauvage — rien de saisi`];
    if (o.crate) parts.push(o.crate.lost ? `caisse ${rarName(o.crate.rar).toLowerCase()} perdue (sac plein)` : `caisse ${rarName(o.crate.rar).toLowerCase()} !`);
    if (o.escaped) parts.push(`${o.escaped} s’est enfui — son butin avec`);
    const tst = el(`<div class="q-toast ${o.n ? 'win' : ''}"><b>${o.n ? '★' : '…'}</b> ${esc(parts.join(' · '))}</div>`);
    document.body.appendChild(tst);
    setTimeout(() => tst.classList.add('show'), 20); setTimeout(() => { tst.classList.remove('show'); setTimeout(() => tst.remove(), 400); }, 4200);
  }

  // ---------------------------------------------------------------- UI: Quête pages
  const QUEST_PAGES = [['depot', 'Dépôt'], ['best', 'Bestiaire'], ['bag', 'Sac'], ['me', 'Dresseur']];
  const questPage = key => QUEST_PAGES.some(([id]) => id === key) ? key : 'depot';
  function view(render, page) {
    const sub = questPage(page);
    const g = load();
    const wrap = document.createElement('div'); wrap.dataset.questPage = sub;
    wrap.appendChild(el(`<div class="page-head"><h1>Quête</h1><p class="sub">Nv ${level()} · ${g.xp} XP · ${g.coins} pièces · ${g.wins} apaisées</p></div>`));
    const seg = el(`<nav class="q-seg" aria-label="Pages de Quête">${QUEST_PAGES.map(([k, l]) => `<a href="#/quest/${k}" data-k="${k}" class="${sub === k ? 'on' : ''}"${sub === k ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`);
    wrap.appendChild(seg);
    ({ depot: viewDepot, best: viewBest, bag: viewBag, me: viewMe })[sub](wrap, render);
    return wrap;
  }
  function viewBest(wrap) {
    const g = load(); const bs = g.bestiary || {};
    wrap.appendChild(el('<p class="q-hint">Ce qui hante une piscine négligée. Chacun naît d’un vrai problème et craint le vrai remède.</p>'));
    Object.entries(MON).forEach(([id, m]) => {
      const seen = bs[id] && bs[id].seen; const card = el(`<div class="q-card q-monrow${seen ? '' : ' unseen'}"><div class="q-head"><div class="q-grow"><b>${seen ? esc(m.n) : '???'}</b> <span class="q-tag">${esc(m.el)}</span><div class="q-hint">${seen ? esc(m.desc) : 'Pas encore rencontré.'}</div>${seen ? `<div class="q-hint">faible contre ${Object.entries(m.weak).filter(([, v]) => v >= 1.5).map(([k]) => MOVES[k][0]).join(', ')} · laisse ${esc(RES[id])} · vu ${bs[id].seen}× · vaincu ${bs[id].beaten}×</div>` : ''}</div></div></div>`);
      card.querySelector('.q-head').appendChild(monsterSprite(id));
      wrap.appendChild(card);
    });
  }
  function viewBag(wrap, render) {
    const g = load(); migrateItems(); const b = bonuses();
    const eq = el(`<div class="q-card${b.aura ? ' aura' : ''}" ${b.aura ? `style="--aura:${ZSETS[b.aura].aura}"` : ''}><div class="q-head"><b class="q-grow">Équipement</b><span class="q-hint">${b.aura ? 'Aura ' + esc(setName(b.aura)) : ''}</span></div><div class="q-equip"></div>
      <div class="q-bon">${['xp', 'gold', 'drop', 'luck'].map((k) => `<span class="${b[k] < 0 ? 'neg' : b[k] > 0 ? 'pos' : ''}">${b[k] > 0 ? '+' : ''}${b[k]} % ${esc(AFFIX[k])}</span>`).join('')}</div></div>`);
    SLOTS.forEach((sl) => {
      const it = g.equip[sl];
      const d = el(`<div class="q-slot${it ? '' : ' empty'}"><span>${sl}</span></div>`);
      if (it) { d.insertBefore(glyph(it.slot, it.rar, null, it.res), d.firstChild); d.appendChild(el(`<span class="q-rr" style="background:${RCOL[it.rar]}"></span>`)); d.title = it.name; d.addEventListener('click', () => itemSheet(it, null, render)); }
      eq.querySelector('.q-equip').appendChild(d);
    });
    wrap.appendChild(eq);
    const sets = el('<div class="q-card"><b>Panoplies</b><div class="q-hint">2 pièces : +5 % XP · 4 : +10 % pièces · 6 : +10 % caisses · 8 : aura, +25 % à tout</div><div class="q-sets"></div></div>');
    Object.entries(ZSETS).forEach(([res, z]) => sets.querySelector('.q-sets').appendChild(el(`<div><span style="color:${z.aura}">${esc(z.n)}</span> <small class="q-hint">${res}</small><br>${b.sets[res] || 0} / 8 portées</div>`)));
    wrap.appendChild(sets);
    // resources: what monsters leave, what the dépôt's workshop takes
    const resEntries = Object.entries(g.res || {}).filter(([, n]) => n > 0);
    const rc = el(`<div class="q-card"><b>Ressources</b> <span class="q-hint">${resEntries.reduce((a, [, n]) => a + n, 0)} au total</span><div class="q-res">${resEntries.length ? resEntries.map(([k, n]) => `<span><i style="background:${RESCOL[k]}"></i>${n} × ${esc(RES[k])}</span>`).join('') : '<span class="q-hint">Vaincs un monstre : il laisse toujours quelque chose.</span>'}</div></div>`);
    wrap.appendChild(rc);

    const size = bagSize(); const cost = upgradeCost();
    const bag = el(`<div class="q-card"><div class="q-head"><b>Sac</b> <span class="q-hint">${g.bag.length} / ${size}</span><span class="q-grow"></span>${g.bagTier < BAG_SIZES.length - 1 ? `<button type="button" class="btn q-up${g.coins >= cost ? '' : ' dis'}">+${BAG_SIZES[g.bagTier + 1] - size} places · ${cost} pièces</button>` : ''}</div><div class="q-slots"></div></div>`);
    const up = bag.querySelector('.q-up'); if (up) up.addEventListener('click', () => { if (g.coins >= cost) { g.coins -= cost; g.bagTier++; save(); render(); } });
    for (let i = 0; i < size; i++) {
      const it = g.bag[i];
      const d = el(`<div class="q-slot${it ? '' : ' empty'}"></div>`);
      if (it && it.crate) { d.appendChild(crateGlyph(it.rar)); d.appendChild(el('<span>caisse</span>')); d.appendChild(el(`<span class="q-rr" style="background:${RCOL[it.rar]}"></span>`)); d.title = `Caisse ${rarName(it.rar).toLowerCase()} · ${it.from}`;
        d.addEventListener('click', () => { const got = openCrate(i); if (got) { render(); const tst = el(`<div class="q-toast win show"><b>📦</b> ${esc(got.name)} · ${esc(rarName(got.rar))} · +1 pièce</div>`); document.body.appendChild(tst); setTimeout(() => tst.remove(), 3500); } }); }
      else if (it) { d.appendChild(glyph(it.slot, it.rar, null, it.res)); d.appendChild(el(`<span>${esc(it.slot)}</span>`)); d.appendChild(el(`<span class="q-rr" style="background:${RCOL[it.rar]}"></span>`)); d.title = `${it.name} · ${it.from}`;
        d.addEventListener('click', () => itemSheet(it, i, render)); }
      bag.querySelector('.q-slots').appendChild(d);
    }
    wrap.appendChild(bag);
    wrap.appendChild(el('<p class="q-hint">Une caisse tombe après un passage où quelque chose a été saisi ; tape-la pour l\'ouvrir — elle contient une pièce de la panoplie de sa zone. Tape un objet pour le voir, l\'équiper ou le vendre au dépôt. Le sac grandit avec les pièces : 8 · 16 · 32 · 64 · 128.</p>'));
  }
  function viewDepot(wrap, render) {
    const g = load(); migrateItems();
    const resEntries = Object.entries(g.res || {}).filter(([, n]) => n > 0);
    // the dépôt buys and crafts — only when you're there
    const dp = el(`<div class="q-card q-depot"><div class="q-head"><div class="q-grow"><b>Dépôt</b><div class="q-hint" id="q-dep-txt">${depotState.checked ? (depotState.at ? 'Tu es au dépôt — vente ouverte' : depotState.err === 'denied' ? 'Position refusée — la vente attend au dépôt' : depotState.err ? 'Pas de GPS ici' : 'À ' + (depotState.dist >= 1000 ? (depotState.dist / 1000).toFixed(1) + ' km' : Math.round(depotState.dist) + ' m') + ' du dépôt — reviens pour vendre') : 'La vente n’est possible qu’au dépôt produits'}</div></div><button type="button" class="btn q-up" data-depot-check>Je suis là ?</button></div></div>`);
    dp.querySelector('button').addEventListener('click', () => { dp.querySelector('#q-dep-txt').textContent = 'Position…'; checkDepot(render); });
    const rd = rewardDays(); const nCr = rd.reduce((a, d) => a + d.crates, 0);
    if (!depotStage || depotStage.disposed) {
      depotStage = stage(drawDepot); depotStage.kind = 'depot'; depotStage.host.dataset.mapKind = 'depot'; depotStage.lay = PoolMaps.depot();
      const spawn = depotStage.lay.anchors.sp; depotStage.hc = [spawn.x, spawn.y]; configurePoolStage(depotStage);
    }
    const ds = depotStage, revision = JSON.stringify([depotState.at, g.coins, g.res, g.bag.map(it => it.id)]);
    if (ds.revision !== revision) closeMapMenu(ds, false); ds.revision = revision; ds.context = { render, nCr };
    dp.appendChild(ds.host);
    const mapHint = el('<div class="q-hint q-maphint"><span>Touche l’atelier, les caisses ou les casiers. Touche le sol pour marcher.</span><button type="button" class="q-map-shortcut" aria-haspopup="dialog">Actions</button></div>');
    ds.shortcut = mapHint.querySelector('button'); ds.shortcut.addEventListener('click', () => ds.menu ? closeMapMenu(ds) : depotMenu(ds, 'root', [200, 140])); dp.appendChild(mapHint);
    const rw = el(`<div class="q-craft"><div class="q-head"><div class="q-grow"><b>Récompenses</b><div class="q-hint">${nCr ? nCr + ' caisse' + (nCr > 1 ? 's' : '') + ' — ' + rd.map((d) => d.d.slice(5) + ' : ' + d.n + ' piscines' + (d.floor ? ' (' + rarName(RAR[d.floor][0]).toLowerCase() + ' min.)' : '')).join(' · ') : 'Une journée à 4 piscines ou plus laisse une caisse ici : peu commun dès 8 piscines, rare et deux caisses dès 12. Le dépôt en garde une semaine.'}</div></div>${nCr ? `<button type="button" class="btn q-up${depotState.at ? '' : ' dis'}">Récupérer</button>` : ''}</div></div>`);
    const rb = rw.querySelector('button'); if (rb) { rb.dataset.depotClaim = ''; rb.disabled = !depotState.at || g.bag.length >= bagSize(); }
    if (rb && depotState.at) rb.addEventListener('click', () => { if (!rb.isConnected) return; const got = claimRewards(); render(); if (got.length) { depotCelebrate('reward', got[0].rar); const tst = el(`<div class="q-toast win show"><b>📦</b> ${got.length} caisse${got.length > 1 ? 's' : ''} : ${esc(got.map((x) => rarName(x.rar).toLowerCase()).join(', '))}</div>`); document.body.appendChild(tst); setTimeout(() => tst.remove(), 3500); } });
    dp.appendChild(rw);
    if (depotState.at) {
      const totalRes = resEntries.reduce((a, [, n]) => a + n, 0);
      const cf = el(`<div class="q-craft"><b>Atelier</b><div class="q-craftrow"><select class="q-cz">${Object.entries(ZSETS).map(([k, z]) => `<option value="${k}">${esc(z.n)}</option>`).join('')}</select><select class="q-cs">${SLOTS.map((sl) => `<option value="${sl}">${sl}</option>`).join('')}</select><select class="q-cr">${RAR.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></div><div class="q-hint q-ccost"></div><button type="button" class="btn q-up q-cbtn">Fabriquer</button></div>`);
      cf.dataset.depotCraft = ''; [['.q-cz', 'Panoplie'], ['.q-cs', 'Emplacement'], ['.q-cr', 'Rareté']].forEach(([selector, label]) => cf.querySelector(selector).setAttribute('aria-label', label));
      const cost = () => { const r = cf.querySelector('.q-cr').value; const [nres, coins] = CRAFT[r]; cf.querySelector('.q-ccost').textContent = `${nres} ressources (tu en as ${totalRes}) + ${coins} pièces (tu en as ${g.coins})${g.bag.length >= bagSize() ? ' · sac plein' : ''}`; cf.querySelector('.q-cbtn').disabled = !depotState.at || totalRes < nres || g.coins < coins || g.bag.length >= bagSize(); };
      cf.querySelectorAll('select').forEach((x) => x.addEventListener('change', cost)); cost();
      cf.querySelector('.q-cbtn').addEventListener('click', () => {
        if (!cf.isConnected) return;
        const r = cf.querySelector('.q-cr').value; const [nres, coins] = CRAFT[r]; if (!depotState.at || Object.values(g.res).reduce((n, v) => n + v, 0) < nres || g.coins < coins || g.bag.length >= bagSize()) return;
        let need = nres; Object.entries(g.res).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => { const take = Math.min(n, need); g.res[k] -= take; need -= take; });
        g.coins -= coins; const it = makeItem(cf.querySelector('.q-cz').value, cf.querySelector('.q-cs').value, r, 'atelier du dépôt'); g.bag.push(it); save(); render(); depotCelebrate('craft');
        const tst = el(`<div class="q-toast win show"><b>🔨</b> ${esc(it.name)} · ${esc(rarName(it.rar))}</div>`); document.body.appendChild(tst); setTimeout(() => tst.remove(), 3500);
      });
      dp.appendChild(cf);
    }
    wrap.appendChild(dp);
  }
  function viewMe(wrap, render) {
    const g = load(); const a = g.avatar;
    const card = el(`<div class="q-card"><div class="q-head"><div class="q-grow"><b style="font-size:1.2rem">${esc(Store.operator() || 'Dresseur')}</b> <span class="q-tag">Nv ${level()}</span><div class="q-hint">${g.xp} XP · ${g.coins} pièces · ${g.wins} apaisées / ${g.fights} passages</div></div></div></div>`);
    const av = avatar(a); card.querySelector('.q-head').appendChild(av);
    const aura = Motion.setAuraState(g.equip); if (aura) card.appendChild(el(`<div class="q-hint">Aura ${esc(setName(aura.set))} · ${esc(rarName(aura.rarity))} · rareté minimale des 8 pièces</div>`));
    wrap.appendChild(card);
    // avatar settings
    const set = el('<div class="q-card"><b>Personnage</b><div class="q-opts"></div></div>');
    const opts = set.querySelector('.q-opts');
    const row = (label, html) => { const r = el(`<div class="q-opt"><span>${label}</span><span class="q-optv"></span></div>`); r.querySelector('.q-optv').innerHTML = html; opts.appendChild(r); return r; };
    const facing = row('Vue', [['south', 'Face'], ['east', 'Droite'], ['north', 'Dos'], ['west', 'Gauche']].map(([direction, name]) => `<button type="button" class="q-pick${avatarDirection === direction ? ' on' : ''}" data-direction="${direction}">${name}</button>`).join(''));
    facing.querySelectorAll('button').forEach(button => button.addEventListener('click', () => { avatarDirection = button.dataset.direction; render(); }));
    const r2 = row('Cheveux', [1, 2, 3].map((h) => `<button type="button" data-v="${h}" class="q-pick${(a.hair === 4 ? 1 : a.hair) === h ? ' on' : ''}">${['—', 'court', 'hérissé', 'long'][h]}</button>`).join(''));
    r2.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { a.hair = +b.dataset.v; save(); render(); }));
    const sw = (key, colors) => { const r = row({ hairColor: 'Couleur', skin: 'Peau' }[key], colors.map((c) => `<button type="button" data-v="${c}" class="q-sw${a[key] === c ? ' on' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')); r.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { a[key] = b.dataset.v; save(); render(); })); };
    sw('hairColor', ['#20203a', '#4a2e1a', '#a8672a', '#e6c35c', '#d82f2f', '#e6e6ff']);
    sw('skin', ['#f6dcc1', '#e8b88a', '#c68d5a', '#8d5a3a', '#5a3a26']);
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
    if (B && !(name === 'pool' && g.enc && poolId === g.enc.poolId)) abandon();
    if (poolStage && (name !== 'pool' || poolStage.poolId !== poolId || document.documentElement.dataset.style !== 'pixel')) { poolStage.dispose(); poolStage = null; }
    if (depotStage && (name !== 'quest' || questPage(poolId) !== 'depot' || document.documentElement.dataset.style !== 'pixel')) { depotStage.dispose(); depotStage = null; }
    if (g.enc && !(name === 'pool' && poolId === g.enc.poolId)) settle();
    if (name !== 'pool') setTimeout(toast, 50);
  }
  window.addEventListener('pagehide', () => { abandon(); poolStage?.dispose(); poolStage = null; depotStage?.dispose(); depotStage = null; if (load().enc) settle(); });

  return { poolSection, view, onRoute, settle, creature, sprite, makeItem, bonuses, ZSETS, MON, MTIER, RES, openBattle, rewardDays, get state() { return load(); } };
})();
window.Game = Game;
