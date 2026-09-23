import { GARDENS, WEATHER_KEY, CONTEXT_KEY, parisClock, dayNumber, addDays, gardenCycle, recordGardenCut, overviewSnapshot, weatherAppearance, readContext } from './living-state.mjs';
import { zoneStyle } from './zone-art.mjs';

const $ = id => document.getElementById(id);
const dateLabel = date => new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Paris' });

export class AdaptiveWorld {
  constructor(world, { getManual, onApplied, onNotice, onGardenChange }) {
    this.world = world; this.getManual = getManual; this.onApplied = onApplied; this.onNotice = onNotice; this.onGardenChange = onGardenChange;
    this.context = readContext(localStorage); this.previewDays = 0; this.snapshot = null; this.loading = false; this.disposed = false;
    this.clocks = new Map();
    for (const garden of GARDENS) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.garden = garden.id;
      button.style.setProperty('--zone-accent', zoneStyle(garden.id).accent);
      const name = document.createElement('b'); name.textContent = garden.label;
      const age = document.createElement('span'), progress = document.createElement('progress'); progress.max = 6; progress.setAttribute('aria-label', `${garden.label} grass growth`);
      button.append(name, age, progress); button.addEventListener('click', () => { this.onGardenChange?.(); this.context.gardenId = garden.id; this.saveContext(); this.apply(); });
      $('garden-clocks').append(button); this.clocks.set(garden.id, { button, age, progress });
    }
    $('days-ahead').addEventListener('input', e => { this.previewDays = +e.target.value; this.apply(); });
    $('cut-grass').addEventListener('click', () => this.cut(this.context.gardenId, parisClock().date));
    $('weather-auto').addEventListener('change', e => { this.context.weatherAuto = e.target.checked; this.saveContext(); this.apply(); if (this.context.weatherAuto) this.refresh(); });
    $('refresh-weather').addEventListener('click', () => this.refresh(true));
    this.onStorage = e => { if (e.key === WEATHER_KEY) this.pullWeather(); if (e.key === CONTEXT_KEY) { this.context = readContext(localStorage); this.apply(); } };
    this.onWeather = () => this.pullWeather();
    this.onFocus = () => { this.pullWeather(); if (this.context.weatherAuto) this.refresh(); };
    // A future gardener NPC/tool can emit this after a recorded visit. The
    // current study stores the cut in its own sandbox context, not app data.
    this.onCut = e => { if (e.detail?.poolId && e.detail?.at) this.cut(e.detail.poolId, e.detail.at); };
    window.addEventListener('storage', this.onStorage); window.addEventListener('lp-weather', this.onWeather);
    window.addEventListener('focus', this.onFocus); window.addEventListener('lq-garden-cut', this.onCut);
    this.timer = setInterval(() => { if (!document.hidden) { this.pullWeather(); if (this.context.weatherAuto) this.refresh(); } }, 60000);
    this.pullWeather(); if (this.context.weatherAuto) this.refresh();
  }
  saveContext() { try { localStorage.setItem(CONTEXT_KEY, JSON.stringify(this.context)); } catch { /* The preview still works without storage. */ } }
  pullWeather() {
    if (this.disposed) return;
    try { this.snapshot = overviewSnapshot(JSON.parse(localStorage.getItem(WEATHER_KEY) || 'null')); }
    catch { this.snapshot = overviewSnapshot(window.Weather?.data); }
    this.apply();
  }
  async refresh(force = false) {
    if (this.loading || this.disposed) return;
    this.loading = true; this.render();
    try { await window.Weather?.load(force); }
    finally { this.loading = false; if (!this.disposed) this.pullWeather(); }
  }
  apply() {
    if (this.disposed) return;
    const garden = GARDENS.find(g => g.id === this.context.gardenId) || GARDENS[0];
    const now = new Date(); this.today = parisClock(now).date; this.previewDate = addDays(this.today, this.previewDays);
    this.appearance = this.context.weatherAuto ? weatherAppearance(this.snapshot, now) : null;
    this.cycle = gardenCycle(garden.id, this.previewDate, this.context.cuts);
    this.world.setGarden(garden); this.world.setCycle(this.cycle);
    this.world.setSettings({ ...this.getManual(), ...(this.appearance?.patch || {}) });
    this.world.setWeather(this.appearance?.visual || null);
    this.onApplied(); this.render();
  }
  render() {
    const garden = GARDENS.find(g => g.id === this.context.gardenId) || GARDENS[0];
    $('garden-name').textContent = garden.name; $('garden-code').textContent = garden.label;
    const forest = this.world.forestSummary();
    const theme = zoneStyle(garden.id);
    document.documentElement.style.setProperty('--zone-accent', theme.accent);
    $('zone-art-label').textContent = `${theme.colour} · ${theme.style}`;
    $('dominant-tree-name').textContent = forest.name;
    $('forest-summary').textContent = `${forest.name} dominate · ${forest.count} of ${forest.total} trees. ${forest.sizes.small} small · ${forest.sizes.medium} medium · ${forest.sizes.large} large. Trimmed borders, wilder edges.`;
    $('weather-auto').checked = this.context.weatherAuto;
    const automatic = !!this.appearance;
    for (const name of ['breeze', 'water', 'sun']) $(name).disabled = automatic && name in this.appearance.patch;
    document.querySelectorAll('[data-mood]').forEach(button => button.disabled = automatic);
    $('refresh-weather').disabled = this.loading;
    const weather = this.snapshot;
    if (weather) {
      const values = [];
      if (weather.temp !== null) values.push(`${Math.round(weather.temp)} °C`);
      if (weather.wind !== null) values.push(`Wind ${Math.round(weather.wind)} km/h`);
      if (weather.uv !== null) values.push(`UV ${Math.round(weather.uv * 10) / 10}`);
      if (weather.precip !== null && weather.precip > 0) values.push(`Rain ${weather.precip} mm`);
      $('overview-values').textContent = values.join(' · ');
      const stamp = weather.at && Number.isFinite(Date.parse(weather.at)) ? new Date(weather.at) : null;
      const old = stamp && Date.now() - stamp.getTime() > 35 * 60000;
      const at = stamp ? stamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) : 'unknown time';
      $('overview-status').textContent = `${old ? 'Cached' : 'Latest'} Aperçu · ${at}${automatic ? ' · following weather' : ' · manual appearance'}`;
      if (automatic) {
        $('time-label').textContent = `${this.appearance.clock.time} · ${this.world.settings.mood === 'dusk' ? 'evening' : this.world.settings.mood === 'golden' ? 'low sun' : 'daylight'}`;
        $('scene-weather').textContent = `${old ? 'Cached Aperçu' : 'Aperçu'} · ${values.slice(0, 2).join(' · ')}`;
        if (weather.wind !== null) $('breeze-output').textContent = `${Math.round(weather.wind)} km/h`;
      }
    } else {
      $('overview-values').textContent = this.loading ? 'Reading the latest Aperçu weather…' : 'Weather unavailable. Manual controls are available.';
      $('overview-status').textContent = 'Uses the same weather cache as the app';
    }
    if (!this.cycle) return;
    for (const g of GARDENS) {
      const phase = gardenCycle(g.id, this.previewDate, this.context.cuts), item = this.clocks.get(g.id);
      item.button.setAttribute('aria-pressed', String(g.id === garden.id)); item.age.textContent = phase.age === 0 ? 'Cut' : `Day ${phase.age}`;
      item.progress.value = phase.age; item.button.title = `${g.name}: ${phase.age} days since cut; next visit ${dateLabel(phase.nextCut)}`;
    }
    $('days-ahead').value = this.previewDays;
    $('days-ahead-output').textContent = this.previewDays ? `+${this.previewDays} days · ${dateLabel(this.previewDate)}` : `Today · ${dateLabel(this.today)}`;
    const phaseLabel = this.cycle.age === 0 ? 'freshly cut' : this.cycle.age < 3 ? 'short grass' : this.cycle.age < 6 ? 'growing back' : 'tall grass';
    $('cycle-summary').textContent = `${garden.label} · ${phaseLabel} · day ${this.cycle.age} of 7. Next cut ${dateLabel(this.cycle.nextCut)}.`;
  }
  cut(gardenId, at) {
    let date = at;
    if (dayNumber(date) === null) { const instant = new Date(at); if (!Number.isFinite(instant.getTime())) return; date = parisClock(instant).date; }
    const today = parisClock().date, updated = recordGardenCut(this.context.cuts, gardenId, date, today);
    if (updated === this.context.cuts && this.context.cuts[gardenId] !== date) return;
    this.context.cuts = updated; this.previewDays = 0; this.saveContext(); this.apply();
    if (gardenId === this.context.gardenId) this.world.cutFeedback();
    const garden = GARDENS.find(g => g.id === gardenId);
    this.onNotice(`${garden.label} · the gardener has cut the grass. It will grow back over the next week.`);
  }
  resetPreview() { this.previewDays = 0; this.apply(); }
  exportState() { return { gardenId: this.context.gardenId, weatherAuto: this.context.weatherAuto, previewDate: this.previewDate, previewDays: this.previewDays, grass: this.cycle, weather: this.snapshot }; }
  dispose() { this.disposed = true; clearInterval(this.timer); window.removeEventListener('storage', this.onStorage); window.removeEventListener('lp-weather', this.onWeather); window.removeEventListener('focus', this.onFocus); window.removeEventListener('lq-garden-cut', this.onCut); }
}
