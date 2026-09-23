/* Pure rules for the game layer. Maintenance records never enter these writes. */
const QuestCore = (() => {
  const SLOTS = ['tête', 'torse', 'jambes', 'pieds', 'amulette', 'perche', 'robot', 'balai'];
  const SETS = ['EC', 'AG', 'EP', 'EPP', 'GP'];
  const RARITIES = ['common', 'uncommon', 'rare', 'vrare', 'epic', 'legend'];
  const BAG_SIZES = [8, 16, 32, 64, 128];
  const DEFEAT = Object.freeze({ coinShare: .2, minimumCoins: 10, xpShare: .1, itemChance: .2, attempts: 2 });
  const POTIONS = [
    { id: 'small', name: 'Potion de vie', heal: 40, price: 8 },
    { id: 'large', name: 'Grande potion', heal: 100, price: 20 },
  ];
  const NPCS = [
    { id: 'jojo', name: 'Jojo', job: 'Entretien', action: 'potions', map: 'depot' },
    { id: 'karine', name: 'Karine', job: 'Technicienne', action: 'craft', map: 'depot' },
    { id: 'matt', name: 'Matt', job: 'Jardinier', action: 'sale', map: 'depot' },
    { id: 'jp', name: 'JP', job: 'Réception', action: 'quest', map: 'bureau' },
    { id: 'pj', name: 'PJ', job: 'Direction', action: 'rewards', map: 'bureau' },
    { id: 'partner', name: 'Collègue', job: 'Équipe', action: 'partner', map: 'bureau' },
  ];
  const integer = (n, min = 0, max = 999999) => Math.max(min, Math.min(max, Number.isFinite(+n) ? Math.floor(+n) : min));
  const playerId = name => String(name || '').trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_-]+/g, '-').slice(0, 60) || 'local';
  const counterpart = name => ({ loki: 'dodo', dodo: 'loki' })[playerId(name)] || null;
  const playerName = id => ({ loki: 'Loki', dodo: 'Dodo' })[id] || 'Collègue';
  function dayKey(value = new Date()) {
    const d = value instanceof Date ? value : new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function normalize(g) {
    if (!Array.isArray(g.bag)) g.bag = [];
    if (!g.equip || typeof g.equip !== 'object' || Array.isArray(g.equip)) g.equip = {};
    g.bagTier = integer(g.bagTier, 0, BAG_SIZES.length - 1);
    g.depotPass = g.depotPass === true;
    if (!g.potions || typeof g.potions !== 'object' || Array.isArray(g.potions)) g.potions = {};
    POTIONS.forEach(p => { g.potions[p.id] = integer(g.potions[p.id], 0, 9999); });
    if (!g.dailyQuests || typeof g.dailyQuests !== 'object' || Array.isArray(g.dailyQuests)) g.dailyQuests = {};
    return g;
  }
  const bagCapacity = g => BAG_SIZES[integer(g.bagTier, 0, BAG_SIZES.length - 1)];
  // Resolve identity at action time. A stale menu/index or a repeated click can
  // never remove a different item, overwrite a new outfit, or consume a swap.
  function equipItem(g, id) {
    const index = g.bag.findIndex(it => it.id === id);
    if (!id || index < 0) return false;
    const item = g.bag[index]; if (item.crate || !SLOTS.includes(item.slot)) return false;
    const previous = g.equip[item.slot];
    if (previous?.id === item.id) return false;
    g.bag.splice(index, 1); g.equip[item.slot] = item;
    if (previous) g.bag.splice(index, 0, previous);
    return true;
  }
  function unequipItem(g, slot, id) {
    if (!id || g.equip[slot]?.id !== id || g.bag.length >= bagCapacity(g)) return false;
    g.bag.push(g.equip[slot]); delete g.equip[slot]; return true;
  }
  function sellItem(g, id, price, access) {
    const index = g.bag.findIndex(it => it.id === id);
    if (!access || !id || index < 0 || g.bag[index].crate || !(price > 0)) return 0;
    g.bag.splice(index, 1); g.coins += price; return price;
  }
  function buyDepotPass(g) {
    if (g.depotPass || !(g.coins >= 200)) return false;
    g.coins -= 200; g.depotPass = true; return true;
  }
  function beginBattle(monster) {
    if (!monster || monster.gone || monster.engaged || integer(monster.attempts) >= DEFEAT.attempts) return false;
    monster.attempts = integer(monster.attempts) + 1; monster.engaged = true; return true;
  }
  function loseBattle(g, monster, roll = Math.random(), pick = Math.random()) {
    if (!monster?.engaged || monster.gone) return null;
    monster.engaged = false;
    const coins = Math.min(integer(g.coins), Math.max(DEFEAT.minimumCoins, Math.ceil(integer(g.coins) * DEFEAT.coinShare)));
    const xp = Math.min(integer(g.xp), Math.ceil(integer(g.xp) * DEFEAT.xpShare));
    g.coins -= coins; g.xp -= xp; g.hp = 1;
    let item = null;
    if (monster.attempts === 1 && roll < DEFEAT.itemChance) {
      const eligible = g.bag.filter(it => !it.crate && SLOTS.includes(it.slot));
      item = eligible[Math.min(eligible.length - 1, Math.max(0, Math.floor(pick * eligible.length)))] || null;
      if (item) g.bag.splice(g.bag.indexOf(item), 1);
    }
    const vanished = monster.attempts >= DEFEAT.attempts;
    const lostItem = vanished ? monster.loss?.item || null : item;
    monster.loss = vanished ? null : { coins, xp, item };
    monster.gone = vanished; monster.hp = monster.maxHp;
    return { coins, xp, item: lostItem, vanished };
  }
  function winBattle(g, monster) {
    if (!monster?.engaged || monster.gone) return null;
    const loss = monster.loss || { coins: 0, xp: 0, item: null };
    monster.engaged = false; monster.gone = true; monster.loss = null;
    g.coins += integer(loss.coins); g.xp += integer(loss.xp);
    // Recovered property is allowed to overflow a full bag; the UI shows every
    // owned item and new collections wait until room is available.
    // The resolved combat is the idempotency guard. Do not discard property
    // merely because an older save reused another item's ID.
    if (loss.item) g.bag.push(loss.item);
    return loss;
  }
  function leaveBattle(monster) {
    if (!monster?.engaged || monster.gone) return null;
    monster.engaged = false; monster.hp = monster.maxHp;
    const vanished = integer(monster.attempts) >= DEFEAT.attempts, item = monster.loss?.item || null;
    if (vanished) { monster.gone = true; monster.loss = null; }
    return { vanished, item: vanished ? item : null };
  }
  function freshState() { return normalize({ xp: 0, coins: 0, wins: 0, fights: 0, bag: [], bagTier: 0, equip: {}, calmed: {}, res: {}, avatar: { hair: 1, hairColor: '#4a2e1a', skin: '#e8b88a' }, pending: null, enc: null }); }
  function loadPlayer(storage, name, base = 'lagrange-piscine.quest') {
    const id = playerId(name), key = base + '.player.' + id;
    const read = k => { try { const value = JSON.parse(storage.getItem(k) || 'null'); return value && typeof value === 'object' && !Array.isArray(value) ? value : null; } catch (_) { return null; } };
    let state = read(key);
    if (!state) {
      const claimed = storage.getItem(base + '.legacy-owner');
      if (!claimed || claimed === id || claimed === 'local' && id !== 'local') {
        state = claimed === 'local' ? read(base + '.player.local') || read(base) : read(base);
        try { storage.setItem(base + '.legacy-owner', id); } catch (_) {}
      }
      state ||= freshState();
      try { storage.setItem(key, JSON.stringify(state)); } catch (_) {}
    }
    return { id, key, state: normalize(state) };
  }
  function maxHP(g) {
    const level = Math.floor(Math.sqrt(Math.max(0, +g.xp || 0) / 12)) + 1;
    const armour = SLOTS.slice(0, 4).reduce((sum, slot) => sum + (g.equip?.[slot] ? 8 + (Math.max(0, RARITIES.indexOf(g.equip[slot].rar)) + 1) * 4 : 0), 0);
    return 100 + 4 * (level - 1) + armour;
  }
  function health(g) {
    const max = maxHP(g);
    if (!Number.isFinite(g.hp)) g.hp = max;
    g.hp = integer(g.hp, 1, max);
    return { hp: g.hp, max };
  }
  function buyPotion(g, id) {
    normalize(g); const p = POTIONS.find(p => p.id === id);
    if (!p || !Number.isFinite(g.coins) || g.coins < p.price || g.potions[id] >= 99) return false;
    g.coins -= p.price; g.potions[id]++; return true;
  }
  function usePotion(g, id, currentHP = health(g).hp) {
    normalize(g); const p = POTIONS.find(p => p.id === id), max = maxHP(g), hp = integer(currentHP, 0, max);
    if (!p || !g.potions[id] || hp >= max || hp === 0) return null;
    const healed = Math.min(p.heal, max - hp); g.potions[id]--; g.hp = hp + healed;
    return { healed, hp: g.hp, max };
  }
  function dailyQuest(g, day = dayKey()) { normalize(g); return g.dailyQuests[day] || null; }
  function acceptQuest(g, day = dayKey()) {
    normalize(g); if (g.dailyQuests[day]) return false;
    g.dailyQuests[day] = { day, target: 'algue', goal: 3, progress: 0, claimed: false };
    // Keep recent missions for refresh/reload protection without growing forever.
    Object.keys(g.dailyQuests).sort().slice(0, -14).forEach(key => delete g.dailyQuests[key]);
    return true;
  }
  function recordKill(g, monsterId, day = dayKey()) {
    const q = dailyQuest(g, day);
    if (!q || q.claimed || q.target !== monsterId || q.progress >= q.goal) return false;
    q.progress++; return true;
  }
  function claimQuest(g, day = dayKey()) {
    const q = dailyQuest(g, day); if (!q || q.claimed || q.progress < q.goal) return null;
    q.claimed = true; g.coins = integer(g.coins) + 25; g.xp = integer(g.xp) + 16;
    g.potions.small = integer(g.potions.small, 0, 9998) + 1;
    return { coins: 25, xp: 16, potions: 1 };
  }
  function sanitizeAvatar(value = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) value = {};
    const hex = (v, fallback) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
    return { skin: hex(value.skin, '#e8b88a'), hairColor: hex(value.hairColor, '#4a2e1a'), hair: [1, 2, 3].includes(value.hair) ? value.hair : 1 };
  }
  function visualEquipment(value = {}) {
    const out = {};
    SLOTS.forEach(slot => { const item = value?.[slot]; if (item && SETS.includes(item.res) && RARITIES.includes(item.rar)) out[slot] = { res: item.res, rar: item.rar, cursed: !!item.cursed }; });
    return out;
  }
  function profile(name, g, updatedAt = new Date().toISOString()) {
    const operator = playerId(name); if (!['loki', 'dodo'].includes(operator)) return null;
    return { version: 1, operator, avatar: sanitizeAvatar(g.avatar), equip: visualEquipment(g.equip), updatedAt };
  }
  function sanitizeProfile(value, id) {
    if (!value || value.version !== 1 || !['loki', 'dodo'].includes(id) || value.operator !== id || typeof value.updatedAt !== 'string' || value.updatedAt.length > 40 || !Number.isFinite(Date.parse(value.updatedAt))) return null;
    return profile(id, value, new Date(value.updatedAt).toISOString());
  }
  const profileKey = value => JSON.stringify([value.operator, value.avatar, value.equip]);
  function lastActivity(store, name) {
    const id = playerId(name);
    return [...(store.visits || []), ...(store.readings || []).map(r => ({ ...r, type: 'reading' }))]
      .filter(r => !r.deleted && playerId(r.by) === id && Number.isFinite(Date.parse(r.at)))
      .sort((a, b) => b.at.localeCompare(a.at))[0] || null;
  }
  return { SLOTS, SETS, RARITIES, POTIONS, NPCS, BAG_SIZES, DEFEAT, bagCapacity, equipItem, unequipItem, sellItem, buyDepotPass, beginBattle, loseBattle, winBattle, leaveBattle, playerId, counterpart, playerName, dayKey, normalize, freshState, loadPlayer, maxHP, health, buyPotion, usePotion, dailyQuest, acceptQuest, recordKill, claimQuest, sanitizeAvatar, visualEquipment, profile, sanitizeProfile, profileKey, lastActivity };
})();
if (typeof window !== 'undefined') window.QuestCore = QuestCore;
if (typeof module !== 'undefined') module.exports = QuestCore;
