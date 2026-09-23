/* Cosmetic material study. No app stores, maintenance records or sync access. */
const TerrainStudy = (() => {
  const W = 512, H = 384, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const random = (x, y, seed = 0) => { let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed, 1274126177); n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
  function noise(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), u = smooth(0, 1, x - ix), v = smooth(0, 1, y - iy);
    return mix(mix(random(ix, iy, seed), random(ix + 1, iy, seed), u), mix(random(ix, iy + 1, seed), random(ix + 1, iy + 1, seed), u), v);
  }
  function growthPatch(x, y) {
    const xx = x + Math.sin(y / 74) * 19, yy = y + Math.sin(x / 92) * 22;
    return noise(xx / 76, yy / 76, 307) * .84 + noise(xx / 31, yy / 31, 901) * .16;
  }
  function fitGrowth(samples, average) {
    const low = Math.min(...samples), high = Math.max(...samples), target = clamp((average - 10) / 30, 0, 1);
    const normalized = v => clamp((v - low) / Math.max(.001, high - low), 0, 1);
    let a = .015, b = 24;
    for (let n = 0; n < 22; n++) {
      const power = (a + b) / 2, mean = samples.reduce((sum, v) => sum + normalized(v) ** power, 0) / samples.length;
      if (mean > target) a = power; else b = power;
    }
    const power = (a + b) / 2;
    // Two-pixel steps keep the shared pose cache small. Individual blade
    // lengths still vary inside each tuft, while whole patches remain smooth.
    return v => target === 0 ? 10 : target === 1 ? 40 : Math.round((10 + 30 * normalized(v) ** power) / 2) * 2;
  }
  const Maps = typeof window === 'undefined' ? require('./maps.js') : window.SurfaceMaps;
  function grassWeight(x, y, blend = 24, mode = 'blend', layout = 'garden') { return Maps.sample(x, y, blend, mode, layout).grass; }
  function rootEligible(x, y, blend, mode, layout = 'garden') { return x >= 0 && y >= 0 && x < W && y < H && random(x, y, 23) < grassWeight(x, y, blend, mode, layout); }
  function materialWeights(x, y, blend = 24, mode = 'blend', layout = 'garden') { return Maps.sample(x, y, blend, mode, layout); }
  function footprintOpacity(age, wind) {
    const life = mix(5, 2, clamp(wind, 0, 1));
    return .48 * Math.max(0, 1 - Math.max(0, age) / life) ** 1.6;
  }
  function makeCanvas(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function pixel(g, colour, x, y, w = 1, h = 1) { g.fillStyle = colour; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function oval(g, colour, x, y, rx, ry) {
    for (let yy = -Math.ceil(ry); yy <= ry; yy++) { const dx = Math.sqrt(Math.max(0, 1 - (yy / ry) ** 2)) * rx; pixel(g, colour, x - dx, y + yy, Math.max(1, dx * 2), 1); }
  }
  class Field {
    constructor(options = {}) {
      this.options = { length: 20, grain: .5, variation: .55, edgeGrain: .55, pathWear: .65, moisture: .35, wind: .35, angle: 0, blend: 24, mode: 'blend', layout: 'garden', rain: 0, sun: .65, speed: 1, temperature: 18, humidity: .55, seasonFrom: 'summer', seasonTo: 'autumn', seasonBlend: 0, richness: 1.25, lightPalette: 'sun', lightStrength: .55, lightSaturation: 1, keyLight: '#ffe3a5', shadowColour: '#425880', vectors: false, shade: .55, recovery: 8, ...options };
      this.options = { ...SurfaceReflections.defaults, colourDriver: 'manual', studyHour: 18, observedHour: null, adaptation: .75, ...this.options };
      this.weather = new SurfaceWeather.State(this.options.moisture); this.water = new SurfaceWater.Layer(); this.reflections = new SurfaceReflections.Layer(); this.sequenceWeather = null;
      // grainRes: grain texture resolution per scene pixel (2 in the lab; 1 is enough on a phone).
      // grainRate / grassRate: optional caps (Hz) on grain re-renders and grass layer rebuilds.
      const grainRes = Math.max(1, Math.min(2, Math.round(this.options.grainRes || 2)));
      this.variation = new SurfaceVariation.Field(); this.grainScratch = makeCanvas(W * grainRes, H * grainRes);
      this.grainLayers = Object.fromEntries(SurfaceVariation.types.map(type => [type, new SurfaceGrainLayer.Layer(type, this.variation, this.grainScratch, grainRes)]));
      this.sandGrains = this.grainLayers.sand.output; this.earthGrains = this.grainLayers.earth.output;
      this.sandOffset = { x: 0, y: 0 }; this.earthOffset = { x: 0, y: 0 };
      this.base = makeCanvas(); this.wetBase = makeCanvas(); this.grassLayer = makeCanvas(); this.frames = new Map(); this.bytes = 0;
      this.grassShadow = makeCanvas(); this.foregroundGrass = makeCanvas(); this.sequenceElapsed = null; this.sequencePlaying = false;
      this.sandMask = this.grainLayers.sand.mask; this.earthMask = this.grainLayers.earth.mask;
      this.sandLight = makeCanvas(); this.lightSample = makeCanvas(128, 96); this.lightPixels = this.lightSample.getContext('2d').createImageData(128, 96);
      this.patchMap = Array.from({ length: 64 * 48 }, (_, i) => growthPatch(i % 64 * 8 + 4, Math.floor(i / 64) * 8 + 4));
      this.tracks = []; this.dust = []; this.time = 0; this.distance = 0; this.step = 0; this.dirty = true;
      this.keyLayer = makeCanvas(128, 96); this.shadeLayer = makeCanvas(128, 96);
      this.setPalette();
      this.build();
    }
    setPalette() {
      this.season = SurfaceColour.season(this.options.seasonFrom, this.options.seasonTo, this.options.seasonBlend);
      this.palettes = [.35, .65, 1].map(growth => SurfaceColour.grassPalette(QuestZones.meadowPalette(QuestZones.zoneStyle('GP'), growth), this.season, this.options.richness));
      this.frames.clear(); this.bytes = 0; this.dirty = true;
      this.buildLighting();
    }
    buildLighting() {
      this.light = SurfaceColour.lighting(this.options);
      this.adaptive = SurfaceAdaptiveColour.forField(this);
      if (this.adaptive) { this.light.key = SurfaceAdaptiveColour.blend(this.light.key, this.adaptive.key, this.options.adaptation); this.light.shadow = SurfaceAdaptiveColour.blend(this.light.shadow, this.adaptive.shadow, this.options.adaptation); }
      this.shadowInk = this.season.shadow.map((v, i) => mix(v, this.light.shadow[i], this.options.lightStrength));
      for (const [layer, colour, start, end] of [[this.keyLayer, this.light.key, .38, .015], [this.shadeLayer, this.light.shadow, .035, .38]]) {
        const g = layer.getContext('2d'); g.clearRect(0, 0, 128, 96);
        const gradient = g.createLinearGradient(0, 0, 128, 96);
        gradient.addColorStop(0, `rgba(${colour.join(',')},${start})`); gradient.addColorStop(1, `rgba(${colour.join(',')},${end})`);
        g.fillStyle = gradient; g.fillRect(0, 0, 128, 96);
      }
      this.dirty = true;
    }
    paintLighting(g) {
      if (!this.options.lightStrength) return;
      g.save(); g.imageSmoothingEnabled = true; g.globalAlpha = this.options.lightStrength;
      g.globalCompositeOperation = 'multiply'; g.drawImage(this.shadeLayer, 0, 0, W, H);
      g.globalCompositeOperation = 'screen'; g.drawImage(this.keyLayer, 0, 0, W, H); g.restore();
    }
    weight(x, y) { return grassWeight(x, y, this.options.blend, this.options.mode, this.options.layout); }
    materials(x, y) { return materialWeights(x, y, this.options.blend, this.options.mode, this.options.layout); }
    configure(changes) {
      const topology = ['blend', 'mode', 'layout'].some(k => changes[k] != null && changes[k] !== this.options[k]);
      const season = ['seasonFrom', 'seasonTo', 'seasonBlend', 'richness'].some(k => changes[k] != null && changes[k] !== this.options[k]);
      const regional = ['variation', 'edgeGrain', 'pathWear'].some(k => changes[k] != null && changes[k] !== this.options[k]);
      const lighting = ['lightPalette', 'lightStrength', 'lightSaturation', 'keyLight', 'shadowColour', 'colourDriver', 'studyHour', 'observedHour', 'adaptation'].some(k => Object.prototype.hasOwnProperty.call(changes, k) && changes[k] !== this.options[k]);
      const rebuild = topology || season || ['length', 'grain'].some(k => changes[k] != null && changes[k] !== this.options[k]);
      const grains = topology || changes.grain != null && changes.grain !== this.options.grain;
      if (['moisture', 'temperature', 'humidity', 'rain', 'wind', 'sun'].some(k => changes[k] != null)) { this.weatherStamp = null; this.weatherAt = null; }
      Object.assign(this.options, changes); this.options.length = clamp(this.options.length, 10, 40); this.options.grain = clamp(this.options.grain, .125, 2);
      for (const key of ['variation', 'edgeGrain', 'pathWear']) this.options[key] = clamp(this.options[key], 0, 1);
      this.options.wind = clamp(this.options.wind, 0, 1); this.options.blend = clamp(this.options.blend, 0, 48);
      this.options.shade = clamp(this.options.shade, 0, 1); this.options.recovery = clamp(this.options.recovery, 4, 12);
      this.options.moisture = clamp(this.options.moisture, 0, 1);
      this.options.rain = clamp(this.options.rain, 0, 1); this.options.sun = clamp(this.options.sun, 0, 1); this.options.speed = clamp(this.options.speed, 1, 8);
      this.options.temperature = clamp(this.options.temperature, -15, 45); this.options.humidity = clamp(this.options.humidity, 0, 1); this.options.seasonBlend = clamp(this.options.seasonBlend, 0, 1);
      this.options.richness = clamp(this.options.richness, .6, 1.8); this.options.lightStrength = clamp(this.options.lightStrength, 0, 1); this.options.lightSaturation = clamp(this.options.lightSaturation, 0, 2);
      this.options.studyHour = clamp(this.options.studyHour, 0, 24); this.options.adaptation = clamp(this.options.adaptation, 0, 1);
      for (const key of ['reflectionStrength', 'reflectionWet']) this.options[key] = clamp(this.options[key], 0, 1.5);
      for (const key of ['reflectionRoughness', ...SurfaceReflections.names.map(n => 'reflect' + n[0].toUpperCase() + n.slice(1))]) this.options[key] = clamp(this.options[key], 0, 1);
      if (changes.moisture != null) { this.weather.reset(this.options.moisture); this.syncWater(); this.sequenceWeather = null; }
      if (season) this.setPalette();
      else if (lighting) this.buildLighting();
      this.dirty = true;
      if (rebuild) { if (topology) this.clearTracks(); this.build(topology); }
      else if (regional) this.variation.configure(this.options, (x, y) => this.materials(x, y));
      if (grains && !topology) this.buildGrains();
    }
    syncWater() { this.water.update(this.weather.pooling, this.weather.waterLoss); this.water.ice = this.weather.ice; }
    applyWeatherRecord(record, { preserveState = false } = {}) {
      const climate = SurfaceClimate.fromRecord(record); if (!climate) return null;
      this.cancelSequence(); this.configure(climate.options); this.clearTracks(); if (!preserveState) this.weather.reset(this.options.moisture);
      // Deterministic visual initialization; this is not elapsed real weather.
      for (let i = 0; i < 120; i++) { this.weather.advance(.25, { ...this.options, speed: 1 }); if (preserveState) this.variation.advance(.25, this.options.rain); }
      this.weatherStamp = JSON.stringify([climate.at, climate.options]); this.weatherAt = climate.at;
      this.syncWater(); this.dirty = true; return climate;
    }
    adaptWeatherOnEntry(record) {
      const climate = SurfaceClimate.fromRecord(record); if (!climate) return false;
      if (JSON.stringify([climate.at, climate.options]) === this.weatherStamp) return false;
      if (this.weatherAt && climate.at && Date.parse(climate.at) < Date.parse(this.weatherAt)) return false;
      this.applyWeatherRecord(record, { preserveState: true }); return true;
    }
    snapshotScene(hero) {
      return { version:1, weather:this.weather.snapshot(), wear:this.variation.snapshot(), time:this.time, step:this.step,
        sandOffset:{...this.sandOffset},earthOffset:{...this.earthOffset},hero:{...hero},weatherStamp:this.weatherStamp||null,weatherAt:this.weatherAt||null };
    }
    restoreScene(snapshot) {
      this.cancelSequence(); this.clearTracks(); this.frames.clear(); this.bytes = 0;
      if (snapshot) this.weather.restore(snapshot.weather); else this.weather.reset(this.options.moisture);
      this.variation.restore(snapshot?.wear); this.time = snapshot?.time || 0; this.step = snapshot?.step || 0;
      this.sandOffset = { ...(snapshot?.sandOffset || {x:0,y:0}) }; this.earthOffset = { ...(snapshot?.earthOffset || {x:0,y:0}) };
      this.weatherStamp = snapshot?.weatherStamp || null; this.weatherAt = snapshot?.weatherAt || null;
      const hero = snapshot?.hero || Maps.spawn(this.options.layout); this.lastHero = {...hero};
      this.syncWater(); this.lightTick = null; this.dirty = true; return {...hero};
    }
    dispose() {
      this.frames.clear(); this.bytes = 0;
      for (const layer of Object.values(this.grainLayers)) layer.dispose();
      for (const value of Object.values(this)) if (value?.getContext) value.width = value.height = 1;
      this.water.dispose(); this.reflections.dispose(); this.variation = null; this.lightPixels = null; this.patchMap.length = 0;
      this.cells.length = this.tracks.length = this.dust.length = 0; this.disposed = true;
    }
    clearTracks() {
      this.water.clear();
      this.tracks.length = 0; this.dust.length = 0; this.distance = 0;
      for (const c of this.cells || []) { c.flatten = c.bend = c.bendVelocity = c.trailPressure = c.trailBend = 0; c.touchedAt = -Infinity; } this.dirty = true;
    }
    get sequenceState() { return this.sequenceElapsed == null ? null : SurfaceMotion.sequence(this.sequenceElapsed, this.options.recovery); }
    resetWeather() { this.weather.reset(this.options.moisture); this.syncWater(); this.sequenceWeather = null; this.dirty = true; }
    wetness(type) { return this.weather.moisture[type] || 0; }
    beginSequence(retainWeather = false) {
      if (!retainWeather || !this.sequenceWeather) { this.sequenceWeather = this.weather.snapshot(); this.sequenceWear = this.variation.snapshot(); }
      this.weather.restore(this.sequenceWeather); this.syncWater();
      this.variation.restore(this.sequenceWear);
      this.sandOffset = { x: 0, y: 0 }; this.earthOffset = { x: 0, y: 0 }; this.grainTick = this.earthTick = null;
      this.clearTracks(); this.time = 0; this.step = 0; this.sequenceElapsed = 0; this.sequencePlaying = true;
      for (const c of this.cells) { c.windBend = c.windVelocity = 0; c.length = c.targetLength; c.tone = c.length < 18 ? 0 : c.length < 28 ? 1 : 2; }
      this.lastHero = SurfaceMotion.heroAt(0); this.lightTick = null;
      return { ...this.lastHero };
    }
    cancelSequence() { this.sequenceElapsed = null; this.sequencePlaying = false; this.sequenceWeather = null; this.sequenceWear = null; this.dirty = true; }
    seekSequence(time) {
      this.seeking = true; this.beginSequence(true); const end = clamp(time, 0, 5 + this.options.recovery); let hero = SurfaceMotion.heroAt(0);
      while (this.sequenceElapsed < end - .00001) {
        const step = Math.min(1 / 30, end - this.sequenceElapsed); hero = SurfaceMotion.heroAt(this.sequenceElapsed + step); this.advance(step, hero);
      }
      this.sequenceElapsed = end; this.sequencePlaying = false; this.seeking = false; this.dirty = true; return hero;
    }
    build(reseed = true) {
      if (reseed) {
        this.cells = QuestZones.createMeadow({ width: W, height: H, eligible: (x, y) => rootEligible(x, y, this.options.blend, this.options.mode, this.options.layout) });
        this.rows = new Map(); for (const c of this.cells) { const row = Math.floor(c.y / 16); if (!this.rows.has(row)) this.rows.set(row, []); this.rows.get(row).push(c); }
        for (const c of this.cells) {
          c.weight = this.weight(c.x, c.y); c.patch = growthPatch(c.x, c.y);
          c.variant = Math.floor(random(c.x, c.y, 37) * 4); c.phase = random(c.x, c.y, 82) * TAU;
        }
      }
      const interior = this.cells.filter(c => c.weight > .95);
      this.growthHeight = fitGrowth(interior.length ? interior.map(c => c.patch) : this.patchMap, this.options.length);
      for (const c of this.cells) { c.targetLength = this.growthHeight(c.patch) * (c.settle || 1); c.length ??= c.targetLength; c.tone = c.length < 18 ? 0 : c.length < 28 ? 1 : 2; }
      const heights = interior.map(c => c.targetLength);
      this.growthStats = { mean: heights.length ? heights.reduce((a, b) => a + b, 0) / heights.length : 0, min: heights.length ? Math.min(...heights) : 0, max: heights.length ? Math.max(...heights) : 0 };
      this.variation.configure(this.options, (x, y) => this.materials(x, y));
      const g = this.base.getContext('2d'), pixels = g.createImageData(W, H), wetPixels = g.createImageData(W, H);
      const masks = Object.fromEntries(SurfaceVariation.types.map(type => [type, g.createImageData(W, H)]));
      const waterAlpha = new Uint8Array(W * H), waterDepth = new Float32Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const material = this.materials(x, y), broad = Math.sin(x * .017 + y * .006) * 1.7 + Math.cos(y * .027) * 1.5;
        const noise = (random(x, y, 4) - .5) * 7, patch = (this.growthHeight(this.patchMap[Math.floor(y / 8) * 64 + Math.floor(x / 8)]) - 10) / 30;
        const grass = [139 - patch * 15 + broad + noise * .4, 180 - patch * 10 + broad + noise * .4, 108 - patch * 8 + broad + noise * .35];
        const dry = SurfaceColour.tint(grass, 'grass', this.season, this.options.richness);
        const wet = SurfaceColour.tint(grass.map((v, k) => v - [20, 19, 9][k]), 'grass', this.season, this.options.richness);
        const bed = SurfaceColour.tint([168 + broad + noise*.3, 151 + broad + noise*.3, 114 + broad + noise*.2], 'sand', this.season, this.options.richness);
        const i = (y * W + x) * 4, amount = material.grass + material.water;
        if (amount) for (let k = 0; k < 3; k++) {
          pixels.data[i + k] = (dry[k] * material.grass + bed[k] * material.water) / amount;
          wetPixels.data[i + k] = (wet[k] * material.grass + bed[k] * material.water) / amount;
        }
        pixels.data[i + 3] = wetPixels.data[i + 3] = Math.round(amount * 255);
        for (const type of SurfaceVariation.types) masks[type].data[i + 3] = Math.round(material[type] * 255);
        waterAlpha[y * W + x] = Math.round(material.water * 255);
        if (material.water) waterDepth[y * W + x] = Maps.depth(x, y, this.options.layout, this.options.mode);
      }
      g.putImageData(pixels, 0, 0); this.wetBase.getContext('2d').putImageData(wetPixels, 0, 0);
      for (const type of SurfaceVariation.types) this.grainLayers[type].setMask(masks[type]);
      this.hasEarth = this.grainLayers.earth.active; this.hasSand = this.grainLayers.sand.active;
      if (reseed || !this.water.permanent) this.water.setup(waterAlpha, waterDepth, (x, y) => this.materials(x, y));
      if (reseed || !this.reflections.sites.length) this.reflections.setup((x, y) => this.materials(x, y));
      this.syncWater(); this.buildGrains(); this.lightTick = null; this.dirty = true;
    }
    buildGrains() {
      for (const layer of Object.values(this.grainLayers)) layer.configure(this.options, this.season);
      this.grains = this.grainLayers.sand.sources[1].dry;
      this.earthSource = this.grainLayers.earth.sources[1].dry; this.earthWetSource = this.grainLayers.earth.sources[1].wet;
    }
    paintGround(g, quiet) {
      g.save(); g.clearRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 1 - this.wetness('grass'); g.drawImage(this.base, 0, 0);
      g.globalAlpha = this.wetness('grass'); g.drawImage(this.wetBase, 0, 0); g.globalAlpha = 1;
      const grainDue = !this.options.grainRate || this.time - (this.grainAt ?? -1) >= 1 / this.options.grainRate;
      if (grainDue) { this.grainAt = this.time; this.grainOffsets = { sand: { ...this.sandOffset }, earth: { ...this.earthOffset } }; }
      for (const type of SurfaceVariation.types) {
        const layer = this.grainLayers[type]; if (!layer.active) continue;
        layer.render(quiet || type === 'gravel' ? {x:0,y:0} : this.grainOffsets[type], this.wetness(type), grainDue);
        g.drawImage(layer.output, 0, 0, W, H);
      }
      g.restore();
    }
    paintSandLight(g, quiet, includeGrains = true) {
      if (!this.hasSand) return;
      const offset = quiet ? { x: 0, y: 0 } : this.sandOffset, ox = Math.round(offset.x * 2) / 2, oy = Math.round(offset.y * 2) / 2;
      const tick = ox + '/' + oy;
      if (tick !== this.lightTick) {
        const data = this.lightPixels.data;
        for (let y = 0; y < 96; y++) for (let x = 0; x < 128; x++) {
          // All tones follow the same accumulated displacement as the grains.
          // Periodic waves also stay continuous when the texture wraps.
          const xx = (x * 4 - ox) / W * TAU, yy = (y * 4 - oy) / H * TAU;
          const wave = Math.sin(xx * 3) * .52 + Math.sin(yy * 3 + xx) * .3 + Math.sin(xx * 5 + yy * 4) * .18;
          const colour = wave >= 0 ? [252, 231, 180] : [171, 139, 91], i = (y * 128 + x) * 4;
          data[i] = colour[0]; data[i + 1] = colour[1]; data[i + 2] = colour[2]; data[i + 3] = Math.abs(wave) * (wave >= 0 ? 66 : 27);
        }
        this.lightSample.getContext('2d').putImageData(this.lightPixels, 0, 0);
        const light = this.sandLight.getContext('2d'); light.clearRect(0, 0, W, H); light.imageSmoothingEnabled = true;
        light.drawImage(this.lightSample, 0, 0, W, H); light.globalCompositeOperation = 'destination-in'; light.drawImage(this.sandMask, 0, 0); light.globalCompositeOperation = 'source-over';
        this.lightTick = tick;
      }
      g.drawImage(this.sandLight, 0, 0);
      if (includeGrains) { this.grainLayers.sand.render(offset, this.wetness('sand')); g.drawImage(this.sandGrains, 0, 0, W, H); }
    }
    paintEarthGrains(g, quiet) {
      if (!this.hasEarth) return;
      this.grainLayers.earth.render(quiet ? {x:0,y:0} : this.earthOffset, this.wetness('earth'));
      g.drawImage(this.earthGrains, 0, 0, W, H);
    }
    shape(cell, time, quiet, mask = cell.mask) {
      const demo = this.sequenceState, growth = demo?.growth ?? 1;
      const edge = .3 + .7 * smooth(.02, .92, cell.weight), maximum = Math.max(3, Math.round(cell.length * edge * growth));
      const shape = QuestZones.meadowShape(cell, { growth: 1, lushness: 80, time, wind: this.options.wind, quiet, maximum });


      const sweep = demo ? demo.bend * Math.sin(cell.x * .017 + cell.y * .01 - time * 1.1) * 2.8 : 0;
      shape.pose = quiet ? 0 : clamp(Math.round((cell.windBend || 0) + cell.bend * .7 + sweep), -6, 6);
      shape.mask = mask; return shape;
    }
    sprite(cell, time, quiet, mask = cell.mask) {
      const shape = this.shape(cell, time, quiet, mask), key = [shape.height, shape.amount, shape.pose, shape.variant, shape.mask, cell.tone].join('/');
      if (!this.frames.has(key)) {
        const image = QuestZones.meadowSprite(shape, this.palettes[cell.tone]); this.frames.set(key, image); this.bytes += image.width * image.height * 4;
        while (this.bytes > (this.options.spriteCacheBytes || 4 * 1048576) || this.frames.size > (this.options.spriteCacheSize || 768)) { const key = this.frames.keys().next().value, old = this.frames.get(key); this.frames.delete(key); this.bytes -= old.width * old.height * 4; }
      }
      return this.frames.get(key);
    }
    stampStep(hero, vx, vy) {
      const heading = Math.atan2(vy, vx), side = this.step++ % 2 ? -1 : 1;
      const x = hero.x - Math.sin(heading) * side * 3, y = hero.y + Math.cos(heading) * side * 2;
      const m = this.materials(x, y), water = this.water.at(x, y), land = 1 - water;
      if (water > .12) this.water.step(x, y, this.time, water, vx, vy);
      const sand = m.sand * land, earth = m.earth * land, gravel = m.gravel * land;
      if (!this.seeking) this.onStep?.({ x, y, material: m, liquid: this.water.liquidAt(x,y), ice: this.water.iceAt(x,y), wet: this.wetness('earth') });
      this.variation.step(x, y, sand + earth + gravel);
      if (sand + earth + gravel > .12) {
        this.tracks.push({ x, y, angle: heading + Math.PI / 2, at: this.time, sand, earth, gravel, seed: this.step });
        if (this.tracks.length > 100) this.tracks.shift();
        const type = gravel > Math.max(sand, earth) ? 'gravel' : earth > sand ? 'earth' : 'sand', wet = this.wetness(type);
        const count = Math.round((type === 'sand' ? 4 : type === 'earth' ? 2 : 0) * this.weather.dust(type));
        for (let n = 0; n < count; n++) {
          const r = random(this.step, n, 8), theta = heading + Math.PI + (r - .5) * 1.8, speed = type === 'sand' ? 5 + r * 9 : 3 + r * 5;
          this.dust.push({ x, y, vx: Math.cos(theta) * speed, vy: Math.sin(theta) * speed, age: 0,
            life: type === 'sand' ? .4 + r * .45 : .25 + r * .35, windScale: type === 'sand' ? 1 - wet : .22 * (1 - wet),
            colour: type === 'sand' ? '#f9e7b6' : type === 'earth' ? '#b99367' : '#bab6a0' });
        }
        if (this.dust.length > 160) this.dust.splice(0, this.dust.length - 160);
      }
    }
    advance(dt, hero, quiet = false) {
      if (this.disposed) return;
      this.time += dt;
      this.weather.advance(dt, this.options); this.syncWater(); this.variation.advance(dt, this.options.rain);
      const adaptiveKey = JSON.stringify([this.options.colourDriver, this.options.studyHour, this.options.observedHour, this.options.adaptation, this.options.temperature, this.options.humidity, this.options.rain, this.options.sun, Math.round(this.weather.frost*16)]);
      if (adaptiveKey !== this.adaptiveKey) { this.adaptiveKey = adaptiveKey; if (this.options.colourDriver !== 'manual') this.buildLighting(); }
      const wetKey = Math.round(this.wetness('grass') * 32) + '/' + Math.round(this.weather.frost * 32); if (wetKey !== this.wetKey) { this.wetKey = wetKey; this.dirty = true; }
      this.water.advance(dt, this.options, quiet);
      if (!quiet) for (const type of ['sand', 'earth']) {
        const velocity = SurfaceDynamics.drift(type, this.wetness(type), W / 2, H / 2, this.time, this.options.wind, this.options.angle), offset = this[type + 'Offset'];
        offset.x = (offset.x + velocity.x * dt * (1 - this.weather.frost)) % W; offset.y = (offset.y + velocity.y * dt * (1 - this.weather.frost)) % H;
      }
      this.water.ripples = this.water.ripples.filter(p => this.time - p.at < 1.5);
      if (this.sequencePlaying) {
        this.sequenceElapsed = Math.min(5 + this.options.recovery, this.sequenceElapsed + dt);
        if (this.sequenceElapsed >= 5 + this.options.recovery) this.sequencePlaying = false;
      }
      const old = this.lastHero || hero, dx = hero.x - old.x, dy = hero.y - old.y;
      const vx = dt ? dx / dt : 0, vy = dt ? dy / dt : 0;
      this.distance += Math.hypot(dx, dy);
      if (this.distance >= 8) { this.distance %= 8; this.stampStep(hero, vx, vy); }
      for (const c of this.cells) {
        const air = SurfaceDynamics.wind(c.x, c.y, this.time, this.options.wind, this.options.angle);
        for (let remaining = dt; remaining > 0; remaining -= .05) SurfaceDynamics.windSpring(c, air, Math.min(.05, remaining), this.wetness('grass'), quiet);
        if (Math.abs(c.targetLength - c.length) > .01) {
          c.length += (c.targetLength - c.length) * (1 - Math.exp(-dt / (.45 + c.patch * .55)));
          if (Math.abs(c.targetLength - c.length) < .01) c.length = c.targetLength;
          c.tone = c.length < 18 ? 0 : c.length < 28 ? 1 : 2; this.dirty = true;
        }
        if (Math.abs(c.x - hero.x) < 26 && Math.abs(c.y - hero.y) < 26 || Math.abs(c.bend) > .004 || c.flatten > .004 || Math.abs(c.bendVelocity) > .004) {
          // A tall blade brushes the keeper's body before its root reaches a
          // foot, so long grass parts over a wider area than the short lawn.
          const contact = { ...c, size: 1 + (c.length - 8) / 8 };
          let force = QuestEcology.passageImpulse(contact, { x: hero.x, y: hero.y, vx, vy }); const before = c.flatten + c.bend;
          if (force.pressure > .035) {
            c.touchedAt = this.time; c.trailPressure = Math.max(force.pressure, (c.trailPressure || 0) * .98); c.trailBend = force.bend;
          } else {
            const response = SurfaceMotion.grass(this.time - c.touchedAt, this.options.recovery);
            force = { pressure: (c.trailPressure || 0) * response.flatten, bend: (c.trailBend || 0) * response.bend };
          }
          for (let remaining = dt; remaining > 0; remaining -= .05) SurfaceDynamics.spring(c, force, Math.min(.05, remaining), quiet, this.wetness('grass'));
          if (Math.abs(before - c.flatten - c.bend) > .002) this.dirty = true;
        } else c.flatten = c.bend = c.bendVelocity = 0;
        if (this.time - c.touchedAt > this.options.recovery + .5) {
          if (c.flatten || c.bend || c.bendVelocity) this.dirty = true;
          c.flatten = c.bend = c.bendVelocity = c.trailPressure = c.trailBend = 0;
        }
      }
      const wx = Math.cos(this.options.angle) * this.options.wind, wy = Math.sin(this.options.angle) * this.options.wind;
      for (const p of this.dust) { p.age += dt; p.x += (p.vx + wx * 17 * p.windScale) * dt; p.y += (p.vy + wy * 17 * p.windScale) * dt; }
      this.dust = this.dust.filter(p => p.age < p.life);
      this.tracks = this.tracks.filter(p => SurfaceMotion.sand(this.time - p.at, this.options.wind, this.options.recovery).settle > .004);
      this.lastHero = { x: hero.x, y: hero.y };
    }
    paintTracks(g) {
      for (const p of this.tracks) {
        if (p.gravel > .01) SurfaceGravel.paintContact(g, p, this.time - p.at, this.options.recovery, this.options.shade, this.options.grain * 2 * this.variation.sample('gravel', p.x, p.y), this.wetness('gravel'));
        if (p.earth > .01) SurfaceEarth.paintContact(g, p, this.time - p.at, this.wetness('earth'), this.options.recovery, this.options.shade, this.options.grain * 2 * this.variation.sample('earth', p.x, p.y), this.weather.frost);
        if (p.sand < .01) continue;
        const response = SurfaceMotion.sand(this.time - p.at, this.options.wind, this.options.recovery);
        g.save(); g.translate(Math.round(p.x), Math.round(p.y)); g.rotate(p.angle);
        g.globalAlpha = response.shade * p.sand * this.options.shade; oval(g, '#9d8057', 1, 1, 7, 4);
        g.globalAlpha = response.indent * p.sand;
        pixel(g, '#987c50', -1, -3, 3, 4); pixel(g, '#ad8c56', -1, 2, 2, 1);
        g.globalAlpha = response.rim * .3 * p.sand; pixel(g, '#fff0c3', 2, -2, 1, 3); pixel(g, '#ead6a0', 0, 4, 2, 1);
        for (let i = 0; i < 7; i++) {
          const r = random(p.seed, i, 119), angle = i * 2.4, radius = 2 + response.scatter * (3 + r * 4);
          const xx = Math.cos(angle) * radius, yy = Math.sin(angle) * radius * .65;
          g.globalAlpha = response.settle * .24 * p.sand * this.options.shade; pixel(g, '#aa8b56', xx + 1, yy + 1);
          g.globalAlpha = response.settle * (.2 + response.lift * .35) * p.sand;
          pixel(g, i % 3 ? '#f3dca4' : '#b79a65', xx, yy - response.lift * (1 + r * 3));
        }
        g.restore();
      }
    }
    paintGrains(g, quiet) {
      if (quiet) return;
      const wind = this.options.wind;
      for (const type of ['sand', 'earth']) {
        const offset = this[type + 'Offset'], freedom = SurfaceDynamics.transport(type, this.wetness(type), wind) * 2 * (1 - this.weather.frost);
        for (let i = 0; i < Math.round(wind * 100); i++) {
          const x = ((random(i, 1, 14) * W + offset.x * 3) % W + W) % W;
          const y = ((random(i, 2, 14) * H + offset.y * 3) % H + H) % H;
          const strength = this.materials(x, y)[type] * freedom;
          if (strength < .015 || this.water.at(x, y) > .15) continue;
          g.globalAlpha = strength * (.13 + .15 * random(i, 3, 14));
          pixel(g, type === 'sand' ? '#f9e6b4' : '#c09b70', x, y, 1, 1);
        }
      }
      for (const p of this.dust) { g.globalAlpha = (1 - p.age / p.life) * .48; pixel(g, p.colour, p.x, p.y, 1, 1); }
      g.globalAlpha = 1;
    }
    tintGrass(layer, look = this.grassLook, rect = [0, 0, layer.width, layer.height]) {
      const g = layer.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = look.wet * .15; g.fillStyle = '#254a38'; g.fillRect(...rect);
      g.globalAlpha = look.frost * .28; g.fillStyle = '#e3ebed'; g.fillRect(...rect); g.restore();
    }
    // Rooted blades redrawn over the base of a subject that stands in the grass:
    // the keeper (defaults), or any scenery object given its contact width w
    // and height h. Only the blades rooted in front of the contact line are
    // drawn, so the subject sits in the grass instead of floating on it.
    paintForegroundGrass(g, subject, tick, quiet) {
      const w = Math.ceil(subject.w || 34), h = Math.ceil(subject.h || 47), reach = w / 2 + 37;
      const x = Math.floor(subject.x - w / 2), y = Math.floor(subject.y - h + 5);
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.imageSmoothingEnabled = false;
      for (let row = Math.floor((subject.y - 3) / 16); row <= Math.floor((subject.y + 45) / 16); row++) for (const cell of this.rows?.get(row) || []) {
        if (cell.y < subject.y - 3 || cell.y > subject.y + 45 || Math.abs(cell.x - subject.x) > reach) continue;
        const mask = QuestZones.foregroundRoots(cell, subject.y - 1); if (!mask) continue;
        const image = this.tinted(this.sprite(cell, tick / 10, quiet, mask)); g.drawImage(image, cell.x - image.width / 2, cell.y - image.height + 6);
      }
      g.restore();
    }
    // A blade sprite with the current wet / frost tint baked in, so foreground
    // blades draw straight into the scene. Small bounded cache per look.
    tinted(image) {
      const look = this.grassLook || { wet: 0, frost: 0 }, wet = Math.round(look.wet * 8) / 8, frost = Math.round(look.frost * 8) / 8;
      if (!wet && !frost) return image;
      const key = wet + '/' + frost; if (this.tintKey !== key) { this.tintKey = key; this.tints = new Map(); this.tintBytes = 0; }
      let out = this.tints.get(image);
      if (!out) {
        out = makeCanvas(image.width, image.height); const c = out.getContext('2d'); c.drawImage(image, 0, 0); this.tintGrass(out, { wet, frost });
        this.tints.set(image, out); this.tintBytes += out.width * out.height * 4;
        while (this.tintBytes > 2 * 1048576 || this.tints.size > 1024) { const first = this.tints.keys().next().value, old = this.tints.get(first); this.tints.delete(first); this.tintBytes -= old.width * old.height * 4; }
      }
      return out;
    }
    // Objects standing in the meadow: blades right at their base grow shorter,
    // as under anything that has stood in a lawn for a while.
    settle(marks = []) {
      for (const c of this.cells) { c.settle = 1; for (const m of marks) if (Math.abs(c.x - m.x) <= m.w / 2 + 3 && c.y >= m.y - 7 && c.y <= m.y + 5) { c.settle = .6; break; } }
      this.build(false);
    }
    paintBase(g, hero, quiet = false) {
      if (this.disposed) return -1;
      g.imageSmoothingEnabled = false; this.paintGround(g, quiet);
      this.paintSandLight(g, quiet, false); this.paintTracks(g); this.paintGrains(g, quiet);
      if (this.weather.frost > .01) { g.save(); g.globalAlpha = this.weather.frost * .28; g.fillStyle = '#e3ebed'; g.fillRect(0, 0, W, H); g.restore(); }
      this.water.paint(g, this.time, { ...this.options, season: this.season, sharedReflections: true }, quiet);
      const tick = quiet ? -1 : Math.floor(this.time * 10);
      const due = this.grassTick == null || !this.options.grassRate || this.time - (this.grassAt ?? -1) >= 1 / this.options.grassRate;
      if ((this.dirty || this.grassTick !== tick) && due) {
        this.grassAt = this.time;
        const field = this.grassLayer.getContext('2d'); field.clearRect(0, 0, W, H); field.imageSmoothingEnabled = false;
        const shadow = this.grassShadow.getContext('2d'); shadow.clearRect(0, 0, W, H); shadow.imageSmoothingEnabled = false;
        for (const cell of this.cells) {
          const image = this.sprite(cell, tick / 10, quiet); field.drawImage(image, cell.x - image.width / 2, cell.y - image.height + 6);
          shadow.save(); shadow.translate(cell.x, cell.y); shadow.transform(1, 0, -.62, -.32, 0, 0); shadow.drawImage(image, -image.width / 2, -image.height + 6); shadow.restore();
        }
        this.grassLook = { wet: this.wetness('grass'), frost: this.weather.frost }; this.tintGrass(this.grassLayer);
        shadow.globalCompositeOperation = 'source-in'; shadow.fillStyle = `rgb(${this.shadowInk.join(',')})`; shadow.fillRect(0, 0, W, H); shadow.globalCompositeOperation = 'source-over';
        this.grassTick = tick; this.dirty = false;
      }
      g.globalAlpha = this.options.shade * .3 * (this.sequenceState?.shade ?? 1); g.drawImage(this.grassShadow, 0, 0); g.globalAlpha = 1;
      g.drawImage(this.grassLayer, 0, 0);
      return tick;
    }
    // One actor: its cast shadow, the actor itself, wading water and the blades over its feet.
    paintActor(g, hero, tick, drawActor, drawShadow, quiet = false) {
      if (this.disposed) return;
      if (drawShadow) { g.save(); g.globalAlpha = this.options.shade * .4; g.translate(hero.x, hero.y); g.transform(1, 0, -.7, -.3, 0, 0); drawShadow(); g.restore(); }
      g.globalAlpha = this.options.shade * .27; oval(g, '#466145', hero.x, hero.y - 1, 8, 2); g.globalAlpha = 1;
      drawActor(); this.water.foreground(g, hero);
      // Redraw the same rooted blades over the actor; bending, shortening and
      // the open sandy margin create the passage, without moving the keeper.
      this.paintForegroundGrass(g, hero, tick, quiet);
    }
    // Atmosphere over everything: rain haze, lighting, rain streaks, reflections.
    paintFront(g, hero, quiet = false) {
      if (this.disposed) return;
      g.save(); g.globalAlpha = this.options.rain * .08; pixel(g, '#78939f', 0, 0, W, H); g.restore();
      this.paintLighting(g);
      if (this.options.vectors) this.water.vectors(g);
      if (!quiet) { g.save(); g.globalAlpha = .27;
        for (let i = 0; i < Math.round(this.options.rain * 95); i++) { const x = ((i * 97 + this.time * (17 + this.options.wind * 35) * Math.cos(this.options.angle)) % W + W) % W, y = (i * 61 + this.time * 160) % H;
          g.strokeStyle = '#d6e7df'; g.lineWidth = 1; g.beginPath(); g.moveTo(Math.round(x), Math.round(y)); g.lineTo(Math.round(x - this.options.wind * 5), Math.round(y - 6)); g.stroke(); }
        g.restore(); }
      this.reflections.paint(g, this, hero, quiet, this.options.reflectionView);
    }
    paint(g, hero, drawActor, drawShadow, quiet = false) {
      if (this.disposed) return;
      const tick = this.paintBase(g, hero, quiet);
      this.paintActor(g, hero, tick, drawActor, drawShadow, quiet);
      this.paintFront(g, hero, quiet);
    }
    get stats() { return { reflections: this.reflections.stats, variation: this.variation.stats, grainBytes: Object.values(this.grainLayers).reduce((n, layer) => n + layer.bytes, this.grainScratch.width * this.grainScratch.height * 4), cells: this.cells.length, bent: this.cells.filter(c => c.flatten > .05).length,
      tracks: this.tracks.filter(p => p.gravel > .02 && SurfaceGravel.response(this.time - p.at, this.options.recovery).settle > .004 || p.sand > .02 && footprintOpacity(this.time - p.at, this.options.wind) > .004 || p.earth > .02 && SurfaceEarth.response(this.time - p.at, this.wetness('earth'), this.options.recovery).indent > .004).length,
      earthTracks: this.tracks.filter(p => p.earth > .5).length, gravelTracks: this.tracks.filter(p => p.gravel > .5).length, puddles: this.water.count, ripples: this.water.ripples.length, wetness: { ...this.weather.moisture }, pooling: this.weather.pooling, trails: this.tracks.length, dust: this.dust.length, frames: this.frames.size, bytes: this.bytes, fluid: this.water.flow.stats, growth: this.growthStats }; }
  }
  return { W, H, grassWeight, materialWeights, rootEligible, growthPatch, fitGrowth, footprintOpacity, Field };
})();
if (typeof window !== 'undefined') window.TerrainStudy = TerrainStudy;
if (typeof module !== 'undefined') module.exports = TerrainStudy;
