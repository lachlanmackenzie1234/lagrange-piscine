/*
 * Weather — Open-Meteo (free, no API key). Current conditions + 5-day forecast
 * for Lacanau-Océan, cached in localStorage and refreshed on a TTL. Weather.current()
 * returns a compact snapshot to stamp onto notes/readings at creation time.
 */
const Weather = (() => {
  const LAT = 45.00, LON = -1.18;
  const KEY = 'lagrange-piscine.weather';
  const TTL = 30 * 60 * 1000; // 30 min
  let data = null;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { data = null; }

  const url = () => 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${LAT}&longitude=${LON}`
    + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,uv_index'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max'
    + '&timezone=auto&forecast_days=5';

  let inflight = null;
  async function load(force) {
    if (!force && data && data.at && (Date.now() - new Date(data.at).getTime()) < TTL) return data;
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const res = await fetch(url());
        if (!res.ok) throw new Error('weather http ' + res.status);
        const j = await res.json();
        data = { at: new Date().toISOString(), current: j.current, daily: j.daily };
        localStorage.setItem(KEY, JSON.stringify(data));
        window.dispatchEvent(new CustomEvent('lp-weather'));
      } catch (e) { /* keep any stale data */ }
      finally { inflight = null; }
      return data;
    })();
    return inflight;
  }

  // compact snapshot to attach to a record
  function current() {
    if (!data || !data.current) return null;
    const c = data.current;
    return { at: data.at, temp: c.temperature_2m, hum: c.relative_humidity_2m, uv: c.uv_index, precip: c.precipitation, code: c.weather_code, wind: c.wind_speed_10m };
  }

  return { load, current, get data() { return data; }, LAT, LON };
})();
window.Weather = Weather;
