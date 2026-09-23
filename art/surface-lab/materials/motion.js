/* Deterministic envelopes, shared by live contact and the scrub-able demo. */
const SurfaceMotion = (() => {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function grass(age, recovery = 8) {
    if (!Number.isFinite(age) || age >= recovery) return { bend: 0, flatten: 0, shade: 0 };
    age = Math.max(0, age); const rest = 1 - smooth(.5, recovery, age);
    return { bend: (1 + Math.sin(Math.min(1, age / .8) * Math.PI) * .32) * rest,
      flatten: rest * (.9 + .1 * Math.exp(-age * 3)), shade: rest * (.7 + .3 * Math.exp(-age * 4)) };
  }
  function sand(age, wind = .35, recovery = 8) {
    age = Math.max(0, age); const life = 5 - clamp(wind, 0, 1) * 3, settle = 1 - smooth(.5, recovery, age);
    return { indent: .48 * Math.max(0, 1 - age / life) ** 1.6,
      scatter: smooth(0, .38, age), lift: Math.sin(clamp(age / .9, 0, 1) * Math.PI),
      rim: (1 - smooth(.3, 2.1, age)) * smooth(0, .08, age),
      shade: settle * .13, settle };
  }
  function sequence(elapsed, recovery = 8) {
    const duration = 5 + recovery, t = clamp(elapsed, 0, duration);
    if (t < 2) return { phase: 'Growing', progress: t / duration, growth: .5 + .5 * smooth(0, 2, t), bend: 0, shade: .6 + .4 * smooth(0, 2, t), settle: 0, duration };
    if (t < 3.2) return { phase: 'Trailing bend', progress: t / duration, growth: 1, bend: smooth(2, 3.2, t), shade: 1, settle: 0, duration };
    if (t < 5) return { phase: 'Displacement', progress: t / duration, growth: 1, bend: 1, shade: 1, settle: smooth(3.2, 5, t), duration };
    const rest = 1 - smooth(5, duration, t);
    return { phase: t === duration ? 'At rest' : 'Settling', progress: t / duration, growth: 1, bend: rest, shade: 1, settle: rest, duration };
  }
  function heroAt(time) { const t = clamp((time - 2) / 3, 0, 1); return { x: 276 + t * 68, y: 126 + t * 159 }; }
  return { grass, sand, sequence, heroAt };
})();
if (typeof window !== 'undefined') window.SurfaceMotion = SurfaceMotion;
if (typeof module !== 'undefined') module.exports = SurfaceMotion;
