/* Clustered colour grains; bulk soil response without rendered clod geometry. */
const SurfaceEarth = (() => {
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  function sample(x, y, moisture = .35, scale = 1) { return SurfaceGrain.sample('earth', x, y, moisture, scale); }
  function response(age, moisture = .35, recovery = 8) {
    const wet = clamp(moisture), t = Math.max(0, age), settle = 1 - smooth(.4, recovery, t);
    return { indent: (.48 + wet * .2) * settle, rim: smooth(0, .08, t) * (1 - smooth(.25, 2.2, t)),
      scatter: smooth(0, .28, t) * (1 - wet * .35), lift: Math.sin(clamp(t / .5) * Math.PI) * (1 - wet * .7),
      shade: settle * (.15 + wet * .08), settle };
  }
  function paintContact(g, track, age, moisture, recovery, shade, scale=1, frost=0) { SurfaceGrain.paintContact(g, track, 'earth', age, moisture, recovery, shade, scale, frost); }
  return { sample, response, paintContact };
})();
if (typeof window !== 'undefined') window.SurfaceEarth = SurfaceEarth;
if (typeof module !== 'undefined') module.exports = SurfaceEarth;
