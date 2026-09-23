/* Read-only art simulation. Loads renderer modules, never Store, Sync or Game. */
(async () => {
  const canvas = document.getElementById('grass-map'), status = document.getElementById('status');
  const height = document.getElementById('grass-height'), value = document.getElementById('height-label'), walk = document.getElementById('walk');
  try {
    await Promise.all([QuestWorld.ready, QuestMotion.ready]);
    if (!QuestWorld.status.loaded || !QuestMotion.status.loaded) throw Error('The map artwork could not load. Refresh to try again.');
    const requested = new URLSearchParams(location.search).get('pool');
    const id = PoolMaps.ids().includes(requested) ? requested : 'GP-39', layout = PoolMaps.get(id), scene = QuestWorld.create(layout, { grassHeight: 40 });
    document.getElementById('pool-name').textContent = id + ' · Pocket Coast';
    // Freeze this preview's grass clock at its maximum; no stored cut dates change.
    scene.nextClimate = Infinity;
    scene.climate.patch = { ...scene.climate.patch, breeze: 32, mood: 'day', sun: 60 };
    scene.climate.visual = { ...scene.climate.visual, rain: 0, cloud: .1, sunStrength: .9, warmth: .3 };
    const setHeight = () => {
      scene.grassHeight = Number(height.value); scene.cycle.height = 1; scene.makeLawn();
      const multiple = +(scene.grassHeight / QuestZones.MAX_GRASS_HEIGHT).toFixed(2);
      value.textContent = multiple + '× · ' + scene.grassHeight + ' px';
      height.setAttribute('aria-valuetext', multiple + ' times taller; up to ' + scene.grassHeight + ' pixels');
      canvas.dataset.growth = '100'; canvas.dataset.grassHeight = height.value;
    };
    height.addEventListener('input', setHeight); setHeight();
    const ctx = canvas.getContext('2d'), surface = PixelSurface.bind(canvas, 256, 192);
    const avatar = { hair: 1, skin: '#e9b886', hairColor: '#4a2e1a' }, condition = { state: 'calme', s: { dirt: 0 }, filtre: 0, interval: 7 };
    const point = ([x, y]) => [x * 16 + 8, y * 16 + 15];
    const origin = [layout.anchors.sp.x, layout.anchors.sp.y];
    // Choose a long, reachable grass strip so the demonstration visibly bends
    // blades instead of merely walking back and forth along the sandy path.
    let strip = [];
    for (let y = 3; y < 11; y++) {
      let run = [];
      for (let x = 1; x <= 14; x++) {
        if (!layout.coll[y][x] && layout.ground[y][x] === 'grass') run.push([x, y]); else run = [];
        if (run.length >= strip.length && run.length >= 3 && PoolMaps.route(layout.coll, origin, run[0]).length) strip = run.slice();
      }
    }
    const stops = strip.length ? [strip[0], strip.at(-1)] : [origin, [layout.anchors.en.x, layout.anchors.en.y]];
    let foot = point(stops[0]), path = [], direction = 'east', time = 0, drawn = performance.now(), turn = 1;
    let automatic = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const currentCell = () => foot.map(n => Math.floor(n / 16));
    const go = destination => {
      const from = currentCell(), target = PoolMaps.nearestReachable(layout.coll, from, destination);
      path = target ? PoolMaps.route(layout.coll, from, target).map(point) : [];
    };
    const reflectWalk = () => { walk.textContent = automatic ? 'Pause walk' : 'Auto walk'; walk.setAttribute('aria-pressed', String(automatic)); };
    walk.addEventListener('click', () => { automatic = !automatic; path = []; reflectWalk(); }); reflectWalk();
    canvas.addEventListener('click', event => {
      const bounds = PixelSurface.bounds(canvas), x = (event.clientX - bounds.left) / bounds.width * 16, y = (event.clientY - bounds.top) / bounds.height * 12;
      automatic = false; reflectWalk(); go([Math.floor(x), Math.floor(y)]); canvas.focus({ preventScroll: true });
    });
    canvas.addEventListener('keydown', event => {
      const delta = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[event.key];
      if (!delta) return; event.preventDefault(); if (path.length) return;
      automatic = false; reflectWalk(); const [x, y] = currentCell(); go([x + delta[0], y + delta[1]]);
    });
    const frame = now => {
      if (!document.hidden && now - drawn >= 1000 / 30) {
        const step = Math.min(.1, (now - drawn) / 1000); drawn = now; time += step;
        if (!path.length && automatic) { go(stops[turn]); turn = 1 - turn; }
        let budget = step * 30, moving = false;
        while (path.length && budget > 0) {
          const [x, y] = path[0], dx = x - foot[0], dy = y - foot[1], distance = Math.hypot(dx, dy);
          if (distance < .01) { path.shift(); continue; }
          direction = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'east' : 'west' : dy > 0 ? 'south' : 'north'; moving = true;
          const amount = Math.min(distance, budget); foot = [foot[0] + dx / distance * amount, foot[1] + dy / distance * amount]; budget -= amount;
          if (amount === distance) path.shift();
        }
        const motion = moving ? 'walk' : 'idle', elapsed = time * 1000;
        surface.prepare(ctx);
        scene.paint(ctx, condition, time, foot, [{ x: foot[0], y: foot[1],
          draw: lighting => QuestMotion.keeper(ctx, ...foot, avatar, {}, { motion, elapsed, direction, light: lighting.light }),
          castShadow: () => QuestMotion.keeper(ctx, 0, 0, avatar, {}, { motion, elapsed, direction, shadow: true }),
        }], QuestMotion.reduced());
        canvas.dataset.hero = foot.map(n => n.toFixed(2)).join(','); canvas.dataset.moving = String(moving);
        canvas.dataset.bentCells = scene.meadow.filter(c => c.flatten > .05).length;
      } else if (document.hidden) drawn = now;
      requestAnimationFrame(frame);
    };
    canvas.dataset.ready = 'true'; status.hidden = true; requestAnimationFrame(frame);
    addEventListener('pagehide', () => surface.dispose(), { once: true });
  } catch (error) { status.textContent = error.message; status.setAttribute('role', 'alert'); }
})();
