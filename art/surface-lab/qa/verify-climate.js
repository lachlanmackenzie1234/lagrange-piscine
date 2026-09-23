/* Climate state, subpixel filtering, seasonal rendering and read-only logs. */
(async () => {
  const assert = (ok, message) => { if (!ok) throw Error(message); }, report = {};
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const wait = async fn => { for (let n = 0; n < 100; n++) { if (fn()) return; await pause(100); } throw Error('Climate UI timed out'); };
  const evolve = (state, seconds, options) => { for (let i = 0; i < seconds * 4; i++) state.advance(.25, options); return state; };
  const cold = evolve(new SurfaceWeather.State(.9), 100, SurfaceWeather.presets.frost);
  assert(cold.waterTemperature < -1.9 && cold.ice > .95, 'Cold exposure does not freeze water');
  const frozen = cold.snapshot(); evolve(cold, 25, SurfaceWeather.presets.heat);
  assert(cold.ice < .03 && cold.waterTemperature > 35, 'Warming does not thaw water');
  const hot = evolve(new SurfaceWeather.State(.9), 25, { ...SurfaceWeather.presets.heat, wind: .35 });
  const humid = evolve(new SurfaceWeather.State(.9), 25, { ...SurfaceWeather.presets.heat, humidity: .95, wind: .35 });
  assert(hot.moisture.earth < humid.moisture.earth * .5 && hot.waterLoss > humid.waterLoss + .08, 'Heat/humidity do not alter drying');
  assert(SurfaceWeather.soil(.05).aggregates > .9 && SurfaceWeather.soil(.98).mud > .9 && SurfaceWeather.soil(.98, 1).mud === 0, 'Soil aggregate/mud/frost states');
  report.climate = { iceAfterCold: frozen.ice, iceAfterHeat: cold.ice, hotEarth: hot.moisture.earth, humidEarth: humid.moisture.earth, hotWaterLoss: hot.waterLoss };
  const contrast = scale => {
    let difference = 0;
    for (let y = 4; y < 120; y += 3) for (let x = 4; x < 120; x += 3) difference += Math.abs(SurfaceGrain.sample('earth', x, y, .3, scale)[0] - SurfaceGrain.sample('earth', x + 1, y, .3, scale)[0]);
    return difference;
  };
  const fine = contrast(.25), coarse = contrast(4);
  assert(fine < coarse * .3, 'Subpixel earth aliases into oversized grains');
  const field = new TerrainStudy.Field({ grain: .125, mode: 'sand', wind: .8 });
  assert(field.options.grain === .125 && field.grains.width <= 1024 && field.grains.height <= 768, 'Fine grain grows an oversized texture');
  report.fineGrain = { fineContrast: fine, coarseContrast: coarse, sourceSize: [field.grains.width, field.grains.height] };

  const summer = SurfaceColour.season('summer', 'winter', 0), winter = SurfaceColour.season('summer', 'winter', 1), half = SurfaceColour.season('summer', 'winter', .5);
  assert(half.grass.every((v, i) => v === (summer.grass[i] + winter.grass[i]) / 2), 'Season colour interpolation');
  assert(half.shadow.every((v, i) => v === (summer.shadow[i] + winter.shadow[i]) / 2), 'Season shadow interpolation');
  field.configure({ mode: 'blend' }); field.advance(.1, { x: 200, y: 230 });
  const climateBefore = JSON.stringify(field.weather.snapshot()), flowBefore = field.water.flow.dye.slice(), cellsBefore = field.cells;
  const art = document.createElement('canvas'); art.width = 512; art.height = 384; const g = art.getContext('2d'), noop = () => {};
  field.paint(g, { x: 200, y: 230 }, noop, noop, true); const before = g.getImageData(0, 0, 512, 384).data;
  field.configure({ seasonFrom: 'summer', seasonTo: 'winter', seasonBlend: 1 }); field.paint(g, { x: 200, y: 230 }, noop, noop, true);
  assert(field.options.seasonBlend === 1 && field.season.grass.every((v, i) => Number.isFinite(v) && v === winter.grass[i]), 'Season render palette does not match the selected blend');
  const after = g.getImageData(0, 0, 512, 384).data, changed = after.reduce((n, v, i) => n + (v !== before[i]), 0);
  assert(changed > 150000, 'Season has no visible material effect');
  assert(climateBefore === JSON.stringify(field.weather.snapshot()) && field.cells === cellsBefore && field.water.flow.dye.every((v, i) => v === flowBefore[i]), 'Season recolouring resets the simulation');
  report.seasons = { changedChannels: changed, terrainAndWeatherPreserved: true };

  const water = new SurfaceWater.Layer(), mask = new Uint8Array(512 * 384).fill(255), depth = new Float32Array(512 * 384).fill(.15);
  water.setup(mask, depth, () => ({ water: 1 })); water.update(0, .2); assert(water.active.length === 0, 'Shallow water does not recede');
  water.update(0, 0); assert(water.active.length === 512 * 384, 'Rain refill does not restore the shore');
  water.ice = 1; water.step(200, 230, 0); assert(water.ripples.length === 0 && water.liquidAt(200, 230) === 0, 'Frozen water splashes or wades');
  water.paint(g, 0); const frozenPixels = g.getImageData(0, 0, 512, 384).data; water.paint(g, 2);
  assert(g.getImageData(0, 0, 512, 384).data.every((v, i) => v === frozenPixels[i]), 'Solid ice keeps rippling');
  report.waterStates = { shoreRecedesAndRefills: true, iceHasNoSplashOrAmbientMotion: true };

  const record = { at: '2026-01-20T09:00:00Z', poolId: 'TEST', weather: { at: '2026-01-20T08:59:00Z', temp: -2, hum: 85, precip: 1.2, wind: 12, uv: .5 } };
  const adapted = SurfaceClimate.fromRecord(record);
  assert(adapted.options.temperature === -2 && adapted.options.humidity === .85 && adapted.options.wind === .24 && adapted.options.seasonFrom === 'winter', 'App weather schema adapter');
  assert(SurfaceClimate.fromRecord({ poolId: 'TEST', temp: 28, weather: null }) === null, 'Pool water temperature is mistaken for weather');
  assert(SurfaceClimate.fromRecord({ temp: null, hum: 'not a number' }) === null, 'Missing observations coerced into zero');
  assert(Date.parse(SurfaceClimate.latest([{ ...record, deleted: true }, { ...record, weather: { temp: 12, at: '2025-12-01T10:00:00Z' } }, record]).at) === Date.parse(record.weather.at), 'Latest non-deleted observation selection');
  field.applyWeatherRecord(record); const first = JSON.stringify(field.weather.snapshot()); field.applyWeatherRecord(record);
  assert(first === JSON.stringify(field.weather.snapshot()), 'Weather record initialization not reproducible');
  report.records = { nativeSchema: true, missingValuesIgnored: true, deterministic: true };

  const keys = ['lagrange-piscine.v1', 'lagrange-piscine.weather'], originals = keys.map(k => localStorage.getItem(k));
  const page = document.getElementById('terrain'), change = (id, value, event = 'change') => { const e = document.getElementById(id); e.value = value; e.dispatchEvent(new Event(event, { bubbles: true })); };
  try {
    localStorage.setItem(keys[0], JSON.stringify({ readings: [record], visits: [], notes: [] })); localStorage.removeItem(keys[1]);
    const saved = localStorage.getItem(keys[0]); document.getElementById('logged-weather').click();
    await wait(() => +page.dataset.temperature === -2 && +page.dataset.humidity === .85);
    assert(localStorage.getItem(keys[0]) === saved && localStorage.getItem(keys[1]) === null, 'Applying weather writes app records');
    assert(document.getElementById('weather-source').textContent.startsWith('Logged weather'), 'Weather provenance not shown');
    localStorage.removeItem(keys[0]); document.getElementById('logged-weather').click();
    assert(document.getElementById('weather-source').textContent.includes('No saved weather'), 'Missing saved weather not explained');
    const cached = JSON.stringify({ at: '2026-07-10T12:00:00Z', current: { temperature_2m: 22, relative_humidity_2m: 60, precipitation: 0, wind_speed_10m: 10, uv_index: 6 } });
    localStorage.setItem(keys[1], cached); document.getElementById('logged-weather').click();
    await wait(() => +page.dataset.temperature === 22 && +page.dataset.humidity === .6);
    assert(document.getElementById('weather-source').textContent.startsWith('Cached weather') && localStorage.getItem(keys[1]) === cached && localStorage.getItem(keys[0]) === null, 'Cached observation fallback or storage isolation');
    change('grain', .25, 'input'); await wait(() => +page.dataset.grain === .125);
    change('season-from', 'spring'); change('season-to', 'autumn'); change('season-blend', 50, 'input');
    await wait(() => +page.dataset.seasonBlend === .5 && page.dataset.seasonFrom === 'spring');
    change('weather-preset', 'heat'); await wait(() => +page.dataset.temperature === 40 && +page.dataset.humidity === .15);
    change('weather-preset', 'frost'); await wait(() => +page.dataset.temperature === -2 && +page.dataset.humidity === .85);
    report.controls = { grainMinimum: true, seasonalBlend: true, heatAndFrost: true, savedWeatherReadOnly: true, cachedFallback: true, missingRecordMessage: true };
  } finally { keys.forEach((k, i) => originals[i] == null ? localStorage.removeItem(k) : localStorage.setItem(k, originals[i])); }
  report.noGameStores = typeof Store === 'undefined' && typeof Sync === 'undefined' && typeof Game === 'undefined';
  return report;
})()
