/* Native 48×64 appearance layers over the illustrated, four-direction base. */
const KeeperArt = (() => {
  const palettes = { EC: ['#e9dec2', '#326fb3', '#9dccdf'], AG: ['#367b58', '#245442', '#a4c875'], EP: ['#b08a4a', '#756548', '#e6c67c'], EPP: ['#b486bd', '#755086', '#edbedc'], GP: ['#408f8c', '#315d69', '#a7dace'] };
  const rarity = { common: '#bcb6a0', uncommon: '#39a658', rare: '#407cdf', vrare: '#ad6cdb', epic: '#ecb447', legend: '#e76464' };
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const shade = (hex, value) => '#' + rgb(hex).map(v => Math.max(0, Math.min(255, Math.round(v * value))).toString(16).padStart(2, '0')).join('');
  function hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255; const hi = Math.max(r, g, b), lo = Math.min(r, g, b), d = hi - lo;
    let h = !d ? 0 : hi === r ? ((g - b) / d + 6) % 6 : hi === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, hi ? d / hi : 0, hi];
  }
  function paint(ctx, base, equip, avatar, direction) {
    const image = ctx.createImageData(48, 64); image.data.set(base.data);
    const colour = (slot, fallback) => palettes[equip[slot]?.res]?.[0] || fallback;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 48; x++) {
      const i = (y * 48 + x) * 4; if (!image.data[i + 3]) continue;
      const [h, s, v] = hsv(image.data[i], image.data[i + 1], image.data[i + 2]); let target = null, factor = 1;
      const skin = h > .035 && h < .13 && s > .28 && s < .8 && v > .52;
      const hair = y < (direction === 'north' ? 24 : 16) && h > .015 && h < .16 && s > .25 && v > .12 && v < .68;
      if (skin && (y < 25 || x < 16 || x > 32 || y > 46)) { target = avatar.skin; factor = .7 + .35 * v; }
      if (hair) { target = avatar.hairColor; factor = .5 + v; }
      if (equip.torse && y >= 20 && y <= 40 && !skin && !hair && v > .24 && (s < .4 || h > .10 && h < .18)) { target = colour('torse', '#e9dec2'); factor = .55 + .5 * v; }
      if (equip.jambes && y >= 40 && y <= 55 && v > .14 && !skin) { target = palettes[equip.jambes.res]?.[1] || '#31516a'; factor = .7 + .55 * v; }
      if (equip.jambes && ['AG', 'EP', 'GP'].includes(equip.jambes.res) && y >= 47 && y <= 55 && skin) { target = palettes[equip.jambes.res][1]; factor = .7 + .35 * v; }
      if (equip.pieds && y >= 55 && v > .12) { target = palettes[equip.pieds.res]?.[1] || '#675545'; factor = .6 + .7 * v; }
      if (target && /^#[0-9a-f]{6}$/i.test(target)) rgb(target).forEach((channel, k) => { image.data[i + k] = Math.min(255, Math.round(channel * factor)); });
    }
    ctx.clearRect(0, 0, 48, 64);
    const hair = avatar.hairColor || '#4a2e1a';
    if (avatar.hair === 3) { ctx.fillStyle = shade(hair, .65); ctx.fillRect(13, 13, 23, 21); ctx.fillRect(15, 32, 19, 6); }
    const baseCanvas = document.createElement('canvas'); baseCanvas.width = 48; baseCanvas.height = 64;
    baseCanvas.getContext('2d').putImageData(image, 0, 0); ctx.drawImage(baseCanvas, 0, 0);
    // A little shoulder/torso volume keeps the compact keeper rounded. Head,
    // feet and the independent equipment/tool coordinates remain unchanged.
    ctx.imageSmoothingEnabled = false; ctx.drawImage(baseCanvas, 12, 23, 24, 21, 11, 23, 26, 21);
    const f = (c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const ink = '#253044';
    const box = (c, x, y, w, h) => { f(ink, x + 1, y, w - 2, h); f(ink, x, y + 1, w, h - 2); f(c, x + 1, y + 1, w - 2, h - 2); };
    const pal = slot => palettes[equip[slot]?.res] || palettes.EC;
    const trim = slot => rarity[equip[slot]?.rar] || pal(slot)[2];
    const cursed = (slot, x, y) => { if (equip[slot]?.cursed) { f('#713b92', x, y, 3, 2); f('#f2b0e9', x + 1, y - 1); } };
    const back = direction === 'north', side = direction === 'east' || direction === 'west';
    ctx.save(); if (direction === 'west') { ctx.translate(48, 0); ctx.scale(-1, 1); }
    if (avatar.hair === 2 && !equip['tête']) { f(ink, 20, 1, 3, 3); f(hair, 21, 2, 2, 3); f(ink, 26, 1, 3, 3); f(hair, 25, 3, 4, 2); }
    if (avatar.hair === 3 && !equip['tête']) { f(shade(hair, .8), side ? 15 : 14, 14, 3, 17); if (!side) f(shade(hair, 1.15), 33, 14, 2, 17); }
    const hat = equip['tête']?.res;
    if (hat === 'EC') { box('#376ba9', 14, 2, 21, 10); f('#82b1d3', 17, 3, 10); box('#376ba9', side ? 28 : 10, 9, side ? 12 : 18, 4); f(trim('tête'), 23, 5, 4, 2); }
    if (hat === 'AG') { box('#438462', 15, 1, 19, 11); box('#438462', 10, 10, 29, 4); f(trim('tête'), 17, 8, 16, 2); }
    if (hat === 'EP') { box('#c6a263', 17, 2, 15, 9); box('#d8b77b', 9, 10, 31, 4); f('#f4d89a', 11, 11, 26); f(trim('tête'), 18, 8, 13, 2); }
    if (hat === 'EPP' && !back) { box('#423558', side ? 26 : 16, 13, side ? 11 : 8, 5); if (!side) box('#423558', 26, 13, 8, 5); f(trim('tête'), 23, 14, 4); f('#c6cce2', side ? 29 : 18, 14, 2); }
    if (hat === 'GP') { f(ink, 14, 7, 22, 4); f('#469b90', 15, 8, 20, 2); f(ink, side ? 27 : 11, 11, side ? 13 : 25, 2); f(trim('tête'), side ? 28 : 12, 11, side ? 11 : 23); }
    if (hat) cursed('tête', 30, hat === 'EPP' ? 15 : 7);
    if (equip.torse) {
      if (equip.torse.res === 'EP') { f(shade(pal('torse')[0], .7), 16, 25, 4, 14); f(shade(pal('torse')[0], .7), side ? 28 : 30, 25, 3, 14); box('#7f643d', 17, 33, 5, 5); if (!side) box('#7f643d', 28, 33, 5, 5); }
      if (equip.torse.res === 'AG' || equip.torse.res === 'GP') { f(pal('torse')[2], 18, 29, side ? 12 : 14, 2); f(pal('torse')[1], 18, 33, side ? 12 : 14); }
      if (equip.torse.res === 'EPP') for (const [x, y] of [[19, 27], [28, 29], [23, 35], [31, 35]]) { f('#e2c596', x, y, 2, 2); f('#f4dbb7', x + 1, y - 1); }
      f(trim('torse'), side ? 30 : 23, 37, 3, 2); cursed('torse', 28, 35);
    }
    if (equip.jambes) { f(trim('jambes'), side ? 27 : 18, 42, 3); cursed('jambes', side ? 30 : 29, 46); }
    if (equip.pieds) { f(trim('pieds'), side ? 29 : 16, 59, 3); if (!side) f(trim('pieds'), 28, 59, 3); cursed('pieds', 29, 60); }
    if (equip.amulette) { if (back) f(trim('amulette'), 20, 22, 10); else { f(trim('amulette'), side ? 31 : 20, 23, 1, 8); if (!side) f(trim('amulette'), 29, 23, 1, 7); box(pal('amulette')[1], side ? 29 : 22, 29, 6, 6); f(trim('amulette'), side ? 31 : 24, 31, 2, 2); } cursed('amulette', side ? 31 : 24, back ? 22 : 32); }
    if (equip.robot) { const x = back ? 17 : side ? 12 : 8, y = back ? 26 : 34; box(pal('robot')[1], x, y, back ? 15 : 8, back ? 17 : 10); f(pal('robot')[2], x + 2, y + 2, back ? 10 : 4, 2); f(trim('robot'), x + 3, y + 6, 3, 2); f('#e9f2dc', x + 2, y + 5); cursed('robot', x + 3, y + 8); }
    if (equip.perche) {
      f(ink, 42, 6, 2, 48); f('#b4976b', 42, 9, 1, 43); const res = equip.perche.res;
      if (res === 'EC' || res === 'EPP') { box(pal('perche')[2], 37, 1, 10, 13); for (let y = 4; y < 12; y += 3) f(pal('perche')[1], 39, y, 6); f('#eef5db', 39, 3, 2); }
      if (res === 'AG') { f('#acba71', 42, 4, 1, 48); for (const y of [8, 20, 32, 44]) f(trim('perche'), 42, y); }
      if (res === 'EP') { f(ink, 36, 5, 11, 4); for (let x = 37; x < 47; x += 3) f(trim('perche'), x, 1, 1, 6); }
      if (res === 'GP') { box('#99cbc2', 39, 2, 8, 5); f(ink, 39, 5, 2, 5); f(trim('perche'), 40, 4, 6); }
      f(avatar.skin, 40, 36, 3, 3); cursed('perche', 42, 24);
    }
    if (equip.balai) { f(ink, 5, 25, 2, 33); f('#b99361', 6, 26, 1, 30); box(pal('balai')[1], 1, 54, 12, 5); for (let x = 2; x < 13; x += 2) f(trim('balai'), x, 59, 1, 2); f(avatar.skin, 6, 36, 3, 3); cursed('balai', 8, 56); }
    ctx.restore();
  }
  return { paint };
})();
window.KeeperArt = KeeperArt;
