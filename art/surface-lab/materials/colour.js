/* Canvas presentation controls; the material simulation keeps its own state. */
const SurfaceColour = (() => {
  const seasons = {
    spring: { grass: [121,183,94], earth: [150,108,70], sand: [227,204,147], gravel: [144,154,139], water: [91,180,163], shadow: [43,78,72], light: [228,239,166] },
    summer: { grass: [139,180,108], earth: [145,110,75], sand: [218,197,143], gravel: [144,143,135], water: [95,171,165], shadow: [49,73,55], light: [244,234,167] },
    autumn: { grass: [172,139,73], earth: [159,100,66], sand: [219,182,129], gravel: [158,137,130], water: [111,154,161], shadow: [91,59,78], light: [245,195,125] },
    winter: { grass: [127,155,140], earth: [127,106,107], sand: [195,197,169], gravel: [139,157,173], water: [111,162,187], shadow: [68,77,113], light: [209,232,241] },
  };
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  function season(from = 'summer', to = 'autumn', weight = 0) {
    const a = seasons[from] || seasons.summer, b = seasons[to] || seasons.autumn, t = Math.max(0, Math.min(1, weight));
    return Object.fromEntries(Object.keys(a).map(key => [key, a[key].map((v, i) => v + (b[key][i] - v) * t)]));
  }
  const lightingPalettes = {
    neutral: { name: 'Neutral', key: '#ededed', shadow: '#626262' },
    sun: { name: 'Sun / blue shade', key: '#ffe3a5', shadow: '#425880' },
    sky: { name: 'Sky / warm shade', key: '#afdce9', shadow: '#86505d' },
    amber: { name: 'Gold / violet shade', key: '#ffc878', shadow: '#66518c' },
    rose: { name: 'Rose / teal shade', key: '#ffc3b7', shadow: '#326b70' },
  };
  function saturate(rgb, amount = 1) {
    const luminance = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    return rgb.map(v => clamp(luminance + (v - luminance) * amount));
  }
  function rgb(hex, fallback) {
    const colour = /^#[\da-f]{6}$/i.test(hex || '') ? hex : fallback;
    return [1, 3, 5].map(i => parseInt(colour.slice(i, i + 2), 16));
  }
  function lighting({ lightPalette = 'sun', keyLight = '#ffe3a5', shadowColour = '#425880', lightSaturation = 1 } = {}) {
    const preset = lightingPalettes[lightPalette] || { key: keyLight, shadow: shadowColour };
    return { key: saturate(rgb(preset.key, '#ffe3a5'), lightSaturation), shadow: saturate(rgb(preset.shadow, '#425880'), lightSaturation) };
  }
  function tint(rgb, type, palette, richness = 1.25) { return saturate(rgb.map((v, i) => clamp(v + palette[type][i] - seasons.summer[type][i])), richness); }
  function grassPalette(original, palette, richness = 1.25) {
    return Object.fromEntries(Object.entries(original).map(([key, value]) => {
      const rgb = value.match(/[\d.]+/g).map(Number), highlight = /tip/i.test(key), shade = /root|shade/i.test(key);
      const changed = rgb.map((v, i) => clamp(v + palette.grass[i] - seasons.summer.grass[i] + (highlight ? (palette.light[i] - seasons.summer.light[i]) * .4 : shade ? (palette.shadow[i] - seasons.summer.shadow[i]) * .4 : 0)));
      return [key, `rgb(${saturate(changed, richness).join(',')})`];
    }));
  }
  const palettes = {
    coast: { name: 'Pocket Coast', filter: 'saturate(1)' },
    gold: { name: 'Golden hour', filter: 'sepia(.22) saturate(1.22) hue-rotate(-9deg)' },
    moss: { name: 'Cool moss', filter: 'hue-rotate(18deg) saturate(.78) brightness(.96)' },
    dusk: { name: 'Dusk', filter: 'hue-rotate(27deg) saturate(.68) brightness(.78)' },
  };
  function filter({ palette = 'coast', view = 'colour', contrast = 1, saturation = 1, exposure = 1 } = {}) {
    if (view === 'reflections') return 'none';
    const tone = palettes[palette] || palettes.coast, amount = Math.max(.6, Math.min(1.8, contrast));
    return tone.filter + ` saturate(${Math.max(0, Math.min(2, saturation))})` + (view !== 'colour' ? ' grayscale(1)' : '') + ` contrast(${amount}) brightness(${Math.max(.6, Math.min(1.4, exposure))})` + (view === 'ink' ? ' url(#surface-ink)' : '');
  }
  return { palettes, filter, seasons, season, tint, grassPalette, lightingPalettes, lighting, saturate };
})();
if (typeof window !== 'undefined') window.SurfaceColour = SurfaceColour;
if (typeof module !== 'undefined') module.exports = SurfaceColour;
