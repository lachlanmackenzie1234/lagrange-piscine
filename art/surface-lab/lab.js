/* Preview controller: local animation state only; no storage or game writes. */
(async () => {
  const canvas = document.getElementById('terrain'), status = document.getElementById('status');
  const walk = document.getElementById('walk'), direction = document.getElementById('wind-direction');
  const inputs = Object.fromEntries(['length', 'grain', 'moisture', 'wind', 'edge', 'rain', 'sun', 'temperature', 'humidity'].map(id => [id, document.getElementById(id)]));
  const sequencePlay = document.getElementById('sequence-play'), sequenceTime = document.getElementById('sequence-time'), sequencePhase = document.getElementById('sequence-phase');
  try {
    await QuestMotion.ready;
    if (!QuestMotion.status.loaded) throw Error('The keeper artwork could not load. Refresh to try again.');
    const sceneCache = new SurfaceMemory.Cache(); let savedWeatherActive = false;
    const field = new TerrainStudy.Field(), ctx = canvas.getContext('2d'), surface = PixelSurface.bind(canvas, 512, 384);
    const sound = new SurfaceSound.Preview(); field.onStep = event => sound.step(event);
    const showGrainScale = scale => { document.getElementById('grain-relation').textContent = 'Texture scale · ' + ['sand', 'earth', 'gravel'].map(type => type[0].toUpperCase() + type.slice(1) + ' ' + SurfaceDynamics.properties[type].grain * scale + ' px').join(' · '); };
    showGrainScale(+inputs.grain.value);
    const quiet = matchMedia('(prefers-reduced-motion: reduce)'), avatar = { hair: 1, skin: '#e9b886', hairColor: '#4a2e1a' };
    let automatic = !quiet.matches, hero = SurfaceMaps.spawn(field.options.layout), facing = 'south', target = null, index = 0, angle = 0;
    let drawn = performance.now(), telemetry = 0, drawMs = 0;
    const look = { palette: 'coast', view: 'colour', contrast: 1, saturation: 1, exposure: 1 };
    const applyLook = () => {
      const effective = SurfaceAdaptiveColour.grade(look, field.adaptive, field.options.adaptation), filter = SurfaceColour.filter(effective);
      if (canvas.style.filter !== filter) canvas.style.filter = filter;
      if (field.options.reflectionView !== (look.view === 'reflections')) field.configure({ reflectionView: look.view === 'reflections' });
      Object.assign(canvas.dataset, {view:look.view,palette:look.palette,contrast:look.contrast,saturation:look.saturation,exposure:look.exposure,effectiveContrast:effective.contrast,effectiveSaturation:effective.saturation,effectiveExposure:effective.exposure});
    };
    document.getElementById('palette').addEventListener('change', event => { look.palette = event.target.value; applyLook(); });
    document.getElementById('view').addEventListener('change', event => { look.view = event.target.value; applyLook(); });
    document.getElementById('contrast').addEventListener('input', event => { const n = +event.target.value; look.contrast = n / 100; document.getElementById('contrast-value').textContent = n + '%'; applyLook(); });
    for (const key of ['saturation', 'exposure']) document.getElementById(key).addEventListener('input', event => { const n = +event.target.value; look[key] = n / 100; document.getElementById(key + '-value').textContent = n + '%'; applyLook(); });
    const lighting = document.getElementById('lighting'), keyLight = document.getElementById('key-light'), shadowColour = document.getElementById('shadow-colour');
    lighting.addEventListener('change', () => {
      const pair = SurfaceColour.lightingPalettes[lighting.value]; if (pair) { keyLight.value = pair.key; shadowColour.value = pair.shadow; }
      field.configure({ lightPalette: lighting.value, keyLight: keyLight.value, shadowColour: shadowColour.value });
    });
    for (const picker of [keyLight, shadowColour]) picker.addEventListener('input', () => {
      lighting.value = 'custom'; field.configure({ lightPalette: 'custom', keyLight: keyLight.value, shadowColour: shadowColour.value });
    });
    for (const [id, key] of [['light-strength', 'lightStrength'], ['light-saturation', 'lightSaturation']]) document.getElementById(id).addEventListener('input', event => {
      const n = +event.target.value; field.configure({ [key]: n / 100 }); document.getElementById(id + '-value').textContent = n + '%';
    });
    const reflectionControls = [['reflection-strength','reflectionStrength'],['reflection-wet','reflectionWet'],['reflection-roughness','reflectionRoughness'],...SurfaceReflections.names.map(n=>['reflect-'+n,'reflect'+n[0].toUpperCase()+n.slice(1)])];
    for (const [id, key] of reflectionControls) document.getElementById(id).addEventListener('input', event => { const value = +event.target.value; field.configure({[key]:value/100}); document.getElementById(id+'-value').textContent = value+'%'; });
    const hourLabel = h => String(Math.floor(h)%24).padStart(2,'0')+':'+String(Math.round(h%1*60)).padStart(2,'0');
    document.getElementById('colour-driver').addEventListener('change', event => {
      field.configure({colourDriver:event.target.value}); if (event.target.value === 'recorded') document.getElementById('logged-weather').click(); applyLook();
    });
    document.getElementById('study-hour').addEventListener('input', event => { const h = +event.target.value; document.getElementById('study-hour-value').textContent = hourLabel(h); field.configure({studyHour:h}); applyLook(); });
    document.getElementById('adaptation').addEventListener('input', event => { const value=+event.target.value; document.getElementById('adaptation-value').textContent=value+'%';field.configure({adaptation:value/100});applyLook(); });
    document.getElementById('shade').addEventListener('input', event => { const n = +event.target.value; field.configure({ shade: n / 100 }); document.getElementById('shade-value').textContent = n + '%'; });
    document.getElementById('flow-vectors').addEventListener('change', event => field.configure({ vectors: event.target.checked }));
    document.getElementById('recovery').addEventListener('input', event => { const n = +event.target.value; field.configure({ recovery: n }); document.getElementById('recovery-value').textContent = n + ' s'; if (field.sequenceElapsed != null) hero = field.seekSequence(Math.min(field.sequenceElapsed, 5 + n)); });
    applyLook();
    if (innerWidth < 520) { document.querySelector('.appearance').open = false; document.querySelector('.weather-panel').open = false; }
    const keys = new Set(); let tour = SurfaceMaps.tour(field.options.layout);
    const preset = document.getElementById('weather-preset');
    const syncWeatherControls = () => {
      for (const key of ['rain', 'wind', 'sun', 'humidity', 'temperature']) {
        const value = Math.round(field.options[key] * (key === 'temperature' ? 1 : 100)), unit = key === 'temperature' ? '°C' : '%';
        inputs[key].value = value; document.getElementById(key + '-value').textContent = value + unit; inputs[key].setAttribute('aria-valuetext', value + unit);
      }
    };
    const applyWeather = name => {
      savedWeatherActive = false;
      const values = SurfaceWeather.presets[name]; if (!values) return;
      field.configure(values); syncWeatherControls(); document.getElementById('weather-source').textContent = 'Manual study';
    };
    let seasonTimer;
    const applySeason = () => {
      clearTimeout(seasonTimer);
      field.configure({ seasonFrom: document.getElementById('season-from').value, seasonTo: document.getElementById('season-to').value, seasonBlend: +document.getElementById('season-blend').value / 100, richness: +document.getElementById('richness').value / 100 });
    };
    for (const id of ['season-from', 'season-to']) document.getElementById(id).addEventListener('change', applySeason);
    document.getElementById('season-blend').addEventListener('input', event => {
      document.getElementById('season-blend-value').textContent = event.target.value + '%'; clearTimeout(seasonTimer); seasonTimer = setTimeout(applySeason, 90);
    });
    document.getElementById('richness').addEventListener('input', event => {
      document.getElementById('richness-value').textContent = event.target.value + '%'; clearTimeout(seasonTimer); seasonTimer = setTimeout(applySeason, 90);
    });
    const readSavedWeather = () => {
      const saved = JSON.parse(localStorage.getItem('lagrange-piscine.v1') || '{}') || {};
      const records = ['readings', 'visits', 'notes'].flatMap(key => Array.isArray(saved[key]) ? saved[key].filter(r => r.weather) : []);
      let climate = SurfaceClimate.latest(records), kind = 'Logged';
      if (!climate) { climate = SurfaceClimate.fromRecord(JSON.parse(localStorage.getItem('lagrange-piscine.weather') || 'null')); kind = 'Cached'; }
      return climate ? { climate, kind } : null;
    };
    const syncRecordedControls = ({ climate, kind }) => {
      preset.value = 'custom'; syncWeatherControls();
      document.getElementById('season-from').value = field.options.seasonFrom; document.getElementById('season-to').value = field.options.seasonTo;
      const blend = Math.round(field.options.seasonBlend * 100); document.getElementById('season-blend').value = blend; document.getElementById('season-blend-value').textContent = blend + '%';
      document.getElementById('weather-source').textContent = kind + ' weather' + (climate.at ? ' · ' + new Date(climate.at).toLocaleString() : ' · date unavailable');
    };
    document.getElementById('logged-weather').addEventListener('click', () => {
      const source = document.getElementById('weather-source');
      try {
        const observed = readSavedWeather(); if (!observed) { source.textContent = 'No saved weather in this browser yet.'; return; }
        clearTimeout(seasonTimer); field.applyWeatherRecord(observed.climate.record); savedWeatherActive = true; syncRecordedControls(observed);
      } catch { source.textContent = 'Saved weather could not be read.'; }
    });
    document.addEventListener('visibilitychange', () => {
      drawn = performance.now();
      if (!document.hidden && savedWeatherActive) {
        try { const observed = readSavedWeather(); if (observed && field.adaptWeatherOnEntry(observed.climate.record)) { clearTimeout(seasonTimer); syncRecordedControls(observed); } }
        catch { document.getElementById('weather-source').textContent = 'Resumed map · saved weather unavailable'; }
      }
    });
    for (const [id, key] of [['variation', 'variation'], ['edge-grain', 'edgeGrain'], ['path-wear', 'pathWear']]) document.getElementById(id).addEventListener('input', event => {
      const n = +event.target.value; field.configure({ [key]: n / 100 }); document.getElementById(id + '-value').textContent = n + '%';
    });
    document.getElementById('clear-wear').addEventListener('click', () => { field.cancelSequence(); field.variation.clear(); });
    preset.addEventListener('change', () => applyWeather(preset.value));
    document.getElementById('weather-speed').addEventListener('change', event => field.configure({ speed: +event.target.value }));
    document.getElementById('reset-weather').addEventListener('click', () => { field.cancelSequence(); preset.value = 'calm'; applyWeather('calm'); field.resetWeather(); });
    document.getElementById('map-layout').addEventListener('change', event => {
      sceneCache.remember(field.options.layout, field.snapshotScene({ ...hero, facing }));
      field.configure({ layout: event.target.value }); hero = field.restoreScene(sceneCache.recall(event.target.value)); facing = hero.facing || 'south';
      if (savedWeatherActive) {
        try { const observed = readSavedWeather(); if (observed && field.adaptWeatherOnEntry(observed.climate.record)) { clearTimeout(seasonTimer); syncRecordedControls(observed); } }
        catch { document.getElementById('weather-source').textContent = 'Restored map · saved weather unavailable'; }
      }
      target = null; index = 0; keys.clear(); tour = SurfaceMaps.tour(field.options.layout);
    });
    const refreshWalk = () => { walk.textContent = automatic ? 'Pause walk' : 'Auto walk'; walk.setAttribute('aria-pressed', String(automatic)); };
    const toggle = () => { field.cancelSequence(); automatic = !automatic; target = null; keys.clear(); refreshWalk(); };
    walk.addEventListener('click', toggle); refreshWalk();
    for (const [id, input] of Object.entries(inputs)) input.addEventListener('input', () => {
      const number = Number(input.value), percent = ['wind', 'moisture', 'rain', 'sun', 'humidity'].includes(id), unit = id === 'grain' ? '×' : id === 'temperature' ? '°C' : percent ? '%' : ' px';
      document.getElementById(id + '-value').textContent = (id === 'length' ? '≈' : '') + number + unit;
      input.setAttribute('aria-valuetext', number + unit);
      field.configure({ [{ length: 'length', grain: 'grain', moisture: 'moisture', wind: 'wind', rain: 'rain', sun: 'sun', edge: 'blend', temperature: 'temperature', humidity: 'humidity' }[id]]: id === 'grain' ? number * .5 : percent ? number / 100 : number });
      if (id === 'grain') showGrainScale(number);
      if (['wind', 'rain', 'sun', 'temperature', 'humidity', 'moisture'].includes(id)) { savedWeatherActive = false; preset.value = 'custom'; document.getElementById('weather-source').textContent = 'Manual study'; }
    });
    document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
      document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      field.cancelSequence(); field.configure({ mode: button.dataset.mode });
      document.getElementById('earth-control').hidden = button.dataset.mode === 'water';
    }));
    document.getElementById('clear').addEventListener('click', () => { field.cancelSequence(); field.clearTracks(); });
    sequencePlay.addEventListener('click', () => {
      automatic = false; target = null; keys.clear(); refreshWalk();
      if (field.sequencePlaying) field.sequencePlaying = false;
      else if (field.sequenceElapsed == null || field.sequenceElapsed >= 5 + field.options.recovery) hero = field.beginSequence();
      else field.sequencePlaying = true;
    });
    sequenceTime.addEventListener('input', () => {
      automatic = false; target = null; keys.clear(); refreshWalk(); hero = field.seekSequence(+sequenceTime.value / 100 * (5 + field.options.recovery)); facing = 'south';
    });
    const arrows = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'], names = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
    direction.addEventListener('click', () => {
      angle = (angle + 1) % 8; field.configure({ angle: angle * Math.PI / 4 });
      direction.textContent = 'Wind ' + arrows[angle]; direction.setAttribute('aria-label', 'Wind direction: ' + names[angle]);
    });
    canvas.addEventListener('click', event => {
      const bounds = PixelSurface.bounds(canvas);
      target = [Math.max(16, Math.min(496, (event.clientX - bounds.left) / bounds.width * 512)), Math.max(36, Math.min(370, (event.clientY - bounds.top) / bounds.height * 384))];
      field.cancelSequence(); automatic = false; keys.clear(); refreshWalk(); canvas.focus({ preventScroll: true });
    });
    const vectors = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
    canvas.addEventListener('keydown', event => {
      if (event.key === ' ') { event.preventDefault(); if (!event.repeat) toggle(); return; }
      if (!vectors[event.key]) return; event.preventDefault(); field.cancelSequence(); automatic = false; target = null; keys.add(event.key); refreshWalk();
    });
    window.addEventListener('keyup', event => keys.delete(event.key)); window.addEventListener('blur', () => keys.clear());
    const move = dt => {
      let dx = 0, dy = 0;
      if (keys.size) { for (const key of keys) { dx += vectors[key][0]; dy += vectors[key][1]; } }
      else {
        if (!target && automatic) { target = tour[index++ % tour.length]; }
        if (target) { dx = target[0] - hero.x; dy = target[1] - hero.y; }
      }
      const distance = Math.hypot(dx, dy); if (distance < .01) { target = null; return false; }
      const under = field.materials(hero.x, hero.y), water = field.water.liquidAt(hero.x, hero.y);
      const speed = 51 - under.grass * 6 - under.earth * field.wetness('earth') * 10 - under.gravel * 4 - water * 24, amount = keys.size ? speed * dt : Math.min(distance, speed * dt);
      hero.x = Math.max(16, Math.min(496, hero.x + dx / distance * amount)); hero.y = Math.max(36, Math.min(370, hero.y + dy / distance * amount));
      facing = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'east' : 'west' : dy > 0 ? 'south' : 'north';
      if (target && amount === distance) target = null;
      return true;
    };
    const frame = now => {
      if (!document.hidden && now - drawn >= 1000 / 30) {
        const dt = Math.min(.1, (now - drawn) / 1000); drawn = now;
        let moving, step = dt;
        if (field.sequenceElapsed != null) {
          step = field.sequencePlaying ? dt : 0;
          const next = field.sequenceElapsed + step, position = SurfaceMotion.heroAt(next);
          moving = field.sequencePlaying && next > 2 && next < 5; hero = position; facing = 'south';
        } else moving = move(dt);
        const still = quiet.matches && field.sequenceElapsed == null;
        field.advance(step, hero, still);
        const started = performance.now(), options = { motion: moving ? 'walk' : 'idle', elapsed: field.time * 1000, direction: facing };
        surface.prepare(ctx);
        field.paint(ctx, hero, () => { ctx.save(); ctx.translate(Math.round(hero.x * 2) / 2, Math.round(hero.y * 2) / 2); ctx.scale(2, 2); QuestMotion.keeper(ctx, 0, 0, avatar, {}, options); ctx.restore(); },
          () => { ctx.save(); ctx.scale(2, 2); QuestMotion.keeper(ctx, 0, 0, avatar, {}, { ...options, shadow: true }); ctx.restore(); }, still);
        drawMs = drawMs * .9 + (performance.now() - started) * .1;
        if (now - telemetry > 300) {
          telemetry = now; const material = field.materials(hero.x, hero.y), weight = material.grass, stats = field.stats;
          applyLook(); sound.update(field, hero, look); const audio = sound.snapshot();
          document.getElementById('adaptive-status').textContent = field.options.colourDriver!=='manual'&&field.options.adaptation===0?'Adaptation off · manual colours':field.adaptive ? hourLabel(field.adaptive.hour)+' · effective exposure '+Math.round(+canvas.dataset.effectiveExposure*100)+'% · saturation '+Math.round(+canvas.dataset.effectiveSaturation*100)+'%' : field.options.colourDriver==='recorded'?'Waiting for saved weather · manual colours retained':'Manual colour controls';
          const sequence = field.sequenceState;
          sequencePhase.textContent = sequence?.phase || 'Ready'; sequenceTime.value = sequence ? sequence.progress * 100 : 0;
          sequencePlay.textContent = field.sequencePlaying ? 'Pause sequence' : sequence?.phase === 'At rest' ? 'Replay sequence' : sequence ? 'Resume sequence' : 'Play sequence';
          const water = field.water.at(hero.x, hero.y), soil = field.wetness('earth');
          document.getElementById('surface-label').textContent = water > .2 ? (field.water.iceAt(hero.x, hero.y) > .7 ? 'Frozen water · ice' : field.water.iceAt(hero.x, hero.y) > .1 ? 'Partly frozen water' : field.water.isPuddle(hero.x, hero.y) ? 'Puddle · ripples underfoot' : 'Shallow water · flowing') : weight > .8 ? 'Rooted grass · ' + field.growthHeight(TerrainStudy.growthPatch(hero.x, hero.y)) + ' px' : material.gravel > .6 ? 'Gravel · small mineral grains' : material.earth > .6 ? (soil > .65 ? 'Muddy earth · cohesive grain' : soil < .25 ? 'Dry earth · loose dust' : 'Earth · clustered grain') : material.sand > .6 ? (field.wetness('sand') > .5 ? 'Wet sand · compacted grains' : 'Dry sand · fine drifting grains') : 'Mixed ground';
          document.getElementById('conditions').textContent = (soil > .65 ? 'Muddy' : soil > .3 ? 'Damp' : 'Dry') + ' soil · ' + Math.round(soil * 100) + '% · ' + stats.puddles + ' puddles';
          document.getElementById('material-state').textContent = (field.weather.frost > .3 ? 'Frosted ground' : field.weather.earth.mud > .4 ? 'Soft mud' : soil < .25 ? 'Fine soil · dry aggregates' : 'Damp, cohesive soil') + ' · Water ' + field.weather.waterTemperature.toFixed(1) + '°C · Ice ' + Math.round(field.weather.ice * 100) + '% · Drying ' + field.weather.evaporation.toFixed(1) + '×';
          const granular = SurfaceVariation.types.reduce((a, type) => material[type] > (material[a] || 0) ? type : a, 'grass');
          document.getElementById('grain-local').textContent = granular === 'grass' ? 'Underfoot · grass / water' : 'Underfoot · ' + granular + ' ' + (SurfaceDynamics.properties[granular].grain * field.options.grain * 2 * field.variation.sample(granular, hero.x, hero.y)).toFixed(3) + ' px';
          const memory = sceneCache.stats; document.getElementById('scene-memory').textContent = memory.entries + '/' + memory.maxEntries + ' saved map states · ' + (memory.bytes / 1024).toFixed(1) + ' KiB · inactive maps paused';
          Object.assign(canvas.dataset, { hero: hero.x.toFixed(2) + ',' + hero.y.toFixed(2), mode: field.options.mode, length: field.options.length, wind: field.options.wind, angle: field.options.angle, edge: field.options.blend,
            layout: field.options.layout, rain: field.options.rain, sun: field.options.sun, weatherSpeed: field.options.speed, wetness: soil.toFixed(3), pooling: stats.pooling.toFixed(3), puddles: stats.puddles, ripples: stats.ripples,
            grain: field.options.grain, moisture: field.options.moisture, earthWeight: material.earth.toFixed(3), sandWeight: material.sand.toFixed(3), gravelWeight: material.gravel.toFixed(3), waterWeight: water.toFixed(3), earthTracks: stats.earthTracks, gravelTracks: stats.gravelTracks,
            growthMean: stats.growth.mean.toFixed(2), growthMin: stats.growth.min, growthMax: stats.growth.max,
            sequence: sequence?.phase || 'Ready', sequenceAt: field.sequenceElapsed ?? '', sequencePlaying: field.sequencePlaying, recovery: field.options.recovery, shade: field.options.shade,
            fluidCells: stats.fluid.cells, fluidSpeed: stats.fluid.maxSpeed.toFixed(4), divergence: stats.fluid.divergence.toFixed(5), vectors: field.options.vectors,
            temperature: field.options.temperature, humidity: field.options.humidity, ice: field.weather.ice.toFixed(3), frost: field.weather.frost.toFixed(3), waterTemperature: field.weather.waterTemperature.toFixed(2), waterLoss: field.weather.waterLoss.toFixed(3), mud: field.weather.earth.mud.toFixed(3), seasonFrom: field.options.seasonFrom, seasonTo: field.options.seasonTo, seasonBlend: field.options.seasonBlend,
            variation: field.options.variation, edgeGrain: field.options.edgeGrain, pathWear: field.options.pathWear, wornCells: stats.variation.wornCells, grainCacheBytes: stats.grainBytes, sceneStates: memory.entries, sceneStateBytes: memory.bytes, savedWeatherActive, weatherAt: field.weatherAt || '',
            richness: field.options.richness, lightPalette: field.options.lightPalette, lightStrength: field.options.lightStrength, lightSaturation: field.options.lightSaturation,
            reflectionStrength:field.options.reflectionStrength,reflectionView:field.options.reflectionView,reflectionCounts:JSON.stringify(stats.reflections.counts),reflectionBytes:stats.reflections.bytes,colourDriver:field.options.colourDriver,studyHour:field.options.studyHour,observedHour:field.options.observedHour??'',adaptation:field.options.adaptation,
            audioEnabled:audio.enabled,audioState:audio.state,audioVoices:audio.voices,audioBeds:audio.ambientBeds,audioNoiseBytes:audio.noiseBytes,audioCues:JSON.stringify(audio.cuesAccepted||{}),audioTimer:audio.timerActive,audioTrack:audio.track||'',audioPeakVoices:audio.peakVoices||0,
            weight: weight.toFixed(3), moving, cells: stats.cells, bent: stats.bent, tracks: stats.tracks, trails: stats.trails, dust: stats.dust, frames: stats.frames, cacheBytes: stats.bytes, drawMs: drawMs.toFixed(2) });
        }
      } else if (document.hidden) drawn = now;
      requestAnimationFrame(frame);
    };
    canvas.dataset.ready = 'true'; status.hidden = true; requestAnimationFrame(frame);
    addEventListener('pagehide', event => { if (!event.persisted) { clearTimeout(seasonTimer); surface.dispose(); field.dispose(); sceneCache.clear(); sound.dispose(); } });
  } catch (error) { status.textContent = error.message; status.setAttribute('role', 'alert'); }
})();
