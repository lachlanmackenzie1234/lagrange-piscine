/* Pocket Coast animation playback and composable 24×32 keeper. */
const QuestMotion = (() => {
  const root = typeof window !== 'undefined' ? window : globalThis;
  const slots = ['tête', 'torse', 'jambes', 'pieds', 'amulette', 'perche', 'robot', 'balai'];
  const sets = ['EC', 'AG', 'EP', 'EPP', 'GP'];
  const tiers = ['common', 'uncommon', 'rare', 'vrare', 'epic', 'legend'];
  let data = null, loaded = false, failure = null;
  const pages = new Map(), keeperCache = new Map();
  const reduced = () => !!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const fullSet = (equip = {}) => { const values = slots.map((slot) => equip[slot]?.res); return sets.includes(values[0]) && values.every((v) => v === values[0]) ? values[0] : null; };
  const setAuraState = (equip = {}) => { const set = fullSet(equip); if (!set) return null; const rank = Math.min(...slots.map(s => Math.max(0, tiers.indexOf(equip[s].rar)))); return { set, rank, rarity: tiers[rank] }; };

  function frameAt(clip, elapsed = 0, quiet = false) {
    if (!clip) return null;
    elapsed = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
    const done = !clip.loop && elapsed >= clip.duration;
    let index = 0;
    if (done && clip.end) index = clip.f.length - 1;
    else if (quiet) index = clip.reduced || 0;
    else { let t = clip.loop ? elapsed % clip.duration : Math.min(elapsed, clip.duration - 1); for (let i = 0; i < clip.f.length; i++) { if (t < clip.f[i].d) { index = i; break; } t -= clip.f[i].d; } }
    return { ...clip.f[index], index, done, o: quiet ? [0, 0] : clip.f[index].o || [0, 0] };
  }

  // Call advance before drawing, finish after drawing the last frame. Effects fire once.
  class Timeline {
    constructor() { this.jobs = []; this.current = null; this.elapsed = 0; this.impacted = false; }
    advance(dt) {
      const a = this.jobs[0]; if (!a) { this.current = null; return { action: null, progress: 0 }; }
      if (a !== this.current) { this.current = a; this.elapsed = 0; this.impacted = false; a.onStart?.(); }
      else this.elapsed += Math.max(0, dt);
      if (this.jobs[0] !== a) return { action: null, progress: 0 };
      const p = Math.min(1, this.elapsed / Math.max(.001, a.dur || .001));
      if (!this.impacted && a.impactAt != null && this.elapsed >= a.impactAt) { this.impacted = true; a.onImpact?.(); }
      return this.jobs[0] === a ? { action: a, progress: p } : { action: null, progress: 0 };
    }
    finish() { const a = this.current; if (a && this.jobs[0] === a && this.elapsed >= (a.dur || .001)) { this.jobs.shift(); this.current = null; a.onEnd?.(); } }
    cancel() { this.jobs.length = 0; this.current = null; this.elapsed = 0; }
  }

  function draw(ctx, id, elapsed, x, y, options = {}) {
    const clip = data?.clips[id], page = clip && pages.get(clip.page); if (!page) return false;
    const f = frameAt(clip, elapsed, reduced()), scale = options.scale || 1;
    const offset = options.offset || f.o;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(page, ...f.r, Math.round(x - clip.a[0] * scale + offset[0] * scale), Math.round(y - clip.a[1] * scale + offset[1] * scale), f.r[2] * scale, f.r[3] * scale);
    return true;
  }

  function aura(ctx, group, layer, elapsed, x, y, options = {}) {
    if (options.moving || options.action || options.alive === false) return false;
    const g = data?.auras[group]; return g ? draw(ctx, g[layer], elapsed, x, y, options) : false;
  }

  function setAura(ctx, equip, layer, elapsed, x, y, options = {}) {
    const state = setAuraState(equip); if (!state || options.moving || options.action || options.alive === false) return false;
    ctx.save(); ctx.globalAlpha *= [.35, .5, .65, .8, .9, 1][state.rank];
    const shown = aura(ctx, 'set-' + state.set, layer, elapsed, x, y, options); ctx.restore();
    if (state.rank >= 2) aura(ctx, 'rarity-' + state.rarity, layer, elapsed, x, y, options);
    return shown;
  }

  // One clock for all visible portraits, including the 23 Dex cards. Detached
  // cards are collected after renders; offscreen/hidden cards do not repaint.
  const portraits = new Map(); let portraitRAF = 0, portraitTime = 0, portraitPrevious = 0;
  const portraitObserver = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => entries.forEach(entry => { const p = portraits.get(entry.target); if (p) { p.visible = entry.isIntersecting; p.dirty = true; } }));
  function portrait(width, height, paint) {
    const c = document.createElement('canvas'); c.width = width; c.height = height; c.setAttribute('aria-hidden', 'true');
    const p = { paint, visible: true, dirty: true, last: -1 }; portraits.set(c, p); portraitObserver?.observe(c);
    paint(c.getContext('2d'), 0); if (!portraitRAF) portraitRAF = requestAnimationFrame(portraitLoop); return c;
  }
  function portraitLoop(now) {
    const delta = portraitPrevious ? Math.min(100, now - portraitPrevious) : 0; portraitPrevious = now;
    if (!document.hidden) portraitTime += delta;
    for (const [c, p] of portraits) {
      // Views append their portraits synchronously, before this next frame.
      if (!c.isConnected) { portraitObserver?.unobserve(c); portraits.delete(c); continue; }
      if (document.hidden || !p.visible || !c.isConnected || !p.dirty && (reduced() || now - p.last < 90)) continue;
      const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height); ctx.imageSmoothingEnabled = false; p.paint(ctx, portraitTime); p.last = now; p.dirty = false;
    }
    portraitRAF = portraits.size ? requestAnimationFrame(portraitLoop) : 0;
    if (!portraitRAF) portraitPrevious = 0;
  }
  function creaturePortrait(poolId, zone) {
    return portrait(24, 24, (ctx, elapsed) => {
      const id = data?.clips['pool-creature/' + poolId + '/idle'] ? 'pool-creature/' + poolId + '/idle' : 'species/' + zone + '/idle';
      const clip = data?.clips[id];
      if (!clip || !draw(ctx, id, elapsed, ...clip.a, { offset: [0, 0] })) ctx.drawImage(root.PixelArt.creature(zone, poolId), 0, 0);
    });
  }
  function monsterPortrait(id) {
    return portrait(28, 24, (ctx, elapsed) => {
      const clip = data?.clips[`monster/${id}/idle`];
      if (!clip || !draw(ctx, `monster/${id}/idle`, elapsed, ...clip.a, { offset: [0, 0] })) ctx.drawImage(root.PixelArt.monster(id), 0, 0);
    });
  }

  const fallback = {
    idle: { n: 4, d: 300, loop: true }, walk: { n: 8, d: 95, loop: true }, cast: { n: 6, d: 80 },
    hit: { n: 4, d: 90 }, victory: { n: 4, d: 170 }, spawn: { n: 6, d: 90 }, defeat: { n: 6, d: 100 },
    flee: { n: 8, d: 65 }, crouch: { n: 4, d: 130 },
  };
  function keeperClip(direction, motion) {
    if (data?.keeper[direction]?.[motion]) return data.keeper[direction][motion];
    const f = fallback[motion] || fallback.idle;
    return { loop: !!f.loop, duration: f.n * f.d, end: motion === 'defeat', reduced: motion === 'spawn' ? f.n - 1 : 0, f: Array.from({ length: f.n }, () => ({ d: f.d, o: [0, 0] })) };
  }

  function keeper(ctx, x, y, avatar, equip, options = {}) {
    const direction = options.direction || 'south', motion = options.motion || 'idle';
    const f = frameAt(keeperClip(direction, motion), options.elapsed || 0, reduced());
    const look = slots.map((s) => equip?.[s] ? [equip[s].res, equip[s].rar, !!equip[s].cursed] : null);
    const key = JSON.stringify([avatar.skin, avatar.hair, avatar.hairColor, look, direction, motion, f.index]);
    if (!keeperCache.has(key)) {
      const c = document.createElement('canvas'); c.width = 24; c.height = 32; const g = c.getContext('2d');
      root.PixelArt.keeper(g, 0, 0, equip || {}, avatar, direction);
      const src = g.getImageData(0, 0, 24, 32), out = g.createImageData(24, 32);
      const kind = motion === 'flee' ? 'walk' : motion;
      const stride = kind === 'walk' ? [0, 1, 1, 0, 0, -1, -1, 0][f.index % 8] : 0;
      const bob = kind === 'idle' && f.index === 2 || kind === 'walk' && ![0, 4].includes(f.index % 8) || kind === 'victory' && [1, 2].includes(f.index) ? -1 : 0;
      const lean = kind === 'cast' ? [0, -1, 0, 1, 1, 0][f.index % 6] : 0;
      for (let yy = 0; yy < 32; yy++) for (let xx = 0; xx < 24; xx++) {
        const i = (yy * 24 + xx) * 4; if (!src.data[i + 3]) continue;
        let dx = 0, dy = 0; const leg = yy >= 25 && xx >= 7 && xx <= 17;
        if (kind === 'walk' && leg) { const side = xx < 12 ? -1 : 1; if (direction === 'east' || direction === 'west') { dx = side * stride; dy = side * stride < 0 ? -1 : 0; } else { dy = side * stride; if ([2, 6].includes(f.index)) dx = side; } }
        else if (!leg) { dy = bob; dx = lean * (direction === 'west' ? -1 : 1); if (kind === 'crouch' && [1, 2].includes(f.index)) dy = 1; }
        const px = xx + dx, py = yy + dy; if (px < 0 || px >= 24 || py < 0 || py >= 32) continue;
        const j = (py * 24 + px) * 4; out.data.set(src.data.subarray(i, i + 4), j);
        if (kind === 'hit' && [1, 2].includes(f.index) && src.data[i] + src.data[i + 1] + src.data[i + 2] > 190) for (let k = 0; k < 3; k++) out.data[j + k] = Math.round(src.data[i + k] * .3 + [255, 241, 214][k] * .7);
      }
      if (bob) for (let xx = 7; xx <= 17; xx++) { const below = (25 * 24 + xx) * 4, gap = (24 * 24 + xx) * 4; if (src.data[below + 3] && !out.data[gap + 3]) out.data.set(src.data.subarray(below, below + 4), gap); }
      if (kind === 'spawn' || kind === 'defeat') { const levels = kind === 'spawn' ? [0, .2, .4, .65, .85, 1] : [1, .85, .65, .4, .2, 0]; for (let yy = 0; yy < 32; yy++) for (let xx = 0; xx < 24; xx++) if ((xx * 13 + yy * 7) % 20 / 20 >= levels[f.index]) out.data.fill(0, (yy * 24 + xx) * 4, (yy * 24 + xx) * 4 + 4); }
      g.clearRect(0, 0, 24, 32); g.putImageData(out, 0, 0); keeperCache.set(key, c);
      if (keeperCache.size > 256) keeperCache.delete(keeperCache.keys().next().value);
    }
    const offset = options.offset || (options.applyOffset ? f.o : [0, 0]);
    ctx.drawImage(keeperCache.get(key), Math.round(x - 12 + offset[0]), Math.round(y - 31 + offset[1]));
  }

  function monster(ctx, id, motion, elapsed, x, y, options = {}) {
    if (draw(ctx, `monster/${id}/${motion}`, elapsed, x, y, options)) return;
    const c = root.PixelArt.monster(id), scale = options.scale || 1; ctx.drawImage(c, x - 14 * scale, y - 23 * scale, 28 * scale, 24 * scale);
  }

  function water(ctx, state, elapsed, x, y, w, h) {
    const clip = data?.clips['water/' + (state === 'traité' ? 'traite' : state)];
    const page = clip && pages.get(clip.page); if (!page) return false;
    const f = frameAt(clip, elapsed, reduced());
    for (let yy = y; yy < y + h; yy += 16) for (let xx = x; xx < x + w; xx += 16) ctx.drawImage(page, ...f.r, xx, yy, 16, 16);
    return true;
  }

  const ready = typeof document === 'undefined' ? Promise.resolve(false) : (async () => {
    try {
      const base = new URL('../assets/quest-motion/', document.currentScript.src);
      const response = await fetch(new URL('manifest.json', base)); if (!response.ok) throw new Error('Animation manifest unavailable'); data = await response.json();
      const results = await Promise.allSettled(data.pages.map(async (name) => { const image = new Image(); image.src = new URL(name, base).href; await image.decode(); pages.set(name, image); }));
      loaded = results.every((r) => r.status === 'fulfilled'); if (!loaded) failure = 'Some animation pages could not be loaded';
      portraits.forEach(p => { p.dirty = true; }); return loaded;
    } catch (error) { failure = error.message; return false; }
  })();
  return { ready, frameAt, Timeline, fullSet, setAuraState, tiers, draw, aura, setAura, portrait, creaturePortrait, monsterPortrait, keeper, monster, water, reduced, get status() { return { loaded, failure, pages: pages.size, portraits: portraits.size }; } };
})();
if (typeof window !== 'undefined') window.QuestMotion = QuestMotion;
if (typeof module !== 'undefined') module.exports = QuestMotion;
