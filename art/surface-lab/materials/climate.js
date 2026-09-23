/* Pure adapter for Weather.current() snapshots and logged record.weather. */
const SurfaceClimate = (() => {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const numeric = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
  function fromRecord(record) {
    if (!record || record.deleted) return null;
    if (record.poolId && !record.weather) return null;
    const snapshot = record.weather || record.current || record;
    if (!snapshot || typeof snapshot !== 'object') return null;
    const options = {}, fields = [
      ['temperature', snapshot.temp ?? snapshot.temperature_2m, v => clamp(v, -15, 45)],
      ['humidity', snapshot.hum ?? snapshot.relative_humidity_2m, v => clamp(v / 100, 0, 1)],
      ['rain', snapshot.precip ?? snapshot.precipitation, v => 1 - Math.exp(-Math.max(0, v) / 2)],
      ['wind', snapshot.wind ?? snapshot.wind_speed_10m, v => clamp(v / 50, 0, 1)],
      ['sun', snapshot.uv ?? snapshot.uv_index, v => clamp(v / 9, 0, 1)],
    ];
    for (const [key, value, convert] of fields) if (numeric(value) != null) options[key] = convert(value);
    if (!Object.keys(options).length) return null;
    const timestamp = Date.parse(snapshot.at || record.at || snapshot.time || '');
    options.observedHour = null;
    if (Number.isFinite(timestamp)) {
      options.observedHour = SurfaceAdaptiveColour.hour(new Date(timestamp).toISOString());
      const date = new Date(timestamp), phase = ((date.getUTCMonth() - 2 + (date.getUTCDate() - 1) / 31) / 3 + 4) % 4;
      const seasons = ['spring', 'summer', 'autumn', 'winter'], index = Math.floor(phase);
      Object.assign(options, { seasonFrom: seasons[index], seasonTo: seasons[(index + 1) % 4], seasonBlend: phase - index });
    }
    return { options, at: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null, record };
  }
  function latest(records) {
    return records.map(fromRecord).filter(r => r?.at).sort((a, b) => b.at.localeCompare(a.at))[0] || null;
  }
  return { fromRecord, latest };
})();
if (typeof window !== 'undefined') window.SurfaceClimate = SurfaceClimate;
if (typeof module !== 'undefined') module.exports = SurfaceClimate;
