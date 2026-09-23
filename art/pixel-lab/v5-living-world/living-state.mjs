import { clamp } from './engine.mjs';

export const WEATHER_KEY = 'lagrange-piscine.weather';
export const CONTEXT_KEY = 'lagrange-quest.living-world.context.v1';
export const GARDENS = [
  { id: 'EC-2', label: 'EC 2', name: 'Eden Club', cutDay: 0, seed: 9827 },
  { id: 'AG-7', label: 'AG 7', name: 'Atlantic Green', cutDay: 2, seed: 9851 },
  { id: 'EP-6B-75', label: 'EP 6B/75', name: 'Eden Parc Golf', cutDay: 4, seed: 9913 },
  { id: 'EPP-3', label: 'EPP 3', name: 'Eden Parc', cutDay: 1, seed: 9931 },
  { id: 'GP-18', label: 'GP 18', name: 'Green Parc', cutDay: 6, seed: 9973 },
];
const DAY = 86400000, MONDAY = Date.UTC(2026, 0, 5) / DAY;
const mod = (n, divisor) => ((n % divisor) + divisor) % divisor;
const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;

export function parisClock(instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const p = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour + +p.minute / 60, time: `${p.hour}:${p.minute}` };
}
export function dayNumber(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const n = Date.parse(date + 'T00:00:00Z');
  return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === date ? n / DAY : null;
}
export function addDays(date, amount) { const n = dayNumber(date); return n === null ? null : new Date((n + amount) * DAY).toISOString().slice(0, 10); }

// A small, independent clock. These are sample weekly cut days, not real
// gardener schedules. A recorded visit becomes that garden's new cycle anchor.
export function gardenCycle(gardenId, date, cuts = {}) {
  const garden = GARDENS.find(g => g.id === gardenId) || GARDENS[0];
  const today = dayNumber(date);
  if (today === null) throw new Error('A valid garden date is required');
  const recorded = dayNumber(cuts[garden.id]);
  const anchored = recorded !== null && recorded <= today;
  const anchor = anchored ? recorded : MONDAY + garden.cutDay;
  const age = mod(today - anchor, 7), growth = age / 6;
  return { gardenId: garden.id, age, growth, height: .18 + .82 * growth,
    lastCut: new Date((today - age) * DAY).toISOString().slice(0, 10),
    nextCut: new Date((today - age + 7) * DAY).toISOString().slice(0, 10),
    source: anchored ? 'gardener-visit' : 'sample-schedule' };
}
export function recordGardenCut(cuts, gardenId, date, today) {
  const at = dayNumber(date), now = dayNumber(today);
  if (!GARDENS.some(g => g.id === gardenId) || at === null || now === null || at > now) return cuts;
  const previous = dayNumber(cuts[gardenId]);
  if (previous !== null && previous >= at) return cuts;
  return { ...cuts, [gardenId]: date };
}

export function overviewSnapshot(cache) {
  const c = cache?.current;
  if (!c || typeof c !== 'object') return null;
  const snapshot = { at: typeof cache.at === 'string' ? cache.at : null,
    temp: number(c.temperature_2m), wind: number(c.wind_speed_10m), uv: number(c.uv_index),
    precip: number(c.precipitation), code: number(c.weather_code) };
  return [snapshot.temp, snapshot.wind, snapshot.uv, snapshot.precip, snapshot.code].some(v => v !== null) ? snapshot : null;
}

// Normalize the existing Overview values into the renderer's 0–100 controls.
// Missing fields stay missing; a reported zero remains a genuine zero.
export function weatherAppearance(snapshot, instant = new Date()) {
  if (!snapshot) return null;
  const clock = parisClock(instant), patch = {};
  patch.mood = clock.hour < 7 || clock.hour >= 20 ? 'dusk' : clock.hour < 9 || clock.hour >= 17 ? 'golden' : 'day';
  patch.sun = Math.round(clamp(165 - (clock.hour - 7) / 13 * 150, 15, 165));
  if (snapshot.wind !== null) {
    patch.breeze = Math.round(clamp(snapshot.wind / 60, 0, 1) * 100);
    patch.water = Math.round(clamp(30 + patch.breeze * .6 + (snapshot.precip === null ? 0 : clamp(snapshot.precip / 4, 0, 1) * 10), 0, 100));
  }
  const code = snapshot.code, rain = snapshot.precip === null ? 0 : clamp(snapshot.precip / 4, 0, 1);
  const cloud = code === null ? 0 : code === 0 ? .03 : code === 1 ? .2 : code === 2 ? .55 : .85;
  return { patch, clock, visual: { cloud: Math.max(cloud, rain * .9), rain,
    warmth: snapshot.temp === null ? .5 : clamp((snapshot.temp - 5) / 30, 0, 1),
    sunStrength: snapshot.uv === null ? .7 : clamp(.35 + snapshot.uv / 11 * .65, .35, 1) } };
}

export function readContext(storage) {
  const out = { weatherAuto: true, gardenId: GARDENS[0].id, cuts: {} };
  try {
    const saved = JSON.parse(storage.getItem(CONTEXT_KEY) || '{}');
    if (typeof saved.weatherAuto === 'boolean') out.weatherAuto = saved.weatherAuto;
    if (GARDENS.some(g => g.id === saved.gardenId)) out.gardenId = saved.gardenId;
    if (saved.cuts && typeof saved.cuts === 'object') for (const garden of GARDENS) if (dayNumber(saved.cuts[garden.id]) !== null) out.cuts[garden.id] = saved.cuts[garden.id];
  } catch { /* Local-only state may be unavailable; the sample schedule works. */ }
  return out;
}
