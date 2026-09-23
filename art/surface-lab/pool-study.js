/* Pool study: a real pool map on the surface lab's living ground.
 * Local animation state only; no stores, records or sync. */
(async () => {
  const canvas = document.getElementById('terrain'), status = document.getElementById('status'), stats = document.getElementById('stats');
  const poolSelect = document.getElementById('pool'), stateSelect = document.getElementById('state');
  const W = 512, H = 384, T = 32, WEAR_KEY = 'lp-surface-study.wear.';
  const PRESETS = {
    sec: { rain: 0, wind: .2, sun: .8, temperature: 24, humidity: .45 },
    brise: { rain: 0, wind: .5, sun: .65, temperature: 20, humidity: .55 },
    pluie: { rain: .7, wind: .35, sun: .2, temperature: 15, humidity: .9 },
    tempete: { rain: .9, wind: .9, sun: .1, temperature: 13, humidity: .95 },
    gel: { rain: 0, wind: .15, sun: .5, temperature: -3, humidity: .7 },
  };
  const quiet = matchMedia('(prefers-reduced-motion: reduce)');
  try {
    await Promise.all([QuestMotion.ready, QuestWorld.ready]);
    if (!QuestMotion.status.loaded) throw Error('Le personnage n’a pas pu se charger.');
    if (!QuestWorld.status.loaded) throw Error('Le décor n’a pas pu se charger : ' + QuestWorld.status.failure);
    const ctx = canvas.getContext('2d'), surface = PixelSurface.bind(canvas, W, H);
    const avatar = { hair: 1, skin: '#e9b886', hairColor: '#4a2e1a' };
    for (const id of PoolMaps.ids()) { const o = document.createElement('option'); o.value = id; o.textContent = id; poolSelect.appendChild(o); }
    poolSelect.value = location.hash.slice(1) || 'EC-2';

    // A flat, top-down villa: mostly roof, a strip of façade. Provisional art.
    function facade(o, res) {
      const [roof, light, dark] = PixelArt.ROOF[res] || PixelArt.ROOF.EC, w = o.w * T, h = o.h * T + 6;
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
      const box = (color, x, y, bw = 1, bh = 1) => { g.fillStyle = color; g.fillRect(x, y, bw, bh); };
      const roofH = h - 22;
      box(dark, 0, 0, w, roofH); box(roof, 2, 2, w - 4, roofH - 4);
      for (let y = 4; y < roofH - 3; y += 4) box(dark, 2, y, w - 4, 1);
      for (let y = 5; y < roofH - 3; y += 4) box(light, 3, y, w - 6, 1);
      box(light, 2, Math.floor(roofH / 2) - 1, w - 4, 2);
      box('#6b5a4d', w - 18, 6, 6, 8); box('#8b7a6a', w - 17, 5, 4, 2);
      box('#5f5a4d', 0, roofH, w, 3);
      box('#e9dfca', 0, roofH + 3, w, h - roofH - 8); box('#cbbb9d', 0, h - 5, w, 3); box('#78644f', 0, h - 2, w, 2);
      const door = Math.floor(w / 2) - 7; box('#586a6d', door, roofH + 4, 14, h - roofH - 9); box('#a5cbd0', door + 1, roofH + 5, 12, h - roofH - 11); box('#cfe6e8', door + 2, roofH + 6, 3, h - roofH - 13);
      for (const x of [10, w - 26]) { box(dark, x - 3, roofH + 5, 3, 10); box(dark, x + 13, roofH + 5, 3, 10); box('#586a6d', x, roofH + 5, 13, 10); box('#b7d4d6', x + 1, roofH + 6, 11, 8); box('#e2f0f0', x + 2, roofH + 7, 3, 3); }
      return c;
    }

    let field = null, scene = null, L = null, layout = null, hero = null, facing = 'south', path = null, pathIndex = 0, target = null, automatic = !quiet.matches, tourIndex = 0;
    let wearTimer = 0, preset = 'sec', hourMode = 'manual';
    const walkButton = document.getElementById('walk');
    const cellOf = (x, y) => [Math.max(0, Math.min(15, Math.floor(x / T))), Math.max(0, Math.min(11, Math.floor(y / T)))];
    const centre = ([cx, cy]) => [cx * T + 16, cy * T + 26];
    function nearestOpen(cell) {
      const [cx, cy] = cell; if (!L.coll[cy][cx]) return cell; let best = null, bd = 1e9;
      for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) if (!L.coll[y][x]) { const d = (x - cx) ** 2 + (y - cy) ** 2; if (d < bd) { bd = d; best = [x, y]; } }
      return best;
    }
    function walkTo(px) {
      const from = nearestOpen(cellOf(hero.x, hero.y)), to = nearestOpen(cellOf(px[0], px[1]));
      const route = PoolMaps.route(L.coll, from, to); if (!route || route.length < 2) { target = null; path = null; return; }
      path = route.slice(1).map(centre); pathIndex = 0; target = path[0];
    }
    function move(dt) {
      if (!target) { if (!automatic) return false; const tour = SurfaceMaps.tour(field.options.layout); walkTo(tour[tourIndex++ % tour.length]); if (!target) return false; }
      const dx = target[0] - hero.x, dy = target[1] - hero.y, distance = Math.hypot(dx, dy);
      const wet = field.water.liquidAt(hero.x, hero.y), speed = 62 * (1 - wet * .45), amount = Math.min(distance, speed * dt);
      if (distance > .01) { hero.x += dx / distance * amount; hero.y += dy / distance * amount; facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : dy > 0 ? 'south' : 'north'; }
      if (amount >= distance - .01) { pathIndex++; target = path && pathIndex < path.length ? path[pathIndex] : null; if (!target) path = null; }
      return true;
    }
    function applyWeather(name) {
      preset = name; for (const b of document.querySelectorAll('[data-weather]')) b.setAttribute('aria-pressed', String(b.dataset.weather === name));
      if (name === 'lacanau') {
        const record = window.Weather?.current?.();
        if (!record) { stats.textContent = 'Pas de relevé météo en cache : ouvre l’application une fois en ligne, puis reviens.'; return; }
        field.applyWeatherRecord(record, { preserveState: true }); return;
      }
      field.configure({ ...PRESETS[name] });
    }
    function applyHour(mode) {
      hourMode = mode; for (const b of document.querySelectorAll('[data-hour]')) b.setAttribute('aria-pressed', String(b.dataset.hour === mode));
      field.configure(mode === 'manual' ? { colourDriver: 'manual' } : { colourDriver: 'weather', studyHour: +mode, adaptation: 1 });
      applyLook();
    }
    const look = { palette: 'coast', view: 'colour', contrast: 1, saturation: 1, exposure: 1 };
    function applyLook() {
      const effective = SurfaceAdaptiveColour.grade(look, field.adaptive, field.options.adaptation), filter = SurfaceColour.filter(effective);
      if (canvas.style.filter !== filter) canvas.style.filter = filter;
    }
    function saveWear() { try { const bytes = field.variation.snapshot(); localStorage.setItem(WEAR_KEY + L.id, btoa(String.fromCharCode(...bytes))); } catch (e) { /* study only */ } }
    function loadWear() { try { const s = localStorage.getItem(WEAR_KEY + L.id); if (s) field.variation.restore(Uint8Array.from(atob(s), c => c.charCodeAt(0))); } catch (e) { /* ignore */ } }

    function open(id) {
      if (field) { saveWear(); field.dispose(); }
      const [res] = id.split('-'); L = PoolMaps.get(id, res); layout = PoolSurface.build(L);
      SurfaceMaps.register(layout.id, layout);
      const q = new URLSearchParams(location.search), budget = { grainRes: +(q.get('res') || 1), grainRate: +(q.get('grain') ?? 6), grassRate: +(q.get('grass') ?? 8), spriteCacheSize: 2048, spriteCacheBytes: 10 * 1048576 };
      field = new TerrainStudy.Field({ layout: layout.id, blend: 12, length: 16, grain: .5, wind: .2, shade: .5, moisture: .3, ...budget, ...PRESETS[preset === 'lacanau' ? 'sec' : preset] });
      loadWear();
      scene = QuestWorld.create(L, { surface: true, sprite: o => o.kind === 'villa' ? facade(o.object || { w: 4, h: 3 }, res) : null });
      if (!scene) throw Error('Le décor de ' + id + ' n’a pas pu être construit.');
      hero = { ...layout.spawn }; facing = 'south'; path = null; target = null; tourIndex = 0;
      if (hourMode !== 'manual') applyHour(hourMode); else applyLook();
      canvas.dataset.pool = id; canvas.dataset.borrowed = String(!!L.borrowed); location.hash = id;
    }
    poolSelect.addEventListener('change', () => open(poolSelect.value));
    for (const b of document.querySelectorAll('[data-weather]')) b.addEventListener('click', () => applyWeather(b.dataset.weather));
    for (const b of document.querySelectorAll('[data-hour]')) b.addEventListener('click', () => applyHour(b.dataset.hour));
    walkButton.addEventListener('click', () => { automatic = !automatic; target = null; path = null; walkButton.textContent = automatic ? 'Pause tournée' : 'Tournée'; walkButton.setAttribute('aria-pressed', String(automatic)); });
    document.getElementById('wear').addEventListener('click', () => { field.variation.clear(); field.clearTracks(); saveWear(); });
    canvas.addEventListener('pointerdown', event => {
      const bounds = PixelSurface.bounds(canvas); automatic = false; walkButton.textContent = 'Tournée'; walkButton.setAttribute('aria-pressed', 'false');
      walkTo([(event.clientX - bounds.left) / bounds.width * W, (event.clientY - bounds.top) / bounds.height * H]);
    });
    addEventListener('pagehide', saveWear);

    open(poolSelect.value); status.hidden = true;
    let drawn = performance.now(), drawMs = 0, telemetry = 0;
    const frame = now => {
      if (!document.hidden && now - drawn >= 1000 / 30 && field && !field.disposed) {
        const dt = Math.min(.1, (now - drawn) / 1000); drawn = now;
        const moving = move(dt), still = quiet.matches;
        field.advance(dt, hero, still);
        const started = performance.now(), t = field.time, options = { motion: moving ? 'walk' : 'idle', elapsed: t * 1000, direction: facing };
        surface.prepare(ctx); ctx.imageSmoothingEnabled = false;
        // 1. the map's own hard ground: terrace, basin rim, fence, canal
        ctx.drawImage(scene.base, 0, 0);
        // 2. the living surface: grass, sand, earth, gravel, wetness, tracks, rooted grass
        const tick = field.paintBase(ctx, hero, still);
        // 3. the basin, in the water state of the pool
        const p = L.pool; ctx.save(); ctx.scale(2, 2); QuestMotion.water(ctx, stateSelect.value, t * 1000, p.x * 16, p.y * 16, p.w * 16, p.h * 16); ctx.restore();
        // 4. tree shadows, then scenery and the keeper in depth order
        scene.updateShadows(still ? 0 : t, still); ctx.drawImage(scene.shadows, 0, 0);
        scene.onFootGrass = (g, actor) => field.paintForegroundGrass(g, { x: actor.x * 2, y: actor.y * 2 }, tick, still);
        const actor = { x: hero.x / 2, y: hero.y / 2, shadow: 7, draw: () => QuestMotion.keeper(ctx, Math.round(hero.x) / 2, Math.round(hero.y) / 2, avatar, {}, options),
          castShadow: () => QuestMotion.keeper(ctx, 0, 0, avatar, {}, { ...options, shadow: true }) };
        scene.paintScenery(ctx, { state: stateSelect.value }, t, [hero.x, hero.y], [actor], still);
        // 5. atmosphere: rain haze, light, rain, reflections
        field.paintFront(ctx, hero, still);
        drawMs = drawMs * .9 + (performance.now() - started) * .1;
        if (now - telemetry > 400) {
          telemetry = now; applyLook(); const s = field.stats, m = field.materials(hero.x, hero.y);
          const ground = Object.entries(m).filter(([k, v]) => k !== 'solid' && v > .05).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + Math.round(v * 100) + '%').join(' · ') || 'terrasse';
          stats.textContent = `${L.id}${L.borrowed ? ' (plan de la résidence)' : ''} · ${drawMs.toFixed(1)} ms/image · ${s.cells} touffes · usure ${s.variation.wornCells} cases · sous les pieds : ${ground} · humidité ${Math.round(field.wetness('grass') * 100)}%`;
          canvas.dataset.drawMs = drawMs.toFixed(2); canvas.dataset.cells = s.cells; canvas.dataset.worn = s.variation.wornCells;
          if (++wearTimer % 25 === 0) saveWear();
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  } catch (error) { status.hidden = false; status.textContent = error.message; console.error(error); }
})();
