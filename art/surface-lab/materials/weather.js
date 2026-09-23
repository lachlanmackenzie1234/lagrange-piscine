/* Accelerated material weather. Units: Celsius, relative humidity 0..1.
 * Rates are tuned for the lab, not physical elapsed time or a forecast. */
const SurfaceWeather = (() => {
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  function drying(temperature = 18, humidity = .55) {
    return Math.exp((clamp(temperature, -15, 45) - 18) * .035) * (1 - clamp(humidity)) / .45;
  }
  function soil(wet, frost = 0) {
    const mud = smooth(.65, .96, wet) * (1 - frost);
    return { dust: (1 - smooth(.08, .5, wet)) * (1 - frost), aggregates: (1 - smooth(.12, .7, wet)) * (1 - frost), mud, frozen: frost };
  }
  class State {
    constructor(moisture = .35) { this.reset(moisture); }
    reset(v = .35) {
      this.moisture = { grass: clamp(v * .85), sand: clamp(v * .6), earth: clamp(v), gravel: clamp(v * .55) };
      this.pooling = 0; this.elapsed = 0; this.waterTemperature = 18; this.ice = 0; this.frost = 0; this.waterLoss = 0; this.evaporation = 1;
    }
    snapshot() { return { moisture: { ...this.moisture }, pooling: this.pooling, elapsed: this.elapsed, waterTemperature: this.waterTemperature, ice: this.ice, frost: this.frost, waterLoss: this.waterLoss, evaporation: this.evaporation }; }
    restore(s) {
      this.moisture = { ...s.moisture }; this.pooling = s.pooling; this.elapsed = s.elapsed;
      for (const [key, fallback] of Object.entries({ waterTemperature: 18, ice: 0, frost: 0, waterLoss: 0, evaporation: 1 })) this[key] = s[key] ?? fallback;
    }
    advance(dt, { rain = 0, wind = .35, sun = .65, speed = 1, temperature = 18, humidity = .55 } = {}) {
      let left = Math.max(0, dt) * clamp(speed, 0, 8); rain = clamp(rain); wind = clamp(wind); sun = clamp(sun); temperature = clamp(temperature, -15, 45);
      this.evaporation = drying(temperature, humidity);
      while (left > 0) {
        const step = Math.min(.25, left); left -= step; this.elapsed += step;
        this.waterTemperature += (temperature - this.waterTemperature) * (1 - Math.exp(-step / 8));
        this.ice = clamp(this.ice + step * (Math.max(0, -this.waterTemperature) * .024 * (1 - this.ice) - Math.max(0, this.waterTemperature) * .012 * this.ice));
        const frostTarget = clamp(-temperature / 4);
        this.frost += (frostTarget - this.frost) * (1 - Math.exp(-step / 6));
        const liquidRain = rain * (1 - this.frost * .85);
        for (const [type, soak, drain] of [['grass', .12, .013], ['sand', .17, .04], ['earth', .15, .009], ['gravel', .17, .03]]) {
          const wet = this.moisture[type], dry = ((sun * .035 + wind * .012) * this.evaporation + drain) * (1 - rain * .9) * (1 - this.frost * .9);
          this.moisture[type] = clamp(wet + step * (liquidRain * soak * (1 - wet) - dry * wet));
        }
        const target = liquidRain * Math.max(0, (this.moisture.earth - .53) / .47);
        const rate = target > this.pooling ? .2 : (.016 + (sun * .055 + wind * .012) * this.evaporation) * (1 - this.ice * .97);
        this.pooling = clamp(this.pooling + (target - this.pooling) * (1 - Math.exp(-rate * step)));
        // Only sustained hot, dry exposure draws down the demonstration pond.
        const loss = Math.max(0, this.evaporation - 1.4) * sun * .0018 * (1 - this.ice);
        this.waterLoss = clamp(this.waterLoss + step * (loss - rain * .022), 0, .38);
      }
    }
    dust(type) { return Math.max(0, 1 - (this.moisture[type] || 0) * 1.35) ** 2 * (1 - this.frost); }
    retention(type) { return { earth: 1, gravel: .72, grass: .48, sand: .28 }[type] || 0; }
    get earth() { return soil(this.moisture.earth, this.frost); }
  }
  const presets = {
    calm: { rain: 0, wind: .35, sun: .65, temperature: 18, humidity: .55 },
    breeze: { rain: 0, wind: .82, sun: .9, temperature: 24, humidity: .35 },
    rain: { rain: .9, wind: .45, sun: .08, temperature: 14, humidity: .92 },
    drying: { rain: 0, wind: .45, sun: 1, temperature: 25, humidity: .35 },
    frost: { rain: 0, wind: .22, sun: .25, temperature: -2, humidity: .85 },
    heat: { rain: 0, wind: .45, sun: 1, temperature: 40, humidity: .15 },
  };
  return { State, presets, drying, soil };
})();
if (typeof window !== 'undefined') window.SurfaceWeather = SurfaceWeather;
if (typeof module !== 'undefined') module.exports = SurfaceWeather;
